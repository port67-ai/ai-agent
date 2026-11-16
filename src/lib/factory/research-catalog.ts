import type { Project, Segment } from './model';
import { selectedResearch } from './task-plan';
import type { SegmentScope } from './scope';

export const RESEARCH_LABELS: Record<Segment, string> = {
  brand: 'Business and brand', customer: 'Customer insight', competitor: 'Competitor intelligence', creative: 'Creative research',
  adjacent: 'Adjacent businesses', trends: 'Social trends', video: 'Video language',
};
export const RESEARCH_FOCUS = {
  adjacent: 'Investigate complementary, adjacent and parallel businesses sharing the audience, purchase occasion or customer journey, not just direct rivals. Name the adjacency, cite concrete campaigns and explain the mechanism that could transfer, its limits and a counterexample. Separate observed practice from proposed adaptation.',
  trends: 'Investigate what is currently emerging on the selected social channels. Use dated individual posts, platform trend reports and repeat examples; record publication/observation dates and actual visible metrics with their sampling limits. Prefer same-account comparisons when possible. Views and likes are attention signals, never proof of conversion, paid distribution or causal success. If access or dates cannot be verified, report a gap rather than calling it trending.',
  video: 'Discover individual reference videos from the brand, its rivals and adjacent categories. Research visual style, lighting, camera movement, subject motion, graphics, captions, editing speed, hook, duration, sound and CTA. Web search can report published descriptions and metadata only: do not say you watched frames or heard audio. Find public YouTube reference URLs for the explicit direct-video analysis action. Report inaccessible visuals and unverifiable performance as gaps.',
};
export const RESEARCH_METHOD = 'Discover primary sources, investigate specific examples, follow relevant references within the page budget, and actively seek counterexamples. Cite the actual source for each finding. Two articles repeating one upstream source are one evidence origin, not triangulation. Preserve contradictions, source commercial interests and unknowns. Treat recency separately from authority. Learn principles and propose original brand-appropriate adaptations; never copy protected creative, music or likenesses.';
export function extendedResearchScope(segment: Segment, business: string, channels: string[]): SegmentScope | undefined {
  const where = channels.length ? channels.join(', ') : 'the selected launch channels';
  const contextual = (scope: SegmentScope): SegmentScope => ({ ...scope, questions: scope.questions.map(q => `For ${business}: ${q}`.slice(0, 220)) });
  const base = { maxPages: 8, avoid: ['Unverified conversion or virality claims', 'Private profiles and copying protected creative'] };
  if (segment === 'adjacent') return contextual({ ...base, questions: [`Which complementary and parallel businesses share ${business}'s audience, purchase occasion or customer journey?`, `Which specific campaigns on ${where} offer transferable mechanisms, and why would they fit or fail for this brand?`, 'Find a counterexample and explain category, audience and budget differences.'], sourceTypes: ['Adjacent-brand websites and campaign pages', 'Individual social posts', 'Primary case studies and interviews'] });
  if (segment === 'trends') return contextual({ ...base, questions: [`What dated formats, hooks and recurring themes emerged on ${where} in the last 30 days (90 days only if thin)?`, `Which independent examples from this category and parallel businesses show the pattern, and what observed metrics or baseline support it?`, 'What is uncertain about recency, sample size, paid promotion and conversion; what should this brand test rather than assume?'], sourceTypes: ['Dated individual posts and videos', 'Official platform trend and creative libraries', 'Recent primary creator or brand case studies'] });
  if (segment === 'video') return contextual({ ...base, questions: [`Which public reference videos from ${business}, rivals and adjacent brands fit ${where}?`, 'What published evidence describes style, lighting, motion, graphics, captions, editing speed, content length, opening hook, audio and CTA?', 'Which details require direct viewing, and which public YouTube URLs can a producer submit for timecoded video analysis?'], sourceTypes: ['Individual public YouTube videos and Shorts', 'Public Reels and TikTok references where accessible', 'Production breakdowns, transcripts and official creative libraries'] });
}
/** Stable serialization of public research inputs; excludes contact and private operational data. */
export function researchContextHash(p: Project): string {
  return JSON.stringify({ brief: { business: p.brief.business, website: p.brief.website, description: p.brief.description, objective: p.brief.objective, audience: p.brief.audience, competitors: p.brief.competitors, inspiration: p.brief.inspiration }, channels: p.channels || [], scope: p.scope || null, skillVersion: '2.0.0' });
}

/** Existing four-role campaigns may finish; new/expanded scopes require the full bus. */
export function requiredResearchSegments(p: Project): Segment[] {
  if (p.taskPlan) return selectedResearch(p);
  const core: Segment[] = ['brand','customer','competitor','creative'];
  const extended: Segment[] = ['adjacent','trends','video'];
  const expanded = extended.some(s => p.scope?.segments[s] || p.runs.some(r => r.segment === s));
  return !expanded && core.every(s => p.runs.some(r => (r.stage || 'research') === 'research' && r.segment === s && r.status === 'completed')) ? core : [...core,...extended];
}

/** Discovery destinations, not claims that authenticated platform connectors are installed. */
export function researchDestinations(segment: Segment, channels: string[] = []) {
  const sites = [
    { channel:'instagram', name:'Meta Ad Library and public Instagram references', url:'https://www.facebook.com/ads/library/' },
    { channel:'facebook', name:'Meta Ad Library and public Facebook references', url:'https://www.facebook.com/ads/library/' },
    { channel:'tiktok', name:'TikTok Creative Center and individual public posts', url:'https://ads.tiktok.com/business/creativecenter/' },
    { channel:'youtube', name:'YouTube videos, Shorts and Google Ads Transparency', url:'https://adstransparency.google.com/' },
    { channel:'pinterest', name:'Pinterest Trends', url:'https://trends.pinterest.com/' },
    { channel:'linkedin', name:'LinkedIn Ad Library and public company posts', url:'https://www.linkedin.com/ad-library/' },
    { channel:'reddit', name:'Reddit communities and public discussions', url:'https://www.reddit.com/' },
  ];
  const selected = sites.filter(s => channels.includes(s.channel));
  const defaults = segment === 'video' ? [{ channel:'youtube', name:'YouTube public reference videos and Shorts', url:'https://www.youtube.com/' }] : [];
  return [...new Map([...selected,...defaults].map(s => [s.url,s])).values()].map(s => ({...s,access:'Public web discovery only; access, dates and metrics must be verified. A blocked page is a gap.'}));
}
