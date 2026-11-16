import { segments, type Project, type ResearchRun, type Segment } from "./model";

export type TaskStatus = "pending" | "ready" | "running" | "blocked" | "waiting_approval" | "done" | "skipped" | "manual";
export type ProjectTask = {
  id: string; title: string; capability: string; dependsOn: string[]; status: TaskStatus;
  reason: string; acceptance: string[]; runIds: string[]; detail: string;
  completion?: { by: string; at: string; note: string };
};
export type TaskPlan = {
  version: number; createdAt: string; updatedBy: string; reason: string;
  /** Exact public input key. This is freshness data, never an authorisation token. */
  researchKey: string; inputKey: string; research: Segment[]; overrides?: Segment[]; overrideReason?: string;
  mode: "campaign" | "research"; tasks: ProjectTask[]; clarifications: string[];
  history: { version: number; at: string; by: string; reason: string; research: Segment[]; done: string[] }[];
};

export const researchInputKey = (p: Pick<Project, "brief" | "channels">) => {
  const { contact: _contact, logoData: _logo, brandColor: _colour, ...publicBrief } = p.brief;
  void _contact; void _logo; void _colour;
  return JSON.stringify({ brief: publicBrief, channels: [...(p.channels || [])].sort() });
};

/** Legacy campaigns retain the catalogue until an operator explicitly adopts a plan. */
export function selectedResearch(p: Pick<Project, "taskPlan">): Segment[] {
  return p.taskPlan ? [...p.taskPlan.research] : [...segments];
}
export function taskResearchCurrent(p: Project, run: ResearchRun): boolean {
  return !p.taskPlan || (!!run.taskInputKey && run.taskInputKey === p.taskPlan.researchKey && !!run.segment && p.taskPlan.research.includes(run.segment));
}
export function validateTaskGraph(tasks: { id: string; dependsOn: string[] }[]) {
  const byId = new Map(tasks.map(t => [t.id, t]));
  if (byId.size !== tasks.length) throw new Error("Duplicate task ID");
  const visited = new Set<string>(), visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("Task dependency cycle");
    if (visited.has(id)) return;
    const t = byId.get(id);
    if (!t) throw new Error("Unknown task dependency");
    visiting.add(id); t.dependsOn.forEach(visit); visiting.delete(id); visited.add(id);
  };
  tasks.forEach(t => visit(t.id));
}

function relevance(p: Project): Record<Segment, { selected: boolean; reason: string }> {
  const ask = `${p.brief.objective} ${p.brief.inspiration}`.toLowerCase().replace(/\b(?:no|without|not)\s+(?:any\s+)?(?:video|motion|animation)\b/g, "");
  const campaign = p.brief.workRequest !== "research";
  const formats = p.formats?.decidedAt ? p.formats.selected : p.brief.requestedFormats || [];
  const video = formats.length ? formats.some(f => /video|motion/.test(f)) : /\b(video|animation|animated|film|reels?|shorts?|tiktok|youtube)\b/.test(ask) || (p.channels || []).some(c => ["tiktok", "youtube"].includes(c));
  const social = (p.channels || []).some(c => ["instagram", "facebook", "tiktok", "youtube", "pinterest", "reddit"].includes(c)) || /\b(social|trends?|trending|tiktok|instagram|youtube|reels?)\b/.test(ask);
  const competitor = campaign || !!p.brief.competitors.trim() || /\b(competitor|competition|positioning|market|alternatives?)\b/.test(ask);
  const creative = campaign || /\b(creative|campaign|advert|design|content|hooks?)\b/.test(ask);
  const adjacent = /\b(adjacent|parallel|cross-category|cross category|complementary|inspiration beyond)\b/.test(ask);
  return {
    brand: { selected: true, reason: "Establish the customer's offer and source-backed business facts." },
    customer: { selected: true, reason: "Understand the intended audience, needs and objections." },
    competitor: { selected: competitor, reason: competitor ? "Positioning, named rivals or campaign differentiation require competitor evidence." : "No competitor or positioning question is requested." },
    creative: { selected: creative, reason: creative ? "The requested creative work needs formats, hooks and reference principles." : "The request is research and insights without creative development." },
    adjacent: { selected: adjacent, reason: adjacent ? "The brief explicitly asks for adjacent or cross-category inspiration." : "No adjacent-category question is requested; avoid an unrelated research call." },
    trends: { selected: social, reason: social ? "The requested channels or brief call for current social patterns." : "No social trend requirement or relevant launch channel is specified." },
    video: { selected: video, reason: video ? "The brief or chosen formats explicitly require video or motion craft." : "No video or motion deliverable is requested." },
  };
}

/** Build a versioned bounded plan from trusted capability choices, never executable brief text. */
export function planProject(p: Project, actor: string, reason: string, override?: Segment[]): boolean {
  const previous = p.taskPlan;
  const researchKey = researchInputKey(p);
  const overrides = override ?? (previous?.researchKey === researchKey ? previous.overrides : undefined);
  if (overrides && (!overrides.length || overrides.some(s => !segments.includes(s)) || !overrides.includes("brand") || !overrides.includes("customer"))) throw new Error("Research selection must include brand and customer and known research agents only");
  const overrideReason = override ? reason : overrides ? previous?.overrideReason || previous?.reason : undefined;
  const decisions = relevance(p);
  const research = segments.filter(s => overrides ? overrides.includes(s) : decisions[s].selected);
  const mode = p.brief.workRequest === "research" ? "research" : "campaign";
  const inputKey = JSON.stringify([researchKey, p.formats?.selected || [], research, mode, overrideReason || null]);
  if (previous?.inputKey === inputKey) { syncTaskPlan(p); return false; }
  if (previous && previous.researchKey !== researchKey) {
    for (const s of p.sources) s.status = "rejected";
    for (const i of p.insights) i.status = "rejected";
    delete p.scope;
    if (p.producerAgent) { delete p.producerAgent.hold; delete p.producerAgent.pending; p.producerAgent.researchRetries = {}; }
  }
  const tasks: ProjectTask[] = [];
  const add = (id: string, title: string, capability: string, dependsOn: string[], why: string) => tasks.push({ id, title, capability, dependsOn, reason: why, status: "pending", acceptance: ["Current inputs and approved evidence only", "Existing authorisation, budget and review gates pass"], runIds: [], detail: "" });
  add("scope", "Scope the customer request", "scope.business", [], "Match research questions to the customer's business and requirements.");
  for (const s of segments) {
    add("research:" + s, `${s[0].toUpperCase() + s.slice(1)} research`, "research." + s, ["scope"], overrides ? (research.includes(s) ? "Producer selected: " : "Producer excluded: ") + (overrideReason || reason) : decisions[s].reason);
    if (!research.includes(s)) tasks.at(-1)!.status = "skipped";
  }
  add("reviewSources", "Review research evidence", "review.sources", research.map(s => "research:" + s), "Decide which sources can support the customer's work.");
  add("draftInsights", "Draft evidence-backed insights", "analysis.insights", ["reviewSources"], "Interpret accepted findings for the customer's objective.");
  add("reviewInsights", "Review insights", "review.insights", ["draftInsights"], "Accept interpretations before they guide deliverables.");
  if (mode === "campaign") {
    add("formats", "Choose campaign formats", "human.formats", ["reviewInsights"], "A producer confirms the deliverables required for this customer.");
    add("draftDirection", "Draft campaign direction", "drafting.direction", ["formats"], "Develop the approved deliverable types from accepted insights.");
    add("reviewDirection", "Review campaign direction", "review.direction", ["draftDirection"], "Check relevance, evidence and unsupported claims.");
    add("approveDirection", "Approve campaign direction", "human.direction", ["reviewDirection"], "Existing version-specific customer approval policy applies.");
    add("produce", "Create selected production drafts", "orchestration.production", ["approveDirection"], "Produce only formats selected for this campaign.");
    const selected = p.formats?.decidedAt ? p.formats.selected : p.brief.requestedFormats || [];
    if (selected.includes("static")) add("production:svg", "Create static artwork", "production.visual", ["produce"], "Static artwork is a selected deliverable.");
    if (selected.some(f => ["motion", "video_short", "video_long", "video_ugc"].includes(f))) add("production:motion", "Create motion storyboard and grid", "production.motion", ["produce"], "The selected motion or video format needs a storyboard concept.");
    if (selected.some(f => ["written_ad", "written_long", "video_short", "video_long", "video_ugc"].includes(f))) add("production:copy", "Create copy and script concept", "production.copy", ["produce"], "The selected written or video format needs a copy or script concept.");
    if (selected.some(f => ["written_ad", "written_long"].includes(f))) add("draftCopyPack", "Draft channel copy pack", "drafting.content", ["produce"], "The selected written formats need evidence-backed copy.");
    const unsupported = selected.filter(f => !["static", "motion", "written_ad"].includes(f));
    for (const f of unsupported) add("manual:" + f, `Complete ${f.replaceAll("_", " ")}`, "human.production", ["approveDirection"], "This full deliverable needs a producer; a copy concept is not a finished output.");
    add("shareAssets", "Share production drafts", "human.share", ["produce", ...tasks.filter(t => t.id.startsWith("production:")).map(t => t.id), ...(tasks.some(t => t.id === "draftCopyPack") ? ["draftCopyPack"] : [])], "Share drafts through existing audited commands.");
    add("assetApproval", "Approve final assets", "human.assets", ["shareAssets"], "The customer approves each current asset version before delivery.");
  }
  validateTaskGraph(tasks);
  const history = previous ? [...previous.history, { version: previous.version, at: previous.createdAt, by: previous.updatedBy, reason: previous.reason, research: previous.research, done: previous.tasks.filter(t => t.status === "done").map(t => t.id) }].slice(-10) : [];
  p.taskPlan = { version: (previous?.version || 0) + 1, createdAt: new Date().toISOString(), updatedBy: actor, reason, researchKey, inputKey, research, ...(overrides ? { overrides: [...research], overrideReason } : {}), mode, tasks, history, clarifications: mode === "campaign" && !p.formats?.decidedAt ? ["Confirm the campaign deliverables at the format decision before direction work."] : [] };
  syncTaskPlan(p);
  return true;
}

/** Reconstruct persisted task state from authoritative run, review and approval records. */
export function syncTaskPlan(p: Project) {
  const plan = p.taskPlan;
  if (!plan) return;
  const d = p.strategies.at(-1);
  const currentRuns = p.runs.filter(r => r.stage === "scope" || r.taskInputKey === plan.researchKey);
  const sources = p.sources.filter(s => s.status !== "rejected");
  const acceptedInsights = p.insights.filter(i => (i.status || "reviewed") === "reviewed");
  const assets = d ? p.assets.filter(a => a.strategyHash === d.hash) : [];
  for (const t of plan.tasks) {
    if (t.id.startsWith("research:") && !plan.research.includes(t.id.slice(9) as Segment)) { t.status = "skipped"; continue; }
    const stage = ({ scope: "scope", draftInsights: "insights", draftDirection: "strategy", draftCopyPack: "content" } as Record<string, string>)[t.id];
    const runs = currentRuns.filter(r => t.id.startsWith("research:") ? (r.stage || "research") === "research" && r.segment === t.id.slice(9) : (!!stage && r.stage === stage) || (r.stage === "review" && r.capabilityId === t.capability));
    t.runIds = runs.map(r => r.id);
    t.detail = "";
    let done = false;
    if (t.id === "scope") done = !!p.scope;
    else if (t.id.startsWith("research:")) done = runs.at(-1)?.status === "completed";
    else if (t.id === "reviewSources") done = sources.some(s => s.status === "supported") && !sources.some(s => s.kind === "public_source" && s.status === "unreviewed");
    else if (t.id === "draftInsights") done = p.insights.some(i => i.status !== "rejected");
    else if (t.id === "reviewInsights") done = !!acceptedInsights.length && !p.insights.some(i => i.status === "draft");
    else if (t.id === "formats") done = !!p.formats?.decidedAt;
    else if (t.id === "draftDirection") done = !!d && d.status !== "changes_requested";
    else if (t.id === "reviewDirection") done = !!d && (d.status === "shared" || d.status === "approved" || !!p.reviews?.some(r => r.gate === "direction" && r.subject === d.hash && r.verdict === "pass"));
    else if (t.id === "approveDirection") done = d?.status === "approved";
    else if (t.id === "produce") done = !!d && p.tasks.some(task => task.strategyId === d.id);
    else if (t.id.startsWith("production:")) done = assets.some(a => a.kind === t.id.slice(11));
    else if (t.id === "draftCopyPack") done = assets.some(a => a.title === "AI copy pack");
    else if (t.id === "shareAssets") done = !!assets.length && assets.every(a => a.status !== "draft");
    else if (t.id === "assetApproval") done = !!assets.length && assets.every(a => a.status === "approved");
    else if (t.id.startsWith("manual:")) done = !!t.completion;
    const hold = p.producerAgent?.hold;
    if (hold && ({ sources: "reviewSources", insights: "reviewInsights", direction: "reviewDirection", scope: "scope" }[hold.gate] === t.id)) {
      t.status = "blocked"; t.detail = hold.notes; continue;
    }
    const pending = p.producerAgent?.pending?.gate;
    if ((pending === "insights" && ["draftInsights", "reviewInsights"].includes(t.id)) || (pending === "direction" && ["draftDirection", "reviewDirection"].includes(t.id))) done = false;
    const dependencies = t.dependsOn.every(id => ["done", "skipped"].includes(plan.tasks.find(x => x.id === id)!.status));
    if (runs.some(r => r.status === "running")) { t.status = "running"; t.detail = "Agent execution is in progress"; }
    else if (done && dependencies) t.status = "done";
    else if (!dependencies) { t.status = "pending"; t.detail = "Waiting for dependencies"; }
    else if (runs.at(-1)?.status === "failed") { t.status = "blocked"; t.detail = runs.at(-1)!.error || "Execution failed; a producer must decide whether to retry"; }
    else if (t.id.startsWith("manual:")) { t.status = "manual"; t.detail = t.reason; }
    else if (t.id === "approveDirection" || t.id === "assetApproval") { t.status = "waiting_approval"; t.detail = "Waiting for the existing approval gate"; }
    else if (t.id === "formats") { t.status = "manual"; t.detail = "A producer must choose the campaign formats"; }
    else { t.status = "ready"; t.detail = "Ready when authorisation and execution controls pass"; }
  }
}

export function nextReadyTask(p: Project): ProjectTask | undefined {
  syncTaskPlan(p);
  return p.taskPlan?.tasks.find(t => t.status === "ready");
}

/** Explicit operator retries are permitted; dependencies and selection can never be bypassed. */
export function requirePlannedTask(p: Project, id: string) {
  if (!p.taskPlan) return;
  syncTaskPlan(p);
  const t = p.taskPlan.tasks.find(t => t.id === id);
  if (!t || t.status === "skipped") throw new Error("Agent is excluded from the selected project task plan");
  if (t.status === "pending") throw new Error("Task dependencies are not complete: " + t.title);
}
