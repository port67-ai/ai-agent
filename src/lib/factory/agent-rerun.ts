// Rerun one failed AI agent for one project, optionally after switching its model (CHG-0100). This is the producer's deliberate
// retry: it reruns exactly that agent through the agent's existing runner, so every existing control still applies (provider
// consent, studio stage gating, task-plan exclusion, dependencies, one run at a time, metering). Only the "a failed paid task needs
// a deliberate retry" refusal is passed, because this is that deliberate retry. Every attempt is audited on the project.
import { access, hasProviderConsent, id, operator, requireProviderConsent, requireStudioIntakeApproved, transition } from "./engine";
import { resolveSelection, setSlotRoute } from "./ai-routing";
import { isSlotId, slotLabel, type SlotId } from "./ai-slots";
import { classifyFailure, type FailureClass } from "./failure-class";
import { RERUN_ORDER, agentOfRun, failedAgents, segmentOf, taskOfSlot, type FailedAgent } from "./failed-agents";
import { runResearchPlanning, runMediumSelection } from "./planning-run";
import { ensureScope } from "./scope-run";
import { runSynthesis } from "./synthesis-run";
import { runContent } from "./content-run";
import { runAdvisory } from "./advisory-run";
import { producerAgentBusy, runReviewStep } from "./producer-agent";
import { draftPreproduction } from "./studio-preproduction";
import type { Principal, Project, ReviewGate, Segment } from "./model";
import type { Repository } from "./repository";

/** The two service paths that live in service.ts: the research segment runner and the studio rerun executor. */
export type RerunDeps = {
  runResearch: (a: Principal, projectId: string, segment: Segment) => Promise<void>;
  runStudioRerun: (a: Principal, projectId: string) => Promise<void>;
};
export type RerunResult = {
  slot: SlotId;
  label: string;
  ok: boolean;
  /** The new error when the rerun ran and failed, or why it was refused or skipped. */
  error?: string;
  failure?: FailureClass;
  /** "provider model" before and after (the same unless the model was switched). */
  from: string;
  to: string;
  switched: boolean;
  /** True when the agent was not run at all (refused, or skipped in a bulk rerun). */
  notRun?: boolean;
};
export class RerunRefused extends Error {}

const find = (projects: Project[], projectId: string, a: Principal) => {
  const p = projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Forbidden: project access");
  access(p, a);
  return p;
};
const read = async (repo: Repository, a: Principal, projectId: string) => find((await repo.read(a.workspaceId)).projects, projectId, a);
async function routeOf(repo: Repository, slot: SlotId) {
  try {
    const s = await resolveSelection(repo, slot);
    return `${s.provider} ${s.model}`;
  } catch (e) {
    return "no usable model (" + (e instanceof Error ? e.message : "unresolved").slice(0, 120) + ")";
  }
}
const isAdmin = (a: Principal) => !!a.admin && a.identity === "firebase" && !a.demo;

/** Refuse unless this agent's latest run for this project failed and every existing control allows a rerun now. */
function guard(p: Project, a: Principal, slot: SlotId): FailedAgent {
  if (producerAgentBusy(a.workspaceId, p.id)) throw new RerunRefused("The producer agent is working on this project right now; wait for it to finish, then rerun.");
  requireStudioIntakeApproved(p);
  requireProviderConsent(p);
  // Task-plan exclusion: an agent the plan does not select is never rerun, whatever its old runs say.
  const taskId = taskOfSlot(slot);
  const task = taskId && p.taskPlan ? p.taskPlan.tasks.find((t) => t.id === taskId) : undefined;
  if (taskId && p.taskPlan && (!task || task.status === "skipped" || (slot.startsWith("research:") && !p.taskPlan.research.includes(segmentOf(slot))))) throw new RerunRefused("This agent is excluded from the project task plan; revise the plan first.");
  const entry = failedAgents(p, { authorised: hasProviderConsent(p) }).find((x) => x.slot === slot);
  if (!entry) throw new RerunRefused(`${slotLabel(slot)} has not failed for this project (its latest run for the current inputs did not fail), so there is nothing to rerun. Use the normal buttons to run it again.`);
  if (!entry.canRerun) throw new RerunRefused(entry.why || "This agent cannot be rerun now.");
  return entry;
}

/** Redraft insights or the direction with the producer reviewer's pending notes (if a redraft was requested), as the orchestrator would. */
async function draftWithNotes(repo: Repository, a: Principal, projectId: string, stage: "insights" | "strategy") {
  const gate = stage === "insights" ? "insights" : "direction";
  const pending = (await read(repo, a, projectId)).producerAgent?.pending;
  const notes = pending?.gate === gate ? pending.notes : undefined;
  await runSynthesis(repo, a, projectId, stage, notes);
  // Consumed only once the redraft succeeded, so a failed rerun keeps the reviewer's notes for the next attempt.
  if (notes) await repo.mutate(a.workspaceId, (state) => {
    const agent = find(state.projects, projectId, a).producerAgent;
    if (agent?.pending?.gate === gate) { delete agent.pending; agent.reworks = { ...agent.reworks, [gate]: (agent.reworks?.[gate] || 0) + 1 }; }
  });
}

/** Run the agent through its existing runner. Throws when the runner refuses or the run fails. */
async function execute(repo: Repository, a: Principal, projectId: string, entry: FailedAgent, deps: RerunDeps) {
  const slot = entry.slot;
  if (slot.startsWith("research:")) return deps.runResearch(a, projectId, segmentOf(slot));
  if (slot === "scope:business") {
    const scope = await ensureScope(repo, a, projectId, true);
    if (scope.source !== "ai") throw new Error(scope.note || "The scoping agent did not run; the free template scope was used");
    return;
  }
  if (slot === "synthesis:planner") return void (await runResearchPlanning(repo, a, projectId, { force: true }));
  if (slot === "synthesis:medium") return void (await runMediumSelection(repo, a, projectId, { force: true }));
  if (slot === "synthesis:insights") return draftWithNotes(repo, a, projectId, "insights");
  if (slot === "synthesis:strategy") return draftWithNotes(repo, a, projectId, "strategy");
  if (slot === "synthesis:content") return void (await runContent(repo, a, projectId));
  if (slot === "synthesis:formats" || slot === "synthesis:audiences" || slot === "synthesis:ideas") return void (await runAdvisory(repo, a, projectId, slot.slice(10) as "formats" | "audiences" | "ideas"));
  if (slot.startsWith("review:")) return void (await runReviewStep(repo, a, projectId, slot.slice(7) as ReviewGate));
  if (slot === "studio:preproduction" || slot === "studio:image") {
    if (entry.wholeDraft) await draftPreproduction(repo, a, projectId);
    for (const piece of entry.pieces || []) {
      // The studio rerun path: record a rerun request for the piece (keeping the producer's last instruction), then fulfil it.
      const before = await read(repo, a, projectId);
      const instruction = piece.requestId ? before.studio?.rerunRequests?.find((r) => r.id === piece.requestId)?.instruction : undefined;
      await repo.mutate(a.workspaceId, (state) => {
        const index = state.projects.findIndex((x) => x.id === projectId);
        if (index < 0) throw new Error("Forbidden: project access");
        state.projects[index] = transition(state.projects[index], { type: "requestStudioRerun", pieceId: piece.id, confirm: true, replace: true, requestId: id(), ...(instruction ? { instruction } : {}) }, a);
      });
      await deps.runStudioRerun(a, projectId);
      const request = (await read(repo, a, projectId)).studio?.rerunRequests?.filter((r) => r.pieceId === piece.id).at(-1);
      if (request?.status === "failed") throw new Error(`${piece.title}: ${request.error || "the rerun failed"}`);
      if (request?.status !== "done") throw new Error(`${piece.title}: the rerun did not finish`);
    }
    return;
  }
  throw new RerunRefused("This agent cannot be rerun on its own.");
}

/** Rerun one agent: guards, optional model switch (admin only), the run, the audit entry. */
async function rerunOne(repo: Repository, a: Principal, projectId: string, slot: SlotId, switchTo: unknown, deps: RerunDeps): Promise<RerunResult> {
  const p = await read(repo, a, projectId);
  const entry = guard(p, a, slot);
  const label = slotLabel(slot);
  const from = await routeOf(repo, slot);
  let to = from;
  if (switchTo !== undefined) {
    // Routing is owner-admin only (the AI models page); a switch made here is the same change, with the same validation and history.
    await setSlotRoute(repo, slot, switchTo, a.subject, `switched for a rerun on project ${projectId}`);
    to = await routeOf(repo, slot);
  }
  const switched = to !== from;
  const before = new Set(p.runs.filter((r) => agentOfRun(r) === slot).map((r) => r.id));
  let error = "";
  let refused = false;
  try {
    await execute(repo, a, projectId, entry, deps);
  } catch (e) {
    error = e instanceof Error ? e.message : "Rerun failed";
    refused = e instanceof RerunRefused;
  }
  const after = await read(repo, a, projectId);
  const fresh = after.runs.filter((r) => agentOfRun(r) === slot && !before.has(r.id));
  const newest = fresh.at(-1);
  // Scoping and reviewers fall back to free checks instead of throwing; their new run record says whether the model call failed.
  if (!error && newest?.status === "failed") error = newest.error || "The rerun failed";
  // A reviewer that could not use its model (for example no model chosen) still ran its free checks, but the agent itself did not run.
  if (!error && !fresh.length) error = (slot.startsWith("review:") ? after.reviews?.at(-1)?.skipped : undefined) || "The agent did not call its model, so nothing was rerun";
  // Nothing new was recorded: the runner refused before any paid call (for example a switch is off), so the agent did not run.
  if (error && !fresh.length) refused = true;
  const outcome = refused ? "refused: " + error : error ? "failed: " + error : "completed";
  await repo.mutate(a.workspaceId, (state) => {
    const current = find(state.projects, projectId, a);
    current.audit.push({ id: id(), at: new Date().toISOString(), actor: a.subject, role: a.role, action: "agent_rerun", detail: `${slot}: ${switched ? `${from} switched to ${to}` : from}; ${outcome}`.slice(0, 480) });
    current.revision++;
  });
  if (refused) throw new RerunRefused(error);
  return { slot, label, ok: !error, ...(error ? { error, failure: classifyFailure(error) } : {}), from, to, switched };
}

function parse(a: Principal, input: unknown) {
  operator(a);
  if (a.demo) throw new Error("Paid reruns are disabled in the synthetic demo");
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (body.confirm !== true) throw new Error("Confirm the rerun: it makes a paid model call");
  return body;
}

/** POST /projects/:id/agents/rerun with { slot, switchTo?: { provider, model }, confirm: true }. */
export async function rerunAgent(repo: Repository, a: Principal, projectId: string, input: unknown, deps: RerunDeps): Promise<RerunResult> {
  const body = parse(a, input);
  if (!isSlotId(body.slot)) throw new Error("Unknown AI agent");
  if (body.switchTo !== undefined && body.switchTo !== null) {
    if (!isAdmin(a)) throw new Error("Forbidden: switching an agent's model needs owner admin access; rerun with the current model or ask an admin");
    if (typeof body.switchTo !== "object") throw new Error("Choose a provider and model to switch to");
  }
  return rerunOne(repo, a, projectId, body.slot, body.switchTo ?? undefined, deps);
}

/**
 * POST /projects/:id/agents/rerun-failed with { confirm: true }: rerun, in dependency order, every agent whose latest run for this
 * project failed, stopping at the first new failure. Agents that still cannot run (for example waiting for dependencies) are
 * reported as not run.
 */
export async function rerunFailedAgents(repo: Repository, a: Principal, projectId: string, input: unknown, deps: RerunDeps): Promise<{ results: RerunResult[]; stopped?: RerunResult }> {
  parse(a, input);
  const attempted = new Set<SlotId>();
  const results: RerunResult[] = [];
  for (let n = 0; n <= RERUN_ORDER.length; n++) {
    const p = await read(repo, a, projectId);
    const open = failedAgents(p, { authorised: hasProviderConsent(p) }).filter((x) => !attempted.has(x.slot));
    if (!open.length) break;
    const next = open.find((x) => x.canRerun);
    if (!next) {
      for (const x of open) results.push({ slot: x.slot, label: x.label, ok: false, notRun: true, error: x.why, from: `${x.provider} ${x.model}`, to: `${x.provider} ${x.model}`, switched: false });
      break;
    }
    attempted.add(next.slot);
    let result: RerunResult;
    try {
      result = await rerunOne(repo, a, projectId, next.slot, undefined, deps);
    } catch (e) {
      const why = e instanceof Error ? e.message : "Rerun refused";
      result = { slot: next.slot, label: next.label, ok: false, notRun: true, error: why, from: `${next.provider} ${next.model}`, to: `${next.provider} ${next.model}`, switched: false };
    }
    results.push(result);
    if (!result.ok) return { results, stopped: result };
  }
  return { results };
}
