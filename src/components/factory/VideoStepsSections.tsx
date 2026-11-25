"use client";
import { useState } from "react";
import { Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import type { VideoPlan, VideoReference, VideoSheet, VideoShot } from "@/lib/factory/model";
import type { AgentSlot } from "@/lib/factory/agent-prompts";
import { SHEET_KINDS, TEMPLATES, scriptSeconds, skeleton } from "@/lib/factory/video-steps";
import { AgentPopout } from "./AgentPopout";
import { Field } from "./shared";

// The four sections of Video steps (CHG-0115). Presentational: the container owns the requests and the plan.
type Save = (action: string, payload: Record<string, unknown>) => Promise<boolean>;
type Props = { plan: VideoPlan | null; busy: boolean; generating: boolean; onSave: Save; onGenerate: (step: "references" | "script" | "sheets" | "prompts", extra?: Record<string, unknown>) => void };
const stamp = (at?: string) => (at ? at.slice(0, 16).replace("T", " ") + " UTC" : "");
const Agent = ({ slot }: { slot: AgentSlot }) => <AgentPopout slot={slot} />;
const GenButton = ({ label, busy, generating, onClick, disabled }: { label: string; busy: boolean; generating: boolean; onClick: () => void; disabled?: boolean }) => (
  <button type="button" className="f-button secondary" disabled={busy || generating || disabled} onClick={onClick}><Sparkles size={15} /> {generating ? "Generating…" : label}</button>
);

// ---------------- References ----------------
const REF_FIELDS: { key: keyof VideoReference; label: string }[] = [
  { key: "palette", label: "Colour palette" }, { key: "composition", label: "Composition" }, { key: "camera", label: "Camera" }, { key: "film", label: "Film or look" }, { key: "lens", label: "Lens" }, { key: "why", label: "Why it fits" }, { key: "searchTerms", label: "Search terms" },
];
function RefForm({ initial, busy, submit, cancel, label }: { initial?: VideoReference; busy: boolean; submit: (d: Record<string, unknown>) => Promise<boolean>; cancel?: () => void; label: string }) {
  return (
    <form className="f-form-grid w-onecol" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const d = Object.fromEntries(new FormData(form).entries());
      if (await submit(d) && !initial) form.reset();
    }}>
      <Field label="Title"><input name="title" required maxLength={120} defaultValue={initial?.title} placeholder="For example, Baker's window at dawn" /></Field>
      <Field label="Link to the still or clip (optional)"><input name="link" type="text" inputMode="url" maxLength={500} defaultValue={initial?.link} placeholder="https://" /></Field>
      {REF_FIELDS.map((f) => <Field key={f.key} label={f.label}><input name={f.key} maxLength={600} defaultValue={String(initial?.[f.key] ?? "")} /></Field>)}
      <div><button className="f-button" disabled={busy}>{label}</button>{cancel && <> <button type="button" className="f-button secondary" onClick={cancel}>Cancel</button></>}</div>
    </form>
  );
}
export function ReferencesSection({ plan, busy, generating, onSave, onGenerate }: Props) {
  const [editing, setEditing] = useState("");
  const refs = plan?.references || [];
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="vs-refs">
        <div className="f-section-heading"><h3 id="vs-refs">References</h3></div>
        <Agent slot="synthesis:video-references" />
        <p className="f-small">The look the finished video should have, matched to the story, the brand and the age group. Ask the AI for a reference brief of what to look for, then add the stills and clips you find (for example from ShotDeck) with their palette, composition, camera, film look and lens. Only accepted references go forward to scripting.</p>
        <div className="w-generate">
          <GenButton label="Generate reference brief" busy={busy} generating={generating} onClick={() => onGenerate("references")} />
          <span className="f-small">The AI suggests what to find. It does not fetch images.</span>
        </div>
        {plan?.referenceSummary && <div className="f-callout">{plan.referenceSummary}</div>}
        {refs.length === 0 ? <p className="f-small">No references yet.</p> : (
          <ul className="w-cardlist">
            {refs.map((r) => editing === r.id ? (
              <li key={r.id}><RefForm initial={r} busy={busy} label="Save reference" cancel={() => setEditing("")} submit={async (d) => { const ok = await onSave("reference-update", { id: r.id, ...d }); if (ok) setEditing(""); return ok; }} /></li>
            ) : (
              <li key={r.id} className={r.accepted ? "" : "w-pending"}>
                <div className="w-cardhead">
                  <strong>{r.title}</strong>
                  <span className={"f-tag " + (r.accepted ? "green" : "orange")}>{r.accepted ? "Accepted" : "AI draft, not accepted"}</span>
                  {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer">Open link</a>}
                </div>
                <dl className="w-facts">{REF_FIELDS.filter((f) => r[f.key]).map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{String(r[f.key])}</dd></div>)}</dl>
                <div className="w-actions">
                  <button type="button" className="f-button small" disabled={busy} onClick={() => void onSave("reference-accept", { id: r.id, accepted: !r.accepted })}>{r.accepted ? "Unaccept" : "Accept"}</button>
                  <button type="button" className="f-button secondary small" disabled={busy} onClick={() => setEditing(r.id)}>Edit</button>
                  <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void onSave("reference-remove", { id: r.id })}><Trash2 size={14} /> Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="f-panel" aria-labelledby="vs-refadd">
        <h3 id="vs-refadd">Add a reference</h3>
        <RefForm busy={busy} label="Add reference" submit={(d) => onSave("reference-add", d)} />
      </section>
    </div>
  );
}

// ---------------- Scripting ----------------
export type ScriptSeed = { template: "15" | "30" | "60" | "custom"; title: string; shots: VideoShot[] };
export function ScriptSection({ plan, seed, busy, generating, onSave, onGenerate }: Props & { seed?: ScriptSeed }) {
  const start: ScriptSeed = seed || (plan?.script ? { template: plan.script.template, title: plan.script.title, shots: plan.script.shots } : { template: "15", title: "", shots: [] });
  const [template, setTemplate] = useState(start.template);
  const [title, setTitle] = useState(start.title);
  const [shots, setShots] = useState<VideoShot[]>(start.shots);
  const [instruction, setInstruction] = useState("");
  const set = (i: number, k: keyof VideoShot, v: string) => setShots((all) => all.map((s, j) => (j === i ? { ...s, [k]: k === "seconds" ? Number(v) || 0 : v } : s)));
  const saved = plan?.script;
  const tpl = TEMPLATES.find((t) => t.key === template);
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="vs-script">
        <div className="f-section-heading"><h3 id="vs-script">Scripting</h3></div>
        <Agent slot="synthesis:video-script" />
        <p className="f-small">Start from a template, let the AI draft it, then talk it through: tell the AI what to change and it revises the script. Nothing is saved until you press Save script.</p>
        <div className="w-generate">
          <label className="f-field w-inline"><span>Template</span>
            <select aria-label="Template" value={template} onChange={(e) => setTemplate(e.target.value as ScriptSeed["template"])}>
              {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              <option value="custom">Custom length</option>
            </select>
          </label>
          <button type="button" className="f-button secondary" disabled={busy || generating || template === "custom"} onClick={() => { setShots(skeleton(template as "15" | "30" | "60")); }}>Start from template</button>
          <GenButton label="Draft with AI" busy={busy} generating={generating} onClick={() => onGenerate("script", { template })} />
        </div>
        {tpl && <p className="f-small">{tpl.beats.map((b) => `${b.beat} ${b.seconds}s`).join(", ")}.</p>}
        <form className="f-form-grid w-onecol" onSubmit={async (e) => { e.preventDefault(); await onSave("script-save", { template, title, shots: shots.map((s) => ({ seconds: s.seconds, visual: s.visual, line: s.line, onScreen: s.onScreen })) }); }}>
          <Field label="Script title"><input value={title} required maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
          {shots.map((s, i) => (
            <fieldset key={i} className="w-shot">
              <legend>Shot {i + 1}</legend>
              <Field label="Seconds"><input type="number" min={1} max={60} value={s.seconds} onChange={(e) => set(i, "seconds", e.target.value)} /></Field>
              <Field label="What is seen"><textarea rows={2} maxLength={800} value={s.visual} onChange={(e) => set(i, "visual", e.target.value)} /></Field>
              <Field label="Spoken line or voice-over"><textarea rows={2} maxLength={600} value={s.line} onChange={(e) => set(i, "line", e.target.value)} /></Field>
              <Field label="On-screen text"><input maxLength={200} value={s.onScreen} onChange={(e) => set(i, "onScreen", e.target.value)} /></Field>
              <button type="button" className="f-button secondary small" onClick={() => setShots((all) => all.filter((_, j) => j !== i))}><Trash2 size={14} /> Remove shot</button>
            </fieldset>
          ))}
          <div>
            <button type="button" className="f-button secondary" onClick={() => setShots((all) => [...all, { seconds: 3, visual: "", line: "", onScreen: "" }])}><Plus size={14} /> Add shot</button>{" "}
            <span className="f-small">{shots.length} shots, {scriptSeconds({ shots })} seconds</span>
          </div>
          <div><button className="f-button" disabled={busy || shots.length === 0}>Save script</button>{saved && <span className="f-small"> Saved {stamp(saved.savedAt)} by {saved.savedBy}.</span>}</div>
        </form>
      </section>
      <section className="f-panel" aria-labelledby="vs-chat">
        <h3 id="vs-chat">Talk it through</h3>
        <p className="f-small">Say what to change, for example &quot;make the hook faster&quot; or &quot;add a cutaway of the crust&quot;. The AI revises the saved script and shows it above for you to check and save.</p>
        <div className="w-generate">
          <textarea aria-label="Instruction for the AI" rows={2} maxLength={1000} value={instruction} onChange={(e) => setInstruction(e.target.value)} className="w-wide" />
          <GenButton label="Revise with AI" busy={busy} generating={generating} disabled={!saved || !instruction.trim()} onClick={() => { onGenerate("script", { instruction }); setInstruction(""); }} />
        </div>
        {!saved && <p className="f-small">Save a script first; revisions work on the saved script.</p>}
        {(plan?.chat.length || 0) > 0 && (
          <ul className="f-history">{[...(plan?.chat || [])].reverse().map((c) => <li key={c.id}><span className="f-small">{stamp(c.at)}</span> <strong>{c.instruction}</strong> {c.reply && <span className="f-small">AI: {c.reply}</span>}</li>)}</ul>
        )}
      </section>
    </div>
  );
}

// ---------------- Characters, locations and props ----------------
function SheetForm({ initial, busy, submit, cancel, label }: { initial?: VideoSheet; busy: boolean; submit: (d: Record<string, unknown>) => Promise<boolean>; cancel?: () => void; label: string }) {
  return (
    <form className="f-form-grid w-onecol" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const d = Object.fromEntries(new FormData(form).entries()); if (await submit(d) && !initial) form.reset(); }}>
      <Field label="Type"><select name="kind" defaultValue={initial?.kind || "person"}>{SHEET_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
      <Field label="Name"><input name="name" required maxLength={120} defaultValue={initial?.name} /></Field>
      <Field label="Fixed description (stays the same in every shot)"><textarea name="description" required rows={4} maxLength={1500} defaultValue={initial?.description} /></Field>
      <Field label="Extra details (optional)"><textarea name="details" rows={2} maxLength={1500} defaultValue={initial?.details} /></Field>
      <div><button className="f-button" disabled={busy}>{label}</button>{cancel && <> <button type="button" className="f-button secondary" onClick={cancel}>Cancel</button></>}</div>
    </form>
  );
}
export function SheetsSection({ plan, busy, generating, onSave, onGenerate }: Props) {
  const [editing, setEditing] = useState("");
  const sheets = plan?.sheets || [];
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="vs-sheets">
        <div className="f-section-heading"><h3 id="vs-sheets">Characters, locations and props</h3></div>
        <Agent slot="synthesis:video-sheets" />
        <p className="f-small">A fixed written sheet for each person, product, location and prop, so they look the same in every shot. The AI drafts them from the saved script; accept the ones you want. Only accepted sheets go forward to video generation.</p>
        <div className="w-generate">
          <GenButton label="Draft sheets from the script" busy={busy} generating={generating} disabled={!plan?.script} onClick={() => onGenerate("sheets")} />
          {!plan?.script && <span className="f-small">Save a script first.</span>}
        </div>
        {SHEET_KINDS.map((k) => {
          const rows = sheets.filter((s) => s.kind === k.key);
          if (!rows.length) return null;
          return (
            <div key={k.key}>
              <h4>{k.label}s</h4>
              <ul className="w-cardlist">
                {rows.map((s) => editing === s.id ? (
                  <li key={s.id}><SheetForm initial={s} busy={busy} label="Save sheet" cancel={() => setEditing("")} submit={async (d) => { const ok = await onSave("sheet-update", { id: s.id, ...d }); if (ok) setEditing(""); return ok; }} /></li>
                ) : (
                  <li key={s.id} className={s.accepted ? "" : "w-pending"}>
                    <div className="w-cardhead"><strong>{s.name}</strong><span className={"f-tag " + (s.accepted ? "green" : "orange")}>{s.accepted ? "Accepted" : "AI draft, not accepted"}</span></div>
                    <p className="w-prewrap">{s.description}</p>
                    {s.details && <p className="f-small w-prewrap">{s.details}</p>}
                    <div className="w-actions">
                      <button type="button" className="f-button small" disabled={busy} onClick={() => void onSave("sheet-accept", { id: s.id, accepted: !s.accepted })}>{s.accepted ? "Unaccept" : "Accept"}</button>
                      <button type="button" className="f-button secondary small" disabled={busy} onClick={() => setEditing(s.id)}>Edit</button>
                      <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void onSave("sheet-remove", { id: s.id })}><Trash2 size={14} /> Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {sheets.length === 0 && <p className="f-small">No sheets yet.</p>}
      </section>
      <section className="f-panel" aria-labelledby="vs-sheetadd">
        <h3 id="vs-sheetadd">Add a sheet</h3>
        <SheetForm busy={busy} label="Add sheet" submit={(d) => onSave("sheet-add", d)} />
      </section>
    </div>
  );
}

// ---------------- Video generation ----------------
function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="f-button secondary small" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard not available */ } }}><Copy size={14} /> {done ? "Copied" : label}</button>;
}
export const allPrompts = (plan: VideoPlan) => `${plan.prompts?.overall || ""}\n\n${(plan.prompts?.shots || []).map((s) => `Shot ${s.shot}: ${s.prompt}`).join("\n\n")}`.trim();
export function PromptsSection({ plan, busy, generating, onSave, onGenerate }: Props) {
  const pr = plan?.prompts;
  const stale = !!(pr && plan?.script && plan.script.savedAt > pr.generatedAt);
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="vs-prompts">
        <div className="f-section-heading"><h3 id="vs-prompts">Video generation</h3></div>
        <Agent slot="synthesis:video-prompts" />
        <p className="f-small">Pulls the script, accepted sheets and accepted references together into one prompt per shot and an overall style prompt, written for a text-to-video model such as Seedance. Copy them into the video tool. Spoken lines and on-screen text are added in editing, not in the prompts.</p>
        <div className="w-generate">
          <GenButton label={pr ? "Regenerate prompts" : "Generate prompts"} busy={busy} generating={generating} disabled={!plan?.script} onClick={() => onGenerate("prompts")} />
          {!plan?.script && <span className="f-small">Save a script first.</span>}
        </div>
        {stale && <div className="f-callout w-warn" role="status">The script was saved after these prompts were generated. Regenerate them to match.</div>}
        {pr && plan && (
          <form className="f-form-grid w-onecol" onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            await onSave("prompts-save", { overall: d.get("overall"), shots: pr.shots.map((s) => ({ prompt: d.get(`prompt${s.shot}`), negative: d.get(`negative${s.shot}`) })) });
          }}>
            <p className="f-small">{pr.model}, generated {stamp(pr.generatedAt)} by {pr.by}{pr.edited ? ", edited" : ""}.</p>
            <Field label="Overall style prompt"><textarea name="overall" rows={4} maxLength={3000} defaultValue={pr.overall} /></Field>
            <div><CopyButton text={pr.overall} label="Copy overall" /> <CopyButton text={allPrompts(plan)} label="Copy everything" /></div>
            {pr.shots.map((s) => {
              const shot = plan.script?.shots[s.shot - 1];
              return (
                <fieldset key={s.shot} className="w-shot">
                  <legend>Shot {s.shot}{shot ? ` (${shot.seconds}s)` : ""}</legend>
                  {shot && <p className="f-small">Script: {shot.visual}</p>}
                  <Field label="Prompt"><textarea name={`prompt${s.shot}`} rows={5} maxLength={3000} defaultValue={s.prompt} /></Field>
                  <Field label="Avoid"><input name={`negative${s.shot}`} maxLength={1000} defaultValue={s.negative} /></Field>
                  <CopyButton text={s.prompt} label={`Copy shot ${s.shot}`} />
                </fieldset>
              );
            })}
            <div><button className="f-button" disabled={busy}>Save edits</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
