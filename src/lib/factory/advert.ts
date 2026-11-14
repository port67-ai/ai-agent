import { createHash } from "node:crypto";
import type { AdvertPlan, AdvertShot, Continuity, Project, Strategy } from "./model";

// Video advert track, phase 1 (PRD 25.5, FAC-VID-001 to 007). Deterministic: no model and no vendor is called here.
export const MAX_SHOT_SEC = 10;
export const MAX_ADVERT_SEC = 60;
export const MAX_SHOTS = 8;
export const TIERS = { draft: { label: "Draft", height: 480 }, final: { label: "Final", height: 1080 } } as const;
export type Tier = keyof typeof TIERS;
/** Versioned provider rule set. A real adapter adds its own set and golden tests (phase 2). */
export const RULESET = "generic-v1";
const REF_ORDER = ["character", "location", "prop"] as const;
const MAX_REFS = 9;
export const ASPECTS = ["16:9", "9:16", "1:1", "4:5"] as const;

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const HEX = /^#[0-9a-fA-F]{6}$/;

export function defaultContinuity(p: Project): Continuity {
  const brand = HEX.test(p.brief.brandColor || "") ? [p.brief.brandColor.toLowerCase()] : [];
  return {
    palette: [...brand, "#1f2933", "#f5f1ea", "#c8553d"].slice(0, 5),
    lighting: "Soft natural key light, gentle fill, no hard shadows",
    cameraBody: "Full-frame cinema camera",
    lens: "35mm prime, shallow depth of field",
    aspect: "16:9",
    grade: "Natural, slightly warm, lifted blacks",
    confidence: "estimate",
    source: "template",
    approved: false,
  };
}

export function validateContinuity(c: unknown): Continuity {
  const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const str = (k: string, max: number) => {
    const v = o[k];
    if (typeof v !== "string" || !v.trim() || v.length > max) throw new Error(`${k} is required (up to ${max} characters)`);
    return v.trim();
  };
  const palette = o.palette;
  if (!Array.isArray(palette) || palette.length < 1 || palette.length > 8 || palette.some((x) => typeof x !== "string" || !HEX.test(x)))
    throw new Error("Palette needs 1 to 8 hex colours such as #1f2933");
  if (!ASPECTS.includes(o.aspect as never)) throw new Error("Aspect must be 16:9, 9:16, 1:1 or 4:5");
  return {
    palette: (palette as string[]).map((x) => x.toLowerCase()),
    lighting: str("lighting", 300), cameraBody: str("cameraBody", 120), lens: str("lens", 160), grade: str("grade", 200),
    aspect: o.aspect as Continuity["aspect"],
    confidence: o.confidence === "confirmed" ? "confirmed" : "estimate",
    source: "producer",
    approved: false,
  };
}

export function planHash(a: Pick<AdvertPlan, "version" | "strategyHash" | "treatment" | "shots">): string {
  return digest(JSON.stringify({ v: a.version, s: a.strategyHash, t: a.treatment, sh: a.shots }));
}

/** Build the first treatment and shot list from the approved direction: one shot per key message, one closing call to action shot. */
export function buildAdvert(p: Project, s: Strategy, version: number): Omit<AdvertPlan, "id" | "createdAt"> {
  if (s.status !== "approved") throw new Error("Approve the campaign direction before planning a video advert");
  const km = s.keyMessages || [];
  if (!km.length) throw new Error("This direction has no key messages with proof; draft a new direction version first");
  const messages = km.slice(0, MAX_SHOTS - 1);
  const count = messages.length + 1;
  const each = Math.max(3, Math.min(MAX_SHOT_SEC, Math.round(30 / count)));
  const shots: AdvertShot[] = messages.map((m, i) => ({
    id: `s${i + 1}`, n: i + 1, keyMessage: i, sourceIds: [...m.sourceIds], seconds: each,
    scene: clip(`${s.design || "Clean, human scene"}. Moment ${i + 1} for ${s.audience || "the audience"}.`, 400),
    action: clip(`Show the idea behind: ${m.message}`, 400),
    dialogue: m.message, onScreen: "", refs: [],
  }));
  shots.push({
    id: `s${count}`, n: count, keyMessage: Math.max(0, messages.length - 1), sourceIds: [...messages[messages.length - 1].sourceIds],
    seconds: Math.min(MAX_SHOT_SEC, 5), scene: "Resolve on the product or place, calm and confident.",
    action: "Hold on the closing frame.", dialogue: "", onScreen: s.cta || "", refs: [],
  });
  const total = shots.reduce((n, x) => n + x.seconds, 0);
  const treatment = {
    title: clip(`${p.brief.business}: ${s.message}`, 120),
    logline: clip(s.positioning || s.message, 240),
    story: clip(`${s.rationale || s.message} Told in ${count} short shots for ${s.audience || "the audience"}, ending on: ${s.cta || "the call to action"}.`, 1200),
    tone: s.tone || "Warm and credible",
    durationSec: total,
    music: [
      { atSec: 0, cue: `Open soft, ${s.tone || "warm"}` },
      { atSec: Math.round(total / 2), cue: "Lift gently as the benefits land" },
      { atSec: Math.max(0, total - 5), cue: "Resolve on the call to action" },
    ],
  };
  const base = { version, strategyHash: s.hash, treatment, shots };
  return { ...base, status: "draft", continuity: defaultContinuity(p), hash: planHash(base) };
}

const figures = (t: string) => t.match(/\d+(?:[.,]\d+)?%|\d+[.,]\d+|\b\d{2,}\b/g) || [];
/** Rules every plan must meet before it is shared. Returns plain-English problems; empty means fine. */
export function advertIssues(p: Project, plan: AdvertPlan): string[] {
  const out: string[] = [];
  const s = p.strategies.find((x) => x.hash === plan.strategyHash);
  if (!s || s.status !== "approved") return ["The approved direction changed; plan the advert again."];
  const km = s.keyMessages || [];
  const allowed = km.map((m) => m.message + " " + m.proof).join(" ") + " " + s.cta;
  if (!plan.shots.length || plan.shots.length > MAX_SHOTS) out.push(`An advert needs 1 to ${MAX_SHOTS} shots.`);
  let total = 0;
  for (const x of plan.shots) {
    total += x.seconds;
    if (!(x.seconds >= 1 && x.seconds <= MAX_SHOT_SEC)) out.push(`Shot ${x.n} must be 1 to ${MAX_SHOT_SEC} seconds.`);
    if (!km[x.keyMessage]) out.push(`Shot ${x.n} is not linked to a key message.`);
    if (!x.sourceIds.length) out.push(`Shot ${x.n} cites no evidence.`);
    for (const f of figures(x.dialogue + " " + x.onScreen)) if (!allowed.includes(f)) out.push(`Shot ${x.n} uses the figure ${f}, which is not in the approved key messages.`);
    if (x.refs.length > MAX_REFS) out.push(`Shot ${x.n} has more than ${MAX_REFS} references.`);
  }
  if (total > MAX_ADVERT_SEC) out.push(`The advert is ${total}s; the limit is ${MAX_ADVERT_SEC}s.`);
  return out;
}

export function estimate(plan: AdvertPlan, tier: Tier, usdPerSecond?: number) {
  const seconds = plan.shots.reduce((n, x) => n + x.seconds, 0);
  return { seconds, tier, height: TIERS[tier].height, usd: usdPerSecond && usdPerSecond > 0 ? Math.round(seconds * usdPerSecond * 100) / 100 : null };
}

/** The deterministic shot prompt. Reference tags are numbered in a fixed order (characters, locations, props, then label). */
export function compileShot(plan: AdvertPlan, shot: AdvertShot, tier: Tier = "draft") {
  if (!plan.continuity.approved) throw new Error("A producer must approve the Continuity Profile before prompts are compiled");
  if (shot.seconds > MAX_SHOT_SEC || shot.seconds < 1) throw new Error(`Shot ${shot.n} must be 1 to ${MAX_SHOT_SEC} seconds`);
  const c = plan.continuity;
  const refs = [...shot.refs].sort((a, b) => REF_ORDER.indexOf(a.kind) - REF_ORDER.indexOf(b.kind) || a.label.localeCompare(b.label));
  if (refs.length > MAX_REFS) throw new Error(`Shot ${shot.n} has more than ${MAX_REFS} references`);
  const tags = refs.map((r, i) => ({ tag: `@Ref${i + 1}`, ...r }));
  const lighting = shot.overrides?.lighting || c.lighting;
  const lens = shot.overrides?.lens || c.lens;
  const lines = [
    ...tags.map((t) => `${t.tag} = ${t.kind}: ${t.label}`),
    `Scene: ${shot.scene}`,
    `Action: ${shot.action}${tags.length ? ` Feature ${tags.map((t) => t.tag).join(", ")}.` : ""}`,
    ...(shot.dialogue ? [`Spoken line: "${shot.dialogue}"`] : []),
    ...(shot.onScreen ? [`On-screen text: "${shot.onScreen}"`] : []),
    `Camera: ${c.cameraBody}, ${lens}`,
    `Lighting: ${lighting}`,
    `Palette: ${c.palette.join(", ")}`,
    `Grade: ${c.grade}`,
    `Format: ${c.aspect}, ${shot.seconds}s, ${TIERS[tier].height}p ${tier} tier`,
    "No logos, brand marks or real people unless supplied as references.",
  ];
  return { shotId: shot.id, ruleset: RULESET, tier, seconds: shot.seconds, refs: tags, prompt: lines.join("\n") };
}

export function compileAll(plan: AdvertPlan, tier: Tier = "draft") {
  return plan.shots.map((x) => compileShot(plan, x, tier));
}

/** Downloadable prompt pack (markdown). Only for an approved treatment and Continuity Profile. */
export function promptPack(p: Project, plan: AdvertPlan, tier: Tier = "draft"): string {
  if (plan.status !== "approved") throw new Error("The customer must approve the treatment before the prompt pack is released");
  const compiled = compileAll(plan, tier);
  const t = plan.treatment;
  const body = compiled.map((c) => {
    const x = plan.shots.find((s) => s.id === c.shotId)!;
    return `## Shot ${x.n} (${x.seconds}s)\n\n\`\`\`\n${c.prompt}\n\`\`\`\n\nEvidence: ${x.sourceIds.join(", ")}`;
  });
  return `# ${t.title}\n\nAdvert plan v${plan.version} · rule set ${RULESET} · ${TIERS[tier].label} tier (${TIERS[tier].height}p) · ${t.durationSec}s\n\n${t.logline}\n\n${t.story}\n\n### Music cues\n\n${t.music.map((m) => `- ${m.atSec}s: ${m.cue}`).join("\n")}\n\n${body.join("\n\n")}\n\n---\nPlanning pack only. Generate nothing without a producer action and a cost estimate. Reference images must be supplied or licensed; output must be labelled as synthetic where required.\n`;
}
