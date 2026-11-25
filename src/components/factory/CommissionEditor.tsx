"use client";
import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import type { BrandListEntry, Commission, CommissionInput, EvidenceItem, Generation, RedLine } from "@/lib/factory/model";
import { CHANGE_LIST_ACTIVE, EVIDENCE_ACTIVE, EVIDENCE_BASIS, EVIDENCE_WHERE, INPUTS, MAX_ANSWER, SECONDARY, STATUS_LABEL, inputStatus, type ListName } from "@/lib/factory/commissions";
import { RED_LINE_CATEGORIES } from "@/lib/factory/customers";
import type { AgentSlot } from "@/lib/factory/agent-prompts";
import { AgentPopout } from "./AgentPopout";
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
  onGenerate?: GenerateFn;
};
/** Ask the AI for a draft of an input's answers (the audience also names an age group). Resolves with the draft, or null if it failed. */
export type GenerateFn = (input: "objective" | "product" | "brand" | "audience", generation?: Generation) => Promise<Record<string, string> | null>;
type Save = CommissionEditorProps["onSave"];

const AGENT_SLOT: Partial<Record<CommissionInput, AgentSlot>> = { objective: "research:commission-objective", product: "research:commission-product", brand: "research:commission-brand", audience: "synthesis:intended-audience" };
const scopeLabel = (s: string) => (s === "recurring" ? "Recurs across years" : "Single campaign");
const kindLabel = (k?: string) => (k === "out_of_character" ? "Out of character" : k === "can_change" ? "Can change" : "");
const whereLabel = (k: string) => EVIDENCE_WHERE.find((w) => w.key === k)?.label || k;
const basisLabel = (k: string) => EVIDENCE_BASIS.find((b) => b.key === k)?.label || k;
const stamp = (at: string) => at.slice(0, 16).replace("T", " ") + " UTC";
const tone = (s: string) => (s === "complete" ? "green" : s === "in_progress" ? "orange" : "light");

/** A collapsed dropdown. While `locked` it is greyed out: its contents can be read but nothing in it can be changed. */
function Dropdown({ title, count, locked, children }: { title: string; count?: number; locked: boolean; children: React.ReactNode }) {
  return (
    <details className={"w-dropdown" + (locked ? " w-locked" : "")} aria-disabled={locked ? "true" : undefined}>
      <summary>{title}{count !== undefined ? ` (${count})` : ""}{locked && <span className="f-small"> Not available yet</span>}</summary>
      <fieldset className="w-fieldset" disabled={locked}>{children}</fieldset>
    </details>
  );
}

function Evidence({ input, items, busy, onSave }: { input: CommissionInput; items: EvidenceItem[]; busy: boolean; onSave: Save }) {
  const locked = !EVIDENCE_ACTIVE;
  return (
    <Dropdown title="Evidence" count={items.length} locked={locked}>
    <div className="w-evidence">
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
    </Dropdown>
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
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [generating, setGenerating] = useState(false);
  const research = def.key === "objective" || def.key === "product" || def.key === "brand";
  const notes = research ? commission.aiNotes?.[def.key as "objective" | "product" | "brand"] : undefined;
  const status = inputStatus(commission, def.key);
  const confirmable = def.key === "objective" || def.key === "audience";
  return (
    <section className="f-panel" aria-labelledby={`in-${def.key}`}>
      <div className="f-section-heading">
        <h3 id={`in-${def.key}`}>Input {def.number}: {def.title}</h3>
        <span><span className="f-tag light">{def.role}</span> <span className={"f-tag " + tone(status)}>{STATUS_LABEL[status]}</span></span>
      </div>
      {AGENT_SLOT[def.key] && <AgentPopout slot={AGENT_SLOT[def.key]!} />}
      <p className="f-small">{def.helper}</p>
      {def.key === "audience" ? <AudienceBlock commission={commission} busy={busy} onSave={onSave} onGenerate={onGenerate} /> : (
        <>
          {research && onGenerate && (
            <div className="w-generate">
              <button type="button" className="f-button secondary" disabled={busy || generating} onClick={async () => {
                const hasText = def.prompts.some((p) => (commission.answers[def.key][p.key] || "").trim());
                if (hasText && !window.confirm("Replace the boxes below with an AI draft? Nothing is saved until you press Save answers.")) return;
                setGenerating(true);
                try { const d = await onGenerate(def.key as "objective" | "product" | "brand"); if (d) setDraft(d); } finally { setGenerating(false); }
              }}><Sparkles size={15} /> {generating ? "Researching…" : "Generate from AI"}</button>
              <span className="f-small">Searches the web for the company and the product or service entered in the Project box, then fills the boxes below. This can take a few minutes. You review it before saving.</span>
            </div>
          )}
          {draft && <div className="f-callout" role="status">AI draft filled in below, not saved yet. Edit it, then press Save answers.{" "}<button type="button" className="f-text-button" onClick={() => setDraft(null)}>Discard draft</button></div>}
          <form className="f-form-grid" onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); if (await onSave("answers", { input: def.key, answers: Object.fromEntries(def.prompts.map((p) => [p.key, d.get(p.key) || ""])) })) setDraft(null); }}>
            {def.prompts.map((p) => (
              <Field key={p.key + (draft ? "-ai" : "")} label={p.label}><textarea name={p.key} rows={def.key === "brand" ? (draft ? 16 : 6) : draft ? 6 : 3} maxLength={p.max ?? MAX_ANSWER} defaultValue={draft?.[p.key] ?? (commission.answers[def.key][p.key] || "")} /></Field>
            ))}
            <div><button className="f-button" disabled={busy}>Save answers</button></div>
          </form>
          {notes && (
            <details className="w-dropdown w-notes">
              <summary>AI notes <span className="f-small">(from the last Generate from AI, {notes.model})</span></summary>
              {notes.sections.map((n) => <div key={n.title}><h5>{n.title}</h5><p className="w-prewrap">{n.text}</p></div>)}
              {notes.sources.length > 0 && <div><h5>Sources</h5><ul>{notes.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul></div>}
            </details>
          )}
        </>
      )}
      {confirmable && (
        <label className="f-check-line">
          <input type="checkbox" checked={!!commission.confirmed[def.key as "objective" | "audience"]} disabled={busy} onChange={(e) => void onSave("confirm", { input: def.key, confirmed: e.target.checked })} /> Confirmed directly with the client
        </label>
      )}
      {def.key === "brand" && (
        <>
          <BrandList list="preserve" title="Preserve" hint="The non-negotiable DNA once the setting is removed." entries={commission.preserve} busy={busy} onSave={onSave} />
          <Dropdown title="Can change or out of character" count={commission.change.length} locked={!CHANGE_LIST_ACTIVE}>
            <BrandList list="change" title="Can change or out of character" hint="Where there is room for a fresh idea, and what would be out of character." entries={commission.change} busy={busy} onSave={onSave} />
          </Dropdown>
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
    <div className="w-stack w-inputs">
      <section className="f-panel" aria-labelledby="proj-name">
        <div className="f-section-heading"><h3 id="proj-name">Project</h3></div>
        <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); void onSave("rename", { name: new FormData(e.currentTarget).get("name") }); }}>
          <Field label="Project name"><input name="name" required maxLength={120} defaultValue={commission.name} /></Field>
          <div><button className="f-button" disabled={busy}>Save name</button></div>
        </form>
        <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); void onSave("brief", { product: d.get("product"), market: d.get("market"), timing: d.get("timing"), productUrl: d.get("productUrl"), subBrand: d.get("subBrand"), format: d.get("format") }); }}>
          <Field label="Product, service or offer this project is about"><input name="product" maxLength={300} defaultValue={commission.brief?.product || ""} placeholder="For example, the sourdough loaf range" /></Field>
          <Field label="Market or geography (optional)"><input name="market" maxLength={200} defaultValue={commission.brief?.market || ""} placeholder="For example, UK, prices in GBP" /></Field>
          <Field label="Campaign timing or season (optional)"><input name="timing" maxLength={200} defaultValue={commission.brief?.timing || ""} placeholder="For example, Autumn" /></Field>
          <Field label="Product page link (optional)"><input name="productUrl" type="text" inputMode="url" maxLength={500} defaultValue={commission.brief?.productUrl || ""} placeholder="https://example.com/product" /></Field>
          <Field label="Sub-brand or collection (optional)"><input name="subBrand" maxLength={200} defaultValue={commission.brief?.subBrand || ""} /></Field>
          <Field label="Proposed video format (optional)"><input name="format" maxLength={200} defaultValue={commission.brief?.format || ""} placeholder="For example, 15 second vertical video" /></Field>
          <div><button className="f-button" disabled={busy}>Save project details</button> <span className="f-small">The AI agents on Inputs 1, 3 and 5 search for this product or service and the customer.</span></div>
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
