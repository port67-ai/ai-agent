import type { Project, Segment } from "./model";

// Where a project is in its run: what has run, what is running, what is paused and what is waiting for an approval. Computed from the
// project, never stored. `tab` names the page where the person acts (the portal turns it into a link).
export type StepState = "done" | "running" | "paused" | "waiting_approval" | "pending";
export type AiStage = "insights" | "formats" | "audiences" | "strategy" | "content";
export type StepAct = "share_direction" | "approve_direction";
/** `ai` names an AI generation a producer can start from the row; `act` names a human decision (share or approve) the row can take. */
export type TrackStep = { id: string; label: string; state: StepState; detail: string; tab?: "research" | "direction" | "assets" | "advert"; ai?: AiStage; act?: StepAct };
const SEGS: Segment[] = ["brand", "customer", "competitor", "creative", "adjacent", "trends", "video"];
const CORE = new Set<Segment>(["brand", "customer", "competitor", "creative"]);

export function runTracker(p: Project): TrackStep[] {
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
  const srcHold = st?.hold?.gate === "sources";
  step("sources", "Source review", runningStage("review") && unreviewed ? "running" : !anyPublic ? "pending" : srcHold ? "paused" : unreviewed ? "paused" : "done",
    srcHold ? st!.hold!.notes : unreviewed ? `${unreviewed} sources await review` : anyPublic ? "All sources decided" : "Waiting for research", "research");
  const drafts = p.insights.filter((i) => i.status === "draft").length;
  const reviewed = p.insights.filter((i) => (i.status || "reviewed") === "reviewed").length;
  step("insights", "Insight review", runningStage("insights") ? "running" : reviewed && !drafts ? "done" : st?.hold?.gate === "insights" ? "paused" : drafts ? "paused" : "pending",
    st?.hold?.gate === "insights" ? st.hold.notes : drafts ? `${drafts} draft insights await review` : reviewed ? `${reviewed} accepted` : "Not drafted yet", "research", !p.insights.length && anyPublic && !unreviewed ? { ai: "insights" } : {});
  step("formats", "Ad formats", p.formats?.decidedAt ? "done" : reviewed ? "paused" : "pending", p.formats?.decidedAt ? `${p.formats.selected.length} chosen` : reviewed ? "A producer must choose the formats" : "After the insight review", "direction", reviewed && !p.formats?.decidedAt ? { ai: "formats" } : {});
  step("audiences", "Strapline and audiences", p.audiences?.strapline ? "done" : p.formats?.decidedAt ? "paused" : "pending", p.audiences?.strapline ? `${p.audiences.segments.length} segments saved` : p.formats?.decidedAt ? "Choose a strapline and audience segments" : "After the ad formats", "direction", p.formats?.decidedAt && !p.audiences?.strapline ? { ai: "audiences" } : {});
  const d = p.strategies.at(-1);
  const strategyFail = runs.filter((r) => r.stage === "strategy").at(-1);
  const failedDraft = !d && strategyFail?.status === "failed";
  step("direction", "Campaign direction", runningStage("strategy") ? "running" : failedDraft ? "paused" : !d ? "pending" : d.status === "draft" ? (st?.hold?.gate === "direction" ? "paused" : "running") : d.status === "changes_requested" ? "paused" : "done",
    failedDraft ? `Last draft failed: ${(strategyFail!.error || "no reason recorded").slice(0, 160)}` : !d ? "Not drafted yet" : d.status === "draft" ? (st?.hold?.gate === "direction" ? st.hold.notes : "Draft in producer review") : d.status === "changes_requested" ? "Customer asked for changes" : `Version ${d.version} ${d.status}`, "direction", !d || d.status === "changes_requested" ? { ai: "strategy" } : {});
  step("direction-approval", "Direction approval", d?.status === "approved" ? "done" : d?.status === "shared" ? "waiting_approval" : "pending",
    d?.status === "shared" ? "Waiting for the account owner to approve" : d?.status === "approved" ? `Approved by ${d.approvedBy || "the account owner"}` : "Not shared yet", "direction", d?.status === "shared" ? { act: "approve_direction" } : {});
  const mine = d ? p.assets.filter((x) => x.strategyHash === d.hash) : [];
  step("production", "Production drafts", runningStage("content") ? "running" : mine.length ? "done" : d?.status === "approved" ? "paused" : "pending", mine.length ? `${mine.length} assets` : d?.status === "approved" ? "Create the production drafts" : "After direction approval", "assets", d?.status === "approved" && !mine.length ? { ai: "content" } : {});
  const waiting = mine.filter((x) => x.status === "shared").length;
  const approved = mine.filter((x) => x.status === "approved").length;
  step("asset-approval", "Asset approval", mine.length && approved === mine.length ? "done" : waiting ? "waiting_approval" : mine.some((x) => x.status === "changes_requested") ? "paused" : "pending",
    waiting ? `${waiting} assets await the account owner` : mine.length ? `${approved} of ${mine.length} approved` : "After production", "assets");
  if (p.advert) step("advert", "Video advert", p.advert.status === "approved" ? "done" : p.advert.status === "shared" ? "waiting_approval" : "paused", `Treatment v${p.advert.version} ${p.advert.status.replace("_", " ")}`, "advert");
  return out;
}
