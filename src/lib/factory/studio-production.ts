// Stage 4 Production planning (piece C, CHG-0099). Pure and client-safe: which production pieces an offer gets, their dependsOn links,
// the still image prompt, the motion loop prompt and the Hook pack per-variant prompt pack. The server runs generation and uploads in
// studio-production-run.ts; the pages read the same functions so producers see exactly what the server will use.
import type { StudioAssetRef, StudioComment, StudioPiece, StudioState } from "./model";
import { addStudioPiece, currentStudioStage, offerInfo, pieceFields } from "./studio";

export const PRODUCTION_KINDS = ["still", "loop", "variant"] as const;
export type ProductionKind = (typeof PRODUCTION_KINDS)[number];
export const PRODUCTION_KIND_LABELS: Record<ProductionKind, string> = { still: "Still", loop: "Motion loop", variant: "Video variant" };
/** Scene Pack still ratios. Both are drawn by the image adapter: 4:5 at 1024x1536 (2:3) and cropped to 4:5, 1:1 at 1024x1024. */
export const STILL_RATIOS = [
  { id: "4:5", slug: "4x5", size: "1024x1536" as const, ratio: 4 / 5, label: "4:5 portrait (feed)" },
  { id: "1:1", slug: "1x1", size: "1024x1024" as const, ratio: 1, label: "1:1 square (carousel and catalogue)" },
] as const;
export type StillRatio = (typeof STILL_RATIOS)[number];
export const DEFAULT_STILLS = 25;
export const MAX_STILLS = 50;
export const MAX_LOOPS = 10;
export const LOOP_SECONDS = 5;
export const HOOK_SECONDS = 3;
export const VARIANTS_EXPECTED = 12;
/** Stills drawn straight away by "Generate stills"; the rest wait for the button so the cost stays visible. */
export const STILL_BATCH = 5;

const isKind = (x: StudioPiece, kind: string) => x.kind === kind;
export const productionPieces = (s: StudioState) => s.pieces.filter((x) => x.stage === "production");
export const textOf = (s: StudioState, id: string | undefined) => (id ? s.pieces.find((x) => x.id === id)?.versions.at(-1)?.text : undefined);
export const fileOf = (piece: StudioPiece | undefined): StudioAssetRef | undefined => piece?.versions.at(-1)?.image;
const dep = (s: StudioState, piece: StudioPiece | undefined, kind: string) => piece?.dependsOn.map((d) => s.pieces.find((x) => x.id === d)).find((x) => x?.kind === kind);
const dependant = (s: StudioState, id: string, kind: string) => s.pieces.find((x) => x.kind === kind && x.dependsOn.includes(id));
const line = (v: string | undefined, max = 400) => (v || "").replace(/\s+/g, " ").trim().slice(0, max);

/** Stills in scope: the intake quantity when set, otherwise 25, at most 50. */
export const stillQuantity = (s: StudioState) => Math.min(MAX_STILLS, Math.max(1, s.brief.project.quantity || DEFAULT_STILLS));
export const stillRatio = (piece: StudioPiece): StillRatio => STILL_RATIOS.find((r) => piece.id.endsWith("-" + r.slug)) || STILL_RATIOS[0];
/** 1-based position of a scene among the scenes (creation order never changes), used in titles and file names. */
export const sceneIndex = (s: StudioState, sceneId: string | undefined) => s.pieces.filter((x) => isKind(x, "scene")).findIndex((x) => x.id === sceneId) + 1;
/** Narrative and hook numbers from a hook title such as "Hook 2.3: Split-screen comparison". */
export function hookNumbers(hook: StudioPiece | undefined): { narrative: number; hook: number; style: string } {
  const m = /^Hook (\d+)\.(\d+)(?::\s*(.+))?$/.exec(hook?.title || "");
  return m ? { narrative: Number(m[1]), hook: Number(m[2]), style: m[3] || "" } : { narrative: 0, hook: 0, style: "" };
}
export const stillScene = (s: StudioState, piece: StudioPiece) => dep(s, piece, "scene");
export const variantHook = (s: StudioState, piece: StudioPiece) => dep(s, piece, "hook");

export type ProductionPlan = { create: { id: string; kind: ProductionKind; title: string; dependsOn: string[] }[]; existing: number; skipped: string[] };
/**
 * What "Prepare production" creates. Scene Pack: one still per approved scene and ratio (4:5 then 1:1, scene by scene) until the still
 * quantity is reached, each depending on its scene and the scene's test frame. Hook pack: one variant per approved hook (3 narratives x
 * 4 hooks), each depending on its hook, the hook's keyframe and the body script. Piece ids are derived from the pre-production piece ids,
 * so preparing again only adds what is missing. Unapproved scenes or hooks are skipped and listed.
 */
export function planProduction(s: StudioState): ProductionPlan {
  const has = (id: string) => s.pieces.some((x) => x.id === id);
  const plan: ProductionPlan = { create: [], existing: 0, skipped: [] };
  if (s.offer === "scene_pack") {
    const quantity = stillQuantity(s);
    let count = 0;
    for (const scene of s.pieces.filter((x) => x.stage === "preproduction" && isKind(x, "scene"))) {
      const n = sceneIndex(s, scene.id);
      if (scene.status !== "approved") { plan.skipped.push(`${scene.title}: not approved in pre-production`); continue; }
      const frame = dependant(s, scene.id, "test_frame");
      for (const r of STILL_RATIOS) {
        const id = `still-${scene.id}-${r.slug}`;
        if (has(id)) { plan.existing++; count++; continue; }
        if (count >= quantity) { plan.skipped.push(`${scene.title} at ${r.id}: the pack already has ${quantity} stills (the intake quantity)`); continue; }
        plan.create.push({ id, kind: "still", title: `Still ${n} at ${r.id}: ${scene.title.replace(/^Scene \d+:\s*/, "")}`.slice(0, 160), dependsOn: [scene.id, ...(frame ? [frame.id] : [])] });
        count++;
      }
    }
    return plan;
  }
  const script = s.pieces.find((x) => x.stage === "preproduction" && isKind(x, "script"));
  for (const hook of s.pieces.filter((x) => x.stage === "preproduction" && isKind(x, "hook"))) {
    const id = `variant-${hook.id}`;
    if (has(id)) { plan.existing++; continue; }
    if (hook.status !== "approved") { plan.skipped.push(`${hook.title}: not approved in pre-production`); continue; }
    const keyframe = dependant(s, hook.id, "keyframe");
    const nums = hookNumbers(hook);
    const title = nums.narrative ? `Variant ${nums.narrative}.${nums.hook}: ${nums.style || "hook"}` : `Variant: ${hook.title}`;
    plan.create.push({ id, kind: "variant", title: title.slice(0, 160), dependsOn: [hook.id, ...(keyframe ? [keyframe.id] : []), ...(script ? [script.id] : [])] });
  }
  return plan;
}
/** Apply a production plan to the studio state (server, inside the transition). Returns the new pieces. */
export function applyProductionPlan(s: StudioState, plan: ProductionPlan, ctx: { by: string }): StudioPiece[] {
  return plan.create.map((x) => addStudioPiece(s, { stage: "production", kind: x.kind, title: x.title, dependsOn: x.dependsOn, id: x.id }, ctx));
}
/**
 * Motion loops (Scene Pack offer option): up to ten upload pieces, spread over the scenes that have stills, each depending on its scene.
 * The app writes the loop prompt; a person makes the five-second clip in any video tool and uploads it.
 */
export function planLoops(s: StudioState, count: number): ProductionPlan {
  if (s.offer !== "scene_pack") throw new Error("Motion loops are part of the Product Scene Pack only");
  if (!Number.isInteger(count) || count < 0 || count > MAX_LOOPS) throw new Error(`Choose 0 to ${MAX_LOOPS} motion loops`);
  const scenes = [...new Set(productionPieces(s).filter((x) => isKind(x, "still")).map((x) => stillScene(s, x)?.id).filter((x): x is string => !!x))];
  if (count && !scenes.length) throw new Error("Prepare the stills first: loops are made from the scenes that have stills");
  const plan: ProductionPlan = { create: [], existing: 0, skipped: [] };
  for (let i = 1; i <= count; i++) {
    const id = `loop-${String(i).padStart(2, "0")}`;
    if (s.pieces.some((x) => x.id === id)) { plan.existing++; continue; }
    const scene = s.pieces.find((x) => x.id === scenes[(i - 1) % scenes.length])!;
    plan.create.push({ id, kind: "loop", title: `Motion loop ${i}: ${scene.title.replace(/^Scene \d+:\s*/, "")}`.slice(0, 160), dependsOn: [scene.id] });
  }
  return plan;
}
export function requireProductionOpen(s: StudioState) {
  if (currentStudioStage(s) !== "production") throw new Error("Production is not the open stage: approve pre-production (gate 3) first, or reopen Production");
}

// ---------- Prompts ----------

/** The still's references: the scene's test frame (when it has an image) first, then up to four packshots, matching the product first. */
export function stillReferences(s: StudioState, piece: StudioPiece): { frame?: StudioAssetRef; packshots: StudioAssetRef[] } {
  const scene = stillScene(s, piece);
  const frame = fileOf(dep(s, piece, "test_frame"));
  const product = (pieceFields(textOf(s, scene?.id)).product || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const shots = s.brief.assets.packshots.filter((x) => x.mime.startsWith("image/"));
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const ranked = product ? [...shots.filter((x) => norm(x.name).includes(product)), ...shots.filter((x) => !norm(x.name).includes(product))] : shots;
  return { ...(frame?.mime.startsWith("image/") ? { frame } : {}), packshots: ranked.slice(0, 4) };
}
/**
 * The still prompt, built by code from the scene, mood board and continuity text, the brand colours and the ratio. Every line describes
 * the picture; the client's raw brief text is never passed as an instruction. On a rerun the open comments and instruction are added.
 */
export function buildStillPrompt(s: StudioState, piece: StudioPiece, rerun?: { comments: StudioComment[]; instruction?: string }): string {
  if (piece.kind !== "still") throw new Error("Only stills are drawn here");
  const scene = stillScene(s, piece);
  if (!scene?.versions.length) throw new Error("This still's scene has no text");
  const f = pieceFields(textOf(s, scene.id));
  const mood = dep(s, scene, "moodboard"), cont = dep(s, scene, "continuity");
  const mf = pieceFields(textOf(s, mood?.id)), cf = pieceFields(textOf(s, cont?.id));
  const colours = [...new Set([...s.brief.brandKit.colours, ...[...(textOf(s, mood?.id) || "").matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase())])].slice(0, 10);
  const ratio = stillRatio(piece);
  const refs = stillReferences(s, piece);
  const lines = ["Final photographic lifestyle still for a product advert. Every line below describes the picture."];
  lines.push(`Scene: ${line(f.scene || textOf(s, scene.id), 700)}`);
  if (f.setting) lines.push(`Setting: ${line(f.setting)}`);
  if (f["product placement"]) lines.push(`Product placement: ${line(f["product placement"])}`);
  if (f.product) lines.push(`Product shown: ${line(f.product, 120)}`);
  if (cf.lighting || mf.lighting) lines.push(`Lighting: ${line(cf.lighting || mf.lighting)}`);
  if (cf.camera || cf.lens) lines.push(`Camera: ${line([cf.camera, cf.lens].filter(Boolean).join(", "))}`);
  if (cf.grade) lines.push(`Grade: ${line(cf.grade, 200)}`);
  if (cf.rules) lines.push(`Continuity: ${line(cf.rules, 300)}`);
  if (mf.surfaces) lines.push(`Surfaces: ${line(mf.surfaces)}`);
  if (mf.props) lines.push(`Props: ${line(mf.props, 300)}`);
  if (mf["mood words"]) lines.push(`Mood: ${line(mf["mood words"], 200)}`);
  if (colours.length) lines.push(`Palette: ${colours.join(", ")}`);
  if (refs.frame || refs.packshots.length)
    lines.push(`Reference images: ${refs.frame ? "the first is the approved test frame: keep its composition, light and setting" : ""}${refs.frame && refs.packshots.length ? "; " : ""}${refs.packshots.length ? `${refs.frame ? "the others are" : "they are"} the client's product packshots: reproduce the product exactly (shape, colour, label and proportions), never redesign it` : ""}.`);
  lines.push(ratio.id === "4:5"
    ? "Format: portrait, drawn at 2:3 and cropped to 4:5 afterwards: keep the product and every important detail inside the central part of the frame, clear of the top and bottom 9 percent."
    : "Format: square 1:1, the product clear of the edges.");
  lines.push("Render no text, captions, logos, brand marks or watermarks, and no real, recognisable people.");
  if (rerun) {
    const open = rerun.comments.filter((c) => !c.resolved).slice(0, 12).map((c) => `- ${c.region ? areaWords(c.region) + ": " : ""}${line(c.text, 300)}`);
    const extra = line(rerun.instruction, 600);
    if (open.length || extra) lines.push("Changes requested for this version:", ...open, ...(extra ? [`- ${extra}`] : []));
  }
  return lines.join("\n").slice(0, 4000);
}
function areaWords(r: NonNullable<StudioComment["region"]>): string {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const h = cx < 1 / 3 ? "left" : cx < 2 / 3 ? "centre" : "right";
  const v = cy < 1 / 3 ? "top" : cy < 2 / 3 ? "middle" : "bottom";
  const where = v === "middle" && h === "centre" ? "centre" : v === "middle" ? `${h} side` : h === "centre" ? `${v} centre` : `${v}-${h}`;
  return `${where} ${r.w || r.h ? "area" : "point"}`;
}
/** The prompt for one motion loop: a five-second seamless loop of its scene, for any image-to-video tool. */
export function loopPrompt(s: StudioState, piece: StudioPiece): string {
  const scene = dep(s, piece, "scene");
  const f = pieceFields(textOf(s, scene?.id));
  const still = productionPieces(s).find((x) => x.kind === "still" && x.dependsOn.includes(scene?.id || "") && stillRatio(x).id === "4:5");
  return [
    `Motion loop for ${piece.title}`,
    `Length: ${LOOP_SECONDS} seconds, seamless loop (the last frame matches the first).`,
    "Aspect ratio: 4:5 portrait, at least 1080 x 1350; MP4 (H.264).",
    still && fileOf(still) ? `Start frame: the approved still "${still.title}" (download it from the pack and use it as the first frame).` : "Start frame: the scene's approved still once it is drawn.",
    `Scene: ${line(f.scene || textOf(s, scene?.id), 600)}`,
    f.setting ? `Setting: ${line(f.setting)}` : "",
    f.product ? `Product: ${line(f.product, 120)}; it stays still, sharp and exactly as in the packshot.` : "",
    "Movement: one gentle, natural motion only (steam, light shift, fabric, a slow push-in); no cuts, no text, no logos, no people.",
    "Disclosure: tag the upload as AI generated if the tool generated the motion.",
  ].filter(Boolean).join("\n");
}

/** The "Carries key message N: ..." line of a scene or narrative. */
export function carriedMessage(text: string | undefined): { n: number; text: string } | undefined {
  const m = /^Carries key message (\d+):?\s*(.*)$/im.exec(text || "");
  return m ? { n: Number(m[1]), text: `key message ${m[1]}${m[2] ? ": " + m[2].trim() : ""}` } : undefined;
}

// ---------- Hook pack prompt pack ----------

export type ScriptBeat = { start: number; end: number; visual: string; vo: string; onScreen: string; keyMessage?: number };
/** Body script beats from the script piece text ("0-5s | Visual: ... | VO: ... | On screen: ... | Key message 2"). */
export function scriptBeats(text: string | undefined): ScriptBeat[] {
  const out: ScriptBeat[] = [];
  for (const l of (text || "").split("\n")) {
    const m = /^(\d+)\s*-\s*(\d+)s\s*\|(.*)$/.exec(l.trim());
    if (!m) continue;
    const parts = Object.fromEntries(m[3].split("|").map((x) => x.trim()).map((x) => { const i = x.indexOf(":"); return i > 0 ? [x.slice(0, i).trim().toLowerCase(), x.slice(i + 1).trim()] : [x.toLowerCase(), ""]; }));
    const km = /key message (\d+)/i.exec(m[3]);
    out.push({ start: Number(m[1]), end: Number(m[2]), visual: parts.visual || "", vo: parts.vo || "", onScreen: parts["on screen"] || "", ...(km ? { keyMessage: Number(km[1]) } : {}) });
  }
  return out;
}
export type PromptPack = {
  title: string;
  fileBase?: string;
  shots: { at: string; prompt: string; vo: string; onScreen: string }[];
  voLines: string[];
  onScreen: string[];
  captions: { style: string; text: string };
  music: string;
  voice: string;
  narrative: { angle: string; proof: string; keyMessage: string };
  shotList: string;
  delivery: string[];
};
/**
 * The per-variant prompt pack: shot-by-shot prompts for any video tool (the hook's first three seconds, then the body beats), the
 * voice-over lines, on-screen text, captions and the music cue, all from the approved hook, narrative, script and voice notes.
 */
export function variantPromptPack(s: StudioState, piece: StudioPiece): PromptPack {
  if (piece.kind !== "variant") throw new Error("Prompt packs are written for Hook pack variants");
  const hook = variantHook(s, piece);
  const hf = pieceFields(textOf(s, hook?.id));
  const narrative = dep(s, hook, "narrative");
  const nf = pieceFields(textOf(s, narrative?.id));
  const script = dep(s, piece, "script") || s.pieces.find((x) => x.kind === "script");
  const voice = pieceFields(textOf(s, s.pieces.find((x) => x.kind === "voice_captions")?.id));
  const shotList = textOf(s, s.pieces.find((x) => x.kind === "shotlist")?.id) || "";
  const keyframe = dep(s, piece, "keyframe");
  const beats = scriptBeats(textOf(s, script?.id));
  const colours = s.brief.brandKit.colours.join(", ");
  const shots: PromptPack["shots"] = [{
    at: `0-${HOOK_SECONDS}s (hook)`,
    prompt: [line(hf["first 3 seconds"] || textOf(s, hook?.id), 600), hf.style ? `Hook style: ${hf.style}.` : "", keyframe && fileOf(keyframe) ? "Use the approved keyframe as the first frame." : "", "Vertical 9:16, subject centred, clear space top and bottom for captions."].filter(Boolean).join(" "),
    vo: line(hf["first vo line"], 240),
    onScreen: line(hf["on-screen text"], 120),
  }];
  for (const b of beats) shots.push({ at: `${b.start + HOOK_SECONDS}-${b.end + HOOK_SECONDS}s`, prompt: [line(b.visual, 500), "Vertical 9:16, same light, lens and grade as the hook.", colours ? `Brand colours: ${colours}.` : ""].filter(Boolean).join(" "), vo: line(b.vo, 240), onScreen: line(b.onScreen, 120) });
  if (!beats.length && script) shots.push({ at: `${HOOK_SECONDS}s onwards (body)`, prompt: line(textOf(s, script.id), 1500), vo: "", onScreen: "" });
  const voLines = shots.map((x) => x.vo).filter(Boolean);
  return {
    title: piece.title,
    shots,
    voLines,
    onScreen: shots.map((x) => x.onScreen).filter(Boolean),
    captions: { style: line(voice.captions, 300) || "Burned-in captions, two lines at most, high contrast", text: voLines.join(" ") },
    music: line(voice.music, 300) || "Not specified in the voice and captions notes",
    voice: line(voice.voice, 300) || "Not specified in the voice and captions notes",
    narrative: { angle: line(nf.angle, 300), proof: line(nf.proof, 300), keyMessage: line(carriedMessage(textOf(s, narrative?.id))?.text, 300) },
    shotList,
    delivery: [
      `About ${HOOK_SECONDS + (beats.at(-1)?.end || 20)} seconds: the ${HOOK_SECONDS}-second hook, then the ${beats.at(-1)?.end || 20}-second body; trim the body's opening if the cut must stay at 20 seconds.`,
      "Vertical 9:16, 1080 x 1920 or larger, MP4 (H.264, AAC sound).",
      "Captions burned in; sound on (voice-over and music).",
      "Keep text and the product inside each platform's safe zone (check the TikTok, Reels and Shorts overlay templates).",
      "Upload the finished MP4 on this variant's card and choose its AI disclosure (AI generated, AI edited or no AI).",
    ],
  };
}
/** The prompt pack as a Markdown document for download. */
export function promptPackMarkdown(pack: PromptPack, offerLabel = offerInfo("hook_pack")!.label): string {
  return [
    `# Prompt pack: ${pack.title}`,
    "",
    `${offerLabel}. ${pack.fileBase ? `File name: \`${pack.fileBase}.mp4\`` : ""}`,
    "",
    "## Narrative",
    `- Angle: ${pack.narrative.angle || "not set"}`,
    `- Key message: ${pack.narrative.keyMessage || "not set"}`,
    `- Proof: ${pack.narrative.proof || "not set"}`,
    "",
    "## Shots (prompts for any video tool)",
    ...pack.shots.flatMap((x, i) => [`### Shot ${i + 1}, ${x.at}`, x.prompt, ...(x.vo ? [`- VO: ${x.vo}`] : []), ...(x.onScreen ? [`- On screen: ${x.onScreen}`] : []), ""]),
    "## Voice-over lines",
    ...(pack.voLines.length ? pack.voLines.map((x) => `- ${x}`) : ["- None written"]),
    "",
    "## On-screen text",
    ...(pack.onScreen.length ? pack.onScreen.map((x) => `- ${x}`) : ["- None written"]),
    "",
    "## Captions",
    `- Style: ${pack.captions.style}`,
    `- Text: ${pack.captions.text || "None written"}`,
    "",
    "## Voice and music",
    `- Voice: ${pack.voice}`,
    `- Music cue: ${pack.music}`,
    "",
    ...(pack.shotList ? ["## Shot list", pack.shotList, ""] : []),
    "## Delivery",
    ...pack.delivery.map((x) => `- ${x}`),
    "",
  ].join("\n");
}
