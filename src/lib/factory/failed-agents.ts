// Which AI agents failed for one project, and whether each can be rerun now (CHG-0100). Pure and client-safe: the AI agents page,
// the task planner and the studio pages call it on the project they already have; the rerun route calls it on the stored project.
// "Failed" means the agent's latest run for this project's current inputs failed; runs for old inputs (a changed brief, plan or
// evidence) are ignored, and a newer completed run supersedes a failed one.
import type { Project, ResearchRun, Segment } from "./model";
import { slotLabel, type SlotId } from "./ai-slots";
import { classifyFailure, type FailureClass } from "./failure-class";
import { syncTaskPlan, taskResearchCurrent } from "./task-plan";
import { mediumEvidenceKey, planningCurrent, planningInputKey } from "./planning-context";
import { STUDIO_CLASSIC_PRODUCTION_REFUSED, STUDIO_STAGE_LABELS, currentStudioStage, studioStrategyClosed } from "./studio";
import { PIECE_KIND_LABELS, isImageKind } from "./studio-gates";

/** The agent (AI routing slot) that made a run. */
export const agentOfRun = (r: ResearchRun): string => r.stage === "studio" ? (r.capabilityId === "studio.image" ? "studio:image" : "studio:preproduction") : r.stage === "planning" ? "synthesis:planner" : r.stage === "medium" ? "synthesis:medium" : r.stage === "scope" ? "scope:business" : r.stage === "review" ? "review:" + String(r.capabilityId || "").replace("review.", "") : ((r.stage || "research") === "research" ? (r.segment ? "research:" + r.segment : "") : r.stage ? "synthesis:" + (r.stage === "insights" ? "insights" : r.stage === "strategy" ? "strategy" : r.stage === "formats" ? "formats" : r.stage === "ideas" ? "ideas" : r.stage === "audiences" ? "audiences" : "content") : "");

/** Dependency order for "Rerun failed agents": planning and scoping, research, reviews and drafting in the order the work flows, then studio. */
export const RERUN_ORDER: SlotId[] = [
  "synthesis:planner", "scope:business", "review:scope",
  "research:brand", "research:customer", "research:competitor", "research:creative", "research:adjacent", "research:trends", "research:video", "research:channel", "research:offer", "research:measurement",
  "review:sources", "synthesis:insights", "review:insights", "synthesis:medium", "synthesis:formats", "synthesis:audiences", "synthesis:strategy", "review:direction", "synthesis:ideas", "synthesis:content",
  "studio:preproduction", "studio:image",
];
/** The project task (task plan id) each agent does, where it has one. */
const SLOT_TASK: Partial<Record<SlotId, string>> = { "synthesis:planner": "planResearch", "synthesis:medium": "mediumSelection", "scope:business": "scope", "synthesis:insights": "draftInsights", "synthesis:strategy": "draftDirection", "synthesis:content": "draftCopyPack", "review:sources": "reviewSources", "review:insights": "reviewInsights", "review:direction": "reviewDirection" };
const TASK_SLOT: Record<string, SlotId> = { ...Object.fromEntries(Object.entries(SLOT_TASK).map(([slot, task]) => [task, slot as SlotId])),
  // Rows of the legacy run tracker (projects without a task plan).
  "insights-draft": "synthesis:insights", direction: "synthesis:strategy", "formats-suggest": "synthesis:formats", "audiences-suggest": "synthesis:audiences" };
export const taskOfSlot = (slot: SlotId): string | undefined => slot.startsWith("research:") ? slot : SLOT_TASK[slot];
/** The agent behind a task planner row (task plan id or legacy run tracker row id), if it is an AI agent. */
export const slotOfTask = (taskId: string): SlotId | undefined => (taskId.startsWith("research:") ? (taskId as SlotId) : TASK_SLOT[taskId]);

export type FailedPiece = { id: string; title: string; kind: string; runId: string; at: string; error: string; requestId?: string };
export type FailedAgent = {
  slot: SlotId;
  label: string;
  runId: string;
  at: string;
  /** The stored error of the failed run, as recorded (provider text is already redacted when stored). */
  error: string;
  /** Provider and model the failed run used. */
  provider: string;
  model: string;
  failure: FailureClass;
  taskId?: string;
  /** Studio slots: each piece whose latest generation failed (rerun one by one through the studio rerun path). */
  pieces?: FailedPiece[];
  /** Studio pre-production: the whole first draft failed (nothing is drafted yet). */
  wholeDraft?: boolean;
  canRerun: boolean;
  /** Why it cannot be rerun now, in plain English. */
  why?: string;
};

const byTime = (runs: ResearchRun[]) => runs.map((r, i) => ({ r, i })).sort((a, b) => a.r.at.localeCompare(b.r.at) || a.i - b.i).map((x) => x.r);
const briefKey = (b: unknown) => { const { logoData: _logo, ...rest } = (b || {}) as Record<string, unknown>; void _logo; return JSON.stringify(rest); };

/** The runs that count as this agent's runs for the project's current inputs, oldest first. */
function currentRuns(p: Project, slot: SlotId): ResearchRun[] {
  const plan = p.taskPlan;
  const own = p.runs.filter((r) => agentOfRun(r) === slot);
  let runs: ResearchRun[];
  if (slot.startsWith("research:")) runs = own.filter((r) => !plan || taskResearchCurrent(p, r));
  else if (slot === "synthesis:planner") runs = p.researchPlanning?.enabled ? own.filter((r) => r.planningContextKey === planningInputKey(p)) : [];
  else if (slot === "synthesis:medium") runs = own.filter((r) => r.planningContextKey === mediumEvidenceKey(p));
  else if (slot === "scope:business") runs = own.filter((r) => !r.contextSnapshot || briefKey(r.contextSnapshot) === briefKey(p.brief));
  else if (["synthesis:insights", "synthesis:strategy", "synthesis:content"].includes(slot) || slot.startsWith("review:")) runs = own.filter((r) => !plan || r.taskInputKey === plan.researchKey);
  else runs = own;
  return byTime(runs);
}

/** Studio slots: the failed pieces (latest run per piece failed, and no newer version since) and a failed whole first draft. */
function studioFailures(p: Project, slot: SlotId) {
  const s = p.studio;
  const runs = byTime(p.runs.filter((r) => agentOfRun(r) === slot));
  const pieces: FailedPiece[] = [];
  let wholeDraft: ResearchRun | undefined;
  let untagged: ResearchRun | undefined;
  if (!s) return { pieces, wholeDraft, untagged };
  const latestByPiece = new Map<string, ResearchRun>();
  for (const r of runs) if (r.pieceId) latestByPiece.set(r.pieceId, r);
  for (const [pieceId, r] of latestByPiece) {
    if (r.status !== "failed") continue;
    const piece = s.pieces.find((x) => x.id === pieceId);
    if (!piece) continue;
    const newest = piece.versions.at(-1);
    if (newest && newest.createdAt > (r.finishedAt || r.at)) continue;
    const request = r.rerunRequestId ? s.rerunRequests?.find((x) => x.id === r.rerunRequestId) : undefined;
    pieces.push({ id: piece.id, title: piece.title, kind: piece.kind, runId: r.id, at: r.finishedAt || r.at, error: r.error || "No reason recorded", ...(request ? { requestId: request.id } : {}) });
  }
  const untaggedRuns = runs.filter((r) => !r.pieceId);
  const lastUntagged = untaggedRuns.at(-1);
  const drafted = s.pieces.some((x) => x.stage === "preproduction" && !isImageKind(x.kind) && PIECE_KIND_LABELS[x.kind]);
  if (slot === "studio:preproduction" && lastUntagged?.status === "failed" && !drafted) wholeDraft = lastUntagged;
  // A failure recorded before runs named their piece (CHG-0100) can only be redone from the studio page.
  if (lastUntagged?.status === "failed" && lastUntagged === runs.at(-1) && !wholeDraft && (slot === "studio:image" || drafted)) untagged = lastUntagged;
  return { pieces: pieces.sort((a, b) => a.at.localeCompare(b.at)), wholeDraft, untagged };
}

/** Something waiting for this producer reviewer to decide; without it a rerun has nothing to review. */
function reviewWork(p: Project, gate: string): boolean {
  if (gate === "scope") return !!p.scope;
  if (gate === "sources") return p.sources.some((s) => s.kind === "public_source" && s.status === "unreviewed");
  if (gate === "insights") return p.insights.some((i) => i.status === "draft");
  if (gate === "direction") return p.strategies.at(-1)?.status === "draft";
  return false;
}

/** Why this agent cannot be rerun on this project right now, or undefined when it can. Mirrors the server's guards. */
function blockedReason(p: Project, slot: SlotId, authorised: boolean, f: { pieces?: FailedPiece[]; wholeDraft?: boolean; untagged?: boolean }): string | undefined {
  if (p.runs.some((r) => r.status === "running")) return "Another agent task is running for this project; wait for it to finish.";
  const s = p.studio;
  if (s && s.gates.intake.status !== "approved") return "Approve the studio intake (Stage 1) first.";
  if (!authorised) return "Authorise the project brief for AI providers first (Research room), then rerun.";
  const strategyWork = slot.startsWith("research:") || slot.startsWith("review:") || ["scope:business", "synthesis:insights", "synthesis:strategy", "synthesis:audiences", "synthesis:ideas"].includes(slot);
  if (s && strategyWork) { const closed = studioStrategyClosed(s); if (closed) return closed + "."; }
  if (slot === "synthesis:planner" || slot === "synthesis:medium") {
    if (s) return "Studio projects use the studio research set; AI research planning and medium selection are not used.";
    if (!p.researchPlanning?.enabled) return "AI research planning is off for this project.";
    if (p.strategies.length) return "Planning is locked after direction work begins.";
  }
  if (slot === "scope:business" && planningCurrent(p)) return "This project's research questions come from the AI research planner, so the scoping agent is not used now.";
  if (slot === "synthesis:formats" && s) return "The studio offer fixes the format; there is no format suggestion on a studio project.";
  if (slot === "synthesis:content" && s) return STUDIO_CLASSIC_PRODUCTION_REFUSED + ".";
  if (["synthesis:formats", "synthesis:audiences", "synthesis:ideas"].includes(slot) && p.taskPlan?.mode === "research") return "Campaign advisory agents are excluded from this research-only task plan.";
  if (slot.startsWith("review:") && !reviewWork(p, slot.slice(7))) return "Nothing is waiting for this reviewer now: the free checks decided when the model failed, and the work moved on. Its next review uses the current model.";
  if (slot === "studio:preproduction" || slot === "studio:image") {
    if (!s) return "This is not a studio project.";
    if (f.untagged && !f.pieces?.length && !f.wholeDraft) return "This failure was recorded before runs named their piece; draw or rerun the piece from the studio page.";
    const open = currentStudioStage(s);
    if (f.wholeDraft && open !== "preproduction") return "Pre-production is not the open stage.";
    for (const piece of f.pieces || []) {
      const stage = piece.kind === "still" ? "production" : "preproduction";
      if (open !== stage) return `${STUDIO_STAGE_LABELS[stage]} is not the open stage, so ${piece.title} cannot be redrawn.`;
    }
  }
  const taskId = taskOfSlot(slot);
  if (p.taskPlan && taskId) {
    const t = p.taskPlan.tasks.find((x) => x.id === taskId);
    if (!t || t.status === "skipped") return "This agent is excluded from the project task plan; revise the plan first.";
    if (t.status === "pending") return "Waiting for dependencies: " + t.dependsOn.map((id) => p.taskPlan!.tasks.find((x) => x.id === id)).filter((x) => x && !["done", "skipped"].includes(x.status)).map((x) => x!.title).join(", ") + ".";
  }
  return undefined;
}

/**
 * Each agent whose latest run for this project's current inputs failed, with the error, its class, the provider and model used, when,
 * and whether it can be rerun now. `authorised` is the project's provider consent (the server passes hasProviderConsent; pages pass
 * the project view's aiAuthorised). Sorted in dependency order.
 */
export function failedAgents(input: Project, opts: { authorised?: boolean } = {}): FailedAgent[] {
  const p = structuredClone(input);
  syncTaskPlan(p);
  const authorised = opts.authorised ?? p.aiAuthorised ?? true;
  const out: FailedAgent[] = [];
  for (const slot of RERUN_ORDER) {
    if (slot === "studio:preproduction" || slot === "studio:image") {
      const f = studioFailures(p, slot);
      const last = f.wholeDraft || (f.pieces.length ? p.runs.find((r) => r.id === f.pieces.at(-1)!.runId) : undefined) || f.untagged;
      if (!last) continue;
      const why = blockedReason(p, slot, authorised, { pieces: f.pieces, wholeDraft: !!f.wholeDraft, untagged: !!f.untagged });
      out.push({ slot, label: slotLabel(slot), runId: last.id, at: last.finishedAt || last.at, error: last.error || "No reason recorded", provider: last.provider, model: last.model, failure: classifyFailure(last.error || ""), ...(f.pieces.length ? { pieces: f.pieces } : {}), ...(f.wholeDraft ? { wholeDraft: true } : {}), canRerun: !why, ...(why ? { why } : {}) });
      continue;
    }
    const last = currentRuns(p, slot).at(-1);
    if (!last || last.status !== "failed") continue;
    const why = blockedReason(p, slot, authorised, {});
    const taskId = taskOfSlot(slot);
    out.push({ slot, label: slotLabel(slot), runId: last.id, at: last.finishedAt || last.at, error: last.error || "No reason recorded", provider: last.provider, model: last.model, failure: classifyFailure(last.error || ""), ...(taskId && p.taskPlan?.tasks.some((t) => t.id === taskId) ? { taskId } : {}), canRerun: !why, ...(why ? { why } : {}) });
  }
  return out;
}
/** The research segment of a research slot. */
export const segmentOf = (slot: SlotId) => slot.slice("research:".length) as Segment;

export type ProviderQuota = { provider: string; at: string; slot: string; message: string };
/**
 * Providers whose account looks out of quota: some agent's latest call to that provider (across the given projects) failed with a
 * quota error and no call to that provider has succeeded since. A later success clears it (quota is account-wide).
 */
export function providerQuota(projects: Project[]): ProviderQuota[] {
  const latest = new Map<string, ResearchRun>();
  const success = new Map<string, string>();
  for (const p of projects) for (const r of p.runs || []) {
    const slot = agentOfRun(r);
    if (!slot || r.status === "running") continue;
    const at = r.finishedAt || r.at;
    const key = slot + "|" + r.provider;
    const prev = latest.get(key);
    if (!prev || (prev.finishedAt || prev.at) <= at) latest.set(key, r);
    if (r.status === "completed" && (success.get(r.provider) || "") < at) success.set(r.provider, at);
  }
  const out = new Map<string, ProviderQuota>();
  for (const [key, r] of latest) {
    if (r.status !== "failed" || classifyFailure(r.error || "").kind !== "quota") continue;
    const at = r.finishedAt || r.at;
    if ((success.get(r.provider) || "") > at) continue;
    const prev = out.get(r.provider);
    if (!prev || prev.at < at) out.set(r.provider, { provider: r.provider, at, slot: key.split("|")[0], message: (r.error || "").slice(0, 300) });
  }
  return [...out.values()];
}
