import { performanceHistory, performanceContextKey } from "./performance";
import { segments, type Project, type Segment } from "./model";

export function publicPlanningBrief(p: Project) {
  const { contact: _contact, logoData, ...brief } = p.brief;
  void _contact;
  return { ...brief, logoSupplied: !!logoData };
}
export const planningInputKey = (p: Project) => JSON.stringify({ brief: publicPlanningBrief(p), channels: [...(p.channels || [])].sort(), ...(performanceHistory(p).length ? { performance: performanceContextKey(p) } : {}) });
/** Once direction work locks planning, new result reports belong to the next campaign.
 * All other brief, plan and source/insight freshness checks remain in force. */
function withoutPerformance(key: string): string {
  try { const data = JSON.parse(key); delete data.performance; if (typeof data.input === "string") data.input = withoutPerformance(data.input); return JSON.stringify(data); }
  catch { return key; }
}
const contextMatches = (p: Project, previous: string | undefined, current: string) => !!previous && (previous === current || (p.strategies.length > 0 && withoutPerformance(previous) === withoutPerformance(current)));
export const planningContextCurrent = (p: Project) => contextMatches(p, p.researchPlanning?.inputKey, planningInputKey(p));
export const planningCurrent = (p: Project) => p.researchPlanning?.status === "completed" && planningContextCurrent(p);
export function effectiveResearchDecision(p: Project, segment: Segment) {
  const decision = planningCurrent(p) ? p.researchPlanning!.proposal!.agents.find(a => a.segment === segment) : undefined;
  if (decision && segment === "video" && !decision.selected && p.formats?.decidedAt && p.formats.selected.some(f => /video|motion/.test(f))) return { ...decision, selected: true, reason: "Producer confirmed a video or motion deliverable; targeted craft evidence is now a required dependency.", questions: ["Which public video references fit the confirmed formats, audience and campaign objective?", "What cited evidence describes hook, pacing, motion, visual treatment and audio, and what requires direct viewing?"], methods: ["video_provenance" as const], sourceTypes: ["Public reference videos and production breakdowns"], avoid: ["Unverified visual observations and performance claims"], maxPages: 6 };
  return decision;
}
export const researchTaskKey = (p: Project, segment: Segment) => {
  const decision = effectiveResearchDecision(p, segment);
  return decision ? JSON.stringify({ questions: decision.questions, methods: decision.methods, sourceTypes: decision.sourceTypes, avoid: decision.avoid, maxPages: decision.maxPages }) : "";
};
export const planningScopeKey = (p: Project) => JSON.stringify(segments.map(segment => [segment, researchTaskKey(p, segment)]));
export const mediumEvidenceKey = (p: Project) => JSON.stringify({ ...(performanceHistory(p).length ? { performance: performanceContextKey(p) } : {}), input: planningInputKey(p), plan: p.researchPlanning?.version || 0, sources: p.sources.filter(s => s.status === "supported" && s.kind === "public_source").map(s => [s.id, s.excerpt, s.findings, s.url]), insights: p.insights.filter(i => (i.status || "reviewed") === "reviewed").map(i => [i.id, i.interpretation, i.sourceIds, i.confidence]) });
export const mediumContextCurrent = (p: Project) => contextMatches(p, p.mediumSelection?.evidenceKey, mediumEvidenceKey(p));
export const mediumCurrent = (p: Project) => p.mediumSelection?.status === "completed" && mediumContextCurrent(p);
