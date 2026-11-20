"use client";
import { useState } from "react";
import { Check, Clapperboard, Download } from "lucide-react";
import type { AdvertPlan, AdvertShot, Continuity, Project } from "@/lib/factory/model";
import { Tag, Empty, Field, Actions } from "./shared";

// Browser-only advert view helpers. Keep in sync with the server validation rules in advert.ts.
// Do not import advert.ts here: its SHA-256 hash uses Node crypto, unavailable in client bundles.
const MAX_SHOT_SEC = 10;
const MAX_ADVERT_SEC = 60;
const MAX_SHOTS = 8;
const TIERS = { draft: { label: "Draft", height: 480 }, final: { label: "Final", height: 1080 } } as const;
type Tier = keyof typeof TIERS;
const RULESET = "generic-v1";
const REF_ORDER = ["character", "location", "prop"] as const;
const MAX_REFS = 9;

const figures = (t: string) => t.match(/\d+(?:[.,]\d+)?%|\d+[.,]\d+|\b\d{2,}\b/g) || [];
/** Rules every plan must meet before it is shared. Returns plain-English problems; empty means fine. */
function advertIssues(p: Project, plan: AdvertPlan): string[] {
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

function estimate(plan: AdvertPlan, tier: Tier, usdPerSecond?: number) {
  const seconds = plan.shots.reduce((n, x) => n + x.seconds, 0);
  return { seconds, tier, height: TIERS[tier].height, usd: usdPerSecond && usdPerSecond > 0 ? Math.round(seconds * usdPerSecond * 100) / 100 : null };
}

/** The deterministic shot prompt. Reference tags are numbered in a fixed order (characters, locations, props, then label). */
function compileShot(plan: AdvertPlan, shot: AdvertShot, tier: Tier = "draft") {
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
    ...(plan.treatment.creativeDirection ? [`Approved creative treatment: ${plan.treatment.creativeDirection}`, "The approved continuity and per-shot overrides below govern lighting, lens and format where the treatment differs."] : []),
    `Camera: ${c.cameraBody}, ${lens}`,
    `Lighting: ${lighting}`,
    `Palette: ${c.palette.join(", ")}`,
    `Grade: ${c.grade}`,
    `Format: ${c.aspect}, ${shot.seconds}s, ${TIERS[tier].height}p ${tier} tier`,
    "No logos, brand marks or real people unless supplied as references.",
  ];
  return { shotId: shot.id, ruleset: RULESET, tier, seconds: shot.seconds, refs: tags, prompt: lines.join("\n") };
}

const csv = (v: string[]) => v.join(", ");
const parseRefs = (t: string): AdvertShot["refs"] =>
  t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [k, ...r] = l.split(":");
    const kind = (["character", "location", "prop"].includes(k.trim().toLowerCase()) ? k.trim().toLowerCase() : "prop") as AdvertShot["refs"][number]["kind"];
    return { kind, label: (r.length ? r.join(":") : l).trim() };
  });

export default function Advert({ p, operator, busy, command }: Actions) {
  const [feedback, setFeedback] = useState("");
  const [tier, setTier] = useState<Tier>("draft");
  const [open, setOpen] = useState<string | null>(null);
  const ad = p.advert;
  const direction = p.strategies.at(-1);
  const directionOk = direction?.status === "approved" && !!direction.keyMessages?.length;
  const editable = !!ad && (ad.status === "draft" || ad.status === "changes_requested");
  const problems = ad && operator ? advertIssues(p, ad) : [];
  const [continuity, setContinuity] = useState<Continuity | null>(null);
  const c = continuity || ad?.continuity;
  if (!directionOk && !ad)
    return <Empty title="Video advert">Approve a campaign direction with key messages first. The advert is planned from it.</Empty>;
  return (
    <>
      <div className="f-section-heading">
        <p className="f-small">A planned film, not a render yet. The treatment and shot list come from the approved direction. Nothing is generated or charged in this phase.</p>
        {operator && (!ad || editable || (direction && ad.strategyHash !== direction.hash)) && (
          <button className="f-button" disabled={busy || !directionOk} onClick={() => void command({ type: "draftAdvert" }, "Advert treatment and shot list planned.")}>
            {ad ? "Plan again from the direction" : "Plan the advert"} <Clapperboard size={15} />
          </button>
        )}
      </div>
      {!ad ? (
        <Empty title="No advert yet">{operator ? "Press Plan the advert to build a treatment and shot list from the approved direction." : "Your producer is preparing the advert treatment."}</Empty>
      ) : (
        <>
          <section className="f-panel">
            <div className="f-eyebrow">Treatment v{ad.version} <Tag tone={ad.status === "approved" ? "good" : "neutral"}>{ad.status.replace("_", " ")}</Tag></div>
            <h2>{ad.treatment.title}</h2>
            <p>{ad.treatment.logline}</p>
            <p className="f-small">{ad.treatment.story}</p>
            <p className="f-small"><strong>Tone:</strong> {ad.treatment.tone} · <strong>Length:</strong> {ad.treatment.durationSec}s · <strong>Format:</strong> {ad.continuity.aspect}</p>
            <ul className="f-small">{ad.treatment.music.map((m) => <li key={m.atSec + m.cue}>{m.atSec}s: {m.cue}</li>)}</ul>
            {ad.feedback && <div className="f-callout">Feedback: {ad.feedback}</div>}
          </section>
          <section className="f-panel">
            <div className="f-eyebrow">Shot list</div>
            {ad.shots.map((x) => {
              const key = p.strategies.find((s) => s.hash === ad.strategyHash)?.keyMessages?.[x.keyMessage];
              return (
                <div key={x.id} className="f-review">
                  <strong>Shot {x.n} · {x.seconds}s</strong>
                  <p className="f-small">{x.scene}</p>
                  <p className="f-small">{x.action}</p>
                  {x.dialogue && <p className="f-small">Spoken: “{x.dialogue}”</p>}
                  {x.onScreen && <p className="f-small">On screen: “{x.onScreen}”</p>}
                  {key && <p className="f-small">Expresses: {key.message}</p>}
                  {operator && editable && (
                    <>
                      <button className="f-text-button" onClick={() => setOpen(open === x.id ? null : x.id)}>{open === x.id ? "Close editor" : "Edit shot"}</button>
                      {open === x.id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
                            void command({ type: "editAdvertShot", shotId: x.id, seconds: Number(d.seconds), scene: d.scene, action: d.action, dialogue: d.dialogue, onScreen: d.onScreen, refs: parseRefs(d.refs), overrides: { lighting: d.lighting, lens: d.lens } }, "Shot saved.");
                          }}
                        >
                          <Field label={`Seconds (1 to ${MAX_SHOT_SEC})`}><input name="seconds" type="number" min={1} max={MAX_SHOT_SEC} step={0.5} defaultValue={x.seconds} /></Field>
                          <Field label="Scene"><textarea name="scene" defaultValue={x.scene} maxLength={400} /></Field>
                          <Field label="Action"><textarea name="action" defaultValue={x.action} maxLength={400} /></Field>
                          <Field label="Spoken line (approved key message wording only)"><textarea name="dialogue" defaultValue={x.dialogue} maxLength={300} /></Field>
                          <Field label="On-screen text"><input name="onScreen" defaultValue={x.onScreen} maxLength={120} /></Field>
                          <Field label="References, one per line as kind: label (character, location, prop)"><textarea name="refs" defaultValue={x.refs.map((r) => `${r.kind}: ${r.label}`).join("\n")} /></Field>
                          <Field label="Lighting override (optional)"><input name="lighting" defaultValue={x.overrides?.lighting || ""} maxLength={300} /></Field>
                          <Field label="Lens override (optional)"><input name="lens" defaultValue={x.overrides?.lens || ""} maxLength={160} /></Field>
                          <button className="f-button" disabled={busy}>Save shot <Check size={14} /></button>
                        </form>
                      )}
                    </>
                  )}
                  {operator && ad.continuity.approved && (
                    <details>
                      <summary className="f-small">Compiled prompt ({TIERS[tier].label} tier)</summary>
                      <pre className="f-small" style={{ whiteSpace: "pre-wrap" }}>{(() => { try { return compileShot(ad, x, tier).prompt; } catch (e) { return e instanceof Error ? e.message : "Cannot compile"; } })()}</pre>
                    </details>
                  )}
                </div>
              );
            })}
          </section>
          {operator && c && (
            <section className="f-panel">
              <div className="f-eyebrow">Continuity Profile <Tag tone={ad.continuity.approved ? "good" : "neutral"}>{ad.continuity.approved ? "approved" : "needs approval"}</Tag> <Tag>{ad.continuity.confidence}</Tag></div>
              <p className="f-small">Applied to every shot. Values start as estimates; confirm or edit them, then approve. Use reference images you own or have licensed.</p>
              {editable ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
                    void command({ type: "setContinuity", continuity: { palette: d.palette.split(/[\s,]+/).filter(Boolean), lighting: d.lighting, cameraBody: d.cameraBody, lens: d.lens, grade: d.grade, aspect: d.aspect, confidence: "estimate" } }, "Continuity Profile saved. Approve it to compile prompts.");
                    setContinuity(null);
                  }}
                >
                  <Field label="Palette (hex codes)"><input name="palette" defaultValue={csv(c.palette)} /></Field>
                  <Field label="Lighting"><input name="lighting" defaultValue={c.lighting} maxLength={300} /></Field>
                  <Field label="Camera body"><input name="cameraBody" defaultValue={c.cameraBody} maxLength={120} /></Field>
                  <Field label="Lens"><input name="lens" defaultValue={c.lens} maxLength={160} /></Field>
                  <Field label="Grade"><input name="grade" defaultValue={c.grade} maxLength={200} /></Field>
                  <Field label="Aspect ratio">
                    <select name="aspect" defaultValue={c.aspect}>{["16:9", "9:16", "1:1", "4:5"].map((x) => <option key={x}>{x}</option>)}</select>
                  </Field>
                  <div className="f-actions">
                    <button className="f-button secondary" disabled={busy}>Save profile</button>
                    {!ad.continuity.approved && (
                      <button type="button" className="f-button" disabled={busy} onClick={() => void command({ type: "approveContinuity" }, "Continuity Profile approved.")}>
                        Approve profile <Check size={14} />
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <p className="f-small">{csv(ad.continuity.palette)} · {ad.continuity.lighting} · {ad.continuity.cameraBody}, {ad.continuity.lens} · {ad.continuity.grade}</p>
              )}
            </section>
          )}
          {operator && (
            <section className="f-panel">
              <div className="f-eyebrow">Cost and release</div>
              <div className="f-actions">
                {(Object.keys(TIERS) as Tier[]).map((t) => (
                  <button key={t} className={"f-button " + (tier === t ? "" : "secondary")} onClick={() => setTier(t)}>{TIERS[t].label} {TIERS[t].height}p</button>
                ))}
              </div>
              {(() => { const e = estimate(ad, tier); return <p className="f-small">{e.seconds}s of footage at {e.height}p. Unit cost is not measured yet, so no dollar figure is shown; nothing runs without a producer action.</p>; })()}
              {problems.length > 0 && <div className="f-callout"><strong>Fix before sharing:</strong><ul>{problems.map((x) => <li key={x}>{x}</li>)}</ul></div>}
              <div className="f-actions">
                {editable && (
                  <button className="f-button" disabled={busy || problems.length > 0 || !ad.continuity.approved} onClick={() => void command({ type: "shareAdvert" }, "Treatment shared with the customer.")}>
                    Share treatment with customer <Check size={14} />
                  </button>
                )}
                {ad.status === "approved" && ad.continuity.approved && (
                  <a className="f-button" href={`/api/factory/projects/${p.id}/advert-pack?tier=${tier}`} download>Download prompt pack <Download size={15} /></a>
                )}
              </div>
            </section>
          )}
          {ad.status === "shared" && (!operator || p.producerApprovals) && (
            <section className="f-panel f-review">
              <div className="f-eyebrow">Your decision</div>
              {operator && <p className="f-small">Test mode: this is recorded as given on the customer&apos;s behalf.</p>}
              <Field label="Feedback (required for changes)"><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} /></Field>
              <div className="f-actions">
                <button className="f-button" disabled={busy} onClick={() => void command({ type: "approveAdvert", hash: ad.hash, feedback }, "Treatment approved.")}>Approve treatment <Check size={14} /></button>
                <button className="f-button secondary" disabled={busy || !feedback.trim()} onClick={() => void command({ type: "requestAdvertChanges", hash: ad.hash, feedback }, "Changes requested.")}>Request changes</button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
