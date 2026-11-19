"use client";
import type { ReactNode } from "react";
import { AlertTriangle, ImageIcon, Sparkles } from "lucide-react";
import type { StudioPiece } from "@/lib/factory/model";
import { STUDIO_STAGE_LABELS, currentStudioStage, offerInfo } from "@/lib/factory/studio";
import { isImageKind, preproductionPieces, preproductionProgress } from "@/lib/factory/studio-gates";
import { Tag, type Actions } from "./shared";
import PieceCard from "./PieceCard";

/** Test frames drawn straight after the draft; the rest wait for the producer's button so the cost stays visible. */
export const FIRST_IMAGE_BATCH = 5;
export type StudioPreproductionProps = Actions & {
  /** AI drafting can run (switch on and a model resolves). */
  aiReady: boolean;
  /** Writes every text piece with one metered call, then draws the first test frames or keyframes. */
  onDraft?: () => void;
  /** Draws these image pieces one at a time (one metered image call each). */
  onImages?: (pieceIds: string[]) => void;
  /** Progress line while images are being drawn, for example "Drawing 2 of 5". */
  imageProgress?: string;
  onUpload?: (pieceId: string, file: File) => Promise<boolean> | undefined;
};
const TEXT_COST = "one call to the pre-production writer; its cost is recorded on the Private API costs page";
const IMAGE_COST = "one image generation call; its cost is recorded on the Private API costs page";
/** Image pieces with no image yet, in page order. */
export const pendingImages = (pieces: StudioPiece[]) => pieces.filter((x) => isImageKind(x.kind) && !x.versions.at(-1)?.image);
const dependants = (pieces: StudioPiece[], id: string, kind: string) => pieces.filter((x) => x.kind === kind && x.dependsOn.includes(id));

/**
 * Stage 3 (Pre-production): the producer drafts the pieces for the offer, draws the first test frames or keyframes, reviews every
 * piece (edit, comment with areas on images, rerun with impact first, approve, request changes) and shares the stage for client review.
 */
export default function StudioPreproduction({ p, operator, busy, command, aiReady, onDraft, onImages, imageProgress, onUpload }: StudioPreproductionProps) {
  const s = p.studio!;
  const scene = s.offer === "scene_pack";
  const pieces = preproductionPieces(s);
  const progress = preproductionProgress(s);
  const current = currentStudioStage(s);
  const open = current === "preproduction";
  const drafted = pieces.some((x) => !isImageKind(x.kind));
  const pending = pendingImages(pieces);
  const imageWord = scene ? "test frame" : "keyframe";
  const drawn = pieces.filter((x) => isImageKind(x.kind)).length - pending.length;
  const lastRun = p.runs.filter((r) => r.stage === "studio").at(-1);
  const direction = p.strategies.at(-1);
  const card = (piece: StudioPiece) => (
    <PieceCard key={piece.id} p={p} piece={piece} operator={operator} busy={busy} command={command} onUpload={onUpload} rerunCost={isImageKind(piece.kind) ? IMAGE_COST : TEXT_COST} />
  );
  const pair = (left: StudioPiece, right: StudioPiece[]): ReactNode => (
    <div className="f-piece-pair" key={left.id}>
      {card(left)}
      {right.map(card)}
    </div>
  );
  const known = new Set<string>();
  const mark = (x: StudioPiece) => { known.add(x.id); return x; };
  let groups: ReactNode;
  if (scene) {
    const board = pieces.filter((x) => x.kind === "moodboard" || x.kind === "continuity").map(mark);
    const scenes = pieces.filter((x) => x.kind === "scene").map(mark);
    groups = (
      <>
        {board.length > 0 && <section className="f-piece-group" aria-label="Mood board and continuity"><h3>Mood board and continuity</h3><div className="f-piece-grid">{board.map(card)}</div></section>}
        {scenes.length > 0 && (
          <section className="f-piece-group" aria-label="Scenes and test frames">
            <h3>Scenes and test frames</h3>
            {scenes.map((x) => pair(x, dependants(pieces, x.id, "test_frame").map(mark)))}
          </section>
        )}
      </>
    );
  } else {
    const script = pieces.filter((x) => x.kind === "script").map(mark);
    const narratives = pieces.filter((x) => x.kind === "narrative").map(mark);
    const support = pieces.filter((x) => x.kind === "shotlist" || x.kind === "voice_captions").map(mark);
    groups = (
      <>
        {script.length > 0 && <section className="f-piece-group" aria-label="Body script"><h3>Body script</h3><div className="f-piece-grid">{script.map(card)}</div></section>}
        {narratives.map((n) => (
          <section className="f-piece-group" key={n.id} aria-label={n.title}>
            <h3>{n.title}</h3>
            <div className="f-piece-grid">{card(n)}</div>
            {dependants(pieces, n.id, "hook").map(mark).map((h) => pair(h, dependants(pieces, h.id, "keyframe").map(mark)))}
          </section>
        ))}
        {support.length > 0 && <section className="f-piece-group" aria-label="Shot list, voice and captions"><h3>Shot list, voice and captions</h3><div className="f-piece-grid">{support.map(card)}</div></section>}
      </>
    );
  }
  const others = pieces.filter((x) => !known.has(x.id));
  return (
    <div className="f-studio-preproduction">
      <section className="f-panel" id="prepro-draft">
        <div className="f-section-heading">
          <h3>{scene ? "Mood board, continuity, scenes and test frames" : "Script, narratives, hooks and keyframes"}</h3>
          {progress.total > 0 && <Tag tone={progress.approved === progress.total ? "green" : "orange"}>{progress.approved} of {progress.total} approved</Tag>}
        </div>
        <p className="f-small">
          {scene
            ? `The ${offerInfo(s.offer)!.label}: a mood board and a continuity profile (4:5 and 1:1), one scene for each product and theme (up to 25), and one test frame per scene.`
            : `The ${offerInfo(s.offer)!.label}: a 20-second body script, three narratives with four opening hooks each, a shot list, voice and caption notes, and one keyframe per hook.`}{" "}
          Everything is written from the approved direction, its key messages, the accepted insights and the brief only.
        </p>
        {progress.total > 0 && (
          <p className="f-small" role="status">
            {progress.approved} of {progress.total} pieces approved{progress.byStatus.changes_requested ? `, ${progress.byStatus.changes_requested} with changes requested` : ""}{progress.byStatus.stale ? `, ${progress.byStatus.stale} out of date` : ""}{progress.missingImages ? `, ${progress.missingImages} ${imageWord}${progress.missingImages === 1 ? "" : "s"} not drawn yet` : ""}.
          </p>
        )}
        {!open && <p className="f-small">{s.gates.preproduction.status === "locked" ? "Pre-production opens when research and strategy are approved." : s.gates.preproduction.status === "approved" ? "Pre-production is approved." : current === "delivered" ? "The project is delivered." : `${STUDIO_STAGE_LABELS[current]} is open; this stage is out of date until it is approved again.`}</p>}
        {operator && open && (
          <>
            {!drafted && (
              <>
                {direction?.status !== "approved" && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> The campaign direction is not approved. Pre-production is written from the approved direction: reopen Creative strategy and approve it.</p>}
                {!aiReady && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> No model chosen: AI drafting is not configured. Choose a model for Studio: pre-production writer on the AI agents page (or set the drafting default), or add pieces by hand.</p>}
                {!p.aiAuthorised && (
                  <p className="f-callout f-small" role="alert">
                    <AlertTriangle size={14} aria-hidden="true" /> AI is not authorised for this brief.{" "}
                    <button type="button" className="f-button small" disabled={busy} onClick={() => { if (window.confirm("Confirm the brief is PUBLIC information that may be sent to the configured AI providers.")) void command({ type: "authoriseAI", confirm: true }, "AI authorised for this brief"); }}>Authorise AI for this brief</button>
                  </p>
                )}
                <button type="button" className="f-button" disabled={busy || !aiReady || !p.aiAuthorised || direction?.status !== "approved" || !onDraft} onClick={onDraft}>
                  <Sparkles size={15} aria-hidden="true" /> Draft pre-production
                </button>
                <p className="f-small">One call to the pre-production writer, then the first {FIRST_IMAGE_BATCH} {imageWord}s are drawn (one image call each). Costs are recorded on the Private API costs page.</p>
              </>
            )}
            {drafted && pending.length > 0 && (
              <div className="f-actions">
                <button type="button" className="f-button" disabled={busy || !aiReady || !p.aiAuthorised || !onImages} onClick={() => onImages?.(pending.map((x) => x.id))}>
                  <ImageIcon size={15} aria-hidden="true" /> {drawn === 0 ? `Generate ${imageWord}s` : `Generate remaining ${imageWord}s`} ({pending.length})
                </button>
                <span className="f-small">{pending.length} image call{pending.length === 1 ? "" : "s"}, drawn one at a time; you can stop by leaving the page.</span>
              </div>
            )}
            {imageProgress && <p className="f-small" role="status">{imageProgress}</p>}
          </>
        )}
        {operator && lastRun?.status === "failed" && lastRun.error && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> The last pre-production call failed: {lastRun.error}</p>}
        {!operator && !pieces.length && <p className="f-small">Port67 is preparing the concepts for your review.</p>}
      </section>
      <div id="studio-pieces">
        {groups}
        {others.length > 0 && <section className="f-piece-group" aria-label="Other pieces"><h3>Other pieces</h3><div className="f-piece-grid">{others.map(card)}</div></section>}
      </div>
    </div>
  );
}
