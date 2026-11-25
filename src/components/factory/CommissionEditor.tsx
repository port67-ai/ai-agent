"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { BrandListEntry, Commission, CommissionInput, EvidenceItem, Generation, RedLine } from "@/lib/factory/model";
import { EVIDENCE_BASIS, EVIDENCE_WHERE, INPUTS, MAX_ANSWER, SECONDARY, STATUS_LABEL, inputStatus, type ListName } from "@/lib/factory/commissions";
import { RED_LINE_CATEGORIES } from "@/lib/factory/customers";
import { AudienceBlock } from "./AudienceBlock";
import { Field } from "./shared";

// Commission inputs for the video workspace (CHG-0107, FAC-VWS-012 to FAC-VWS-015). Presentational: the container owns the requests.
export type CommissionEditorProps = {
  commission: Commission;
  redLines: RedLine[];
  busy: boolean;
  /** Run one action on the commission. Resolves true when it succeeded, so a form can clear itself. */
  onSave: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
  /** Ask the AI for a draft of the audience answers for one age group. Resolves with the draft (prompt key to text), or null if it failed. Saves nothing. */
  onGenerate?: (input: "audience", generation: Generation) => Promise<Record<string, string> | null>;
};
type Save = CommissionEditorProps["onSave"];

const scopeLabel = (s: string) => (s === "recurring" ? "Recurs across years" : "Single campaign");
const kindLabel = (k?: string) => (k === "out_of_character" ? "Out of character" : k === "can_change" ? "Can change" : "");
const whereLabel = (k: string) => EVIDENCE_WHERE.find((w) => w.key === k)?.label || k;
const basisLabel = (k: string) => EVIDENCE_BASIS.find((b) => b.key === k)?.label || k;
const stamp = (at: string) => at.slice(0, 16).replace("T", " ") + " UTC";
const tone = (s: string) => (s === "complete" ? "green" : s === "in_progress" ? "orange" : "light");

function Evidence({ input, items, busy, onSave }: { input: CommissionInput; items: EvidenceItem[]; busy: boolean; onSave: Save }) {
  return (
    <div className="w-evidence">
      <h4>Evidence</h4>
      {items.length === 0 ? <p className="f-small">No evidence yet. Add where you looked, and whether it was announced, confirmed by the client, or your own inference.</p> : (
        <ul className="w-rows">
          {items.map((e) => (
            <li key={e.id}>
              <span className="f-tag">{basisLabel(e.basis)}</span>{" "}
              {/^https:\/\//.test(e.source) ? <a href={e.source} target="_blank" rel="noopener noreferrer">{e.source}</a> : <strong>{e.source}</strong>}{" "}
              <span className="f-small">{whereLabel(e.where)}{e.note ? `. ${e.note}` : ""}</span>{" "}
              <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void onSave("evidence-remove", { evidenceId: e.id })}><Trash2 size={14} /> Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="f-form-grid" onSubmit={async (ev) => {
        ev.preventDefault();
        const form = ev.currentTarget;
        const d = new FormData(form);
        if (await onSave("evidence-add", { input, source: d.get("source"), where: d.get("where"), basis: d.get("basis"), note: d.get("note") })) form.reset();
      }}>
        <Field label="Source (link or note)"><input name="source" required maxLength={500} placeholder="https://... or a note" /></Field>
        <Field label="Where did you look?"><select name="where" defaultValue="client_brief">{EVIDENCE_WHERE.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}</select></Field>
        <Field label="Basis"><select name="basis" defaultValue="announced">{EVIDENCE_BASIS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field>
        <Field label="Note (optional)"><input name="note" maxLength={1000} /></Field>
        <div><button className="f-button" disabled={busy}>Add evidence</button></div>
      </form>
    </div>
  );
}

function BrandList({ list, title, hint, entries, busy, onSave }: { list: ListName; title: string; hint: string; entries: BrandListEntry[]; busy: boolean; onSave: Save }) {
  const [editing, setEditing] = useState("");
  const kinds = list === "change";
  const kindSelect = (value?: string) => <Field label="Can change or out of character"><select name="kind" defaultValue={value || "can_change"}><option value="can_change">Can change</option><option value="out_of_character">Out of character</option></select></Field>;
  const scopeSelect = (value?: string) => <Field label="Recurs or single campaign"><select name="scope" defaultValue={value || "recurring"}><option value="recurring">Recurs across years and channels</option><option value="single_campaign">Belonged to a single campaign</option></select></Field>;
  return (
    <div className="w-brandlist">
      <h4>{title}</h4>
      <p className="f-small">{hint}</p>
      {entries.length > 0 && (
        <ul className="w-rows">
          {entries.map((e) => editing === e.id ? (
            <li key={e.id}>
              <form className="f-form-grid" onSubmit={async (ev) => { ev.preventDefault(); const d = new FormData(ev.currentTarget); if (await onSave("list-update", { list, entryId: e.id, text: d.get("text"), scope: d.get("scope"), ...(kinds ? { kind: d.get("kind") } : {}) })) setEditing(""); }}>
                <Field label="Entry"><input name="text" required maxLength={500} defaultValue={e.text} /></Field>
                {scopeSelect(e.scope)}
                {kinds && kindSelect(e.kind)}
                <div><button className="f-button" disabled={busy}>Save entry</button> <button type="button" className="f-button secondary" onClick={() => setEditing("")}>Cancel</button></div>
              </form>
            </li>
          ) : (
            <li key={e.id}>
              {kinds && <span className="f-tag">{kindLabel(e.kind)}</span>} <strong>{e.text}</strong> <span className="f-small">{scopeLabel(e.scope)}</span>{" "}
              <button type="button" className="f-button secondary small" disabled={busy} onClick={() => setEditing(e.id)}>Edit</button>{" "}
              <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void onSave("list-remove", { list, entryId: e.id })}><Trash2 size={14} /> Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="f-form-grid" onSubmit={async (ev) => { ev.preventDefault(); const form = ev.currentTarget; const d = new FormData(form); if (await onSave("list-add", { list, text: d.get("text"), scope: d.get("scope"), ...(kinds ? { kind: d.get("kind") } : {}) })) form.reset(); }}>
        <Field label="Entry"><input name="text" required maxLength={500} /></Field>
        {scopeSelect()}
        {kinds && kindSelect()}
        <div><button className="f-button" disabled={busy}>{list === "preserve" ? "Add to preserve" : "Add entry"}</button></div>
      </form>
    </div>
  );
}

function InputCard({ def, commission, redLines, busy, onSave, onGenerate }: { def: (typeof INPUTS)[number]; commission: Commission; redLines: RedLine[]; busy: boolean; onSave: Save; onGenerate?: CommissionEditorProps["onGenerate"] }) {
  const status = inputStatus(commission, def.key);
  const confirmable = def.key === "objective" || def.key === "audience";
  return (
    <section className="f-panel" aria-labelledby={`in-${def.key}`}>
      <div className="f-section-heading">
        <h3 id={`in-${def.key}`}>Input {def.number}: {def.title}</h3>
        <span><span className="f-tag light">{def.role}</span> <span className={"f-tag " + tone(status)}>{STATUS_LABEL[status]}</span></span>
      </div>
      <p className="f-small">{def.helper}</p>
      {def.key === "audience" ? <AudienceBlock commission={commission} busy={busy} onSave={onSave} onGenerate={onGenerate} /> : (
        <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); void onSave("answers", { input: def.key, answers: Object.fromEntries(def.prompts.map((p) => [p.key, d.get(p.key) || ""])) }); }}>
          {def.prompts.map((p) => (
            <Field key={p.key} label={p.label}><textarea name={p.key} rows={3} maxLength={MAX_ANSWER} defaultValue={commission.answers[def.key][p.key] || ""} /></Field>
          ))}
          <div><button className="f-button" disabled={busy}>Save answers</button></div>
        </form>
      )}
      {confirmable && (
        <label className="f-check-line">
          <input type="checkbox" checked={!!commission.confirmed[def.key as "objective" | "audience"]} disabled={busy} onChange={(e) => void onSave("confirm", { input: def.key, confirmed: e.target.checked })} /> Confirmed directly with the client
        </label>
      )}
      {def.key === "brand" && (
        <>
          <BrandList list="preserve" title="Preserve" hint="The non-negotiable DNA once the setting is removed." entries={commission.preserve} busy={busy} onSave={onSave} />
          <BrandList list="change" title="Can change or out of character" hint="Where there is room for a fresh idea, and what would be out of character." entries={commission.change} busy={busy} onSave={onSave} />
          <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); void onSave("went-too-far", { text: new FormData(e.currentTarget).get("text") }); }}>
            <Field label="One example that went too far (the client's own)"><textarea name="text" rows={3} maxLength={2000} defaultValue={commission.wentTooFar} /></Field>
            <div><button className="f-button" disabled={busy}>Save example</button></div>
          </form>
          <div className="f-callout">
            Client red lines from the customer account: {redLines.length === 0 ? "none recorded." : redLines.map((l) => `${RED_LINE_CATEGORIES.find((c) => c.key === l.category)?.label || l.category}: ${l.text}`).join("; ") + "."}
          </div>
        </>
      )}
      <Evidence input={def.key} items={commission.evidence.filter((e) => e.input === def.key)} busy={busy} onSave={onSave} />
    </section>
  );
}

export function CommissionEditor(props: CommissionEditorProps) {
  const { commission, redLines, busy, onSave, onGenerate } = props;
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="proj-name">
        <div className="f-section-heading"><h3 id="proj-name">Project</h3></div>
        <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); void onSave("rename", { name: new FormData(e.currentTarget).get("name") }); }}>
          <Field label="Project name"><input name="name" required maxLength={120} defaultValue={commission.name} /></Field>
          <div><button className="f-button" disabled={busy}>Save name</button></div>
        </form>
      </section>
      {INPUTS.map((def) => <InputCard key={def.key} def={def} commission={commission} redLines={redLines} busy={busy} onSave={onSave} onGenerate={onGenerate} />)}
      <section aria-labelledby="secondary">
        <h3 id="secondary">Secondary checks</h3>
        <p className="f-small">Not available yet. They come in a later step.</p>
        {SECONDARY.map((s) => (
          <div key={s.title} className="f-panel w-locked" aria-disabled="true">
            <h4>{s.title}</h4>
            <p className="f-small">{s.what}</p>
            <p className="f-small">Where to look: {s.where}</p>
          </div>
        ))}
      </section>
      <details className="f-panel">
        <summary>History ({commission.audit.length})</summary>
        <ul className="f-history">
          {[...commission.audit].reverse().slice(0, 30).map((a) => <li key={a.id}><span className="f-small">{stamp(a.at)}</span> {a.action.replace(/_/g, " ")}{a.detail ? `: ${a.detail}` : ""} <span className="f-small">by {a.actor}</span></li>)}
        </ul>
      </details>
    </div>
  );
}
