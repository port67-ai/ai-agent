// Go-to-market checks, naming, test plan, delivery manifest, launch handoff and performance read-back for Stage 4 (piece C, CHG-0099).
// Pure and client-safe: the page shows the same results the server enforces at gate 4. Everything that can be computed is computed from
// the pieces; only what a person decides is stored in StudioState.gtm (confirmations, rights records, claim clearances, winners).
import type { Project, StudioAssetRef, StudioConfirmation, StudioGtm, StudioPiece, StudioState } from "./model";
import type { PerformanceRecord } from "./performance";
import { STUDIO_STAGES, STUDIO_STAGE_LABELS, currentStudioStage, offerInfo, pieceFields, registerStudioGateCheck, studioAssetPath, studioAssetRefs } from "./studio";
import {
  HOOK_SECONDS, LOOP_SECONDS, MAX_LOOPS, STILL_RATIOS, VARIANTS_EXPECTED, carriedMessage, fileOf, hookNumbers, productionPieces, sceneIndex, scriptBeats, stillQuantity, stillRatio,
  stillScene, textOf, variantHook,
} from "./studio-production";

// ---------- State helpers ----------

export const emptyGtm = (): StudioGtm => ({ rights: [], assetRights: {}, claimClearances: {}, specs: {}, safeZones: {}, productAccuracy: {}, winners: [] });
/** The stored records, or empty ones (never mutates). */
export const gtmOf = (s: StudioState): StudioGtm => ({ ...emptyGtm(), ...(s.gtm || {}) });
/** The stored records, created when missing (server, inside a transition). */
export function ensureGtm(s: StudioState): StudioGtm {
  s.gtm = gtmOf(s);
  return s.gtm;
}
/** Short, stable, non-secret fingerprint for confirmations (FNV-1a, two lanes). Not a security hash. */
export function fingerprint(value: unknown): string {
  const input = JSON.stringify(value);
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x85ebca6b);
  }
  return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}
export const confirmed = (c: StudioConfirmation | undefined, fp: string) => !!c && c.fingerprint === fp;
/** Pieces that carry a file to deliver: stills, loops and variants. */
export const deliverables = (s: StudioState) => productionPieces(s).filter((x) => x.kind === "still" || x.kind === "loop" || x.kind === "variant");
/** The fingerprint a per-piece confirmation is tied to: the piece, its current version and file. */
export const pieceFingerprint = (piece: StudioPiece) => `${piece.id}:${piece.versions.length}:${fileOf(piece)?.id || "none"}`;

// ---------- Naming ----------

export function slug(value: string, max = 24): string {
  const out = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "");
  return out || "x";
}
const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
const OFFER_SLUG: Record<StudioState["offer"], string> = { scene_pack: "scene-pack", hook_pack: "hook-pack" };
/**
 * Deterministic file name without extension: `<client>_<offer>_<narrative|scene>_<hook|ratio>_v<version>`, each part slugified.
 * Stills: scene number and ratio (scene03_4x5). Loops: scene number and loop number. Variants: narrative number and hook number with its
 * style (narrative2_hook3-split-screen). The version is the piece's current version (1 before anything is drawn or uploaded).
 */
export function fileBase(s: StudioState, piece: StudioPiece): string {
  const client = slug(s.brief.client.businessName || s.brief.project.name || "client", 30);
  const v = `v${Math.max(1, piece.versions.length)}`;
  let a = "piece", b = slug(piece.kind);
  if (piece.kind === "still") { a = `scene${pad(sceneIndex(s, stillScene(s, piece)?.id))}`; b = stillRatio(piece).slug; }
  else if (piece.kind === "loop") { a = `scene${pad(sceneIndex(s, piece.dependsOn[0]))}`; b = `loop${pad(Number(piece.id.replace(/\D/g, "")) || 0)}`; }
  else if (piece.kind === "variant") { const h = hookNumbers(variantHook(s, piece)); a = `narrative${h.narrative}`; b = `hook${h.hook}-${slug(h.style, 18)}`; }
  return [client, OFFER_SLUG[s.offer], a, b, v].join("_");
}
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov" };
export const fileName = (s: StudioState, piece: StudioPiece) => `${fileBase(s, piece)}.${EXT[fileOf(piece)?.mime || ""] || (piece.kind === "still" ? "png" : "mp4")}`;
/** The read-back key: the file name without the version, so results keep matching after a new version. */
export const variantKey = (s: StudioState, piece: StudioPiece) => fileBase(s, piece).replace(/_v\d+$/, "");

// ---------- Channels and disclosure ----------

export type ChannelFolder = { folder: string; channel: string; label: string; kinds: string[]; ratios?: string[] };
export function channelFolders(s: StudioState): ChannelFolder[] {
  return s.offer === "scene_pack"
    ? [
        { folder: "instagram-feed", channel: "instagram", label: "Instagram feed and carousels", kinds: ["still", "loop"], ratios: ["4:5", "1:1"] },
        { folder: "meta-ads", channel: "facebook", label: "Meta feed and catalogue ads", kinds: ["still", "loop"], ratios: ["4:5", "1:1"] },
        { folder: "pinterest", channel: "pinterest", label: "Pinterest", kinds: ["still"], ratios: ["4:5"] },
      ]
    : [
        { folder: "tiktok", channel: "tiktok", label: "TikTok", kinds: ["variant"] },
        { folder: "instagram-reels", channel: "instagram", label: "Instagram Reels", kinds: ["variant"] },
        { folder: "facebook-reels", channel: "facebook", label: "Facebook Reels", kinds: ["variant"] },
        { folder: "youtube-shorts", channel: "youtube", label: "YouTube Shorts", kinds: ["variant"] },
      ];
}
/** Per-channel AI disclosure lines (as understood in November 2026; check each platform's current rules before launch). */
export const DISCLOSURE_LINES: Record<string, string> = {
  tiktok: "TikTok: apply the AI-generated content (AIGC) label, or a clear caption or sticker disclaimer, to content that is significantly AI-generated.",
  meta: "Meta (Facebook and Instagram): the \"AI info\" label applies to ads created or significantly edited with AI; disclose it where Meta asks during upload.",
  youtube: "YouTube Shorts: use the altered or synthetic content setting for realistic content made or changed with AI.",
  pinterest: "Pinterest: Pinterest may label AI-generated or AI-modified images; check its current ad guidelines for AI imagery at upload.",
  eu: "EU AI Act Article 50: from 2 August 2026, image, audio or video content that is a deepfake (it resembles real people, objects, places or events and would falsely appear authentic) must be disclosed as artificially generated or manipulated. Clearly fantastical content is excluded; evidently artistic or fictional work has a lighter duty.",
};
export function disclosureLines(s: StudioState): string[] {
  return s.offer === "scene_pack" ? [DISCLOSURE_LINES.meta, DISCLOSURE_LINES.pinterest, DISCLOSURE_LINES.eu] : [DISCLOSURE_LINES.tiktok, DISCLOSURE_LINES.meta, DISCLOSURE_LINES.youtube, DISCLOSURE_LINES.eu];
}
export const DISCLOSURE_LABELS: Record<string, string> = { ai_generated: "AI generated", ai_edited: "AI edited", none: "No AI" };
const disclosureOf = (piece: StudioPiece) => fileOf(piece)?.aiDisclosure || piece.aiDisclosure || "none";

// ---------- Specs ----------

export type SpecRule = { label: string; ratios: { id: string; value: number }[]; minWidth: number; minHeight: number; recommendedWidth?: number; mimes: string[]; seconds?: [number, number] };
const R = { "4:5": 4 / 5, "1:1": 1, "9:16": 9 / 16 } as const;
export function specRule(piece: StudioPiece): SpecRule {
  if (piece.kind === "variant") return { label: "9:16 MP4, at least 1080 x 1920, 5 to 60 seconds", ratios: [{ id: "9:16", value: R["9:16"] }], minWidth: 1080, minHeight: 1920, mimes: ["video/mp4"], seconds: [5, 60] };
  if (piece.kind === "loop") return { label: `4:5, 1:1 or 9:16 MP4, at least 1080 px on the short side, about ${LOOP_SECONDS} seconds`, ratios: (["4:5", "1:1", "9:16"] as const).map((id) => ({ id, value: R[id] })), minWidth: 1080, minHeight: 1080, mimes: ["video/mp4"], seconds: [3, 8] };
  const r = stillRatio(piece);
  // Meta's minimum image width for feed ads is 600 px; 1080 px is the recommended width (a note, not a blocker).
  return { label: `${r.id} image, at least 600 px wide (1080 px recommended)`, ratios: [{ id: r.id, value: r.ratio }], minWidth: 600, minHeight: Math.round(600 / r.ratio), recommendedWidth: 1080, mimes: ["image/png", "image/jpeg", "image/webp"] };
}
export type SpecResult = { ok: boolean; problems: string[]; notes: string[]; size: string };
export function specCheck(piece: StudioPiece): SpecResult {
  const f = fileOf(piece);
  const rule = specRule(piece);
  if (!f) return { ok: false, problems: [piece.kind === "still" ? "Not drawn yet" : "Not uploaded yet"], notes: [], size: "none" };
  const problems: string[] = [], notes: string[] = [];
  if (!rule.mimes.includes(f.mime)) problems.push(`File type ${f.mime} (expected ${rule.mimes.join(" or ")})`);
  if (!f.width || !f.height) problems.push("Size unknown: the file's header could not be read (or it was stored before size checks); upload it again or confirm by hand");
  else {
    const ratio = f.width / f.height;
    const match = rule.ratios.find((x) => Math.abs(ratio - x.value) / x.value <= 0.015);
    if (!match) problems.push(`Aspect ratio ${f.width} x ${f.height} is not ${rule.ratios.map((x) => x.id).join(" or ")}`);
    const short = Math.min(f.width, f.height);
    if (piece.kind === "loop" ? short < rule.minWidth : f.width < rule.minWidth || f.height < rule.minHeight) problems.push(`Resolution ${f.width} x ${f.height} is below the minimum (${rule.label})`);
    if (rule.recommendedWidth && f.width < rule.recommendedWidth) notes.push(`${f.width} px wide: below the recommended ${rule.recommendedWidth} px; fine for most placements, upscale for print or large displays`);
  }
  if (rule.seconds) {
    if (f.seconds === undefined) notes.push("Length unknown");
    else if (f.seconds < rule.seconds[0] || f.seconds > rule.seconds[1]) problems.push(`Length ${f.seconds} s is outside ${rule.seconds[0]} to ${rule.seconds[1]} s`);
  }
  return { ok: problems.length === 0, problems, notes, size: f.width && f.height ? `${f.width} x ${f.height}${f.seconds !== undefined ? `, ${f.seconds} s` : ""}` : "unknown" };
}
/** Safe zones are checked by a person against each platform's own overlay template (published margins disagree, so none are coded). */
export const needsSafeZone = (piece: StudioPiece) => piece.kind === "variant" || piece.kind === "loop";

// ---------- Claims ----------

export type ClaimFlag = { id: string; pieceId: string; pieceTitle: string; kind: "no_key_message" | "unknown_key_message" | "absolute" | "before_after" | "price"; text: string; why: string };
const ABSOLUTE: [RegExp, string][] = [
  [/\bbest\b/i, "best"], [/\bnumber\s*(?:1|one)\b/i, "number 1"], [/#\s?1\b/, "#1"], [/\bno\.\s?1\b/i, "no. 1"], [/\bguarantee(?:d|s)?\b/i, "guaranteed"],
  [/\binstant(?:ly)?\b/i, "instantly"], [/\bcure(?:s|d)?\b/i, "cure"], [/\bmiracle\b/i, "miracle"], [/\b100\s?%/, "100%"], [/\bclinically proven\b/i, "clinically proven"],
  [/\bworld'?s (?:first|best|leading)\b/i, "world's first or best"], [/\bunbeatable\b/i, "unbeatable"], [/\brisk[- ]free\b/i, "risk-free"], [/\bperfect\b/i, "perfect"],
];
const BEFORE_AFTER = /\bbefore\s*(?:and|&|\/|-)\s*after\b|\btransformation\b/i;
const PRICE = /[£$€]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:%|percent)\s*(?:off|discount)|\b(?:save|saving)\s+[£$€]?\d[\d,]*(?:\.\d+)?%?|\d[\d,]*(?:\.\d+)?\s?(?:GBP|USD|EUR)\b|\bhalf[- ]price\b/gi;
const digits = (v: string) => (v.match(/\d+(?:\.\d+)?/g) || []).map((x) => x.replace(/\.0+$/, ""));
type ClaimLine = { pieceId: string; text: string; keyMessage?: number | null };
/** The claim-bearing lines: scene messages, script beats and claims, narrative proof, hook voice-over and on-screen text, production text. */
function claimLines(s: StudioState): { lines: ClaimLine[]; pieces: StudioPiece[] } {
  const production = productionPieces(s);
  // Only pieces that feed the pack: production pieces and everything they depend on (all claim pieces before production is prepared).
  const scope = new Set<string>();
  const walk = (id: string) => { if (scope.has(id)) return; scope.add(id); s.pieces.find((x) => x.id === id)?.dependsOn.forEach(walk); };
  production.forEach((x) => walk(x.id));
  const pieces = s.pieces.filter((x) => (production.length ? scope.has(x.id) : true) && x.versions.at(-1)?.text);
  const lines: ClaimLine[] = [];
  const narrativeKm = (id: string | undefined) => carriedMessage(textOf(s, id))?.n ?? null;
  for (const piece of pieces) {
    const text = piece.versions.at(-1)!.text!;
    const f = pieceFields(text);
    if (piece.kind === "scene") {
      const km = carriedMessage(text)?.n ?? null;
      if (f.message) lines.push({ pieceId: piece.id, text: f.message, keyMessage: km });
      if (f.scene) lines.push({ pieceId: piece.id, text: f.scene });
    } else if (piece.kind === "script") {
      for (const b of scriptBeats(text)) {
        if (b.vo) lines.push({ pieceId: piece.id, text: b.vo, keyMessage: b.keyMessage ?? null });
        if (b.onScreen) lines.push({ pieceId: piece.id, text: b.onScreen, keyMessage: b.keyMessage ?? null });
      }
      for (const l of text.split("\n").slice(text.split("\n").indexOf("Claims:") + 1)) {
        if (!l.startsWith("- ") || text.split("\n").indexOf("Claims:") < 0) continue;
        const km = /\(key message (\d+)/i.exec(l);
        lines.push({ pieceId: piece.id, text: l.slice(2).replace(/\s*\(key message.*\)\s*$/i, ""), keyMessage: km ? Number(km[1]) : null });
      }
    } else if (piece.kind === "narrative") {
      if (f.proof) lines.push({ pieceId: piece.id, text: f.proof, keyMessage: carriedMessage(text)?.n ?? null });
    } else if (piece.kind === "hook") {
      const km = narrativeKm(piece.dependsOn.find((d) => s.pieces.find((x) => x.id === d)?.kind === "narrative"));
      if (f["first vo line"]) lines.push({ pieceId: piece.id, text: f["first vo line"], keyMessage: km });
      if (f["on-screen text"]) lines.push({ pieceId: piece.id, text: f["on-screen text"], keyMessage: km });
    } else if (piece.stage === "production") {
      for (const l of text.split("\n").map((x) => x.trim()).filter(Boolean)) lines.push({ pieceId: piece.id, text: l });
    }
  }
  return { lines, pieces };
}
/**
 * Claim flags: every claim must link to an approved key message; absolute or superlative words, before-and-after framing (and
 * split-screen comparison hooks) and any price or discount figure that is not in the brief's offer are flagged for a person to clear.
 */
export function claimFlags(s: StudioState, p?: Pick<Project, "strategies">): ClaimFlag[] {
  const direction = p?.strategies.filter((x) => x.status === "approved").at(-1);
  const kmCount = direction?.keyMessages?.length;
  const offerFigures = new Set(digits(s.brief.product.offer));
  const { lines } = claimLines(s);
  const flags = new Map<string, ClaimFlag>();
  const title = (id: string) => s.pieces.find((x) => x.id === id)?.title || "Piece";
  const add = (l: ClaimLine, kind: ClaimFlag["kind"], why: string, snippet = l.text) => {
    const id = `${kind}:${l.pieceId}:${fingerprint(snippet.toLowerCase())}`;
    if (!flags.has(id)) flags.set(id, { id, pieceId: l.pieceId, pieceTitle: title(l.pieceId), kind, text: snippet.slice(0, 300), why });
  };
  for (const l of lines) {
    if (l.keyMessage === null) add(l, "no_key_message", "Not linked to an approved key message");
    else if (l.keyMessage !== undefined && kmCount !== undefined && (l.keyMessage < 1 || l.keyMessage > kmCount)) add(l, "unknown_key_message", `Names key message ${l.keyMessage}, but the approved direction has ${kmCount}`);
    for (const [re, word] of ABSOLUTE) if (re.test(l.text)) add(l, "absolute", `Absolute or superlative word: "${word}" needs proof or softer wording`);
    if (BEFORE_AFTER.test(l.text)) add(l, "before_after", "Before-and-after framing: most ad platforms restrict it, especially for health and beauty");
    for (const m of l.text.match(PRICE) || []) {
      const ds = digits(m);
      if (/half/i.test(m) || ds.some((d) => !offerFigures.has(d))) add(l, "price", `Price or discount "${m.trim()}" is not in the brief's offer${s.brief.product.offer ? ` ("${s.brief.product.offer.slice(0, 80)}")` : ""}`, m.trim() + " | " + l.text);
    }
  }
  for (const hook of s.pieces.filter((x) => x.kind === "hook" && x.versions.length && (!productionPieces(s).length || productionPieces(s).some((v) => v.dependsOn.includes(x.id))))) {
    if (/split-screen/i.test(pieceFields(hook.versions.at(-1)!.text).style || hook.title)) add({ pieceId: hook.id, text: hook.title }, "before_after", "Split-screen comparison hook: check it does not imply a before-and-after result");
  }
  return [...flags.values()];
}

// ---------- The checklist ----------

export type GtmState = "pass" | "needs_you" | "blocked" | "info";
export type GtmItem = { id: string; text: string; state: GtmState; pieceId?: string; assetId?: string; flagId?: string };
export type GtmCheckId = "scope" | "rights" | "claims" | "disclosure" | "specs" | "safe_zones" | "product" | "naming" | "delivery" | "handoff" | "readback" | "next_cycle";
export type GtmCheck = { id: GtmCheckId; label: string; state: GtmState; blocking: boolean; summary: string; items: GtmItem[] };
export const GTM_LABELS: Record<GtmCheckId, string> = {
  scope: "Scope and revision rounds", rights: "Rights and consent", claims: "Claims", disclosure: "AI disclosure", specs: "Channel specs", safe_zones: "Safe zones",
  product: "Product accuracy", naming: "Variant naming and test plan", delivery: "Delivery pack", handoff: "Launch handoff", readback: "Performance read-back", next_cycle: "Next cycle",
};
const worst = (items: GtmItem[]): GtmState => (items.some((x) => x.state === "blocked") ? "blocked" : items.some((x) => x.state === "needs_you") ? "needs_you" : "pass");
/** The scope a producer confirms: what the offer delivers in this project. */
export function scopeSummary(s: StudioState): string[] {
  const pieces = deliverables(s);
  const count = (kind: string) => pieces.filter((x) => x.kind === kind).length;
  const offer = offerInfo(s.offer)!;
  const revisions = pieces.reduce((n, x) => n + Math.max(0, x.versions.length - 1), 0);
  return s.offer === "scene_pack"
    ? [
        `${offer.label}: ${stillQuantity(s)} stills in scope (intake quantity, default 25), ${count("still")} planned, at ${STILL_RATIOS.map((r) => r.id).join(" and ")}`,
        `Motion loops (option, up to ${MAX_LOOPS}): ${count("loop")} planned`,
        `Channels: ${offer.channelNotes.join(", ")}`,
        `Revisions so far: ${revisions} extra version${revisions === 1 ? "" : "s"} of production pieces; the app sets no round limit, so record the rounds agreed with the client in the confirmation note`,
      ]
    : [
        `${offer.label}: ${VARIANTS_EXPECTED} variants (3 narratives x 4 hooks), ${count("variant")} planned, 9:16 MP4 with burned-in captions and sound`,
        `Each variant: a ${HOOK_SECONDS}-second hook and the 20-second body story`,
        `Channels: ${offer.channelNotes.join(", ")}`,
        `Revisions so far: ${revisions} extra version${revisions === 1 ? "" : "s"} of production pieces; the app sets no round limit, so record the rounds agreed with the client in the confirmation note`,
      ];
}
export const scopeFingerprint = (s: StudioState) => fingerprint({ offer: s.offer, quantity: stillQuantity(s), pieces: deliverables(s).map((x) => x.id).sort() });
export const disclosureFingerprint = (s: StudioState) => fingerprint(deliverables(s).map((x) => [x.id, x.versions.length, disclosureOf(x)]));
const effectiveRights = (g: StudioGtm, ref: StudioAssetRef) => (ref.rights?.source && ref.rights?.licence ? ref.rights : g.assetRights[ref.id]);

export type GtmContext = Pick<Project, "id" | "strategies"> & Partial<Pick<Project, "performance">>;
export function gtmChecks(s: StudioState, p?: GtmContext): GtmCheck[] {
  const g = gtmOf(s);
  const pieces = deliverables(s);
  const withFile = pieces.filter((x) => fileOf(x));
  const noPieces: GtmItem[] = pieces.length ? [] : [{ id: "none", text: "Prepare production first", state: "blocked" }];
  const checks: GtmCheck[] = [];
  const push = (id: GtmCheckId, blocking: boolean, items: GtmItem[], summary: string, state = worst(items)) => checks.push({ id, label: GTM_LABELS[id], state, blocking, summary, items });

  // Scope
  const scopeOk = confirmed(g.scope, scopeFingerprint(s));
  push("scope", true, [...noPieces, ...scopeSummary(s).map((t, i) => ({ id: `scope-${i}`, text: t, state: "info" as const })), ...(pieces.length ? [{ id: "confirm", text: scopeOk ? `Confirmed by ${g.scope!.by}${g.scope!.note ? `: ${g.scope!.note}` : ""}` : g.scope ? "The pack changed since the scope was confirmed: confirm it again" : "Confirm the scope and record the revision rounds agreed", state: scopeOk ? ("pass" as const) : ("needs_you" as const) }] : [])],
    scopeOk ? "Confirmed" : "Producer confirmation needed");

  // Rights
  const b = s.brief;
  const inputs: [string, StudioAssetRef][] = [...(b.brandKit.logo ? [["Logo", b.brandKit.logo] as [string, StudioAssetRef]] : []), ...b.assets.packshots.map((x) => ["Packshot", x] as [string, StudioAssetRef]), ...b.references.mood.map((x) => ["Mood image", x] as [string, StudioAssetRef]), ...b.assets.clips.map((x) => ["Clip", x] as [string, StudioAssetRef])];
  const rightsItems: GtmItem[] = [];
  for (const [label, ref] of inputs) {
    const r = effectiveRights(g, ref);
    rightsItems.push({ id: `in-${ref.id}`, assetId: ref.id, text: `${label} ${ref.name}: ${r ? `${r.source}; ${r.licence}` : "source and licence missing"}`, state: r ? "pass" : "needs_you" });
  }
  for (const piece of withFile) {
    const ref = fileOf(piece)!, r = effectiveRights(g, ref);
    rightsItems.push({ id: `out-${ref.id}`, assetId: ref.id, pieceId: piece.id, text: `${piece.title}: ${r ? `${r.source}; ${r.licence}` : "source and licence missing (add them below)"}`, state: r ? "pass" : "needs_you" });
  }
  for (const r of g.rights) rightsItems.push({ id: `rec-${r.id}`, text: `${r.kind}: ${r.name}: ${r.source}; ${r.licence}${r.usedIn ? ` (used in ${r.usedIn})` : ""}`, state: "pass" });
  if (s.offer === "hook_pack" && !g.rights.some((r) => r.kind === "music" || r.kind === "voice"))
    rightsItems.push({ id: "sound", text: "Sound: record the music and voice-over used in the variants (kind music or voice, with source and licence)", state: "needs_you" });
  if (s.offer === "hook_pack") for (const font of b.brandKit.fonts) if (!g.rights.some((r) => r.kind === "font" && r.name.toLowerCase() === font.toLowerCase()))
    rightsItems.push({ id: `font-${slug(font)}`, text: `Font ${font} (used in burned-in captions): record its licence`, state: "needs_you" });
  push("rights", true, [...noPieces, ...rightsItems], rightsItems.some((x) => x.state === "needs_you") ? "Missing rights block delivery" : "Every asset has a source and licence");

  // Claims
  const flags = claimFlags(s, p);
  const claimItems: GtmItem[] = flags.map((f) => {
    const c = g.claimClearances[f.id];
    return { id: f.id, flagId: f.id, pieceId: f.pieceId, text: `${f.pieceTitle}: "${f.text}": ${f.why}${c ? `. Cleared by ${c.by}: ${c.reason}` : ""}`, state: c ? "pass" : "needs_you" };
  });
  const open = claimItems.filter((x) => x.state === "needs_you").length;
  push("claims", true, claimItems, flags.length ? (open ? `${open} of ${flags.length} flag${flags.length === 1 ? "" : "s"} to clear` : `${flags.length} flag${flags.length === 1 ? "" : "s"} cleared with a reason`) : "No flags: every claim links to an approved key message");

  // Disclosure
  const keyframeAi = (piece: StudioPiece) => piece.dependsOn.some((d) => { const x = s.pieces.find((y) => y.id === d); return (x?.kind === "keyframe" || x?.kind === "test_frame") && fileOf(x)?.aiDisclosure === "ai_generated"; });
  const discItems: GtmItem[] = [...noPieces, ...withFile.map((x) => ({ id: `tag-${x.id}`, pieceId: x.id, text: `${x.title}: ${DISCLOSURE_LABELS[disclosureOf(x)]}${disclosureOf(x) === "none" && keyframeAi(x) ? " (it was made from an AI-generated frame: check the tag)" : ""}`, state: "info" as const })), ...disclosureLines(s).map((t, i) => ({ id: `line-${i}`, text: t, state: "info" as const }))];
  const discOk = confirmed(g.disclosure, disclosureFingerprint(s));
  if (withFile.length) discItems.push({ id: "confirm", text: discOk ? `Confirmed by ${g.disclosure!.by}` : g.disclosure ? "Tags or files changed since the disclosure was confirmed: confirm again" : "Confirm the tags and the channel disclosure lines", state: discOk ? "pass" : "needs_you" });
  else if (pieces.length) discItems.push({ id: "files", text: "No files yet: draw or upload the pieces first", state: "blocked" });
  push("disclosure", true, discItems, discOk ? "Confirmed" : "Producer confirmation needed");

  // Specs, safe zones, product accuracy (per piece, tied to its current version)
  const per = (map: Record<string, StudioConfirmation>, filter: (x: StudioPiece) => boolean, describe: (x: StudioPiece) => { ok: boolean; text: string }): GtmItem[] =>
    pieces.filter(filter).map((x) => {
      if (!fileOf(x)) return { id: x.id, pieceId: x.id, text: `${x.title}: ${x.kind === "still" ? "not drawn yet" : "not uploaded yet"}`, state: "blocked" as const };
      const d = describe(x);
      const c = confirmed(map[x.id], pieceFingerprint(x));
      return { id: x.id, pieceId: x.id, text: `${x.title}: ${d.text}${c ? `. Confirmed by ${map[x.id].by}${map[x.id].note ? `: ${map[x.id].note}` : ""}` : ""}`, state: d.ok || c ? ("pass" as const) : ("needs_you" as const) };
    });
  const specItems = per(g.specs, () => true, (x) => { const r = specCheck(x); return { ok: r.ok, text: r.ok ? `${r.size} meets ${specRule(x).label}${r.notes.length ? ` (${r.notes.join("; ")})` : ""}` : `${r.problems.join("; ")}` }; });
  push("specs", true, [...noPieces, ...specItems], specItems.every((x) => x.state === "pass") && pieces.length ? "Every file meets its channel spec or is confirmed" : "Files outside spec need a new file or a confirmed exception");
  const safeItems = per(g.safeZones, needsSafeZone, () => ({ ok: false, text: "check text, captions and product against the TikTok, Reels and Shorts overlay templates" }));
  push("safe_zones", true, safeItems, safeItems.length ? (safeItems.every((x) => x.state === "pass") ? "Checked against each platform's overlay" : "Producer check against each platform's overlay template") : "No video in this pack", safeItems.length ? worst(safeItems) : "pass");
  const productItems = per(g.productAccuracy, () => true, () => ({ ok: false, text: "spot-check the product (shape, colour, label, proportions) against the packshots" }));
  push("product", true, [...noPieces, ...productItems], "Producer spot check per piece; an automatic vision check is not built");

  // Naming and test plan
  push("naming", false, pieces.map((x) => ({ id: x.id, pieceId: x.id, text: fileName(s, x), state: "pass" as const })), pieces.length ? `${pieces.length} deterministic file names; test matrix ready as CSV` : "Names appear when production is prepared", pieces.length ? "pass" : "info");

  // Delivery pack
  let manifest: DeliveryManifest | undefined, manifestError = "";
  try { manifest = deliveryManifest(s, p || { id: "", strategies: [] }); } catch (e) { manifestError = e instanceof Error ? e.message : "The delivery pack could not be built"; }
  push("delivery", true, manifest ? [{ id: "files", text: `${manifest.files.length} approved file${manifest.files.length === 1 ? "" : "s"} in ${manifest.folders.filter((f) => f.files.length).length} channel folders${manifest.notIncluded.length ? `; ${manifest.notIncluded.length} not included yet (not approved or no file)` : ""}`, state: manifest.notIncluded.length ? "needs_you" : "pass" }] : [{ id: "error", text: manifestError, state: "blocked" }], manifest ? "The manifest builds from approved final versions" : "Not buildable yet");
  push("handoff", false, [{ id: "doc", text: "Test plan and upload notes for the media buyer, downloadable as Markdown", state: "info" }], "Ready to download", "info");
  push("readback", false, [{ id: "rb", text: currentStudioStage(s) === "delivered" ? "Enter results per variant (or import the CSV) to see hook rate, hold rate, click-through and cost per purchase" : "Available once the project is delivered", state: "info" }], "Uses the campaign results entry and CSV import", "info");
  push("next_cycle", false, [{ id: "nc", text: g.nextCycle ? `Next cycle started: project ${g.nextCycle.projectId}` : currentStudioStage(s) === "delivered" ? "Mark the winners, then start the next cycle" : "Available once the project is delivered", state: "info" }], g.nextCycle ? "Started" : "After delivery", "info");
  return checks;
}
/** Gate 4: what blocks a plain approval of Production. */
export function productionGateBlockers(s: StudioState, p?: Project): string[] {
  const pieces = deliverables(s);
  if (!pieces.length) return ["Prepare production first"];
  const out: string[] = [];
  const missing = pieces.filter((x) => !fileOf(x)).length;
  if (missing) out.push(`${missing} piece${missing === 1 ? " has" : "s have"} no file yet (draw or upload ${missing === 1 ? "it" : "them"})`);
  const by = (st: StudioPiece["status"]) => pieces.filter((x) => x.status === st && x.versions.length).length;
  if (by("draft")) out.push(`${by("draft")} production piece${by("draft") === 1 ? " is" : "s are"} still in draft`);
  if (by("changes_requested")) out.push(`${by("changes_requested")} production piece${by("changes_requested") === 1 ? " has" : "s have"} changes requested`);
  if (by("stale")) out.push(`${by("stale")} production piece${by("stale") === 1 ? " is" : "s are"} out of date`);
  for (const c of gtmChecks(s, p)) if (c.blocking && c.state !== "pass" && c.state !== "info") out.push(`Go-to-market, ${c.label.toLowerCase()}: ${c.summary}`);
  return out;
}
registerStudioGateCheck("production", productionGateBlockers);

// ---------- Delivery manifest ----------

export type ManifestFile = {
  fileName: string; pieceId: string; title: string; kind: string; version: number; ratio?: string; mime: string; bytes: number; width?: number; height?: number; seconds?: number;
  aiDisclosure: string; rights?: { source: string; licence: string }; download: string; headline: string; primaryText: string; captions?: string; winner: boolean;
};
export type DeliveryManifest = {
  project: { id: string; name: string; client: string; offer: string; offerLabel: string };
  status: "delivered" | "in_production";
  deliveredAt?: string; approvedBy?: string; onBehalfOfClient?: boolean;
  folders: { folder: string; label: string; files: string[] }[];
  files: ManifestFile[];
  notIncluded: { title: string; reason: string }[];
  disclosure: { lines: string[]; confirmedBy?: string };
  rights: { inputs: { name: string; source: string; licence: string }[]; records: { kind: string; name: string; source: string; licence: string }[] };
  gateNotes: { stage: string; status: string; approvedBy?: string; onBehalfOfClient?: boolean; note?: string; gaps?: string[] }[];
  claimClearances: { text: string; reason: string; by: string }[];
};
const cta = (s: StudioState) => s.brief.product.cta.trim();
/** Suggested headline and primary text from approved material only (scene message, hook and key message, the call to action). */
function adCopy(s: StudioState, piece: StudioPiece): { headline: string; primaryText: string; captions?: string } {
  if (piece.kind === "variant") {
    const hook = variantHook(s, piece);
    const hf = pieceFields(textOf(s, hook?.id));
    const narrative = hook?.dependsOn.map((d) => s.pieces.find((x) => x.id === d)).find((x) => x?.kind === "narrative");
    const km = carriedMessage(textOf(s, narrative?.id))?.text.replace(/^key message \d+:\s*/, "") || "";
    const beats = scriptBeats(textOf(s, s.pieces.find((x) => x.kind === "script")?.id));
    return { headline: (hf["on-screen text"] || km).slice(0, 80), primaryText: [hf["first vo line"], km, cta(s)].filter(Boolean).join(" ").slice(0, 500), captions: [hf["first vo line"], ...beats.map((x) => x.vo)].filter(Boolean).join(" ").slice(0, 1200) };
  }
  const scene = piece.kind === "still" ? stillScene(s, piece) : s.pieces.find((x) => x.id === piece.dependsOn[0]);
  const f = pieceFields(textOf(s, scene?.id));
  return { headline: (f.message || "").slice(0, 80), primaryText: [f.message, cta(s)].filter(Boolean).join(" ").slice(0, 500) };
}
/**
 * The delivery manifest: approved final versions only, per channel folder, with captions and suggested ad copy, disclosure notes, rights,
 * gate notes and the gaps recorded by approvals with a note, and download links through the authorised asset route. Throws when nothing
 * is approved yet.
 */
export function deliveryManifest(s: StudioState, p: Pick<Project, "id">): DeliveryManifest {
  const g = gtmOf(s);
  const pieces = deliverables(s);
  const files: ManifestFile[] = [];
  const notIncluded: DeliveryManifest["notIncluded"] = [];
  for (const piece of pieces) {
    const f = fileOf(piece);
    if (!f) { notIncluded.push({ title: piece.title, reason: piece.kind === "still" ? "not drawn" : "not uploaded" }); continue; }
    if (piece.status !== "approved") { notIncluded.push({ title: piece.title, reason: piece.status === "stale" ? "out of date" : piece.status === "changes_requested" ? "changes requested" : "not approved yet" }); continue; }
    const r = f.rights?.source && f.rights.licence ? f.rights : g.assetRights[f.id];
    files.push({
      fileName: fileName(s, piece), pieceId: piece.id, title: piece.title, kind: piece.kind, version: piece.versions.length, ...(piece.kind === "still" ? { ratio: stillRatio(piece).id } : {}),
      mime: f.mime, bytes: f.bytes, ...(f.width ? { width: f.width, height: f.height } : {}), ...(f.seconds !== undefined ? { seconds: f.seconds } : {}),
      aiDisclosure: disclosureOf(piece), ...(r ? { rights: { source: r.source, licence: r.licence } } : {}), download: `${studioAssetPath(p.id, f.id)}?download=1`,
      ...adCopy(s, piece), winner: g.winners.includes(piece.id),
    });
  }
  if (!files.length) throw new Error(pieces.length ? "No approved final pieces with a file yet: approve the drawn or uploaded pieces first" : "Prepare production first");
  const folders = channelFolders(s).map((c) => ({ folder: c.folder, label: c.label, files: files.filter((x) => c.kinds.includes(x.kind) && (!c.ratios || x.kind !== "still" || c.ratios.includes(x.ratio!))).map((x) => x.fileName) }));
  const gate = s.gates.production;
  const delivered = currentStudioStage(s) === "delivered";
  const inputs = studioAssetRefs({ ...s, pieces: [] }).map((x) => { const r = x.rights?.source && x.rights.licence ? x.rights : g.assetRights[x.id]; return { name: x.name, source: r?.source || "missing", licence: r?.licence || "missing" }; });
  return {
    project: { id: p.id, name: s.brief.project.name, client: s.brief.client.businessName, offer: s.offer, offerLabel: offerInfo(s.offer)!.label },
    status: delivered ? "delivered" : "in_production",
    ...(delivered ? { deliveredAt: gate.approvedAt, approvedBy: gate.approvedBy, onBehalfOfClient: !!gate.onBehalfOfClient } : {}),
    folders,
    files,
    notIncluded,
    disclosure: { lines: disclosureLines(s), ...(g.disclosure ? { confirmedBy: g.disclosure.by } : {}) },
    rights: { inputs, records: g.rights.map((r) => ({ kind: r.kind, name: r.name, source: r.source, licence: r.licence })) },
    gateNotes: STUDIO_STAGES.map((st) => s.gates[st]).filter((x) => x.status !== "locked").map((x) => ({ stage: STUDIO_STAGE_LABELS[x.stage], status: x.status, ...(x.approvedBy ? { approvedBy: x.approvedBy } : {}), ...(x.onBehalfOfClient ? { onBehalfOfClient: true } : {}), ...(x.note ? { note: x.note } : {}), ...(x.gaps?.length ? { gaps: x.gaps } : {}) })),
    claimClearances: Object.values(g.claimClearances).map((c) => ({ text: c.text, reason: c.reason, by: c.by })),
  };
}
const mdEscape = (v: string) => v.replace(/\|/g, "\\|").replace(/\n/g, " ");
export function manifestMarkdown(m: DeliveryManifest): string {
  const out = [
    `# Delivery pack: ${m.project.client} ${m.project.name ? `(${m.project.name})` : ""}`.trim(),
    "",
    `${m.project.offerLabel}. Status: ${m.status === "delivered" ? `delivered${m.deliveredAt ? ` on ${m.deliveredAt.slice(0, 10)}` : ""}${m.approvedBy ? `, approved by ${m.approvedBy}` : ""}` : "in production (not yet approved by the client)"}.`,
    "",
    "Approved final versions only. Download each file from the link (sign-in required).",
    "",
    "## Files by channel folder",
    ...m.folders.flatMap((f) => [`### ${f.folder} (${f.label})`, ...(f.files.length ? f.files.map((x) => `- ${x}`) : ["- No files"]), ""]),
    "## Files",
    "| File | Piece | Size | AI disclosure | Rights | Download |",
    "|---|---|---|---|---|---|",
    ...m.files.map((x) => `| ${x.fileName}${x.winner ? " (winner)" : ""} | ${mdEscape(x.title)} v${x.version} | ${x.width ? `${x.width} x ${x.height}` : "unknown"}${x.seconds !== undefined ? `, ${x.seconds} s` : ""} | ${DISCLOSURE_LABELS[x.aiDisclosure] || x.aiDisclosure} | ${x.rights ? mdEscape(`${x.rights.source}; ${x.rights.licence}`) : "missing"} | ${x.download} |`),
    "",
    "## Captions and ad copy (suggested from approved material; check before upload)",
    ...m.files.flatMap((x) => [`### ${x.fileName}`, `- Headline: ${x.headline || "none"}`, `- Primary text: ${x.primaryText || "none"}`, ...(x.captions ? [`- Captions: ${x.captions}`] : []), ""]),
    "## AI disclosure",
    ...m.disclosure.lines.map((x) => `- ${x}`),
    m.disclosure.confirmedBy ? `- Tags confirmed by ${m.disclosure.confirmedBy}.` : "- Tags not confirmed yet.",
    "",
    "## Rights",
    ...m.rights.inputs.map((x) => `- Input ${x.name}: ${x.source}; ${x.licence}`),
    ...m.rights.records.map((x) => `- ${x.kind} ${x.name}: ${x.source}; ${x.licence}`),
    "",
    "## Gate notes and gaps",
    ...m.gateNotes.map((x) => `- ${x.stage}: ${x.status}${x.approvedBy ? `, by ${x.approvedBy}` : ""}${x.onBehalfOfClient ? " (on behalf of the client)" : ""}${x.note ? `. Note: ${x.note}` : ""}${x.gaps?.length ? `. Outstanding at approval: ${x.gaps.join("; ")}` : ""}`),
    "",
    ...(m.claimClearances.length ? ["## Claims cleared with a reason", ...m.claimClearances.map((x) => `- "${x.text}": ${x.reason} (${x.by})`), ""] : []),
    ...(m.notIncluded.length ? ["## Not included", ...m.notIncluded.map((x) => `- ${x.title}: ${x.reason}`), ""] : []),
  ];
  return out.join("\n");
}

// ---------- Test matrix and launch handoff ----------

const csvCell = (v: unknown) => { const t = String(v ?? ""); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
export type MatrixRow = { fileName: string; variant: string; kind: string; group: string; position: string; style: string; product: string; keyMessage: string; testA: string; questionA: string; testB: string; questionB: string; channels: string };
/** Which variants compare which hook (Hook pack) or which scenes and ratios (Scene Pack). */
export function testMatrix(s: StudioState): MatrixRow[] {
  const channels = channelFolders(s).map((c) => c.folder).join(" ");
  return deliverables(s).map((piece) => {
    const base = { fileName: fileName(s, piece), variant: variantKey(s, piece), kind: piece.kind, channels };
    if (piece.kind === "variant") {
      const h = hookNumbers(variantHook(s, piece));
      const narrative = variantHook(s, piece)?.dependsOn.map((d) => s.pieces.find((x) => x.id === d)).find((x) => x?.kind === "narrative");
      return { ...base, group: `narrative ${h.narrative}`, position: `hook ${h.hook}`, style: h.style, product: "", keyMessage: carriedMessage(textOf(s, narrative?.id))?.text || "",
        testA: `hook-test-N${h.narrative}`, questionA: `Which of the 4 hooks of narrative ${h.narrative} holds attention best (same story, different first 3 seconds)?`,
        testB: `narrative-test-H${h.hook}`, questionB: `Which narrative works best when the hook position is the same (hook ${h.hook} across narratives 1 to 3)?` };
    }
    const scene = piece.kind === "still" ? stillScene(s, piece) : s.pieces.find((x) => x.id === piece.dependsOn[0]);
    const f = pieceFields(textOf(s, scene?.id));
    const n = sceneIndex(s, scene?.id);
    const ratio = piece.kind === "still" ? stillRatio(piece).id : "loop";
    return { ...base, group: `scene ${n}`, position: ratio, style: f.theme || "", product: f.product || "", keyMessage: carriedMessage(textOf(s, scene?.id))?.text || "",
      testA: `scene-test-${slug(f.product || "product", 20)}-${ratio.replace(":", "x")}`, questionA: `Which scene sells ${f.product || "the product"} best at ${ratio} (themes compared for the same product)?`,
      testB: `placement-${ratio.replace(":", "x")}`, questionB: ratio === "loop" ? "Does motion lift results over the still of the same scene?" : `How does ${ratio} perform in its placement (${ratio === "4:5" ? "feed" : "carousel and catalogue"})?` };
  });
}
export function testMatrixCsv(s: StudioState): string {
  const rows = testMatrix(s);
  return toCsv([["file_name", "variant", "kind", "narrative_or_scene", "hook_or_ratio", "hook_style_or_theme", "product", "key_message", "test_a_cell", "test_a_question", "test_b_cell", "test_b_question", "channels"], ...rows.map((r) => [r.fileName, r.variant, r.kind, r.group, r.position, r.style, r.product, r.keyMessage, r.testA, r.questionA, r.testB, r.questionB, r.channels])]);
}
export function handoffMarkdown(s: StudioState, p: Pick<Project, "id">): string {
  const offer = offerInfo(s.offer)!;
  const rows = testMatrix(s);
  const cells = [...new Set(rows.map((r) => r.testA))];
  let manifest: DeliveryManifest | undefined;
  try { manifest = deliveryManifest(s, p); } catch { manifest = undefined; }
  return [
    `# Launch handoff: ${s.brief.client.businessName}${s.brief.project.name ? ` (${s.brief.project.name})` : ""}`,
    "",
    `${offer.label}. For the media buyer: what to upload where, how the test is set up and how to send the results back.`,
    "",
    "## Upload notes per channel",
    ...channelFolders(s).flatMap((c) => [`### ${c.label} (folder ${c.folder})`, `- Files: ${manifest?.folders.find((f) => f.folder === c.folder)?.files.length ?? 0} approved (see the delivery pack).`, ...(s.offer === "hook_pack" ? ["- 9:16 vertical, sound on, captions burned in. Keep the platform's own captions off to avoid double text."] : [`- Ratios: ${(c.ratios || []).join(" and ")}.`]), "- Check text and product against this platform's own safe-zone overlay before publishing.", ""]),
    "## AI disclosure at upload",
    ...disclosureLines(s).map((x) => `- ${x}`),
    "",
    "## Test plan",
    s.offer === "hook_pack"
      ? "Two questions: which opening hook holds attention for each narrative (hook tests N1 to N3, four variants each), and which narrative works best for the same hook position (narrative tests H1 to H4). Run each test cell with an equal budget and the same audience, schedule and optimisation event, and change nothing else during the test."
      : "Two questions: which scene sells each product best (scene tests per product and ratio), and how each ratio performs in its placement. Run each cell with an equal budget and the same audience and schedule.",
    "",
    `Test cells: ${cells.join(", ") || "none yet"}.`,
    "",
    "| File | Cell | Question |",
    "|---|---|---|",
    ...rows.map((r) => `| ${r.fileName} | ${r.testA} | ${mdEscape(r.questionA)} |`),
    "",
    "## Naming",
    "Keep the file names as the ad names: `<client>_<offer>_<narrative or scene>_<hook or ratio>_v<version>`. Results are matched to variants by the name without the version.",
    "",
    "## Sending results back",
    "Export results per ad with these columns and send the CSV to Port67 (or enter them in the project): campaign, channel, format, objective, audience, offer, start, end, provenance, attribution, currency, variant, impressions, views3s (3-second video plays), thruplays (ThruPlays or 15-second views), clicks, conversions, purchases, spend, revenue. Leave a metric blank when the platform does not report it; it stays unknown.",
    "",
  ].join("\n");
}

// ---------- Performance read-back ----------

export type ReadbackRow = { pieceId: string; variant: string; fileName: string; title: string; records: number; pending: number; impressions?: number; hookRate: number | null; holdRate: number | null; ctr: number | null; costPerPurchase: number | null; currency?: string };
/**
 * Results per delivered variant from the campaign results (FAC-FBK): rejected records are left out; ratios use only records where both
 * numbers are known, so an unknown stays unknown. Hook rate = 3-second plays / impressions; hold rate = ThruPlays / 3-second plays;
 * click-through = clicks / impressions; cost per purchase = spend / purchases.
 */
export function readback(s: StudioState, performance: PerformanceRecord[] = []): ReadbackRow[] {
  return deliverables(s).map((piece) => {
    const key = variantKey(s, piece);
    const rows = performance.filter((r) => r.status !== "rejected" && r.variant && r.variant.replace(/_v\d+$/, "").replace(/\.(mp4|mov|png|jpg|webp)$/i, "") === key);
    const ratio = (n: (r: PerformanceRecord) => number | undefined, d: (r: PerformanceRecord) => number | undefined) => {
      const both = rows.filter((r) => n(r) !== undefined && d(r) !== undefined);
      const den = both.reduce((t, r) => t + d(r)!, 0);
      return both.length && den > 0 ? both.reduce((t, r) => t + n(r)!, 0) / den : null;
    };
    const imps = rows.filter((r) => r.impressions !== undefined);
    const currencies = [...new Set(rows.map((r) => r.currency))];
    return {
      pieceId: piece.id, variant: key, fileName: fileName(s, piece), title: piece.title, records: rows.length, pending: rows.filter((r) => r.status === "pending").length,
      ...(imps.length ? { impressions: imps.reduce((t, r) => t + r.impressions!, 0) } : {}),
      hookRate: ratio((r) => r.views3s, (r) => r.impressions),
      holdRate: ratio((r) => r.thruplays, (r) => r.views3s),
      ctr: ratio((r) => r.clicks, (r) => r.impressions),
      // Spend in different currencies is never added together.
      costPerPurchase: currencies.length === 1 ? ratio((r) => r.spend, (r) => r.purchases) : null,
      ...(currencies.length === 1 ? { currency: currencies[0] } : {}),
    };
  });
}
export const READBACK_HEADER = ["campaign", "channel", "format", "objective", "audience", "offer", "start", "end", "provenance", "attribution", "currency", "variant", "impressions", "views3s", "thruplays", "clicks", "conversions", "purchases", "spend", "revenue"];
/** A results CSV with the variant names pre-filled, ready for the existing CSV import once the numbers and dates are added. */
export function readbackTemplateCsv(s: StudioState): string {
  const offer = offerInfo(s.offer)!;
  const format = offer.formats[0];
  const campaign = s.brief.project.name || s.brief.client.businessName;
  const rows = deliverables(s).filter((x) => fileOf(x)).flatMap((piece) => channelFolders(s).filter((c) => c.kinds.includes(piece.kind)).map((c) => [campaign, c.channel, format, s.offer === "hook_pack" ? "Hook test" : "Scene test", "", s.brief.product.offer || "None", "", "", "", "", "", variantKey(s, piece), "", "", "", "", "", "", "", ""]));
  return toCsv([READBACK_HEADER, ...rows]);
}
export const pct = (v: number | null) => (v === null ? "unknown" : `${(v * 100).toFixed(1)}%`);
export const money = (v: number | null, currency?: string) => (v === null ? "unknown" : `${v.toFixed(2)}${currency ? " " + currency : ""}`);
