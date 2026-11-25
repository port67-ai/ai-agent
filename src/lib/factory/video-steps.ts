import type { BrandIntelVersion, Commission, CustomerAccount, Generation, VideoPlan, VideoReference, VideoScript, VideoSheet, VideoShot } from "./model";
import { dropUnknownMentions } from "./video-images";
import type { VideoSlot } from "./agent-prompts";
import { dossierText } from "./brand-intel";
import { INPUTS, generationDef } from "./commissions";
import { webUrl } from "./customers";

// Video steps (CHG-0115): references, scripting, characters/locations/props and video generation prompts for one project and age group.
// Pure and client-safe: limits, templates, validation, the context given to the agents, and the checks on what they return.
export const MAX_REFERENCES = 30;
export const MAX_SHEETS = 40;
export const MAX_CHAT = 30;
export const MAX_PLANS = 30;
export const MAX_SHOTS = 30;
export type VideoStep = "references" | "script" | "sheets" | "prompts";
export const STEP_SLOT: Record<VideoStep, VideoSlot> = { references: "synthesis:video-references", script: "synthesis:video-script", sheets: "synthesis:video-sheets", prompts: "synthesis:video-prompts" };

export const TEMPLATES: { key: "15" | "30" | "60"; label: string; seconds: number; beats: { beat: string; seconds: number }[] }[] = [
  { key: "15", label: "15 seconds: hook, proof, call to action", seconds: 15, beats: [{ beat: "Hook", seconds: 3 }, { beat: "Proof", seconds: 5 }, { beat: "Payoff", seconds: 4 }, { beat: "Call to action", seconds: 3 }] },
  { key: "30", label: "30 seconds: hook, need, product in use, proof, call to action", seconds: 30, beats: [{ beat: "Hook", seconds: 3 }, { beat: "Need", seconds: 5 }, { beat: "Product in use", seconds: 7 }, { beat: "Proof", seconds: 6 }, { beat: "Payoff", seconds: 5 }, { beat: "Call to action", seconds: 4 }] },
  { key: "60", label: "60 seconds: story with set-up, turn, proof and call to action", seconds: 60, beats: [{ beat: "Hook", seconds: 4 }, { beat: "Set-up", seconds: 8 }, { beat: "Need", seconds: 10 }, { beat: "Product", seconds: 12 }, { beat: "Proof", seconds: 10 }, { beat: "Payoff", seconds: 10 }, { beat: "Call to action", seconds: 6 }] },
];
export const templateDef = (key: string) => TEMPLATES.find((t) => t.key === key);
/** The empty shot list a template starts from. */
export const skeleton = (key: "15" | "30" | "60"): VideoShot[] => templateDef(key)!.beats.map((b) => ({ seconds: b.seconds, visual: `${b.beat}: `, line: "", onScreen: "" }));
export const scriptSeconds = (s: Pick<VideoScript, "shots">) => s.shots.reduce((n, x) => n + x.seconds, 0);

export const SHEET_KINDS: { key: VideoSheet["kind"]; label: string }[] = [{ key: "person", label: "Person" }, { key: "product", label: "Product" }, { key: "location", label: "Location" }, { key: "prop", label: "Prop" }];

// ---------- Validation ----------
function str(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) { if (required) throw new Error(`${name} is required`); return ""; }
  if (typeof value !== "string" || value.length > max) throw new Error(`${name} must be text up to ${max} characters`);
  const out = value.trim();
  if (required && !out) throw new Error(`${name} is required`);
  return out;
}
export function referenceFields(d: Record<string, unknown>, partial = false) {
  const out: Partial<Pick<VideoReference, "title" | "link" | "why" | "palette" | "composition" | "camera" | "film" | "lens" | "searchTerms">> = {};
  const set = <K extends keyof typeof out>(k: K, v: string) => { out[k] = v as never; };
  if (!partial || "title" in d) set("title", str(d.title, "Title", 120, true));
  if (!partial || "link" in d) { const l = str(d.link, "Link", 500); set("link", l ? webUrl(l, "Reference link") : ""); }
  for (const [k, name] of [["why", "Why it fits"], ["palette", "Colour palette"], ["composition", "Composition"], ["camera", "Camera"], ["film", "Film or look"], ["lens", "Lens"], ["searchTerms", "Search terms"]] as const)
    if (!partial || k in d) set(k, str(d[k], name, 600));
  return out;
}
export function sheetFields(d: Record<string, unknown>, partial = false) {
  const out: Partial<Pick<VideoSheet, "kind" | "name" | "description" | "details">> = {};
  if (!partial || "kind" in d) { if (!SHEET_KINDS.some((k) => k.key === d.kind)) throw new Error("Choose person, product, location or prop"); out.kind = d.kind as VideoSheet["kind"]; }
  if (!partial || "name" in d) out.name = str(d.name, "Name", 120, true);
  if (!partial || "description" in d) out.description = str(d.description, "Description", 1500, true);
  if (!partial || "details" in d) out.details = str(d.details, "Details", 1500);
  return out;
}
export function shotsFields(value: unknown): VideoShot[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHOTS) throw new Error(`A script needs 1 to ${MAX_SHOTS} shots`);
  return value.map((s, i) => {
    const o = (s || {}) as Record<string, unknown>;
    const seconds = Number(o.seconds);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60) throw new Error(`Shot ${i + 1}: seconds must be a whole number from 1 to 60`);
    return { seconds, visual: str(o.visual, `Shot ${i + 1} visual`, 800, true), line: str(o.line, `Shot ${i + 1} spoken line`, 600), onScreen: str(o.onScreen, `Shot ${i + 1} on-screen text`, 200) };
  });
}
export function scriptFields(d: Record<string, unknown>): Pick<VideoScript, "template" | "title" | "shots"> {
  const template = d.template === "custom" || templateDef(String(d.template)) ? (d.template as VideoScript["template"]) : (() => { throw new Error("Choose a template or custom"); })();
  return { template, title: str(d.title, "Title", 120, true), shots: shotsFields(d.shots) };
}
export const instructionText = (v: unknown) => str(v, "Instruction", 1000);
export function promptsFields(d: Record<string, unknown>, shotCount: number) {
  const overall = str(d.overall, "Overall style prompt", 3000, true);
  if (!Array.isArray(d.shots) || d.shots.length !== shotCount) throw new Error(`There must be one prompt for each of the ${shotCount} script shots`);
  return { overall, shots: d.shots.map((s, i) => { const o = (s || {}) as Record<string, unknown>; return { shot: i + 1, prompt: str(o.prompt, `Shot ${i + 1} prompt`, 3000, true), negative: str(o.negative, `Shot ${i + 1} negative`, 1000) }; }) };
}

// ---------- What the agents are given ----------
const cap = (s: string, n = 3000) => s.trim().slice(0, n);
export type VideoCtx = { customer: CustomerAccount; commission: Commission; generation: Generation; plan?: VideoPlan; dossier?: BrandIntelVersion; images?: { name: string; description: string; title?: string; category?: string }[] };
export function scriptText(s: VideoScript): string {
  return `Title: ${s.title}\nTemplate: ${s.template}, ${scriptSeconds(s)} seconds\n${s.shots.map((x, i) => `Shot ${i + 1} (${x.seconds}s)\n  Visual: ${x.visual}\n  Line: ${x.line || "(none)"}\n  On-screen text: ${x.onScreen || "(none)"}`).join("\n")}`;
}
/** The data block for a step. Earlier steps are included only once they exist (references and sheets only when accepted). */
export function videoContext(step: VideoStep, c: VideoCtx): string {
  const g = generationDef(c.generation)!;
  const { customer, commission: p, plan } = c;
  const answers = INPUTS.filter((d) => d.key !== "audience").map((d) => {
    const lines = d.prompts.map((q) => ({ l: q.label, t: (p.answers[d.key]?.[q.key] || "").trim() })).filter((x) => x.t);
    return lines.length ? `Input ${d.number}, ${d.title}:\n${lines.map((x) => `- ${x.l} ${cap(x.t)}`).join("\n")}` : "";
  }).filter(Boolean).join("\n\n");
  const aud = Object.entries(p.audience?.[c.generation]?.answers || {}).map(([k, v]) => `- ${k}: ${cap(v, 1500)}`).join("\n");
  const reds = customer.redLines.length ? customer.redLines.map((r) => `- [${r.category}] ${r.text}${r.reason ? ` (${r.reason})` : ""}`).join("\n") : "- none recorded";
  const lists = [p.preserve.length ? `Brand preserve list:\n${p.preserve.map((e) => `- ${e.text}`).join("\n")}` : "", p.wentTooFar.trim() ? `An example that went too far: ${p.wentTooFar.trim()}` : ""].filter(Boolean).join("\n\n");
  const refs = (plan?.references || []).filter((r) => r.accepted);
  const sheets = (plan?.sheets || []).filter((s) => s.accepted);
  const parts = [
    `<client_red_lines>\n${reds}\n</client_red_lines>`,
    c.dossier ? `<brand_foundation_dossier version="${c.dossier.version}">\n${dossierText(c.dossier, 3000)}\n</brand_foundation_dossier>` : "<brand_foundation_dossier>(none: Brand Intelligence has not been run)</brand_foundation_dossier>",
    `<commission>\nCustomer: ${customer.name}\nWebsite: ${customer.website || "(none)"}\nProject: ${p.name}\nProduct or service: ${p.brief?.product || "(not specified)"}\nMarket: ${p.brief?.market || "(not specified)"}\nTiming: ${p.brief?.timing || "(not specified)"}\nProposed video format: ${p.brief?.format || "(not specified)"}\n\n${answers || "(no answers entered)"}${lists ? `\n\n${lists}` : ""}\n</commission>`,
    `<target_age_group>\n${g.label}, ages ${g.range}${g.minors ? ". This range includes people under 18." : ""}\n${aud}\n</target_age_group>`,
  ];
  if (step !== "references") parts.push(`<accepted_references>\n${refs.length ? refs.map((r) => `- ${r.title}: palette ${r.palette || "n/a"}; composition ${r.composition || "n/a"}; camera ${r.camera || "n/a"}; look ${r.film || "n/a"}; lens ${r.lens || "n/a"}${r.why ? `; why: ${r.why}` : ""}`).join("\n") : "(none yet)"}\n</accepted_references>`);
  if ((step === "sheets" || step === "prompts") && plan?.script) parts.push(`<script>\n${scriptText(plan.script)}\n</script>`);
  if (step === "prompts") parts.push(`<sheets>\n${sheets.length ? sheets.map((s) => `- [${s.kind}] ${s.name}: ${s.description}${s.details ? ` Details: ${s.details}` : ""}`).join("\n") : "(none accepted)"}\n</sheets>`);
  if (step === "prompts") parts.push(`<images>\n${c.images?.length ? c.images.map((i) => `- @${i.name}${i.category ? ` [${i.category}]` : ""}${i.title ? ` (${i.title})` : ""}${i.description ? `: ${i.description}` : ""}`).join("\n") : "(none uploaded)"}\n</images>`);
  return parts.join("\n\n");
}

// ---------- Schemas and checks on what the agents return ----------
const text = { type: "string" } as const;
const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
export function videoSchema(step: VideoStep) {
  if (step === "references") return obj({ summary: text, references: { type: "array", items: obj({ title: text, why: text, palette: text, composition: text, camera: text, film_look: text, lens: text, search_terms: text }) } });
  if (step === "script") return obj({ title: text, notes: text, shots: { type: "array", items: obj({ seconds: { type: "integer" }, visual: text, line: text, on_screen: text }) } });
  if (step === "sheets") return obj({ sheets: { type: "array", items: obj({ kind: { type: "string", enum: SHEET_KINDS.map((k) => k.key) }, name: text, description: text, details: text }) } });
  return obj({ overall: text, shots: { type: "array", items: obj({ shot: { type: "integer" }, prompt: text, negative: text }) } });
}
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\*\*/g, "").trim().slice(0, max) : "");
const rows = (o: Record<string, unknown>, key: string, min: number, max: number): Record<string, unknown>[] => {
  const a = o[key];
  if (!Array.isArray(a) || a.length < min) throw new Error(`The AI answer did not include enough "${key}". Try again; nothing was changed.`);
  return (a.slice(0, max) as unknown[]).map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}));
};
export type ParsedVideo =
  | { step: "references"; summary: string; references: Omit<VideoReference, "id" | "source" | "accepted" | "addedBy" | "addedAt">[] }
  | { step: "script"; title: string; notes: string; shots: VideoShot[] }
  | { step: "sheets"; sheets: Pick<VideoSheet, "kind" | "name" | "description" | "details">[] }
  | { step: "prompts"; overall: string; shots: { shot: number; prompt: string; negative: string }[] };
export function parseVideo(step: VideoStep, o: Record<string, unknown>, scriptShots = 0, imageNames: string[] = []): ParsedVideo {
  if (step === "references") {
    const refs = rows(o, "references", 1, 8).map((r) => ({ title: clean(r.title, 120), why: clean(r.why, 600), palette: clean(r.palette, 600), composition: clean(r.composition, 600), camera: clean(r.camera, 600), film: clean(r.film_look, 600), lens: clean(r.lens, 600), searchTerms: clean(r.search_terms, 600), link: "" })).filter((r) => r.title);
    if (!refs.length) throw new Error("The AI answer had no usable references. Try again; nothing was changed.");
    return { step, summary: clean(o.summary, 1000), references: refs };
  }
  if (step === "script") {
    const shots = shotsFields(rows(o, "shots", 1, MAX_SHOTS).map((r) => ({ seconds: r.seconds, visual: clean(r.visual, 800), line: clean(r.line, 600), onScreen: clean(r.on_screen, 200) })));
    return { step, title: clean(o.title, 120) || "Untitled script", notes: clean(o.notes, 600), shots };
  }
  if (step === "sheets") {
    const sheets = rows(o, "sheets", 1, 20).map((r) => ({ kind: r.kind as VideoSheet["kind"], name: clean(r.name, 120), description: clean(r.description, 1500), details: clean(r.details, 1500) })).filter((s) => s.name && s.description && SHEET_KINDS.some((k) => k.key === s.kind));
    if (!sheets.length) throw new Error("The AI answer had no usable sheets. Try again; nothing was changed.");
    return { step, sheets };
  }
  const shots = rows(o, "shots", 1, MAX_SHOTS).map((r, i) => ({ shot: i + 1, prompt: dropUnknownMentions(clean(r.prompt, 3000), imageNames), negative: clean(r.negative, 1000) }));
  if (shots.length !== scriptShots || shots.some((s) => !s.prompt)) throw new Error(`The AI answer did not give one prompt for each of the ${scriptShots} script shots. Try again; nothing was changed.`);
  const overall = dropUnknownMentions(clean(o.overall, 3000), imageNames);
  if (!overall) throw new Error('The AI answer left out "overall". Try again; nothing was changed.');
  return { step, overall, shots };
}
export const STEP_LABEL: Record<VideoStep, string> = { references: "References", script: "Scripting", sheets: "Characters, locations and props", prompts: "Video generation" };
