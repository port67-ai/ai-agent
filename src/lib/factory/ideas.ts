import { FORMATS, formatById } from "./formats";
import type { Idea, Project, Segment } from "./model";
import type { SegmentEvidence } from "./evidence";

// The weekly research pack and the ideas bank. The pack reads what the project already holds; ideas are proposed from the direction's key
// messages, the chosen formats and the audience segments. A producer keeps or drops each one. Deterministic: no model, no cost.
export const MAX_IDEAS = 10;

export type ResearchPack = { generatedAt: string; sections: { title: string; items: string[] }[]; actions: { rank: number; text: string }[] };
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const SEG: Record<Segment, string> = { brand: "Business and brand", customer: "Customer insight", competitor: "Competitor intelligence", creative: "Creative research" };

export function researchPack(p: Project, evidence: SegmentEvidence[] = [], now = new Date().toISOString()): ResearchPack {
  const ok = p.sources.filter((s) => s.kind === "public_source" && s.status === "supported");
  const of = (seg: Segment) => ok.filter((s) => s.segment === seg);
  const sections: ResearchPack["sections"] = [
    { title: "What the evidence says", items: (["brand", "customer", "competitor", "creative"] as Segment[]).map((seg) => {
      const e = evidence.find((x) => x.segment === seg);
      return `${SEG[seg]}: ${of(seg).length} accepted source${of(seg).length === 1 ? "" : "s"}${e ? `, evidence rated ${e.rating}${e.weak ? " (weak)" : ""}` : ""}`;
    }) },
    { title: "Customer voice roundup", items: of("customer").slice(0, 6).map((s) => `${clip(s.excerpt.replace(/\s+/g, " "), 180)} (${s.title})`) },
    { title: "Competitor deep dive", items: of("competitor").slice(0, 6).map((s) => `${s.title}: ${clip(s.excerpt.replace(/\s+/g, " "), 140)}`) },
    { title: "Creative and format findings", items: of("creative").slice(0, 6).map((s) => `${s.title}: ${clip(s.excerpt.replace(/\s+/g, " "), 140)}`) },
    { title: "Accepted insights", items: p.insights.filter((i) => (i.status || "reviewed") === "reviewed").map((i) => `${i.title} (${i.confidence})`) },
    { title: "Performance metrics", items: ["No ad account is connected yet, so there are no measured results to rank winning and failing patterns. Until one is, treat every idea as a hypothesis to test."] },
  ];
  const actions: string[] = [];
  for (const e of evidence) if (e.weak) actions.push(`Strengthen ${SEG[e.segment].toLowerCase()} evidence before relying on it (${e.reasons[0] || "weak rating"}).`);
  if (!p.formats?.decidedAt) actions.push("Choose the ad formats to make.");
  if (!p.audiences?.strapline) actions.push("Set the strapline the whole campaign carries.");
  if (!p.audiences?.segments.length) actions.push("Name the audience segments to tailor the brand for.");
  const kept = (p.ideas || []).filter((i) => i.status === "kept").length;
  if (!p.ideas?.length) actions.push("Generate ideas from the direction, then keep the best few.");
  else if (!kept) actions.push("Keep the strongest ideas so they move into production.");
  return { generatedAt: now, sections, actions: actions.map((text, i) => ({ rank: i + 1, text })) };
}

const CONCEPT: Record<string, { name: string; hook: (m: string, seg?: string) => string; criteria: string[]; notes: string }> = {
  static: { name: "The Proof Point", hook: (m) => m, criteria: ["The one idea reads in two seconds", "Headline is the key message, not a paraphrase", "Proof is visible or one tap away"], notes: "One image, one headline, one call to action. Make three headline variants." },
  video_short: { name: "The Three-Second Hook", hook: (m, s) => `Open on the payoff${s ? ` for ${s}` : ""}: ${m}`, criteria: ["Hook lands before the third second", "Works muted with captions", "One message only"], notes: "Vertical 9:16, under 30 seconds, captions burned in, first frame is the payoff." },
  video_long: { name: "The Walkthrough", hook: (m) => `Show how it works, proving: ${m}`, criteria: ["The story has a problem, a turn and a result", "Every claim traces to evidence", "Viewer knows the next step at the end"], notes: "One to three minutes, chaptered, with the proof on screen at the moment each claim is made." },
  video_ugc: { name: "The Honest Review", hook: (m, s) => `A real person${s ? ` like ${s}` : ""} explains, in their own words: ${m}`, criteria: ["Feels like a native post, not an ad", "Spoken line stays inside the approved message", "Creator discloses the partnership where required"], notes: "Vertical, handheld, natural light, casual captions. Brief a creator or customer; supply talking points, not a script to read verbatim." },
  motion: { name: "The Animated Explainer", hook: (m) => `Animate the idea: ${m}`, criteria: ["Brand colours and type are exact", "Motion explains, not decorates", "Readable with sound off"], notes: "Type, shapes and product visuals only. Storyboard first, then render from the approved direction." },
  written_ad: { name: "The Direct Answer", hook: (m, s) => `Answer the question${s ? ` ${s} is asking` : " the buyer is asking"}: ${m}`, criteria: ["First line stands alone", "One claim, one proof", "Clear call to action"], notes: "Headline, body and call to action per channel; vary the angle across versions." },
  written_long: { name: "The Buyer's Guide", hook: (m) => `Teach the reader the thing behind: ${m}`, criteria: ["Useful with no sign-up", "Sources are cited", "Ends on a clear next step"], notes: "1,200 to 2,000 words or a gated white paper; outline from the accepted insights first." },
};

/** Up to ten fresh ideas, spread across key messages, chosen formats and audience segments. Existing kept or dropped ideas are not repeated. */
export function proposeIdeas(p: Project, make: () => string, now: string): Idea[] {
  const s = p.strategies.at(-1);
  const km = s?.keyMessages || [];
  if (!km.length) throw new Error("Draft a direction with key messages first; ideas are built from them");
  const formats = (p.formats?.selected.length ? p.formats.selected : (p.formats?.suggested || []).slice(0, 3).map((x) => x.id)).filter((id) => formatById(id));
  const fmts = formats.length ? formats : FORMATS.slice(0, 3).map((f) => f.id);
  const segs = p.audiences?.segments.length ? p.audiences.segments : [undefined];
  const have = new Set((p.ideas || []).map((i) => `${i.format}|${i.keyMessage}|${i.segment || ""}`));
  const out: Idea[] = [];
  for (let round = 0; round < Math.max(km.length, segs.length) && out.length < MAX_IDEAS; round++)
    for (const f of fmts) {
      const m = km[round % km.length];
      const seg = segs[round % segs.length];
      const key = `${f}|${round % km.length}|${seg?.name || ""}`;
      if (have.has(key) || out.length >= MAX_IDEAS) continue;
      have.add(key);
      const c = CONCEPT[f] || CONCEPT.static;
      out.push({
        id: make(), title: `${c.name}${seg ? `: ${seg.name}` : ""}`, format: f, keyMessage: round % km.length, segment: seg?.name,
        hook: clip(c.hook(m.message, seg?.name), 300), angle: seg?.angle || "", criteria: c.criteria, productionNotes: c.notes,
        sourceIds: [...m.sourceIds], rank: 0, status: "proposed", priority: "medium", createdAt: now,
      });
    }
  const base = (p.ideas || []).length;
  return out.map((i, n) => ({ ...i, rank: base + n + 1 }));
}
