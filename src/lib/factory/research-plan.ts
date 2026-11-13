import { channelById, channelNames } from "./channels";
import { segments, type Project, type Segment } from "./model";
import { CATEGORY_LABEL, type Classification, type ResearchScope } from "./scope";

// Research preparation: decide, before any paid call, whether the brief is good enough, what each research
// agent will be asked, and what the research will produce. Pure functions, no AI cost, safe on the client.
export const SEGMENT_LABEL: Record<Segment, string> = { brand: "Business and brand", customer: "Customer insight", competitor: "Competitor intelligence", creative: "Creative research" };
export const SEGMENT_AGENT: Record<Segment, string> = { brand: "research:brand", customer: "research:customer", competitor: "research:competitor", creative: "research:creative" };
export type Check = { id: string; label: string; ok: boolean; level: "required" | "recommended"; fix: string };
export type SegmentPlan = { segment: Segment; label: string; agent: string; startFrom: string[]; questions: string[]; delivers: string; /** From the stored scope: what this agent skips and how many pages it may open. */ avoid?: string[]; maxPages?: number };
export type PlanScope = { source: ResearchScope["source"]; version: number; at: string; classification: Classification; competitorSet: string[]; note?: string };
export type ResearchPlan = {
  ready: boolean;
  score: number;
  checks: Check[];
  segments: SegmentPlan[];
  /** The stored classification the questions came from. Absent until the business has been classified. */
  scope?: PlanScope;
  assumptions: string[];
  expectedOutputs: string[];
  estimate: { runs: number; inputTokensPerRun: number; note: string };
};
const list = (s: string) =>
  [...new Set(String(s || "").split(/[\n,;]+/).map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 80))].slice(0, 6);
const host = (url: string) => {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    return /\./.test(u.hostname) ? u.hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
export function prepareResearchPlan(p: Pick<Project, "brief" | "channels"> & { scope?: ResearchScope }): ResearchPlan {
  const raw = (p.brief || {}) as Partial<Record<string, string>>;
  const b = { business: String(raw.business ?? ""), objective: String(raw.objective ?? ""), description: String(raw.description ?? ""), website: String(raw.website ?? ""), audience: String(raw.audience ?? ""), competitors: String(raw.competitors ?? ""), inspiration: String(raw.inspiration ?? "") };
  const site = host(b.website);
  const competitors = list(b.competitors);
  const channels = (p.channels || []).map(channelById).filter((c): c is NonNullable<typeof c> => !!c);
  const channelList = channels.map((c) => c.name);
  const category = b.description.trim().slice(0, 140);
  const checks: Check[] = [
    { id: "business", label: "Business name", ok: b.business.trim().length >= 2, level: "required", fix: "Add the business name." },
    { id: "objective", label: "Campaign objective", ok: b.objective.trim().length >= 10, level: "required", fix: "Say what the campaign must achieve, in a sentence." },
    { id: "description", label: "What the business offers", ok: b.description.trim().length >= 40, level: "required", fix: "Describe the offer in at least a couple of sentences so the researchers know the category." },
    { id: "channels", label: "Launch channels chosen", ok: channels.length > 0, level: "required", fix: "Choose at least one launch channel in the Research room." },
    { id: "website", label: "Website the brand researcher can read", ok: !!site, level: "recommended", fix: "Add the business website so the brand researcher starts from first-party facts." },
    { id: "audience", label: "Who the audience is", ok: b.audience.trim().length >= 10, level: "recommended", fix: "Describe the target customers; otherwise the researchers infer the audience." },
    { id: "competitors", label: "Named competitors", ok: competitors.length > 0, level: "recommended", fix: "List two or three competitors; otherwise the competitor researcher chooses them." },
    { id: "inspiration", label: "Inspiration or examples", ok: b.inspiration.trim().length >= 5, level: "recommended", fix: "Add brands or campaigns you admire to steer the creative researcher." },
  ];
  const weight = (c: Check) => (c.level === "required" ? 2 : 1);
  const score = Math.round((100 * checks.filter((c) => c.ok).reduce((n, c) => n + weight(c), 0)) / checks.reduce((n, c) => n + weight(c), 0));
  const forChannels = channelList.length ? ` on ${channelList.join(", ")}` : "";
  const plans: SegmentPlan[] = [
    {
      segment: "brand",
      label: SEGMENT_LABEL.brand,
      agent: SEGMENT_AGENT.brand,
      startFrom: [site ? `Business website: ${site}` : "No website supplied: search for the business by name", ...channels.map((c) => `Existing ${c.name} presence`)],
      questions: [
        `What exactly does ${b.business} offer, to whom and at what price?`,
        "What proof does the business show: customers, numbers, awards, press?",
        "What tone and visual style does the business already use?",
        ...(channelList.length ? [`Which of ${channelList.join(", ")} does the business already use, and with what results visible?`] : []),
      ],
      delivers: "Cited facts about the offer, brand voice and proof the business can stand behind.",
    },
    {
      segment: "customer",
      label: SEGMENT_LABEL.customer,
      agent: SEGMENT_AGENT.customer,
      startFrom: ["Published customer reviews, forums and surveys in the category", ...channels.map((c) => `How buyers talk about the category on ${c.name}`)],
      questions: [
        `What makes buyers of ${category || "this category"} choose, and what makes them hesitate?`,
        b.audience.trim() ? `How does this audience describe their problem in their own words: ${b.audience.trim().slice(0, 120)}?` : "Who actually buys in this category, and what words do they use?",
        "Which alternatives do customers weigh before buying?",
        ...(channelList.length ? [`How does this audience behave and talk${forChannels}?`] : []),
      ],
      delivers: "Customer language, purchase triggers, objections and alternatives, each with the number of independent voices behind it.",
    },
    {
      segment: "competitor",
      label: SEGMENT_LABEL.competitor,
      agent: SEGMENT_AGENT.competitor,
      startFrom: competitors.length ? competitors.map((c) => `Competitor: ${c}`) : ["No competitors supplied: identify three to five direct competitors first"],
      questions: competitors.length
        ? [...competitors.map((c) => `How does ${c} position itself, who does it target and where is it silent?`), "What do customers praise and complain about for each?", ...(channelList.length ? [`What is each competitor's best-performing content${forChannels}?`] : [])]
        : ["Who are the three to five closest competitors or substitutes?", "How does each position itself and where are they silent?", "What do customers praise and complain about for each?"],
      delivers: "Competitor positioning, audience, strengths, weaknesses and the gaps they leave open.",
    },
    {
      segment: "creative",
      label: SEGMENT_LABEL.creative,
      agent: SEGMENT_AGENT.creative,
      startFrom: [...channels.map((c) => `${c.name} playbook: ${c.playbook.slice(0, 90)}`), ...(b.inspiration.trim() ? [`Inspiration: ${b.inspiration.trim().slice(0, 100)}`] : [])],
      questions: [
        `Which formats, hooks and tones work for ${b.audience.trim() ? "this audience" : "this category"}${forChannels}?`,
        "What native conventions should the creative follow on each channel?",
        ...(b.inspiration.trim() ? ["What makes the named inspiration work, as principles rather than copies?"] : []),
      ],
      delivers: "Channel-native formats and hooks backed by cited examples or published analysis.",
    },
  ];
  // A stored scope replaces the generic questions with ones matched to this kind of business.
  if (p.scope) {
    for (const plan of plans) {
      const sc = p.scope.segments[plan.segment];
      if (!sc) continue;
      plan.questions = sc.questions;
      if (sc.sourceTypes.length) plan.startFrom = [...sc.sourceTypes, ...plan.startFrom.filter((x) => /^(Business website|Competitor:)/.test(x))].slice(0, 8);
      plan.avoid = sc.avoid;
      plan.maxPages = sc.maxPages;
    }
  }
  const assumptions = checks
    .filter((c) => !c.ok && c.level === "recommended")
    .map((c) => ({ website: "The brand researcher will search for the business by name; its facts are less certain without the website.", audience: "The customer researcher will infer the audience from the offer; confirm it at source review.", competitors: "The competitor researcher will choose competitors itself; confirm them at source review.", inspiration: "The creative researcher will work from channel playbooks only." }[c.id] || c.fix));
  const briefChars = JSON.stringify(b).length + channels.reduce((n, c) => n + c.playbook.length + c.summary.length, 0);
  return {
    ready: checks.filter((c) => c.level === "required").every((c) => c.ok),
    score,
    checks,
    segments: plans,
    ...(p.scope ? { scope: { source: p.scope.source, version: p.scope.version, at: p.scope.at, classification: p.scope.classification, competitorSet: p.scope.competitorSet, ...(p.scope.note ? { note: p.scope.note } : {}) } } : {}),
    assumptions,
    expectedOutputs: [
      "Per research agent: up to eight cited findings, each one claim with its own source URL and a short quote",
      "What each agent could not find or confirm (gaps), and its confidence",
      "A research dossier you can download, grouped by agent, before any insight is drafted",
      "Nothing is used as evidence until a producer reviews each source",
    ],
    estimate: { runs: segments.length, inputTokensPerRun: Math.ceil((briefChars + 1800) / 4), note: "Rough size of what each research call sends. Search results add to the input and are billed by the provider." },
  };
}

export type DossierSource = { id: string; title: string; url: string; status: string; confidence?: string; collectedAt: string; findings: { claim: string; quote?: string }[] };
export type Dossier = {
  business: string;
  website: string;
  channels: string[];
  generatedAt: string;
  segments: { segment: Segment; label: string; sources: DossierSource[]; gaps: string[]; questions: string[] }[];
  totals: { sources: number; supported: number; unreviewed: number; rejected: number; findings: number; gaps: number };
  readyForInsights: boolean;
  nextStep: string;
  /** What kind of business the research was scoped for, when it has been classified. */
  classification?: Classification;
};
/** The research output before any drafting: findings grouped by agent. Customers only see sources a producer has accepted. */
export function researchDossier(p: Project, audience: "operator" | "customer", now = new Date().toISOString()): Dossier {
  const plan = prepareResearchPlan(p);
  const visible = (s: Project["sources"][number]) => s.kind === "public_source" && (audience === "operator" || s.status === "supported");
  const segs = segments.map((segment) => {
    const sources = p.sources.filter((s) => s.segment === segment && visible(s)).map((s) => ({ id: s.id, title: s.title, url: s.url, status: s.status, confidence: s.confidence, collectedAt: s.collectedAt, findings: s.findings || [] }));
    const gaps = [...new Set(p.runs.filter((r) => r.segment === segment && r.status === "completed").flatMap((r) => r.gaps || []))].slice(0, 8);
    return { segment, label: SEGMENT_LABEL[segment], sources, gaps, questions: plan.segments.find((x) => x.segment === segment)!.questions };
  });
  const all = segs.flatMap((s) => s.sources);
  const totals = {
    sources: all.length,
    supported: all.filter((s) => s.status === "supported").length,
    unreviewed: all.filter((s) => s.status === "unreviewed").length,
    rejected: all.filter((s) => s.status === "rejected").length,
    findings: all.reduce((n, s) => n + s.findings.length, 0),
    gaps: segs.reduce((n, s) => n + s.gaps.length, 0),
  };
  return {
    business: p.brief.business,
    website: p.brief.website,
    channels: channelNames(p.channels || []),
    generatedAt: now,
    segments: segs,
    totals,
    ...(p.scope ? { classification: p.scope.classification } : {}),
    readyForInsights: totals.supported > 0,
    nextStep: !all.length ? "No research yet. Request research, or add sources by hand." : totals.unreviewed > 0 ? "Review the unreviewed sources (Gate 1). Insights can only use sources marked supported." : totals.supported > 0 ? "Ready for AI insights: draft insights from the supported sources." : "Every source was rejected. Run research again or add sources by hand.",
  };
}
export function renderDossierMarkdown(d: Dossier): string {
  const out: string[] = [`# Research dossier: ${d.business}`, "", `Generated ${d.generatedAt.slice(0, 10)}${d.website ? ` · ${d.website}` : ""}${d.channels.length ? ` · Channels: ${d.channels.join(", ")}` : ""}`, "", `${d.totals.sources} sources (${d.totals.supported} supported, ${d.totals.unreviewed} unreviewed, ${d.totals.rejected} rejected), ${d.totals.findings} findings, ${d.totals.gaps} gaps.`, "", `Next step: ${d.nextStep}`, ""];
  if (d.classification) out.push(`Scoped as: ${d.classification.businessType} (${CATEGORY_LABEL[d.classification.category]}; size ${d.classification.size}; reach ${d.classification.reach}; audience ${d.classification.audienceModel}${d.classification.regulated ? "; regulated sector" : ""}; confidence ${d.classification.confidence}).`, "");
  for (const s of d.segments) {
    out.push(`## ${s.label}`, "", "Questions asked:", ...s.questions.map((q) => `- ${q}`), "");
    if (!s.sources.length) out.push("_No sources yet._", "");
    for (const src of s.sources) {
      out.push(`### ${src.title}`, "", `${src.url} · ${src.status}${src.confidence ? ` · confidence ${src.confidence}` : ""}`, "");
      for (const f of src.findings) out.push(`- ${f.claim}${f.quote ? `\n  - Evidence: "${f.quote}"` : ""}`);
      if (src.findings.length) out.push("");
    }
    if (s.gaps.length) out.push("Could not confirm:", ...s.gaps.map((g) => `- ${g}`), "");
  }
  return out.join("\n");
}
