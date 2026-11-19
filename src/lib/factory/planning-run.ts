import { access, digest, hasProviderConsent, id, operator } from "./engine";
import { resolveSelection } from "./ai-routing";
import { meteredModelCall } from "./metering";
import type { Principal, Project, ResearchRun } from "./model";
import type { Repository } from "./repository";
import { generateResearchPlanning, prepareResearchPlanning, type ResearchProposal } from "./research-planner";
import { generateMediumSelection, prepareMediumSelection, type MediumProposal } from "./medium-selection";
import { planningCurrent, planningInputKey, mediumCurrent, mediumEvidenceKey } from "./planning-context";
import { planProject, requirePlannedTask } from "./task-plan";
import { maxProjectRuns } from "./run-cap";

type Kind = "planning" | "medium";
type Options = { force?: boolean; feedback?: string };
const find = (projects: Project[], a: Principal, projectId: string) => { const p = projects.find(p => p.id === projectId); if (!p) throw new Error("Forbidden: project access"); access(p, a); return p; };

async function runJob(repo: Repository, a: Principal, projectId: string, kind: Kind, options: Options): Promise<Project> {
  operator(a);
  if (a.demo) throw new Error("Paid planning is disabled in the synthetic demo");
  const before = find((await repo.read(a.workspaceId)).projects, a, projectId);
  if (!before.researchPlanning?.enabled) throw new Error("Enable AI research planning for this project first");
  if (before.strategies.length) throw new Error("Planning is locked after direction work begins");
  if (!options.force && (kind === "planning" ? planningCurrent(before) || before.researchPlanning.status === "rules" && before.researchPlanning.inputKey === planningInputKey(before) : mediumCurrent(before))) return before;
  if (!options.force && (kind === "planning" ? before.researchPlanning.status === "failed" && before.researchPlanning.inputKey === planningInputKey(before) : before.mediumSelection?.status === "failed" && before.mediumSelection.evidenceKey === mediumEvidenceKey(before))) throw new Error("The last planning task failed; a producer must explicitly retry or choose the manual path");
  if (process.env.PORT67_SYNTHESIS_ENABLED !== "true") throw new Error("Choose a planning model and enable AI drafting before running this task");
  const selection = await resolveSelection(repo, kind === "planning" ? "synthesis:planner" : "synthesis:medium");
  const prepare = (p: Project) => kind === "planning" ? prepareResearchPlanning(p, options.feedback) : prepareMediumSelection(p);
  const reservation = await repo.mutate(a.workspaceId, state => {
    const p = find(state.projects, a, projectId);
    if (p.strategies.length) throw new Error("Planning is locked after direction work begins");
    if (kind === "medium") requirePlannedTask(p, "mediumSelection");
    const context = prepare(p);
    if (p.runs.some(r => r.status === "running")) throw new Error("An agent task is already running");
    // Failed runs (including ones refused before any model call, such as a full cost ledger) do not use up the allowance; only runs that ran or are running count. The provider invocation cap below still bounds total attempts.
    if (p.runs.filter(r => r.stage === kind && r.status !== "failed").length >= 1000) throw new Error("Planning invocation limit reached");
    if (p.runs.filter(r => r.stage !== "scope" && r.stage !== "review").length >= maxProjectRuns()) throw new Error("Provider invocation cap reached for this project");
    const contextKey = kind === "planning" ? prepareResearchPlanning(p, options.feedback).inputKey : prepareMediumSelection(p).evidenceKey;
    const run: ResearchRun = { id: id(), stage: kind, capabilityId: kind === "planning" ? "planning.research" : "planning.medium", capabilityVersion: "1.0.0", at: new Date().toISOString(), status: "running", provider: selection.provider, model: selection.model, inputHash: context.inputHash, contextHash: digest(JSON.stringify(p.brief)), contextSnapshot: structuredClone(p.brief), planningContextKey: contextKey, taskInputKey: p.taskPlan?.researchKey, leaseExpiresAt: new Date(Date.now() + 120000).toISOString(), usageStatus: "unknown" };
    const previousPlanning = structuredClone(p.researchPlanning), previousMedium = structuredClone(p.mediumSelection);
    p.runs.push(run);
    if (kind === "planning") { p.researchPlanning!.status = "running"; p.researchPlanning!.inputKey = contextKey; p.researchPlanning!.runId = run.id; delete p.researchPlanning!.error; }
    else p.mediumSelection = { ...(p.mediumSelection || { version: 0, history: [] }), status: "running", evidenceKey: contextKey, runId: run.id };
    p.revision++;
    return { project: structuredClone(p), run, previousPlanning, previousMedium };
  });
  let failure = "";
  try {
    const result = await meteredModelCall(repo, a, reservation.project, reservation.run, async () => kind === "planning" ? generateResearchPlanning(reservation.project, selection, options.feedback) : generateMediumSelection(reservation.project, selection));
    failure = await repo.mutate(a.workspaceId, state => {
      const p = find(state.projects, a, projectId), record = p.runs.find(r => r.id === reservation.run.id)!;
      record.usage = result.usage; record.usageStatus = Object.keys(result.usage).length ? "recorded" : "unknown";
      if (result.providerRequestId) record.providerRequestId = result.providerRequestId;
      let error = result.error || (!result.value ? "Invalid planning output" : "");
      try { if (!hasProviderConsent(p) || record.status !== "running" || prepare(p).inputHash !== record.inputHash) error = "Project inputs, evidence or authorisation changed; stale planning result rejected"; }
      catch { error = "Project inputs, evidence or authorisation changed; stale planning result rejected"; }
      record.status = error ? "failed" : "completed"; record.finishedAt = new Date().toISOString();
      if (error) {
        record.error = error;
        if (kind === "planning" && p.researchPlanning?.runId === record.id && record.planningContextKey === planningInputKey(p)) { p.researchPlanning.status = "failed"; p.researchPlanning.error = error; }
        if (kind === "medium" && p.mediumSelection?.runId === record.id && record.planningContextKey === mediumEvidenceKey(p)) { p.mediumSelection.status = "failed"; p.mediumSelection.error = error; }
      } else if (kind === "planning") {
        const prev = reservation.previousPlanning!, value = result.value as ResearchProposal;
        const history = prev.version && prev.proposal ? [...prev.history, { version: prev.version, summary: prev.proposal.summary, at: record.finishedAt, runId: prev.runId }].slice(-10) : prev.history;
        p.researchPlanning = { enabled: true, status: "completed", version: prev.version + 1, inputKey: record.planningContextKey!, proposal: value, runId: record.id, provider: record.provider, model: record.model, history };
        planProject(p, a.subject, "LLM research plan validated by the task manager");
        for (const gap of value.gaps) if (p.capabilities.length < 20 && !p.capabilities.some(c => c.name.toLowerCase() === gap.name.toLowerCase())) p.capabilities.push({ id: id(), name: gap.name, reason: gap.reason, status: "proposed", evaluation: `Existing limitation: ${gap.existingCapabilityLimit}. Required inputs: ${gap.requiredInputs.join("; ")}. Pending contracts, tools, rights, budget, evaluation and owner promotion review. Not executable.`, createdAt: record.finishedAt });
      } else {
        const prev = reservation.previousMedium || { version: 0, history: [], proposal: undefined }, value = result.value as MediumProposal;
        const history = prev.version && prev.proposal ? [...prev.history, { version: prev.version, summary: prev.proposal.summary, at: record.finishedAt }].slice(-10) : prev.history;
        p.mediumSelection = { status: "completed", version: prev.version + 1, evidenceKey: record.planningContextKey!, proposal: value, runId: record.id, history };
      }
      p.audit.push({ id: id(), at: record.finishedAt, actor: a.subject, role: a.role, action: error ? "planning_rejected" : "planning_accepted", detail: `${kind}: ${record.id}; ${error || "validated proposal; customer request unchanged"}` });
      p.revision++;
      return error;
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "Planning failed";
    await repo.mutate(a.workspaceId, state => {
      const p = find(state.projects, a, projectId), record = p.runs.find(r => r.id === reservation.run.id)!;
      record.status = "failed"; record.error = failure; record.finishedAt = new Date().toISOString();
      if (kind === "planning" && p.researchPlanning?.runId === record.id && record.planningContextKey === planningInputKey(p)) { p.researchPlanning.status = "failed"; p.researchPlanning.error = failure; }
      if (kind === "medium" && p.mediumSelection?.runId === record.id && record.planningContextKey === mediumEvidenceKey(p)) { p.mediumSelection.status = "failed"; p.mediumSelection.error = failure; }
      p.revision++;
    });
  }
  if (failure) throw new Error(failure);
  return find((await repo.read(a.workspaceId)).projects, a, projectId);
}
export const runResearchPlanning = (repo: Repository, a: Principal, projectId: string, options: Options = {}) => runJob(repo, a, projectId, "planning", options);
export const runMediumSelection = (repo: Repository, a: Principal, projectId: string, options: Options = {}) => runJob(repo, a, projectId, "medium", options);
