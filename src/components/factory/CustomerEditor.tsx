"use client";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { useRef, useState, type ReactNode } from "react";
import { FileText, Image as ImageIcon, Plus, Search, Trash2 } from "lucide-react";
import type { CustomerAccount, SocialPlatform } from "@/lib/factory/model";
import { MAX_BRAND_TEXT, PURPOSE_LABEL, PURPOSE_MIMES, RED_LINE_CATEGORIES, SOCIAL_PLATFORMS, purposeExtension } from "@/lib/factory/customers";
import { Empty, Field } from "./shared";

/** A panel that opens and closes like History. It sits outside the keyed forms, so saving does not collapse it. Starts open only while it has nothing in it yet. */
function Collapsible({ id, title, summary, startOpen, children }: { id: string; title: string; summary: string; startOpen: boolean; children: ReactNode }) {
  const [open] = useState(startOpen);
  return (
    <details className="f-panel w-collapse" open={open}>
      <summary id={id}>{title} <span className="f-small">{summary}</span></summary>
      {children}
    </details>
  );
}

// Customer account editor for the video workspace (CHG-0103, FAC-VWS-004 to FAC-VWS-007). Presentational: the container owns the requests.
export type FindResult = { pageUrl: string; found: Partial<Record<SocialPlatform, string>>; existing: Partial<Record<SocialPlatform, string>> };
export type EditorProps = {
  tabbed?: boolean;
  customer: CustomerAccount;
  busy: boolean;
  found?: FindResult;
  /** Run one action on the account. Resolves true when it succeeded, so a form can clear itself. */
  onSave: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
  onFind: () => void;
  onUpload: (file: File) => Promise<boolean>;
  /** Shown below the red lines and above History (the Brand Intelligence dossier). */
  children?: ReactNode;
};

const stamp = (at: string) => at.slice(0, 16).replace("T", " ") + " UTC";
const size = (bytes: number) => (bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB");
const AUDIT_LABEL: Record<string, string> = {
  customer_created: "Account created", name_changed: "Name changed", website_changed: "Website changed", social_links_saved: "Social links saved",
  red_line_added: "Red line added", red_line_changed: "Red line changed", red_line_removed: "Red line removed",
  purpose_uploaded: "Brand purpose file uploaded", purpose_removed: "Brand purpose file removed",
  brand_text_saved: "Brand text saved", brand_text_authorised: "Models allowed to read the brand text", brand_text_authorisation_withdrawn: "Model access to the brand text withdrawn",
  purpose_model_authorised: "Models allowed to read a file", purpose_model_authorisation_withdrawn: "Model access to a file withdrawn",
};
const fileType = (mime: string) => (purposeExtension(mime) || "file").toUpperCase();
const ACCEPT = PURPOSE_MIMES.map((m) => "." + purposeExtension(m)).concat(".jpeg").join(",");

function Details({ customer, busy, onSave }: Pick<EditorProps, "customer" | "busy" | "onSave">) {
  return (
    <section className="f-panel" aria-labelledby="cust-details">
      <div className="f-section-heading"><h3 id="cust-details">Business</h3></div>
      <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); void onSave("update", { name: d.get("name"), website: d.get("website") }); }}>
        <Field label="Business name"><input name="name" required maxLength={120} defaultValue={customer.name} /></Field>
        <Field label="Website"><input name="website" type="text" inputMode="url" placeholder="https://example.com" maxLength={2000} defaultValue={customer.website} /></Field>
        <div><button className="f-button" disabled={busy}>Save business details</button></div>
      </form>
      <p className="f-small">The company is the brand. Projects for this company use this record.</p>
    </section>
  );
}

function Socials({ customer, busy, found, onSave, onFind }: Pick<EditorProps, "customer" | "busy" | "found" | "onSave" | "onFind">) {
  // What the producer typed or chose. A field shows that, else the saved link, else a link found on the website (empty fields only).
  // Nothing is saved until the producer presses Save.
  const [edits, setEdits] = useState<Partial<Record<SocialPlatform, string>>>({});
  const value = (key: SocialPlatform) => edits[key] ?? customer.socials[key] ?? found?.found[key] ?? "";
  const draft = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, value(p.key)])) as Record<SocialPlatform, string>;
  const different = found ? SOCIAL_PLATFORMS.filter((p) => found.found[p.key] && value(p.key) && value(p.key) !== found.found[p.key]) : [];
  const nothing = found && !Object.keys(found.found).length;
  return (
    <>
      <div className="f-section-heading">
        <span className="f-small">The links the research agent will visit.</span>
        <button type="button" className="f-button secondary small" disabled={busy || !customer.website} onClick={onFind}><Search size={15} /> Find from website</button>
      </div>
      {!customer.website && <p className="f-small">Save the website above to look for its social links.</p>}
      {found && (
        <div className="f-callout" role="status">
          {nothing ? <>No social links were found on {found.pageUrl}. Enter them by hand.</> : <>Read {found.pageUrl}. Links it found are filled into empty fields below. Review them, then save.</>}
          {different.map((p) => (
            <div key={p.key} className="f-small">
              {p.label} is already {value(p.key)}, the website says {found!.found[p.key]}.{" "}
              <button type="button" className="f-text-button" onClick={() => setEdits((d) => ({ ...d, [p.key]: found!.found[p.key]! }))}>Use the website link</button>
            </div>
          ))}
        </div>
      )}
      <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); void onSave("socials", { socials: draft }); }}>
        {SOCIAL_PLATFORMS.map((p) => (
          <Field key={p.key} label={p.label}>
            <input type="text" inputMode="url" placeholder={`https://${p.domains[0]}/...`} maxLength={2000} value={draft[p.key]} onChange={(e) => setEdits((d) => ({ ...d, [p.key]: e.target.value }))} />
          </Field>
        ))}
        <div><button className="f-button" disabled={busy}>Save social links</button></div>
      </form>
    </>
  );
}

function BrandText({ customer, busy, onSave, onUpload }: Pick<EditorProps, "customer" | "busy" | "onSave" | "onUpload">) {
  return (
    <>
      <form className="f-form-grid" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); void onSave("brand-text", { purposeText: d.get("purposeText"), knownFor: d.get("knownFor") }); }}>
        <Field label="Brand purpose (type or paste)"><textarea name="purposeText" rows={6} maxLength={MAX_BRAND_TEXT} defaultValue={customer.purposeText || ""} /></Field>
        <Field label="What is the brand known for?"><textarea name="knownFor" rows={6} maxLength={MAX_BRAND_TEXT} defaultValue={customer.knownFor || ""} /></Field>
        <div><button className="f-button" disabled={busy}>Save brand text</button></div>
      </form>
      <label className="f-check-line">
        <input type="checkbox" checked={!!customer.textAuthorisation} disabled={busy} onChange={(e) => void onSave("brand-text-authorise", { authorise: e.target.checked })} /> AI steps may read these two texts
      </label>
      <p className="f-small">Kept private. If you change the text, permission is withdrawn until you tick the box again.</p>
      <Files customer={customer} busy={busy} onSave={onSave} onUpload={onUpload} />
    </>
  );
}

/** Brand purpose files: an Add button and one small chip per file. A chip opens the file in a new tab. */
function Files({ customer, busy, onSave, onUpload }: Pick<EditorProps, "customer" | "busy" | "onSave" | "onUpload">) {
  const input = useRef<HTMLInputElement>(null);
  const [round, setRound] = useState(0);
  const full = customer.brandPurpose.length >= 5;
  return (
    <div className="w-files">
      <div className="w-files-row">
        <strong>Files</strong>
        {customer.brandPurpose.map((f) => (
          <span key={f.id} className="w-chip">
            <a href={`/api/factory/customers/${customer.id}/purpose/${f.id}`} target="_blank" rel="noopener noreferrer" title={`${f.name}, ${fileType(f.mime)}, ${size(f.bytes)}, added ${stamp(f.uploadedAt)}. Opens in a new tab.`}>
              {f.mime.startsWith("image/") ? <ImageIcon size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
              <span className="w-chip-type">{fileType(f.mime)}</span>
              <span className="w-chip-name">{f.name}</span>
            </a>
            <label className="w-chip-ai" title="AI steps may read this file">
              <input type="checkbox" checked={!!f.modelAuthorisation} disabled={busy} onChange={(e) => void onSave("purpose-authorise", { fileId: f.id, authorise: e.target.checked })} /> AI may read
            </label>
            <button type="button" className="w-chip-x" aria-label={`Remove ${f.name}`} disabled={busy} onClick={() => void onSave("purpose-remove", { fileId: f.id })}><Trash2 size={13} /></button>
          </span>
        ))}
        <button type="button" className="f-button secondary small" disabled={busy || full} onClick={() => { if (window.confirm("I confirm Port67 has the right to hold and use this file.")) input.current?.click(); }}><Plus size={14} /> Add</button>
        <input ref={input} key={round} type="file" hidden accept={ACCEPT} aria-label="Choose a brand purpose file" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onUpload(file);
          setRound((n) => n + 1);
        }} />
      </div>
      <p className="f-small">{customer.brandPurpose.length === 0 ? "No files yet. " : ""}{PURPOSE_LABEL}. Files are kept private; an AI step can read one only after you allow it.{full ? " Five files is the limit; remove one to add another." : ""}</p>
    </div>
  );
}

function RedLines({ customer, busy, onSave }: Pick<EditorProps, "customer" | "busy" | "onSave">) {
  const [editing, setEditing] = useState("");
  const label = (key: string) => RED_LINE_CATEGORIES.find((c) => c.key === key)?.label || key;
  const categories = RED_LINE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>);
  return (
    <>
      <p className="f-small">Anything the client does not want referenced or associated with. Each one is kept separately so later steps can check against it.</p>
      {customer.redLines.length === 0 ? <Empty title="No red lines yet">Add topics, competitors, people, words or visuals to avoid.</Empty> : (
        <ul className="w-rows">
          {customer.redLines.map((l) => editing === l.id ? (
            <li key={l.id}>
              <form className="f-form-grid" onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); if (await onSave("red-line-update", { lineId: l.id, category: d.get("category"), text: d.get("text"), reason: d.get("reason") })) setEditing(""); }}>
                <Field label="Category"><select name="category" defaultValue={l.category}>{categories}</select></Field>
                <Field label="Red line"><input name="text" required maxLength={300} defaultValue={l.text} /></Field>
                <Field label="Reason (optional)"><input name="reason" maxLength={500} defaultValue={l.reason || ""} /></Field>
                <div><button className="f-button" disabled={busy}>Save red line</button> <button type="button" className="f-button secondary" onClick={() => setEditing("")}>Cancel</button></div>
              </form>
            </li>
          ) : (
            <li key={l.id}>
              <span className="f-tag">{label(l.category)}</span> <strong>{l.text}</strong>{l.reason && <span className="f-small"> Reason: {l.reason}</span>}{" "}
              <button type="button" className="f-button secondary small" disabled={busy} onClick={() => setEditing(l.id)}>Edit</button>{" "}
              <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void onSave("red-line-remove", { lineId: l.id })}><Trash2 size={14} /> Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="f-form-grid" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const d = new FormData(form); if (await onSave("red-line-add", { category: d.get("category"), text: d.get("text"), reason: d.get("reason") })) form.reset(); }}>
        <Field label="Category"><select name="category" defaultValue="topic">{categories}</select></Field>
        <Field label="Red line"><input name="text" required maxLength={300} placeholder="What must not be referenced" /></Field>
        <Field label="Reason (optional)"><input name="reason" maxLength={500} /></Field>
        <div><button className="f-button" disabled={busy}>Add red line</button></div>
      </form>
    </>
  );
}

export function CustomerEditor(props: EditorProps) {
  const { customer } = props;
  const set = SOCIAL_PLATFORMS.filter((p) => customer.socials[p.key]).length;
  const textBits = [customer.purposeText?.trim() ? "purpose" : "", customer.knownFor?.trim() ? "known for" : ""].filter(Boolean);
  const fileCount = customer.brandPurpose.length;
  const brandSummary = textBits.length || fileCount ? `(${[...textBits, fileCount ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ")})` : "(empty)";
  if(props.tabbed)return <WorkspaceTabs label="Customer account sections" disabled={props.busy} tabs={[
    {id:"business",label:"Business",content:<Details customer={customer} busy={props.busy} onSave={props.onSave}/>},
    {id:"social",label:"Social links",description:set+" saved",content:<section className="f-panel"><h3>Social links</h3><Socials key={customer.id+customer.updatedAt} customer={customer} busy={props.busy} found={props.found} onSave={props.onSave} onFind={props.onFind}/></section>},
    {id:"brand",label:"Brand purpose & reputation",content:<section className="f-panel"><h3>Brand purpose and reputation</h3><BrandText key={customer.id+(customer.purposeText||"").length+(customer.knownFor||"").length} customer={customer} busy={props.busy} onSave={props.onSave} onUpload={props.onUpload}/></section>},
    {id:"red",label:"Client red lines",description:customer.redLines.length+" recorded",content:<section className="f-panel"><h3>Client red lines</h3><RedLines customer={customer} busy={props.busy} onSave={props.onSave}/></section>},
    {id:"intel",label:"Brand intelligence",content:props.children},
    {id:"history",label:"History",content:<section className="f-panel"><h3>History ({customer.audit.length})</h3><ul className="f-history">{[...customer.audit].reverse().slice(0,30).map(a=><li key={a.id}><span className="f-small">{stamp(a.at)}</span> {AUDIT_LABEL[a.action]||a.action}{a.detail?`: ${a.detail}`:""} <span className="f-small">by {a.actor}</span></li>)}</ul></section>}
  ]}/>;
  return (
    <div className="f-customer-editor">
      <Details customer={customer} busy={props.busy} onSave={props.onSave} />
      {/* The key remounts the form after a save so the fields show what is stored; the collapsible around it is not keyed, so it stays open. */}
      <Collapsible id="cust-socials" title="Social links" summary={`(${set} of ${SOCIAL_PLATFORMS.length} set)`} startOpen={set === 0}>
        <Socials key={customer.id + customer.updatedAt} customer={customer} busy={props.busy} found={props.found} onSave={props.onSave} onFind={props.onFind} />
      </Collapsible>
      <Collapsible id="cust-text" title="Brand purpose and reputation" summary={brandSummary} startOpen={!textBits.length && !fileCount}>
        <BrandText key={customer.id + (customer.purposeText || "").length + (customer.knownFor || "").length} customer={customer} busy={props.busy} onSave={props.onSave} onUpload={props.onUpload} />
      </Collapsible>
      <Collapsible id="cust-redlines" title="Client red lines" summary={`(${customer.redLines.length})`} startOpen={customer.redLines.length === 0}>
        <RedLines customer={customer} busy={props.busy} onSave={props.onSave} />
      </Collapsible>
      {props.children}
      <details className="f-panel">
        <summary>History ({customer.audit.length})</summary>
        <ul className="f-history">
          {[...customer.audit].reverse().slice(0, 30).map((a) => (
            <li key={a.id}><span className="f-small">{stamp(a.at)}</span> {AUDIT_LABEL[a.action] || a.action}{a.detail ? `: ${a.detail}` : ""} <span className="f-small">by {a.actor}</span></li>
          ))}
        </ul>
      </details>
    </div>
  );
}
