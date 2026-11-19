"use client";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, MessageSquare, Pencil, RefreshCw, X } from "lucide-react";
import type { StudioComment, StudioPiece } from "@/lib/factory/model";
import { STUDIO_GATE_APPROVER, pieceImpact, studioAssetPath, validRegion } from "@/lib/factory/studio";
import { Tag } from "./shared";
import type { Actions } from "./shared";

type Region = NonNullable<StudioComment["region"]>;
export type PieceCardProps = Actions & {
  piece: StudioPiece;
  /** Optional override for Rerun. By default the card sends requestStudioRerun (the server runs piece B's generator when one is registered). */
  onRerun?: (pieceId: string, instruction: string) => Promise<boolean> | undefined;
  /** Optional cost estimate shown before a rerun, for example "about $0.04". Piece B supplies it. */
  rerunCost?: string;
  /** Producers: upload an image or clip as a new version (POST .../studio/upload?slot=piece&pieceId=...). */
  onUpload?: (pieceId: string, file: File) => Promise<boolean> | undefined;
};
const STATUS: Record<StudioPiece["status"], { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "neutral" },
  changes_requested: { label: "Changes requested", tone: "orange" },
  approved: { label: "Approved", tone: "green" },
  stale: { label: "Out of date", tone: "stale" },
};
const DISCLOSURE: Record<string, string> = { ai_generated: "AI generated", ai_edited: "AI edited", none: "No AI" };
const SOURCE: Record<string, string> = { ai: "AI", human: "Edited by hand", upload: "Uploaded" };
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/**
 * One reviewable piece: current version, version history, comments (on images as numbered pins and boxes), and Edit, Comment,
 * Rerun (impact first), Approve and Request changes. Producers edit and rerun; the client may comment and, on client stages,
 * approve or request changes. Every action is a server command and is audited there.
 */
export default function PieceCard({ p, piece, operator, busy, command, onRerun, rerunCost, onUpload }: PieceCardProps) {
  const s = p.studio!;
  const [mode, setMode] = useState<"" | "edit" | "comment" | "rerun" | "changes">("");
  const [draft, setDraft] = useState("");
  const [region, setRegion] = useState<Region | undefined>();
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const gate = s.gates[piece.stage].status;
  const open = gate === "active" || gate === "stale";
  const canDecide = open && (operator || STUDIO_GATE_APPROVER[piece.stage] === "client");
  const latest = piece.versions.at(-1);
  const version = (shown !== null && piece.versions.find((v) => v.n === shown)) || latest;
  const isImage = !!version?.image?.mime.startsWith("image/");
  const isVideo = !!version?.image?.mime.startsWith("video/");
  const markable = mode === "comment" && isImage && version === latest;
  const openComments = piece.comments.filter((c) => !c.resolved);
  const pins = openComments.map((c, i) => ({ c, n: i + 1 })).filter((x) => x.c.region);
  const impact = pieceImpact(s, piece.id).map((id) => s.pieces.find((x) => x.id === id)!).filter(Boolean);
  const reset = (ok: boolean | undefined) => { if (ok) { setMode(""); setDraft(""); setRegion(undefined); } };
  const start = (next: typeof mode) => { setMode(mode === next ? "" : next); setDraft(next === "edit" ? latest?.text || "" : ""); setRegion(undefined); };
  const point = (e: ReactPointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const finish = (e: ReactPointerEvent) => {
    if (!drawing) return;
    const end = point(e);
    const box = { x: Math.min(drawing.x, end.x), y: Math.min(drawing.y, end.y), w: Math.abs(end.x - drawing.x), h: Math.abs(end.y - drawing.y) };
    setRegion(box.w < 0.01 && box.h < 0.01 ? { x: drawing.x, y: drawing.y, w: 0, h: 0 } : box);
    setDrawing(null);
  };
  const setField = (k: keyof Region, v: string) => {
    const next = { ...(region || { x: 0, y: 0, w: 0, h: 0 }), [k]: Math.min(100, Math.max(0, Number(v) || 0)) / 100 };
    setRegion(next);
  };
  let regionError = "";
  try { validRegion(region); } catch (e) { regionError = (e as Error).message; }
  const rerun = () => {
    const result = onRerun ? onRerun(piece.id, draft) : command({ type: "requestStudioRerun", pieceId: piece.id, instruction: draft, confirm: true, replace: true }, `Rerun of ${piece.title} requested.`);
    void Promise.resolve(result).then(reset);
  };
  return (
    <article className="f-piece-card" aria-labelledby={`piece-${piece.id}`}>
      <header>
        <div>
          <h3 id={`piece-${piece.id}`}>{piece.title}</h3>
          <span className="f-small">{piece.kind.replaceAll("_", " ")}{version ? ` · version ${version.n} of ${piece.versions.length} · ${SOURCE[version.source]}` : " · no version yet"}</span>
        </div>
        <div className="f-piece-tags">
          <Tag tone={STATUS[piece.status].tone}>{STATUS[piece.status].label}</Tag>
          {piece.aiDisclosure && <Tag>{DISCLOSURE[piece.aiDisclosure]}</Tag>}
        </div>
      </header>
      {version?.image && (
        <div
          className={"f-piece-media" + (markable ? " marking" : "")}
          ref={frame}
          onPointerDown={markable ? (e) => { e.preventDefault(); setDrawing(point(e)); } : undefined}
          onPointerUp={markable ? finish : undefined}
        >
          {isImage && (
            // Studio files come from the authorised API route, not a static asset, so next/image is not used.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studioAssetPath(p.id, version.image.id)} alt={`${piece.title}, version ${version.n}`} draggable={false} />
          )}
          {isVideo && <video src={studioAssetPath(p.id, version.image.id)} controls preload="metadata" aria-label={`${piece.title}, version ${version.n}`} />}
          {isImage && version === latest && pins.map(({ c, n }) => (
            <span
              key={c.id}
              className={c.region!.w || c.region!.h ? "f-region box" : "f-region pin"}
              style={{ left: pct(c.region!.x), top: pct(c.region!.y), width: c.region!.w ? pct(c.region!.w) : undefined, height: c.region!.h ? pct(c.region!.h) : undefined }}
              aria-label={`Comment ${n}: ${c.text}`}
              title={`${n}. ${c.text}`}
            >
              {n}
            </span>
          ))}
          {markable && region && !regionError && (
            <span className={region.w || region.h ? "f-region box new" : "f-region pin new"} style={{ left: pct(region.x), top: pct(region.y), width: region.w ? pct(region.w) : undefined, height: region.h ? pct(region.h) : undefined }} aria-hidden="true" />
          )}
        </div>
      )}
      {version?.text && <div className="f-piece-text">{version.text}</div>}
      {!version && <p className="f-small">Nothing to review yet.</p>}
      {piece.versions.length > 1 && (
        <details className="f-piece-history">
          <summary>Version history ({piece.versions.length})</summary>
          <ol>
            {[...piece.versions].reverse().map((v) => (
              <li key={v.n}>
                <button type="button" className="f-text-button" aria-pressed={version?.n === v.n} onClick={() => setShown(v.n === latest?.n ? null : v.n)}>
                  Version {v.n}
                </button>{" "}
                <span className="f-small">{SOURCE[v.source]} by {v.createdBy}, {when(v.createdAt)}{v.runId ? ` · run ${v.runId}` : ""}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {piece.comments.length > 0 && (
        <ol className="f-piece-comments" aria-label="Comments">
          {piece.comments.map((c) => {
            const n = openComments.indexOf(c) + 1;
            return (
              <li key={c.id} className={c.resolved ? "resolved" : ""}>
                {!c.resolved && c.region && <span className="f-pin-number" aria-hidden="true">{n}</span>}
                <span>{c.text}</span> <span className="f-small">{c.by}, {when(c.at)}{c.resolved ? " · resolved" : ""}</span>
                {!c.resolved && operator && (
                  <button type="button" className="f-text-button" disabled={busy} onClick={() => void command({ type: "resolveStudioComment", pieceId: piece.id, commentId: c.id }, "Comment resolved")}>
                    Resolve
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="f-piece-actions">
        {operator && open && <button type="button" className="f-button secondary small" disabled={busy} aria-expanded={mode === "edit"} onClick={() => start("edit")}><Pencil size={13} aria-hidden="true" /> Edit</button>}
        {gate !== "locked" && <button type="button" className="f-button secondary small" disabled={busy} aria-expanded={mode === "comment"} onClick={() => start("comment")}><MessageSquare size={13} aria-hidden="true" /> Comment</button>}
        {operator && open && onUpload && (
          <label className="f-button secondary small f-upload-button">
            Upload version
            <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onUpload(piece.id, f); }} />
          </label>
        )}
        {operator && open && <button type="button" className="f-button secondary small" disabled={busy} aria-expanded={mode === "rerun"} onClick={() => start("rerun")}><RefreshCw size={13} aria-hidden="true" /> Rerun</button>}
        {canDecide && latest && piece.status !== "approved" && <button type="button" className="f-button small" disabled={busy} onClick={() => void command({ type: "setStudioPieceStatus", pieceId: piece.id, status: "approved" }, `${piece.title} approved`)}><Check size={13} aria-hidden="true" /> Approve</button>}
        {canDecide && latest && <button type="button" className="f-button secondary small" disabled={busy} aria-expanded={mode === "changes"} onClick={() => start("changes")}><X size={13} aria-hidden="true" /> Request changes</button>}
      </div>
      {mode === "edit" && (
        <div className="f-gate-form">
          <label className="f-field"><span>New version (the current one is kept in the history)</span><textarea value={draft} maxLength={20000} onChange={(e) => setDraft(e.target.value)} /></label>
          <button type="button" className="f-button small" disabled={busy || !draft.trim()} onClick={() => void Promise.resolve(command({ type: "editStudioPiece", pieceId: piece.id, text: draft }, "New version saved")).then(reset)}>Save version</button>
        </div>
      )}
      {mode === "comment" && (
        <div className="f-gate-form">
          {isImage && version === latest && <p className="f-small">Optional: drag on the image to mark an area, or click once to drop a pin.{region ? " Area marked." : ""}</p>}
          <label className="f-field"><span>Comment</span><textarea value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} /></label>
          {isImage && version === latest && (
            <details>
              <summary>Mark an area with numbers instead (percent of width and height)</summary>
              <div className="f-region-fields">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label className="f-field" key={k}>
                    <span>{{ x: "From left", y: "From top", w: "Width", h: "Height" }[k]} (%)</span>
                    <input type="number" min={0} max={100} step={1} value={region ? Math.round(region[k] * 100) : ""} onChange={(e) => setField(k, e.target.value)} />
                  </label>
                ))}
              </div>
            </details>
          )}
          {regionError && <p className="f-small" role="alert">{regionError}</p>}
          <div className="f-gate-actions">
            <button type="button" className="f-button small" disabled={busy || !draft.trim() || !!regionError} onClick={() => void Promise.resolve(command({ type: "commentStudioPiece", pieceId: piece.id, text: draft, ...(region ? { region } : {}) }, "Comment added")).then(reset)}>Add comment</button>
            {region && <button type="button" className="f-button secondary small" onClick={() => setRegion(undefined)}>Clear area</button>}
          </div>
        </div>
      )}
      {mode === "rerun" && (
        <div className="f-gate-form">
          <p className="f-small">
            The AI redraws only this piece, using the {openComments.length} open comment{openComments.length === 1 ? "" : "s"} and your instruction. The current version is kept.{rerunCost ? ` Estimated cost: ${rerunCost}.` : ""}
          </p>
          {impact.length ? (
            <div className="f-gate-blockers">
              <span>These later pieces depend on it and will be marked out of date:</span>
              <ul>{impact.map((x) => <li key={x.id}>{x.title}</li>)}</ul>
            </div>
          ) : <p className="f-small">No other piece depends on this one.</p>}
          <label className="f-field"><span>Instruction (optional)</span><textarea value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} /></label>
          <button type="button" className="f-button small" disabled={busy} onClick={rerun}>Confirm rerun</button>
        </div>
      )}
      {mode === "changes" && (
        <div className="f-gate-form">
          <label className="f-field"><span>What should change? (added as a comment)</span><textarea value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} /></label>
          <button type="button" className="f-button small" disabled={busy} onClick={() => void Promise.resolve(command({ type: "setStudioPieceStatus", pieceId: piece.id, status: "changes_requested", note: draft }, "Changes requested")).then(reset)}>Request changes</button>
        </div>
      )}
    </article>
  );
}
