import { loadApprovalMode, producerApprovalsOn } from "./approval-mode";
import { access, digest, id, operator, transition } from "./engine";
import { runContent } from "./content-run";
import { runSynthesis } from "./synthesis-run";
import { ensureScope } from "./scope-run";
import { reviewGate, saveReview } from "./producer-review-run";
import { GATE_LABEL, MIN_ACCEPTED_PER_SEGMENT, PRODUCER_AGENT } from "./producer-reviews";
import { stageReady } from "./ai-routing";
import { segments, type Principal, type Project, type ReviewGate } from "./model";
import type { Repository } from "./repository";

export { PRODUCER_AGENT };
// The producer orchestrator. It does no judging itself: it decides which producer reviewer or drafting agent goes next, applies
// the reviewer's verdict, carries feedback back to the right drafter, and enforces the loop limits. The four reviewers (scope,
// source, insight, direction) are walled gardens: see producer-reviews.ts. It never approves for the account owner: it stops at
// direction approval and at asset approval.
//
// Loop protection: at most MAX_STEPS steps per pass; a failed step ends the pass and is not retried inside it; each gate may send
// work back for ONE redraft per manual run, after which a human decides (a hold); an automatic pass is skipped when nothing
// changed since the last pass; a project is limited to MAX_PASSES passes; reviewer calls are capped per project; one pass at a
// time runs per project.
export const producerAgentAuto = () => process.env.PORT67_PRODUCER_AGENT === "true";
const MAX_STEPS = 14;
const MAX_PASSES = 30;
const MAX_LOG = 40;
const MAX_REWORKS = 1;

export type StepId = "approveDirection" | "reviewScope" | "reviewSources" | "draftInsights" | "reviewInsights" | "draftDirection" | "reviewDirection" | "produce" | "draftCopyPack" | "shareAssets";
export const STEP_LABEL: Record<StepId, string> = {
  reviewScope: "Scope producer reviews the classification",
  reviewSources: "Source producer reviews the sources",
  draftInsights: "Draft insights with AI",
  reviewInsights: "Insight producer reviews the draft insights",
  draftDirection: "Draft direction with AI",
  reviewDirection: "Direction producer reviews the direction",
  approveDirection: "AI producer approves the direction on the customer's behalf",
  produce: "Create production drafts",
  draftCopyPack: "Draft AI copy pack",
  shareAssets: "Share assets with the account owner",
};
export type Stop = { kind: "waiting_customer" | "waiting_human" | "blocked" | "done"; reason: string };
export type Plan = { step: StepId } | { stop: Stop };
type Agent = NonNullable<Project["producerAgent"]>;

/** Short digest of everything the orchestrator decides from. Equal fingerprints mean the next pass would decide the same thing. */
export function progressFingerprint(p: Project): string {
  const count = (items: { status?: string }[]) => items.reduce<Record<string, number>>((m, x) => ((m[x.status || "-"] = (m[x.status || "-"] || 0) + 1), m), {});
  const last = p.strategies.at(-1);
  return digest(JSON.stringify({
    runs: p.runs.length,
    running: p.runs.filter((r) => r.status === "running").length,
    sources: count(p.sources),
    insights: count(p.insights),
    strategy: last ? [last.id, last.status, last.hash] : null,
    tasks: p.tasks.length,
    assets: p.assets.map((x) => [x.id, x.status]),
    reviews: (p.reviews || []).length,
    pending: p.producerAgent?.pending?.gate || "",
    hold: p.producerAgent?.hold ? p.producerAgent.hold.gate + p.producerAgent.hold.subject : "",
  }));
}
const wait = (kind: Stop["kind"], reason: string): Plan => ({ stop: { kind, reason } });
const unreviewedIds = (p: Project) => p.sources.filter((s) => s.kind === "public_source" && s.status === "unreviewed").map((s) => s.id);
const draftsReady = (p: Project) => p.insights.filter((i) => (i.status || "reviewed") === "draft" && i.sourceIds.every((e) => p.sources.some((s) => s.id === e && s.status === "supported")));
export const holdSubject = (ids: string[]) => (ids.length ? digest(ids.join(",")) : "none");

/** The single next thing the orchestrator would do, or the reason it stops. Pure: no calls, no writes. */
export function planNext(p: Project, aiReady: boolean): Plan {
  const st = p.producerAgent;
  if (p.runs.some((r) => r.status === "running")) return wait("blocked", "A provider task is still running; the agent continues when it finishes.");
  if (p.scope && (st?.reworks?.scope || 0) < 1 && !(p.reviews || []).some((r) => r.gate === "scope" && r.subject === "v" + p.scope!.version)) return { step: "reviewScope" };
  if (!p.sources.some((s) => s.kind === "public_source")) return wait("waiting_human", "No research sources yet: start research first.");
  for (const seg of segments) {
    const run = p.runs.filter((r) => (r.stage || "research") === "research" && r.segment === seg).at(-1);
    if (!run) return wait("waiting_human", `The ${seg} research has not run yet.`);
    if (run.status !== "completed") return wait("waiting_human", `The ${seg} research ${run.status === "failed" ? "failed: re-run it" : "is not finished"}.`);
  }
  const waiting = unreviewedIds(p);
  if (st?.hold?.gate === "sources" && st.hold.subject === holdSubject(waiting)) return wait("waiting_human", st.hold.notes);
  if (waiting.length) return { step: "reviewSources" };
  if (!p.sources.some((s) => s.status === "supported")) return wait("waiting_human", "Every source was rejected by the source producer, so there is nothing to build insights from.");
  // Insights
  if (st?.pending?.gate === "insights") return aiReady ? { step: "draftInsights" } : wait("waiting_human", "The insight producer wants a redraft, but AI drafting is not configured. " + st.pending.notes);
  const live = p.insights.filter((i) => (i.status || "reviewed") !== "rejected");
  const drafts = draftsReady(p);
  if (st?.hold?.gate === "insights" && st.hold.subject === holdSubject(drafts.map((i) => i.id))) return wait("waiting_human", st.hold.notes);
  if (drafts.length) return { step: "reviewInsights" };
  if (!live.length) return p.insights.length === 0 ? (aiReady ? { step: "draftInsights" } : wait("waiting_human", "AI drafting is not configured: draft insights by hand.")) : wait("waiting_human", "The insight producer rejected every draft insight and the redraft allowance is used: a producer decides how to proceed.");
  if (!live.some((i) => (i.status || "reviewed") !== "draft")) return wait("waiting_human", "Draft insights lack accepted sources: review the sources first.");
  // Direction
  const direction = p.strategies.at(-1);
  if (!direction) return aiReady ? { step: "draftDirection" } : wait("waiting_human", "AI drafting is not configured: draft the direction by hand.");
  if (direction.status === "shared" && producerApprovalsOn()) return { step: "approveDirection" };
  if (direction.status === "shared") return wait("waiting_customer", "Direction shared: waiting for the account owner to approve it.");
  if (direction.status === "changes_requested") return wait("waiting_human", "The account owner asked for changes to the direction: a producer decides how to rework it.");
  if (direction.status === "draft") {
    if (st?.pending?.gate === "direction") return aiReady ? { step: "draftDirection" } : wait("waiting_human", "The direction producer wants a redraft, but AI drafting is not configured. " + st.pending.notes);
    if (st?.hold?.gate === "direction" && st.hold.subject === direction.hash) return wait("waiting_human", "The direction producer sent the direction back and the redraft allowance is used: " + st.hold.notes);
    return { step: "reviewDirection" };
  }
  // The direction is approved by the customer from here on.
  const hash = direction.hash;
  if (!p.tasks.some((t) => t.strategyId === direction.id)) return { step: "produce" };
  const mine = p.assets.filter((x) => x.strategyHash === hash);
  if (aiReady && direction.keyMessages?.length && !mine.some((x) => x.title === "AI copy pack")) return { step: "draftCopyPack" };
  if (mine.some((x) => x.status === "draft")) return { step: "shareAssets" };
  if (mine.some((x) => x.status === "shared")) return wait("waiting_customer", "Assets shared: waiting for the account owner to approve the storyboard and outline assets.");
  if (mine.some((x) => x.status === "changes_requested")) return wait("waiting_human", "The account owner asked for changes to an asset: a producer decides how to rework it.");
  if (mine.length && mine.every((x) => x.status === "approved")) return wait("done", "All assets are approved by the account owner. Video render and download are optional, manual steps.");
  return wait("waiting_human", "Nothing for the agent to do.");
}

const running = new Set<string>();
const find = (projects: Project[], projectId: string, a: Principal) => {
  const p = projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Forbidden: project access");
  access(p, a);
  return p;
};
type LogEntry = Agent["log"][number];
const blank = (): Agent => ({ passes: 0, status: "blocked", reason: "", at: new Date().toISOString(), lastFingerprint: "", log: [] });
async function patchAgent(repo: Repository, op: Principal, projectId: string, change: (s: Agent) => void) {
  await repo.mutate(op.workspaceId, (state) => {
    const p = find(state.projects, projectId, op);
    p.producerAgent ||= blank();
    change(p.producerAgent);
    p.revision++;
  });
}

/**
 * One bounded pass. `auto` passes (started by the system after research, an approval, or a bulk accept when the switch is on) are
 * skipped when nothing changed. A manual pass (`force`) always looks again and gives every gate a fresh rework allowance, but still
 * obeys the step and pass limits.
 */
export async function runProducerAgent(repo: Repository, a: Principal, projectId: string, opts: { auto?: boolean; force?: boolean; trigger?: string } = {}): Promise<Project> {
  if (a.demo) throw new Error("The producer agent does not run in the synthetic demo");
  if (!opts.auto) operator(a);
  const op: Principal = { ...a, role: "operator", subject: PRODUCER_AGENT, admin: false };
  const key = a.workspaceId + "/" + projectId;
  const read = async () => find((await repo.read(op.workspaceId)).projects, projectId, op);
  if (running.has(key)) return read();
  running.add(key);
  const log: LogEntry[] = [];
  const stamp = (step: string, outcome: LogEntry["outcome"], detail: string) => log.push({ at: new Date().toISOString(), step, outcome, detail: detail.slice(0, 240) });
  let stop: Stop = { kind: "blocked", reason: "" };
  try {
    const first = await read();
    const state = first.producerAgent;
    if ((state?.passes || 0) >= MAX_PASSES) return first;
    if (!opts.force && state?.lastFingerprint === progressFingerprint(first)) return first;
    if (opts.force && state) await patchAgent(repo, op, projectId, (s) => { s.reworks = {}; delete s.pending; delete s.hold; });
    await loadApprovalMode(repo, 0);
    const aiReady = await stageReady(repo, "synthesis").catch(() => false);
    for (let n = 0; n < MAX_STEPS; n++) {
      const current = await read();
      const plan = planNext(current, aiReady);
      if ("stop" in plan) {
        stop = plan.stop;
        break;
      }
      const label = STEP_LABEL[plan.step];
      try {
        const detail = await perform(repo, op, projectId, plan.step, aiReady);
        stamp(plan.step, "done", detail ? `${label}: ${detail}` : label);
      } catch (e) {
        const why = e instanceof Error ? e.message : "failed";
        stamp(plan.step, "failed", `${label}: ${why}`);
        stop = { kind: "blocked", reason: `${label} did not complete: ${why}`.slice(0, 240) };
        break;
      }
      if (n === MAX_STEPS - 1) stop = { kind: "blocked", reason: "Step limit for one pass reached; run the agent again to continue." };
    }
    return await repo.mutate(op.workspaceId, (s) => {
      const p = find(s.projects, projectId, op);
      const prev = p.producerAgent;
      p.producerAgent = { ...(prev || blank()), passes: (prev?.passes || 0) + 1, status: stop.kind, reason: stop.reason, at: new Date().toISOString(), lastFingerprint: "", log: [...(prev?.log || []), ...log].slice(-MAX_LOG) };
      p.producerAgent.lastFingerprint = progressFingerprint(p);
      p.audit.push({ id: id(), at: p.producerAgent.at, actor: PRODUCER_AGENT, role: "operator", action: "producer_agent_pass", detail: `${opts.trigger || (opts.auto ? "automatic" : "manual by " + a.subject)}: ${log.map((l) => l.step + " " + l.outcome).join(", ") || "no step"}; stopped: ${stop.kind}, ${stop.reason}`.slice(0, 480) });
      p.revision++;
      return structuredClone(p);
    });
  } finally {
    running.delete(key);
  }
}

async function perform(repo: Repository, op: Principal, projectId: string, step: StepId, aiReady: boolean): Promise<string> {
  const command = (build: (p: Project) => Record<string, unknown>[]) =>
    repo.mutate(op.workspaceId, (s) => {
      const index = s.projects.findIndex((x) => x.id === projectId);
      if (index < 0) throw new Error("Forbidden: project access");
      let next = s.projects[index];
      for (const c of build(next)) next = transition(next, c, op);
      s.projects[index] = next;
    });
  const agent = async () => (await repo.read(op.workspaceId)).projects.find((x) => x.id === projectId)?.producerAgent;
  const reworked = async (gate: ReviewGate) => (await agent())?.reworks?.[gate] || 0;
  const sendBack = async (gate: "insights" | "direction", notes: string, subject: string) => {
    if ((await reworked(gate)) < MAX_REWORKS && aiReady) await patchAgent(repo, op, projectId, (s) => { s.pending = { gate, notes }; });
    else await patchAgent(repo, op, projectId, (s) => { s.hold = { gate, subject, notes }; });
  };
  const consume = async (gate: "insights" | "direction") => {
    const notes = (await agent())?.pending?.gate === gate ? (await agent())!.pending!.notes : undefined;
    if (notes) await patchAgent(repo, op, projectId, (s) => { delete s.pending; s.reworks = { ...s.reworks, [gate]: (s.reworks?.[gate] || 0) + 1 }; });
    return notes;
  };
  const current = async () => find((await repo.read(op.workspaceId)).projects, projectId, op);

  if (step === "reviewScope") {
    const first = await reviewGate(repo, op, projectId, "scope");
    await saveReview(repo, op, projectId, first);
    // Re-classifying only helps before the researchers have used the scope; afterwards the verdict is recorded for the producer.
    const researched = (await current()).runs.some((r) => (r.stage || "research") === "research");
    if (first.verdict === "rework" && !researched && (await reworked("scope")) < MAX_REWORKS) {
      await patchAgent(repo, op, projectId, (s) => { s.reworks = { ...s.reworks, scope: 1 }; });
      await ensureScope(repo, op, projectId, true, first.notes || first.summary);
      await saveReview(repo, op, projectId, await reviewGate(repo, op, projectId, "scope"));
      return "sent back once and re-classified";
    }
    return `${first.verdict} (${first.by})`;
  }
  if (step === "reviewSources") {
    const rec = await reviewGate(repo, op, projectId, "sources");
    const before = await current();
    const waiting = unreviewedIds(before);
    if (rec.items.length) await command(() => [{ type: "reviewSourcesBatch", items: rec.items }]);
    await saveReview(repo, op, projectId, rec);
    const after = await current();
    const left = unreviewedIds(after);
    const short = segments.filter((k) => after.sources.filter((s) => s.segment === k && s.kind === "public_source" && s.status === "supported").length < MIN_ACCEPTED_PER_SEGMENT);
    if (left.length) await patchAgent(repo, op, projectId, (s) => { s.hold = { gate: "sources", subject: holdSubject(left), notes: `The source producer left ${left.length} of ${waiting.length} sources undecided: review them by hand.` }; });
    else if (short.length) await patchAgent(repo, op, projectId, (s) => { s.hold = { gate: "sources", subject: holdSubject([]), notes: `Fewer than ${MIN_ACCEPTED_PER_SEGMENT} accepted sources for ${short.join(", ")}: re-run that research or add sources by hand, then run the agent again.` }; });
    return `${rec.summary} (${rec.by})`;
  }
  if (step === "reviewInsights") {
    const rec = await reviewGate(repo, op, projectId, "insights");
    const ids = draftsReady(await current()).map((i) => i.id);
    if (rec.items.length) await command(() => [{ type: "reviewInsightsBatch", items: rec.items }]);
    await saveReview(repo, op, projectId, rec);
    const after = await current();
    const left = draftsReady(after).map((i) => i.id);
    const accepted = after.insights.filter((i) => (i.status || "reviewed") === "reviewed").length;
    if (left.length) await patchAgent(repo, op, projectId, (s) => { s.hold = { gate: "insights", subject: holdSubject(left), notes: `The insight producer left ${left.length} of ${ids.length} insights undecided: review them by hand.` }; });
    else if (rec.verdict === "rework") {
      const notes = rec.notes || rec.summary;
      if (accepted === 0) await sendBack("insights", notes, holdSubject([]));
      else if ((await reworked("insights")) < MAX_REWORKS && aiReady) await sendBack("insights", notes, holdSubject([]));
    }
    return `${rec.summary} (${rec.by})`;
  }
  if (step === "approveDirection") {
    await command((p) => [{ type: "approveStrategy", hash: p.strategies.at(-1)!.hash }]);
    return "approved after the direction producer passed it";
  }
  if (step === "reviewDirection") {
    const rec = await reviewGate(repo, op, projectId, "direction");
    const hash = (await current()).strategies.at(-1)!.hash;
    await saveReview(repo, op, projectId, rec);
    if (rec.verdict === "pass") await command(() => [{ type: "shareStrategy" }]);
    else await sendBack("direction", rec.notes || rec.summary, hash);
    return `${rec.verdict} (${rec.by}): ${rec.summary}`.slice(0, 200);
  }
  if (step === "draftInsights") {
    const notes = await consume("insights");
    await runSynthesis(repo, op, projectId, "insights", notes);
    return notes ? "redraft with the insight producer's notes" : "";
  }
  if (step === "draftDirection") {
    const notes = await consume("direction");
    await runSynthesis(repo, op, projectId, "strategy", notes);
    return notes ? "redraft with the direction producer's notes" : "";
  }
  if (step === "produce") await command(() => [{ type: "produce" }]);
  else if (step === "shareAssets") await command((p) => { const hash = p.strategies.at(-1)?.hash; return p.assets.filter((x) => x.status === "draft" && x.strategyHash === hash).map((x) => ({ type: "shareAsset", id: x.id })); });
  else await runContent(repo, op, projectId);
  return "";
}
export { GATE_LABEL };

/**
 * Called by research start when PORT67_PRODUCER_AGENT=true: the scope producer checks the classification before any researcher
 * uses it, once per scope version. Never throws and never blocks research.
 */
export async function reviewScopeBeforeResearch(repo: Repository, a: Principal, projectId: string) {
  try {
    if (a.demo) return;
    const p = find((await repo.read(a.workspaceId)).projects, projectId, a);
    if (!p.scope || (p.producerAgent?.reworks?.scope || 0) >= 1 || (p.reviews || []).some((r) => r.gate === "scope" && r.subject === "v" + p.scope!.version)) return;
    const op: Principal = { ...a, role: "operator", subject: PRODUCER_AGENT, admin: false };
    await perform(repo, op, projectId, "reviewScope", false);
  } catch {
    /* research never waits on the scope review */
  }
}
