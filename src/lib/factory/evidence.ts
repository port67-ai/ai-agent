import type { Insight, Project, Segment, Source } from "./model";
import { segments } from "./model";

// Evidence quality, graded against named standards. Pure and free: no model calls, no storage; recomputed from the project.
//  - Admiralty (NATO) code: source RELIABILITY A to F, separate from information CREDIBILITY 1 to 6.
//  - CRAAP test per source: currency, relevance, authority, accuracy, purpose (each 0 to 2).
//  - GRADE-style rating per segment and per insight: high, moderate, low, very low.
// These are transparent heuristics, not proof: they decide what to warn about and when a producer should send an agent back.
export type Reliability = "A" | "B" | "C" | "D" | "E" | "F";
export type Credibility = 1 | 2 | 3 | 4 | 5 | 6;
export type Rating = "high" | "moderate" | "low" | "very low";
export type SourceGrade = {
  reliability: Reliability;
  credibility: Credibility;
  craap: { currency: number; relevance: number; authority: number; accuracy: number; purpose: number };
  /** 0 to 100 from reliability, credibility and CRAAP. */
  score: number;
  /** Plain-English reasons behind the grade, for the producer. */
  notes: string[];
};
export const RELIABILITY_LABEL: Record<Reliability, string> = { A: "completely reliable (official or academic)", B: "usually reliable", C: "fairly reliable", D: "not usually reliable", E: "unreliable", F: "cannot be judged" };
export const CREDIBILITY_LABEL: Record<Credibility, string> = { 1: "confirmed by independent sources", 2: "probably true", 3: "possibly true", 4: "doubtful", 5: "improbable", 6: "cannot be judged" };
export const WEAK_BELOW = 60;
export const ratingOf = (score: number): Rating => (score >= 75 ? "high" : score >= 60 ? "moderate" : score >= 40 ? "low" : "very low");
export const isWeak = (r: Rating) => r === "low" || r === "very low";

const STOP = new Set("this that with from have been were will would could should their there which about into than then them they what when where while your yours also more most some such only over each other these those because between during before after being does doing done just like make made many much very".split(" "));
const tokens = (text: string) => new Set((text.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !STOP.has(w)));
const overlap = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / Math.min(a.size, b.size);
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / (a.size + b.size - n);
};
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
/** The organisation behind a host (example.co.uk and shop.example.co.uk are one). */
export const siteOf = (u: string) => {
  const h = hostOf(u);
  if (!h) return "";
  const parts = h.split(".");
  const second = parts.at(-2) || "";
  const wide = parts.length >= 3 && parts.at(-1)!.length === 2 && ["co", "com", "org", "gov", "ac", "net", "edu"].includes(second);
  return parts.slice(wide ? -3 : -2).join(".");
};
const OFFICIAL = /(^|\.)(gov|edu|mil)(\.[a-z]{2})?$|(^|\.)(ac|gov)\.[a-z]{2}$|(^|\.)(europa\.eu|who\.int|oecd\.org|worldbank\.org|un\.org|ons\.gov\.uk|ofcom\.org\.uk|fca\.org\.uk|ico\.org\.uk)$/;
const PUBLISHER = /(^|\.)(reuters\.com|bbc\.co\.uk|bbc\.com|ft\.com|economist\.com|wsj\.com|nytimes\.com|theguardian\.com|bloomberg\.com|statista\.com|gartner\.com|forrester\.com|mckinsey\.com|hbr\.org|nature\.com|ons\.gov\.uk|pewresearch\.org|yougov\.com|ipsos\.com|kantar\.com|nielsen\.com)$/;
const REVIEW = /(^|\.)(trustpilot\.com|yelp\.com|tripadvisor\.[a-z.]+|glassdoor\.[a-z.]+|google\.com|g2\.com|capterra\.com|checkatrade\.com|companieshouse\.gov\.uk|opencorporates\.com)$/;
const SOCIAL = /(^|\.)(reddit\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|linkedin\.com|medium\.com|quora\.com|pinterest\.com|blogspot\.com|wordpress\.com|substack\.com|tumblr\.com)$/;
const PROMO = /\b(best|leading|#1|number one|award[- ]winning|world[- ]class|unbeatable|guarantee[d]?|free quote|book now|buy now|limited offer|market[- ]leader|top[- ]rated|cheapest)\b/gi;
const textOf = (s: Source) => `${s.title} ${s.excerpt} ${(s.findings || []).map((f) => `${f.claim} ${f.quote || ""}`).join(" ")}`;
const claimsOf = (s: Source) => tokens(`${s.title} ${(s.findings || []).map((f) => f.claim).join(" ")} ${s.excerpt}`);

export type GradeContext = { website?: string; questions?: string[]; now?: Date; peers?: Source[] };
export function gradeSource(s: Source, ctx: GradeContext = {}): SourceGrade {
  const notes: string[] = [];
  const h = hostOf(s.url);
  const own = ctx.website ? siteOf(ctx.website) : "";
  let reliability: Reliability;
  if (!h) { reliability = "F"; notes.push("No usable web address."); }
  else if (OFFICIAL.test(h)) { reliability = "A"; notes.push("Official, regulator or academic origin."); }
  else if (PUBLISHER.test(h)) { reliability = "B"; notes.push("Established publisher or research organisation."); }
  else if (own && siteOf(s.url) === own) { reliability = "B"; notes.push("The business's own site: reliable for its own offer, not for how good it is."); }
  else if (REVIEW.test(h)) { reliability = "C"; notes.push("Review or directory platform."); }
  else if (SOCIAL.test(h)) { reliability = "D"; notes.push("Social, forum or personal blog: opinion, not verified fact."); }
  else { reliability = "E"; notes.push("Origin not recognised as authoritative."); }

  // Credibility: corroboration by an independent organisation, then specificity.
  const mine = claimsOf(s);
  const peers = (ctx.peers || []).filter((x) => x.id !== s.id && x.kind === "public_source" && x.status !== "rejected" && siteOf(x.url) && siteOf(x.url) !== siteOf(s.url));
  const corroborated = peers.filter((x) => jaccard(mine, claimsOf(x)) >= 0.18);
  const quoted = (s.findings || []).some((f) => (f.quote || "").trim().length >= 20);
  const figures = /\d{2,}|\d%|\d\.\d/.test(textOf(s));
  const promo = (textOf(s).match(PROMO) || []).length;
  let credibility: Credibility;
  if (textOf(s).trim().length < 40) { credibility = 6; notes.push("Too little content to judge."); }
  else if (corroborated.length) { credibility = 1; notes.push(`Confirmed by ${corroborated.length} independent source${corroborated.length === 1 ? "" : "s"}.`); }
  else if (promo >= 3) { credibility = 5; notes.push("Heavily promotional wording."); }
  else if (quoted && figures) { credibility = 2; notes.push("Specific, quoted and quantified."); }
  else if (quoted) { credibility = 3; notes.push("Quoted but not quantified or corroborated."); }
  else { credibility = 4; notes.push("No quote to check the claim against."); }

  // CRAAP, each 0 to 2.
  const now = ctx.now || new Date();
  const years = (`${s.url} ${textOf(s)}`.match(/\b(20[1-3]\d)\b/g) || []).map(Number).filter((y) => y <= now.getUTCFullYear());
  const newest = years.length ? Math.max(...years) : 0;
  const age = newest ? now.getUTCFullYear() - newest : -1;
  const currency = age < 0 ? 1 : age <= 1 ? 2 : age <= 3 ? 1 : 0;
  if (age < 0) notes.push("No date found: currency unknown.");
  else if (age > 3) notes.push(`Dated ${newest}: may be out of date.`);
  const asked = tokens((ctx.questions || []).join(" "));
  const rel = asked.size ? overlap(asked, tokens(textOf(s))) : 0.1;
  const relevance = rel >= 0.15 ? 2 : rel >= 0.05 ? 1 : 0;
  if (relevance === 0 && asked.size) notes.push("Little overlap with the questions this segment was asked.");
  const authority = reliability === "A" || reliability === "B" ? 2 : reliability === "C" || reliability === "D" ? 1 : 0;
  const accuracy = corroborated.length || (quoted && figures) ? 2 : quoted ? 1 : 0;
  const purpose = promo === 0 ? 2 : promo <= 2 ? 1 : 0;
  if (promo) notes.push(`${promo} promotional phrase${promo === 1 ? "" : "s"}.`);
  const craap = { currency, relevance, authority, accuracy, purpose };

  const rel100 = { A: 100, B: 80, C: 60, D: 35, E: 20, F: 0 }[reliability];
  const cred100 = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 0 }[credibility];
  const craap100 = ((currency + relevance + authority + accuracy + purpose) / 10) * 100;
  const score = Math.round(rel100 * 0.4 + cred100 * 0.3 + craap100 * 0.3);
  return { reliability, credibility, craap, score, notes };
}

export type SegmentEvidence = {
  segment: Segment;
  score: number;
  rating: Rating;
  weak: boolean;
  sources: number;
  independentSites: number;
  quantifiedShare: number;
  reasons: string[];
};
const liveSources = (p: Project, segment: Segment) => p.sources.filter((s) => s.segment === segment && s.kind === "public_source" && s.status !== "rejected");
export const gradeContext = (p: Project, segment?: Segment): GradeContext => ({ website: p.brief.website, questions: segment ? p.scope?.segments[segment]?.questions : undefined, peers: p.sources });
export function gradedSources(p: Project, segment: Segment) {
  return liveSources(p, segment).map((s) => ({ source: s, grade: gradeSource(s, gradeContext(p, segment)) }));
}
/** GRADE-style rating of one research segment: how much weight its collected evidence can carry into the insights. */
export function segmentEvidence(p: Project, segment: Segment): SegmentEvidence {
  const graded = gradedSources(p, segment);
  const reasons: string[] = [];
  if (!graded.length) return { segment, score: 0, rating: "very low", weak: true, sources: 0, independentSites: 0, quantifiedShare: 0, reasons: ["No usable sources were collected."] };
  let score = Math.round(graded.reduce((n, x) => n + x.grade.score, 0) / graded.length);
  const sites = new Set(graded.map((x) => siteOf(x.source.url)).filter(Boolean)).size;
  const findings = graded.flatMap((x) => x.source.findings || []);
  const quantified = findings.filter((f) => /\d{2,}|\d%|\d\.\d/.test(f.claim)).length;
  const share = findings.length ? quantified / findings.length : 0;
  if (sites < 2) { score = Math.min(score, 55); reasons.push("Evidence comes from one organisation only: it is not independent."); }
  if (graded.length < 3) { score = Math.min(score, 59); reasons.push(`Only ${graded.length} source${graded.length === 1 ? "" : "s"}: too few to triangulate.`); }
  if (findings.length && share < 0.15) { score = Math.max(0, score - 10); reasons.push("Almost no figures or measurable facts, only general statements."); }
  const low = graded.filter((x) => x.grade.reliability === "D" || x.grade.reliability === "E").length;
  if (low / graded.length > 0.6) reasons.push("Most sources are opinion, social or unrecognised origins.");
  const stale = graded.filter((x) => x.grade.craap.currency === 0).length;
  if (stale / graded.length > 0.5) reasons.push("Most sources are more than three years old.");
  const rating = ratingOf(score);
  if (!reasons.length && isWeak(rating)) reasons.push("Sources are individually weak: low reliability or credibility grades.");
  return { segment, score, rating, weak: isWeak(rating), sources: graded.length, independentSites: sites, quantifiedShare: Math.round(share * 100) / 100, reasons };
}
export const allSegmentEvidence = (p: Project) => segments.map((k) => segmentEvidence(p, k));

/** What to tell a researcher so a second attempt fixes what was weak. Plain rules, not a rewrite of its job. */
export function researchGuidance(e: SegmentEvidence): string {
  const rules = [
    "Use pages from at least three different organisations, and prefer official, regulator, academic, established-publisher or independent review sources over the business's own marketing or social posts.",
    "Report measurable facts: numbers, percentages, prices, ratings or counts, each with its date, and quote the exact line.",
    "Prefer material from the last three years and say when a page is older.",
    "Skip promotional pages and claims you cannot quote.",
  ];
  return `The first attempt rated ${e.rating} (${e.score}/100). Why: ${e.reasons.join(" ")} Rules for this attempt: ${rules.join(" ")}`.slice(0, 900);
}

export type InsightEvidence = { score: number; rating: Rating; weak: boolean; sources: number; independentSites: number; reasons: string[] };
/** GRADE-style rating of one insight from the grades of the sources it cites and how directly they speak to it. */
export function insightEvidence(p: Project, i: Pick<Insight, "title" | "interpretation" | "sourceIds">): InsightEvidence {
  const cited = i.sourceIds.map((id) => p.sources.find((s) => s.id === id)).filter((s): s is Source => !!s);
  if (!cited.length) return { score: 0, rating: "very low", weak: true, sources: 0, independentSites: 0, reasons: ["It cites no sources."] };
  const grades = cited.map((s) => gradeSource(s, gradeContext(p, s.segment)));
  let score = Math.round(grades.reduce((n, g) => n + g.score, 0) / grades.length);
  const reasons: string[] = [];
  const sites = new Set(cited.map((s) => siteOf(s.url)).filter(Boolean)).size;
  if (sites < 2) { score = Math.min(score, 55); reasons.push("It rests on one organisation's material."); }
  const direct = overlap(tokens(`${i.title} ${i.interpretation}`), new Set(cited.flatMap((s) => [...tokens(textOf(s))])));
  if (direct < 0.25) { score = Math.max(0, score - 15); reasons.push("The interpretation uses ideas that the cited sources barely mention."); }
  const rating = ratingOf(score);
  if (!reasons.length && isWeak(rating)) reasons.push("The cited sources are individually weak.");
  return { score, rating, weak: isWeak(rating), sources: cited.length, independentSites: sites, reasons };
}
