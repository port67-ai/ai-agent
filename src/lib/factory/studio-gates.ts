// Gate checks for Stage 2 (Creative strategy) and Stage 3 (Pre-production), piece B (CHG-0098). Pure and client-safe: the gate bar
// shows the same blockers the server enforces. Importing this module registers both checks with studio.ts.
import type { Project, StudioPiece, StudioState, StudioStage } from "./model";
import { registerStudioGateCheck, studioGateBlockers } from "./studio";
// The gate 4 (production) check registers itself in studio-gtm.ts (piece C); importing it here keeps pages and server in step.
import "./studio-gtm";

/** Piece kinds the pre-production generators create, per offer, in the order the page shows them. */
export const SCENE_TEXT_KINDS = ["moodboard", "continuity", "scene"] as const;
export const HOOK_TEXT_KINDS = ["script", "narrative", "hook", "shotlist", "voice_captions"] as const;
/** Image piece kinds: one test frame per scene (Scene Pack), one keyframe per hook (Hook pack). */
export const STUDIO_IMAGE_KINDS = ["test_frame", "keyframe"] as const;
export const PREPRODUCTION_KINDS: readonly string[] = [...SCENE_TEXT_KINDS, ...HOOK_TEXT_KINDS, ...STUDIO_IMAGE_KINDS];
export const isImageKind = (kind: string) => (STUDIO_IMAGE_KINDS as readonly string[]).includes(kind);
export const PIECE_KIND_LABELS: Record<string, string> = {
  moodboard: "Mood board",
  continuity: "Continuity profile",
  scene: "Scene",
  test_frame: "Test frame",
  script: "Body script",
  narrative: "Narrative",
  hook: "Opening hook",
  shotlist: "Shot list",
  voice_captions: "Voice, captions and music",
  keyframe: "Keyframe",
};

const accepted = (p: Project) => p.insights.filter((i) => (i.status || "reviewed") === "reviewed");
/**
 * Gate 2: a plain approval needs at least one accepted insight and the latest campaign direction approved (by the client or by a
 * producer on the client's behalf through the existing direction approval). Approve with a note is always available to the producer
 * and records these gaps. Thin research is a warning, never a blocker.
 */
export function strategyGateBlockers(_s: StudioState, p?: Project): string[] {
  if (!p) return ["Project data is needed to check the strategy gate"];
  const out: string[] = [];
  if (!accepted(p).length) out.push("Accept at least one insight");
  const d = p.strategies.at(-1);
  if (!d) out.push("Draft and approve the campaign direction");
  else if (d.status !== "approved") out.push(`Approve the campaign direction (version ${d.version} is ${d.status === "changes_requested" ? "waiting for changes" : d.status === "shared" ? "shared, waiting for approval" : "a draft"})`);
  return out;
}

export type PreproductionProgress = { total: number; approved: number; open: number; missingImages: number; byStatus: Record<StudioPiece["status"], number> };
export function preproductionPieces(s: StudioState): StudioPiece[] {
  return s.pieces.filter((x) => x.stage === "preproduction");
}
export function preproductionProgress(s: StudioState): PreproductionProgress {
  const pieces = preproductionPieces(s);
  const byStatus: PreproductionProgress["byStatus"] = { draft: 0, changes_requested: 0, approved: 0, stale: 0 };
  for (const x of pieces) byStatus[x.status]++;
  const missingImages = pieces.filter((x) => isImageKind(x.kind) && !x.versions.at(-1)?.image).length;
  return { total: pieces.length, approved: byStatus.approved, open: pieces.length - byStatus.approved, missingImages, byStatus };
}
/**
 * Gate 3: a plain approval is blocked while any pre-production piece is a draft, has changes requested or is out of date, or while
 * any test frame or keyframe is missing. Approve with a note is always available.
 */
export function preproductionGateBlockers(s: StudioState): string[] {
  const pr = preproductionProgress(s);
  if (!pr.total) return ["Draft pre-production first"];
  const out: string[] = [];
  const kind = s.offer === "scene_pack" ? "test frame" : "keyframe";
  if (pr.missingImages) out.push(`${pr.missingImages} ${kind}${pr.missingImages === 1 ? " is" : "s are"} missing`);
  // An image piece that has not been drawn yet is reported once, as missing, not also as a draft.
  const drafts = preproductionPieces(s).filter((x) => x.status === "draft" && x.versions.length).length;
  if (drafts) out.push(`${drafts} piece${drafts === 1 ? " is" : "s are"} still in draft`);
  if (pr.byStatus.changes_requested) out.push(`${pr.byStatus.changes_requested} piece${pr.byStatus.changes_requested === 1 ? " has" : "s have"} changes requested`);
  if (pr.byStatus.stale) out.push(`${pr.byStatus.stale} piece${pr.byStatus.stale === 1 ? " is" : "s are"} out of date`);
  return out;
}

registerStudioGateCheck("strategy", strategyGateBlockers);
registerStudioGateCheck("preproduction", preproductionGateBlockers);

/** The registered blockers for a stage (intake, strategy, pre-production and any later registration). Same rules as the server. */
export function gateBlockers(s: StudioState, stage: StudioStage, p?: Project): string[] {
  return studioGateBlockers(s, stage, p);
}
