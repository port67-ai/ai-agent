"use client";
import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, Download, ImageIcon, Package, RefreshCw, Square, Trophy, Upload } from "lucide-react";
import type { StudioPiece } from "@/lib/factory/model";
import { STUDIO_STAGE_LABELS, currentStudioStage, offerInfo } from "@/lib/factory/studio";
import { DELIVERY_FILES, deliveryPath } from "@/lib/factory/studio-delivery";
import {
  DISCLOSURE_LABELS, deliverables, deliveryManifest, gtmChecks, gtmOf, money, pct, readback, type DeliveryManifest, type GtmCheck, type GtmItem, type GtmState,
} from "@/lib/factory/studio-gtm";
import {
  MAX_LOOPS, STILL_BATCH, fileOf, loopPrompt, planProduction, productionPieces, stillQuantity, variantPromptPack,
} from "@/lib/factory/studio-production";
import { NO_VIDEO_TOOL, configuredVideoProvider } from "@/lib/factory/video-provider";
import { Tag, type Actions } from "./shared";
import PieceCard from "./PieceCard";

export type UploadOptions = { aiDisclosure: "ai_generated" | "ai_edited" | "none"; rightsSource?: string; rightsLicence?: string };
export type StudioProductionProps = Actions & {
  /** Image generation can run (switch on and a model resolves). */
  aiReady: boolean;
  onPrepare?: () => void;
  onLoops?: (count: number) => void;
  /** Draws these stills one at a time (one metered image call each). */
  onStills?: (pieceIds: string[]) => void;
  /** Stops the still loop after the current image. */
  onStop?: () => void;
  stillProgress?: string;
  drawing?: boolean;
  onUpload?: (pieceId: string, file: File, options: UploadOptions) => Promise<boolean> | undefined;
  onNextCycle?: () => void;
  /** The campaign results entry and CSV import (FAC-FBK), shown in the delivered view for the read-back. */
  results?: ReactNode;
};
const IMAGE_COST = "one image generation call; its cost is recorded on the Private API costs page";
const STATE: Record<GtmState, { label: string; tone: string }> = { pass: { label: "Pass", tone: "green" }, needs_you: { label: "Needs you", tone: "orange" }, blocked: { label: "Blocked", tone: "red" }, info: { label: "Info", tone: "neutral" } };
/** Stills with no image yet, in page order. */
export const pendingStills = (pieces: StudioPiece[]) => pieces.filter((x) => x.kind === "still" && !fileOf(x));

/** Upload slot for a variant or loop: the finished file plus its AI disclosure (required) and, optionally, its rights. */
function UploadSlot({ piece, busy, onUpload }: { piece: StudioPiece; busy: boolean; onUpload: NonNullable<StudioProductionProps["onUpload"]> }) {
  const [disclosure, setDisclosure] = useState("");
  const [source, setSource] = useState("");
  const [licence, setLicence] = useState("");
  return (
    <div className="f-gate-form f-upload-slot">
      <span className="f-small"><Upload size={12} aria-hidden="true" /> {NO_VIDEO_TOOL}. {piece.kind === "variant" ? "Upload the finished 9:16 MP4 (1080 x 1920 or larger)." : "Upload the five-second MP4 loop."}</span>
      <label className="f-field"><span>AI disclosure for this file (required)</span>
        <select value={disclosure} onChange={(e) => setDisclosure(e.target.value)}>
          <option value="">Choose…</option>
          <option value="ai_generated">AI generated</option>
          <option value="ai_edited">AI edited</option>
          <option value="none">No AI</option>
        </select>
      </label>
      <div className="f-region-fields f-two">
        <label className="f-field"><span>Rights source (optional)</span><input value={source} maxLength={300} onChange={(e) => setSource(e.target.value)} placeholder="Made in-house from client footage" /></label>
        <label className="f-field"><span>Licence (optional)</span><input value={licence} maxLength={300} onChange={(e) => setLicence(e.target.value)} placeholder="Owned by the client" /></label>
      </div>
      <label className={"f-button small f-upload-button" + (disclosure ? "" : " disabled")} aria-disabled={!disclosure}>
        Upload MP4
        <input type="file" accept="video/mp4,video/quicktime" disabled={busy || !disclosure} onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && disclosure) void onUpload(piece.id, f, { aiDisclosure: disclosure as UploadOptions["aiDisclosure"], ...(source.trim() && licence.trim() ? { rightsSource: source.trim(), rightsLicence: licence.trim() } : {}) });
        }} />
      </label>
    </div>
  );
}

/** Small inline form: one text field and an orange action button. */
function InlineAction({ label, field, placeholder, required = true, busy, onSubmit }: { label: string; field: string; placeholder?: string; required?: boolean; busy: boolean; onSubmit: (value: string) => unknown }) {
  const [value, setValue] = useState("");
  return (
    <span className="f-inline-action">
      <input aria-label={field} value={value} maxLength={600} placeholder={placeholder || field} onChange={(e) => setValue(e.target.value)} />
      <button type="button" className="f-button small" disabled={busy || (required && !value.trim())} onClick={() => void Promise.resolve(onSubmit(value.trim())).then((ok) => { if (ok) setValue(""); })}>{label}</button>
    </span>
  );
}
function RightsForm({ busy, command, assetId }: { busy: boolean; command: Actions["command"]; assetId?: string }) {
  const [v, setV] = useState({ kind: "music", name: "", source: "", licence: "", usedIn: "" });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const ready = v.source.trim() && v.licence.trim() && (assetId || v.name.trim());
  const save = () => void Promise.resolve(assetId ? command({ type: "setStudioAssetRights", assetId, source: v.source, licence: v.licence }, "Rights recorded") : command({ type: "addStudioRights", ...v }, "Rights record added")).then((ok) => { if (ok) setV({ ...v, name: "", source: "", licence: "", usedIn: "" }); });
  return (
    <div className="f-rights-form">
      {!assetId && (
        <label className="f-field"><span>For</span>
          <select value={v.kind} onChange={set("kind")}>{["music", "voice", "font", "footage", "image", "other"].map((k) => <option key={k} value={k}>{k}</option>)}</select>
        </label>
      )}
      {!assetId && <label className="f-field"><span>Name</span><input value={v.name} maxLength={160} onChange={set("name")} /></label>}
      <label className="f-field"><span>Source</span><input value={v.source} maxLength={300} onChange={set("source")} /></label>
      <label className="f-field"><span>Licence</span><input value={v.licence} maxLength={300} onChange={set("licence")} /></label>
      {!assetId && <label className="f-field"><span>Used in (optional)</span><input value={v.usedIn} maxLength={300} onChange={set("usedIn")} /></label>}
      <button type="button" className="f-button small" disabled={busy || !ready} onClick={save}>{assetId ? "Save rights" : "Add rights record"}</button>
    </div>
  );
}

/** The go-to-market checklist: each check with its state (pass, needs you, blocked) and the action that clears it. */
export function GtmChecklist({ p, operator, busy, command }: Actions) {
  const s = p.studio!;
  const checks = gtmChecks(s, p);
  const g = gtmOf(s);
  const open = currentStudioStage(s) === "production";
  const act = operator && open;
  const pieceAction = (check: "specs" | "safeZones" | "productAccuracy", item: GtmItem) =>
    check === "specs"
      ? <InlineAction label="Confirm exception" field="Why this file is acceptable" busy={busy} onSubmit={(note) => command({ type: "confirmStudioPieceCheck", check, pieceIds: [item.pieceId], note }, "Spec exception confirmed")} />
      : <button type="button" className="f-button small" disabled={busy} onClick={() => void command({ type: "confirmStudioPieceCheck", check, pieceIds: [item.pieceId] }, check === "safeZones" ? "Safe zones checked" : "Product checked")}><Check size={12} aria-hidden="true" /> Checked</button>;
  const actionFor = (c: GtmCheck, item: GtmItem): ReactNode => {
    if (!act || item.state !== "needs_you") return null;
    if (c.id === "scope" && item.id === "confirm") return <InlineAction label="Confirm scope" field="Revision rounds agreed with the client" placeholder="For example: two rounds of client changes" busy={busy} onSubmit={(note) => command({ type: "confirmStudioGtm", check: "scope", note }, "Scope confirmed")} />;
    if (c.id === "disclosure" && item.id === "confirm") return <button type="button" className="f-button small" disabled={busy} onClick={() => void command({ type: "confirmStudioGtm", check: "disclosure" }, "AI disclosure confirmed")}><Check size={12} aria-hidden="true" /> Confirm disclosure</button>;
    if (c.id === "claims" && item.flagId) return <InlineAction label="Clear flag" field="Why the claim is acceptable" busy={busy} onSubmit={(reason) => command({ type: "clearStudioClaimFlag", flagId: item.flagId, reason }, "Claim flag cleared")} />;
    if (c.id === "rights" && item.assetId) return <details><summary>Add source and licence</summary><RightsForm busy={busy} command={command} assetId={item.assetId} /></details>;
    if (c.id === "specs" && item.pieceId) return pieceAction("specs", item);
    if (c.id === "safe_zones" && item.pieceId) return pieceAction("safeZones", item);
    if (c.id === "product" && item.pieceId) return pieceAction("productAccuracy", item);
    return null;
  };
  const bulk = (c: GtmCheck): ReactNode => {
    const ids = c.items.filter((x) => x.state === "needs_you" && x.pieceId).map((x) => x.pieceId!);
    if (!act || ids.length < 2 || (c.id !== "safe_zones" && c.id !== "product")) return null;
    return <button type="button" className="f-button small" disabled={busy} onClick={() => void command({ type: "confirmStudioPieceCheck", check: c.id === "safe_zones" ? "safeZones" : "productAccuracy", pieceIds: ids }, `${ids.length} pieces checked`)}><Check size={12} aria-hidden="true" /> I checked all {ids.length}</button>;
  };
  const blocking = checks.filter((c) => c.blocking && c.state !== "pass");
  return (
    <section className="f-panel" id="production-gtm" aria-label="Go-to-market checks">
      <div className="f-section-heading">
        <h3>Go-to-market checks</h3>
        <Tag tone={blocking.length ? "orange" : "green"}>{blocking.length ? `${blocking.length} to do before final approval` : "Ready for final approval"}</Tag>
      </div>
      <p className="f-small">Computed where possible, recorded where a person decides. Every confirmation is tied to the current version of what it confirms and lapses when that changes.</p>
      <ol className="f-gtm-list">
        {checks.map((c) => (
          <li key={c.id} className={"f-gtm-check " + c.state}>
            <details open={c.state === "needs_you" || c.state === "blocked"}>
              <summary>
                <Tag tone={STATE[c.state].tone}>{STATE[c.state].label}</Tag> <strong>{c.label}</strong> <span className="f-small">{c.summary}{c.blocking ? "" : " (not blocking)"}</span>
              </summary>
              {c.items.length > 0 && (
                <ul>
                  {c.items.map((item) => (
                    <li key={item.id} className={"f-gtm-item " + item.state}>
                      {item.state !== "info" && <Tag tone={STATE[item.state].tone}>{STATE[item.state].label}</Tag>} <span>{item.text}</span> {actionFor(c, item)}
                    </li>
                  ))}
                </ul>
              )}
              {bulk(c)}
              {c.id === "rights" && act && (
                <details>
                  <summary>Add a rights record (music, voice-over, font or other)</summary>
                  <RightsForm busy={busy} command={command} />
                  {g.rights.length > 0 && (
                    <ul>{g.rights.map((r) => <li key={r.id}>{r.kind}: {r.name} <button type="button" className="f-text-button" disabled={busy} onClick={() => void command({ type: "removeStudioRights", id: r.id }, "Rights record removed")}>Remove</button></li>)}</ul>
                  )}
                </details>
              )}
              {c.id === "product" && <p className="f-small">An automatic AI vision check of product accuracy is not built; a person compares each piece with the packshots.</p>}
              {c.id === "safe_zones" && c.items.length > 0 && <p className="f-small">Use each platform&apos;s own overlay template (TikTok, Instagram Reels, Facebook Reels, YouTube Shorts). Published margins disagree, so the app does not hard-code them.</p>}
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Delivery pack preview and downloads (manifest JSON and Markdown, test plan CSV, launch handoff; producers also the results template). */
export function DeliveryPack({ p, operator }: Pick<Actions, "p" | "operator">) {
  const s = p.studio!;
  let manifest: DeliveryManifest | undefined, error = "";
  try { manifest = deliveryManifest(s, p); } catch (e) { error = e instanceof Error ? e.message : "The delivery pack cannot be built yet"; }
  const files = DELIVERY_FILES.filter((f) => operator || f !== "results-template.csv");
  const label: Record<string, string> = { "manifest.json": "Manifest (JSON)", "manifest.md": "Manifest (readable)", "test-plan.csv": "Test plan (CSV)", "handoff.md": "Launch handoff", "results-template.csv": "Results template (CSV)" };
  return (
    <section className="f-panel" id="delivery-pack" aria-label="Delivery pack">
      <div className="f-section-heading"><h3><Package size={16} aria-hidden="true" /> Delivery pack</h3>{manifest && <Tag tone={manifest.status === "delivered" ? "green" : "orange"}>{manifest.status === "delivered" ? "Delivered" : "Preview"}</Tag>}</div>
      {error ? <p className="f-callout f-small" role="status"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : (
        <>
          <p className="f-small">Approved final versions only, by channel folder. Each file downloads through the signed-in file route. No ZIP is built; download the files one by one with the manifest as the index.</p>
          <div className="f-delivery-folders">
            {manifest!.folders.map((f) => (
              <div key={f.folder}><strong>{f.folder}</strong> <span className="f-small">{f.label}: {f.files.length} file{f.files.length === 1 ? "" : "s"}</span></div>
            ))}
          </div>
          <ul className="f-delivery-files">
            {manifest!.files.map((x) => (
              <li key={x.pieceId}><a href={x.download} download={x.fileName}><Download size={12} aria-hidden="true" /> {x.fileName}</a> <span className="f-small">{x.width ? `${x.width} x ${x.height}` : "size unknown"} · {DISCLOSURE_LABELS[x.aiDisclosure]}{x.winner ? " · winner" : ""}</span></li>
            ))}
          </ul>
          {manifest!.notIncluded.length > 0 && <p className="f-small">Not included yet: {manifest!.notIncluded.map((x) => `${x.title} (${x.reason})`).join("; ")}.</p>}
          {manifest!.gateNotes.some((x) => x.note || x.gaps?.length) && (
            <div className="f-gate-blockers"><span>Notes and gaps from earlier approvals (included in the pack):</span><ul>{manifest!.gateNotes.filter((x) => x.note || x.gaps?.length).map((x) => <li key={x.stage}>{x.stage}: {x.note}{x.gaps?.length ? ` (outstanding: ${x.gaps.join("; ")})` : ""}</li>)}</ul></div>
          )}
        </>
      )}
      <div className="f-actions">
        {files.map((f) => <a key={f} className="f-button secondary small" href={deliveryPath(p.id, f)} download>{label[f]}</a>)}
      </div>
    </section>
  );
}

/** After gate 4: the delivered pack, results per variant (read-back), winners and the next cycle. */
export function DeliveredView({ p, operator, busy, command, onNextCycle, results }: Actions & { onNextCycle?: () => void; results?: ReactNode }) {
  const s = p.studio!;
  const g = gtmOf(s);
  const gate = s.gates.production;
  const rows = readback(s, p.performance || []);
  return (
    <section className="f-panel f-delivered" id="delivery-readback" aria-label="Delivered">
      <div className="f-section-heading"><h2><Check size={18} aria-hidden="true" /> Delivered</h2><Tag tone="green">{offerInfo(s.offer)!.label}</Tag></div>
      <p>Final work approved by {gate.approvedBy}{gate.approvedAt ? ` on ${new Date(gate.approvedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}{gate.onBehalfOfClient ? " (on behalf of the client)" : ""}{gate.note ? `, with a note: ${gate.note}` : "."}</p>
      {operator && (
        <>
          <h3>Performance read-back</h3>
          <p className="f-small">Results per variant from Campaign performance feedback (enter a result with its variant name, or download the results template with the names filled in and import it). Unknown stays unknown; rejected results are left out.</p>
          <div className="f-table-wrap">
            <table className="f-readback">
              <thead><tr><th>Variant</th><th>Results</th><th>Hook rate</th><th>Hold rate</th><th>Click-through</th><th>Cost per purchase</th><th>Winner</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const piece = s.pieces.find((x) => x.id === r.pieceId);
                  const winner = !!piece && g.winners.includes(piece.id);
                  return (
                    <tr key={r.variant}>
                      <td><code>{r.variant}</code></td>
                      <td>{r.records ? `${r.records}${r.pending ? ` (${r.pending} pending review)` : ""}` : "none yet"}</td>
                      <td>{pct(r.hookRate)}</td><td>{pct(r.holdRate)}</td><td>{pct(r.ctr)}</td><td>{money(r.costPerPurchase, r.currency)}</td>
                      <td>{piece && piece.status === "approved" && fileOf(piece) ? <button type="button" className={winner ? "f-button small" : "f-button secondary small"} aria-pressed={winner} disabled={busy} onClick={() => void command({ type: "setStudioWinner", pieceId: piece.id, winner: !winner }, winner ? "No longer a winner" : "Marked as a winner")}><Trophy size={12} aria-hidden="true" /> {winner ? "Winner" : "Mark"}</button> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <a className="f-button secondary small" href={deliveryPath(p.id, "results-template.csv")} download>Results template with variant names (CSV)</a>
          {results}
          <h3>Next cycle</h3>
          {g.nextCycle
            ? <p className="f-small">The next cycle is started as project {g.nextCycle.projectId}.</p>
            : (
              <>
                <p className="f-small">A new studio project for the same account and offer, with the Brand Kit and brief copied and the {g.winners.length} winner{g.winners.length === 1 ? "" : "s"} attached as liked references. It starts at the intake.</p>
                <button type="button" className="f-button" disabled={busy || !onNextCycle} onClick={onNextCycle}><RefreshCw size={14} aria-hidden="true" /> Start next cycle</button>
              </>
            )}
        </>
      )}
      {!operator && <p className="f-small">Download the delivery pack below. Port67 will read back the results per variant once the ads have run.</p>}
    </section>
  );
}

/**
 * Stage 4 (Production): prepare the production pieces for the offer, draw the stills (Scene Pack) or upload the finished variants (Hook
 * pack) from their prompt packs, run the go-to-market checks, preview the delivery pack and share it for the client's final approval.
 */
export default function StudioProduction({ p, operator, busy, command, aiReady, onPrepare, onLoops, onStills, onStop, stillProgress, drawing, onUpload, onNextCycle, results }: StudioProductionProps) {
  const s = p.studio!;
  const scene = s.offer === "scene_pack";
  const current = currentStudioStage(s);
  const open = current === "production";
  const pieces = productionPieces(s);
  const items = deliverables(s);
  const [loops, setLoops] = useState(String(gtmOf(s).loops || 0));
  const plan = open ? planProduction(s) : undefined;
  const pending = pendingStills(pieces);
  const approved = items.filter((x) => x.status === "approved").length;
  const video = configuredVideoProvider();
  const lastRun = p.runs.filter((r) => r.stage === "studio").at(-1);
  const card = (piece: StudioPiece) => {
    const upload = piece.kind !== "still" && operator && open && onUpload;
    return (
      <div className="f-piece-stack" key={piece.id}>
        <PieceCard p={p} piece={piece} operator={operator} busy={busy} command={command} rerunCost={piece.kind === "still" ? IMAGE_COST : undefined} />
        {piece.kind === "variant" && operator && (() => {
          const pack = variantPromptPack(s, piece);
          return (
            <details className="f-prompt-pack">
              <summary>Prompt pack: {pack.shots.length} shots, voice-over, captions and music</summary>
              <ol>{pack.shots.map((x, i) => <li key={i}><strong>{x.at}</strong> {x.prompt}{x.vo ? ` VO: "${x.vo}".` : ""}{x.onScreen ? ` On screen: "${x.onScreen}".` : ""}</li>)}</ol>
              <p className="f-small">Captions: {pack.captions.style}. Music: {pack.music}. Voice: {pack.voice}.</p>
              <a className="f-button secondary small" href={deliveryPath(p.id, `prompt-pack-${piece.id}.md`)} download><Download size={12} aria-hidden="true" /> Download prompt pack</a>
            </details>
          );
        })()}
        {piece.kind === "loop" && operator && (
          <details className="f-prompt-pack">
            <summary>Loop prompt</summary>
            <pre className="f-piece-text">{loopPrompt(s, piece)}</pre>
            <a className="f-button secondary small" href={deliveryPath(p.id, `loop-prompt-${piece.id}.txt`)} download><Download size={12} aria-hidden="true" /> Download loop prompt</a>
          </details>
        )}
        {upload && <UploadSlot piece={piece} busy={busy} onUpload={onUpload} />}
        {operator && open && <button type="button" className="f-text-button" disabled={busy} onClick={() => { if (window.confirm(`Remove ${piece.title} from the pack? Its files stay in private storage.`)) void command({ type: "removeStudioPiece", pieceId: piece.id }, `${piece.title} removed from the pack`); }}>Remove from pack</button>}
      </div>
    );
  };
  const groups: ReactNode[] = [];
  if (scene) {
    const byScene = new Map<string, StudioPiece[]>();
    for (const x of pieces.filter((y) => y.kind === "still")) { const k = x.dependsOn[0]; byScene.set(k, [...(byScene.get(k) || []), x]); }
    for (const [sceneId, list] of byScene) groups.push(<section className="f-piece-group" key={sceneId} aria-label={s.pieces.find((x) => x.id === sceneId)?.title || "Scene"}><h3>{s.pieces.find((x) => x.id === sceneId)?.title || "Scene"}</h3><div className="f-piece-grid">{list.map(card)}</div></section>);
    const loopPieces = pieces.filter((x) => x.kind === "loop");
    if (loopPieces.length) groups.push(<section className="f-piece-group" key="loops" aria-label="Motion loops"><h3>Motion loops</h3><div className="f-piece-grid">{loopPieces.map(card)}</div></section>);
  } else {
    const byNarrative = new Map<number, StudioPiece[]>();
    for (const x of pieces.filter((y) => y.kind === "variant")) { const n = Number(/^Variant (\d+)\./.exec(x.title)?.[1]) || 0; byNarrative.set(n, [...(byNarrative.get(n) || []), x]); }
    for (const [n, list] of [...byNarrative].sort((a, b) => a[0] - b[0])) groups.push(<section className="f-piece-group" key={n} aria-label={`Narrative ${n}`}><h3>{n ? s.pieces.find((x) => x.kind === "narrative" && x.title.startsWith(`Narrative ${n}:`))?.title || `Narrative ${n}` : "Variants"}</h3><div className="f-piece-grid">{list.map(card)}</div></section>);
  }
  const others = pieces.filter((x) => !["still", "loop", "variant"].includes(x.kind));
  if (others.length) groups.push(<section className="f-piece-group" key="others" aria-label="Other pieces"><h3>Other pieces</h3><div className="f-piece-grid">{others.map(card)}</div></section>);
  return (
    <div className="f-studio-production">
      {current === "delivered" && <DeliveredView p={p} operator={operator} busy={busy} command={command} onNextCycle={onNextCycle} results={results} />}
      <section className="f-panel" id="production-prepare">
        <div className="f-section-heading">
          <h3>{scene ? `Stills (${stillQuantity(s)} in scope) and optional motion loops` : "Twelve video variants (3 narratives x 4 hooks)"}</h3>
          {items.length > 0 && <Tag tone={approved === items.length ? "green" : "orange"}>{approved} of {items.length} approved</Tag>}
        </div>
        <p className="f-small">
          {scene
            ? "One still per approved scene at 4:5 and 1:1, drawn with the approved test frame and the client's packshots as references (4:5 is drawn at 2:3 and cropped). Motion loops are made in any video tool from the loop prompt and uploaded."
            : "One variant per approved hook. Each has a prompt pack (shots, voice-over, on-screen text, captions and music cue) for any video tool; upload the finished 9:16 MP4 on its card."}
        </p>
        {!open && <p className="f-small">{s.gates.production.status === "locked" ? "Production opens when the client approves pre-production." : current === "delivered" ? "Production is approved and delivered." : `${STUDIO_STAGE_LABELS[current as keyof typeof STUDIO_STAGE_LABELS] || current} is open; this stage is out of date until it is approved again.`}</p>}
        {!scene && <p className="f-small" role="status">{video ? `Video tool: ${video.provider} ${video.model}` : `${NO_VIDEO_TOOL}.`}</p>}
        {operator && open && plan && (
          <>
            {plan.create.length > 0 && (
              <button type="button" className="f-button" disabled={busy || !onPrepare} onClick={onPrepare}>
                <Package size={15} aria-hidden="true" /> {items.length ? `Add ${plan.create.length} missing production piece${plan.create.length === 1 ? "" : "s"}` : `Prepare production (${plan.create.length} ${scene ? "stills" : "variants"})`}
              </button>
            )}
            {!plan.create.length && !items.length && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> Nothing to prepare: no {scene ? "scene" : "hook"} is approved in pre-production. Reopen Pre-production and approve them, or add pieces by hand.</p>}
            {plan.skipped.length > 0 && <details><summary className="f-small">{plan.skipped.length} not included</summary><ul className="f-small">{plan.skipped.map((x) => <li key={x}>{x}</li>)}</ul></details>}
            {scene && pending.length > 0 && (
              <div className="f-actions">
                {!aiReady && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> No model chosen: image generation is not configured (Studio: image generation on the AI agents page, or PORT67_IMAGE_MODEL).</p>}
                {!p.aiAuthorised && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> AI is not authorised for this brief; authorise it in Project settings.</p>}
                <button type="button" className="f-button" disabled={busy || drawing || !aiReady || !p.aiAuthorised || !onStills} onClick={() => onStills?.(pending.slice(0, STILL_BATCH).map((x) => x.id))}><ImageIcon size={15} aria-hidden="true" /> Generate next {Math.min(STILL_BATCH, pending.length)} stills</button>
                <button type="button" className="f-button" disabled={busy || drawing || !aiReady || !p.aiAuthorised || !onStills} onClick={() => onStills?.(pending.map((x) => x.id))}><ImageIcon size={15} aria-hidden="true" /> Generate all remaining stills ({pending.length})</button>
                <span className="f-small">One image call per still, drawn one at a time; costs are recorded on the Private API costs page.</span>
              </div>
            )}
            {drawing && <button type="button" className="f-button secondary" onClick={onStop}><Square size={13} aria-hidden="true" /> Stop after this image</button>}
            {stillProgress && <p className="f-small" role="status">{stillProgress}</p>}
            {scene && items.some((x) => x.kind === "still") && (
              <div className="f-actions">
                <label className="f-field f-inline"><span>Motion loops (optional, 0 to {MAX_LOOPS})</span><input type="number" min={0} max={MAX_LOOPS} value={loops} onChange={(e) => setLoops(e.target.value)} /></label>
                <button type="button" className="f-button small" disabled={busy || !onLoops || Number(loops) <= pieces.filter((x) => x.kind === "loop").length} onClick={() => onLoops?.(Number(loops))}>Add motion loops</button>
              </div>
            )}
          </>
        )}
        {operator && lastRun?.status === "failed" && lastRun.error && open && <p className="f-callout f-small" role="alert"><AlertTriangle size={14} aria-hidden="true" /> The last image call failed: {lastRun.error}</p>}
        {!operator && !items.length && <p className="f-small">Port67 is producing the final pieces for your review.</p>}
      </section>
      <div id="studio-pieces">{groups}</div>
      {(operator || s.gtm) && items.length > 0 && <GtmChecklist p={p} operator={operator} busy={busy} command={command} />}
      {items.length > 0 && current !== "delivered" && operator && <DeliveryPack p={p} operator={operator} />}
      {current === "delivered" && <DeliveryPack p={p} operator={operator} />}
    </div>
  );
}
