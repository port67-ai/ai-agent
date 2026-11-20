import { isThinResearchHold, syncTaskPlan } from "./task-plan";
import type { Project, Segment } from "./model";
import { MIN_ACCEPTED_PER_SEGMENT, thinResearchSegments } from "./producer-reviews";

// Where a project is in its run: what has run, what is running, what is paused and what is waiting for an approval. Computed from the
// project, never stored. `tab` names the page where the person acts (the portal turns it into a link).
export type StepState = "done" | "running" | "paused" | "waiting_approval" | "ready" | "pending";
/** Who has to act: the AI is working ("AI"), or a producer or admin must press something ("Producer"). Done and not-yet-started steps have no actor. */
export type Who = "AI" | "Producer";
/** "agent": an AI agent does the work. "review": a person reviews, chooses or approves. */
export type StepKind = "agent" | "review";
export type AiStage = "insights" | "formats" | "audiences" | "strategy" | "content";
export type StepAct = "share_direction" | "approve_direction" | "review_sources" | "review_insights";
/** `ai` names an AI generation a producer can start from the row; `act` names a human decision (share or approve) the row can take. */
export type TrackStep = { id: string; label: string; state: StepState; detail: string; tab?: "research" | "direction" | "assets" | "advert"; ai?: AiStage; act?: StepAct; who?: Who; kind?: StepKind; anchor?: string; no?: string; taskId?: string };
const SEGS: Segment[] = ["brand", "customer", "competitor", "creative", "adjacent", "trends", "video"];
const CORE = new Set<Segment>(["brand", "customer", "competitor", "creative"]);

export function runTracker(p: Project): TrackStep[] {
  if (p.taskPlan) {
    const copy = structuredClone(p);
    syncTaskPlan(copy);
    const states = { done: "done", running: "running", blocked: "paused", waiting_approval: "waiting_approval", pending: "pending", ready: "ready", manual: "paused", skipped: "pending" } as const;
    const PEOPLE = new Set(["reviewSources", "reviewInsights", "formats", "approveDirection", "shareAssets", "assetApproval"]);
    const rows = copy.taskPlan!.tasks.filter(t => t.status !== "skipped").map((t): TrackStep => {
      const tab = t.id.startsWith("research:") || ["planResearch", "scope", "reviewSources", "draftInsights", "reviewInsights"].includes(t.id) ? "research" : ["mediumSelection", "formats", "draftDirection", "reviewDirection", "approveDirection"].includes(t.id) ? "direction" : "assets";
      const ai = ({ draftInsights: "insights", draftDirection: "strategy", draftCopyPack: "content" } as const)[t.id as "draftInsights" | "draftDirection" | "draftCopyPack"];
      const act = t.id === "reviewSources" && p.sources.some(s => s.status === "unreviewed") ? "review_sources" : t.id === "reviewInsights" && p.insights.some(i => i.status === "draft") ? "review_insights" : t.id === "approveDirection" && p.strategies.at(-1)?.status === "shared" ? "approve_direction" : undefined;
      const kind: StepKind = PEOPLE.has(t.id) || t.id.startsWith("manual:") ? "review" : "agent";
      const state = states[t.status];
      const thin = t.id === "reviewSources" && t.status === "done" ? thinResearchSegments(copy) : [];
      const detail = t.status === "ready" ? "Ready: press Run ready tasks" : thin.length ? `Warning: fewer than ${MIN_ACCEPTED_PER_SEGMENT} accepted sources for ${thin.join(", ")} (thin research; work continues)` : t.detail || t.reason;
      const anchor = t.id === "formats" ? "formats-anchor" : t.id === "approveDirection" || t.id === "reviewDirection" ? "approval-anchor" : undefined;
      return { id: t.id, taskId: t.id, label: t.title, state, detail, tab, kind, anchor, who: state === "running" ? "AI" : state === "paused" || state === "waiting_approval" || state === "ready" ? "Producer" : undefined, ...(ai && ["ready", "blocked"].includes(t.status) ? { ai } : {}), ...(act ? { act } : {}) };
    });
    return numberSteps(rows);
  }
  const out: TrackStep[] = [];
  const st = p.producerAgent;
  const runs = p.runs || [];
  const runningStage = (stage: string, seg?: string) => runs.some((r) => r.status === "running" && (r.stage || "research") === stage && (!seg || r.segment === seg));
  const step = (id: string, label: string, state: StepState, detail: string, tab?: TrackStep["tab"], extra: { ai?: AiStage; act?: StepAct } = {}) => out.push({ id, label, state, detail, tab, ...extra });

  step("scope", "Scoping", runningStage("scope") ? "running" : p.scope ? "done" : "pending", p.scope ? `Classified as ${p.scope.classification.category}` : "Not classified yet");
  for (const seg of SEGS) {
    if (!CORE.has(seg) && !runs.some((r) => (r.stage || "research") === "research" && r.segment === seg)) continue;
    const last = runs.filter((r) => (r.stage || "research") === "research" && r.segment === seg).at(-1);
    const n = p.sources.filter((s) => s.segment === seg && s.kind === "public_source").length;
    step("research:" + seg, `Research: ${seg}`, runningStage("research", seg) ? "running" : last?.status === "completed" ? "done" : last?.status === "failed" ? "paused" : "pending",
      last?.status === "failed" ? "Failed: run it again" : last ? `${n} sources` : p.researchRequest ? "Queued" : "Not started", "research");
  }
  const unreviewed = p.sources.filter((s) => s.status === "unreviewed").length;
  const anyPublic = p.sources.some((s) => s.kind === "public_source");
  // A hold is the AI producer's note from an earlier pass. It only counts while what it names is still open: a person may have decided the sources since.
  const shortSegments = thinResearchSegments(p);
  // Thin research (fewer than MIN_ACCEPTED_PER_SEGMENT accepted sources) is a warning, never a pause (CHG-0098).
  const srcHold = st?.hold?.gate === "sources" && !isThinResearchHold(st.hold) && unreviewed > 0;
  const thinWarning = shortSegments.length ? `. Warning: fewer than ${MIN_ACCEPTED_PER_SEGMENT} accepted sources for ${shortSegments.join(", ")} (thin research; work continues)` : "";
  step("sources", "Source review", runningStage("review") && unreviewed ? "running" : !anyPublic ? "pending" : srcHold ? "paused" : unreviewed ? "paused" : "done",
    srcHold ? `${unreviewed} of ${p.sources.filter((x) => x.kind === "public_source").length} sources are waiting for you (the AI source producer left them undecided)` : unreviewed ? `${unreviewed} sources await review` : anyPublic ? "All sources decided" + thinWarning : "Waiting for research", "research", unreviewed ? { act: "review_sources" } : {});
  const drafts = p.insights.filter((i) => i.status === "draft").length;
  const reviewed = p.insights.filter((i) => (i.status || "reviewed") === "reviewed").length;
  const readyToDraft = !p.insights.length && anyPublic && !unreviewed;
  step("insights-draft", "Insight drafting", runningStage("insights") ? "running" : p.insights.length ? "done" : readyToDraft ? "paused" : "pending",
    p.insights.length ? `${p.insights.length} insights drafted` : readyToDraft ? "Ready: press Draft insights with AI" : "After the source review", "research", readyToDraft ? { ai: "insights" } : {});
  step("insights", "Insight review", reviewed && !drafts ? "done" : drafts ? "paused" : "pending",
    st?.hold?.gate === "insights" && drafts ? st.hold.notes : drafts ? `${drafts} draft insights await review` : reviewed ? `${reviewed} accepted` : "After insight drafting", "research", drafts ? { act: "review_insights" } : {});
  step("formats-suggest", "Ad format suggestions", p.formats?.suggestedAt || p.formats?.decidedAt ? "done" : reviewed ? "paused" : "pending",
    p.formats?.suggestedAt || p.formats?.decidedAt ? "Suggested" : reviewed ? "Ready: press Suggest formats with AI" : "After the insight review", "direction", reviewed && !p.formats?.suggestedAt && !p.formats?.decidedAt ? { ai: "formats" } : {});
  step("formats", "Choose ad formats", p.formats?.decidedAt ? "done" : reviewed ? "paused" : "pending", p.formats?.decidedAt ? `${p.formats.selected.length} chosen` : reviewed ? "A producer must choose the formats" : "After the insight review", "direction");
  step("audiences-suggest", "Strapline and audience suggestions", p.audienceSuggestion || p.audiences?.strapline ? "done" : p.formats?.decidedAt ? "paused" : "pending",
    p.audienceSuggestion || p.audiences?.strapline ? "Suggested" : p.formats?.decidedAt ? "Ready: press Suggest strapline and audiences with AI" : "After the ad formats", "direction", p.formats?.decidedAt && !p.audienceSuggestion && !p.audiences?.strapline ? { ai: "audiences" } : {});
  step("audiences", "Choose strapline and audiences", p.audiences?.strapline ? "done" : p.formats?.decidedAt ? "paused" : "pending", p.audiences?.strapline ? `${p.audiences.segments.length} segments saved` : p.formats?.decidedAt ? "Choose a strapline and audience segments" : "After the ad formats", "direction");
  const d = p.strategies.at(-1);
  const strategyFail = runs.filter((r) => r.stage === "strategy").at(-1);
  const failedDraft = !d && strategyFail?.status === "failed";
  step("direction", "Campaign direction", runningStage("strategy") ? "running" : failedDraft ? "paused" : !d ? "pending" : d.status === "draft" ? (st?.hold?.gate === "direction" ? "paused" : "running") : d.status === "changes_requested" ? "paused" : "done",
    failedDraft ? `Last draft failed: ${(strategyFail!.error || "no reason recorded").slice(0, 160)}` : !d ? "Not drafted yet" : d.status === "draft" ? (st?.hold?.gate === "direction" ? st.hold.notes : "Draft in producer review") : d.status === "changes_requested" ? "Customer asked for changes" : `Version ${d.version} ${d.status}`, "direction", !d || d.status === "changes_requested" ? { ai: "strategy" } : {});
  step("direction-approval", "Direction approval", d?.status === "approved" ? "done" : d?.status === "shared" ? "waiting_approval" : "pending",
    d?.status === "shared" ? "Waiting for a producer to approve (on the customer's behalf)" : d?.status === "approved" ? `Approved by ${d.approvedBy || "a producer"}` : "Not shared yet", "direction", d?.status === "shared" ? { act: "approve_direction" } : {});
  const mine = d ? p.assets.filter((x) => x.strategyHash === d.hash) : [];
  step("production", "Production drafts", runningStage("content") ? "running" : mine.length ? "done" : d?.status === "approved" ? "paused" : "pending", mine.length ? `${mine.length} assets` : d?.status === "approved" ? "Create the production drafts" : "After direction approval", "assets", d?.status === "approved" && !mine.length ? { ai: "content" } : {});
  const waiting = mine.filter((x) => x.status === "shared").length;
  const approved = mine.filter((x) => x.status === "approved").length;
  step("asset-approval", "Asset approval", mine.length && approved === mine.length ? "done" : waiting ? "waiting_approval" : mine.some((x) => x.status === "changes_requested") ? "paused" : "pending",
    waiting ? `${waiting} assets await a producer's approval` : mine.length ? `${approved} of ${mine.length} approved` : "After production", "assets");
  if (p.advert) step("advert", "Video advert", p.advert.status === "approved" ? "done" : p.advert.status === "shared" ? "waiting_approval" : "paused", `Treatment v${p.advert.version} ${p.advert.status.replace("_", " ")}`, "advert");
  const REVIEW = new Set(["sources", "insights", "formats", "audiences", "direction-approval", "asset-approval", "advert"]);
  const ANCHOR: Record<string, string> = { formats: "formats-anchor", "formats-suggest": "formats-anchor", audiences: "audiences-anchor", "audiences-suggest": "audiences-anchor", "direction-approval": "approval-anchor" };
  for (const x of out) { x.kind = REVIEW.has(x.id) ? "review" : "agent"; x.anchor = ANCHOR[x.id]; }
  for (const x of out) x.who = x.state === "running" ? "AI" : x.state === "paused" || x.state === "waiting_approval" ? "Producer" : undefined;
  return numberSteps(out);
}

/** 1, 2, 3 for the main steps; 3A, 3B, 3C for the parallel research agents and for the production items under their parent. */
export function numberSteps(rows: TrackStep[]): TrackStep[] {
  let n = 0;
  let letter = 0;
  let group = "";
  for (const r of rows) {
    const g = r.id.startsWith("research:") ? "research" : r.id.startsWith("production:") || r.id === "draftCopyPack" || r.id.startsWith("manual:") ? "production" : "";
    if (g && g === group) { letter++; r.no = `${n}${String.fromCharCode(65 + letter)}`; continue; }
    if (g === "research") { n++; letter = 0; group = g; r.no = `${n}A`; continue; }
    if (g === "production") { letter = 0; group = g; r.no = `${n}A`; continue; }
    n++; letter = 0; group = ""; r.no = String(n);
  }
  return rows;
}

export type NextAction = { id: string; label: string; who: Who | "Nobody"; text: string; tab?: TrackStep["tab"] };
/** The one thing to do next: the first step that needs a person, else the step the AI is running, else the first one not started, else finished. */
export function nextAction(steps: TrackStep[]): NextAction {
  const need = steps.find((x) => x.state === "paused" || x.state === "waiting_approval");
  if (need) return { id: need.id, label: need.label, who: "Producer", text: need.detail, tab: need.tab };
  const run = steps.find((x) => x.state === "running");
  if (run) return { id: run.id, label: run.label, who: "AI", text: `${run.label} is running. Nothing to press.` };
  const ready = steps.find((x) => x.state === "ready");
  if (ready) return { id: ready.id, label: ready.label, who: "Producer", text: `Press Run ready tasks to start ${ready.label}.`, tab: ready.tab };
  const todo = steps.find((x) => x.state === "pending");
  if (todo) return { id: todo.id, label: todo.label, who: "Nobody", text: `Next stage: ${todo.label}. ${todo.detail}` };
  return { id: "done", label: "Finished", who: "Nobody", text: "Every stage is done." };
}
