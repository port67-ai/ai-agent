"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { StudioAssetRef, StudioBrief, StudioOffer } from "@/lib/factory/model";
import {
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  STUDIO_FIELD_LABELS,
  STUDIO_OFFERS,
  STUDIO_UPLOAD_RULES,
  fieldRule,
  normaliseStudioBrief,
  studioAssetPath,
  studioCompleteness,
  studioUrl,
  type StudioField,
  type StudioUploadSlot,
} from "@/lib/factory/studio";
import { Tag } from "./shared";
import type { Actions } from "./shared";
import GateBar from "./GateBar";

/** The five offer cards. The two live offers are selectable; parked offers are greyed out, not clickable and marked Parked. */
export function OfferPicker({ value, onChange, disabled }: { value?: StudioOffer; onChange: (offer: StudioOffer) => void; disabled?: boolean }) {
  return (
    <div className="f-offer-grid" role="group" aria-label="Offer">
      {STUDIO_OFFERS.map((o) =>
        o.parked ? (
          <div key={o.id} className="f-offer-card parked" aria-disabled="true" data-offer={o.id}>
            <div className="f-offer-head"><strong>{o.label}</strong><Tag>Parked</Tag></div>
            <p>{o.summary}</p>
            <span className="f-small">Not available yet.</span>
          </div>
        ) : (
          <button key={o.id} type="button" className={"f-offer-card" + (value === o.id ? " selected" : "")} aria-pressed={value === o.id} disabled={disabled} data-offer={o.id} onClick={() => onChange(o.id as StudioOffer)}>
            <div className="f-offer-head"><strong>{o.label}</strong><Tag tone={value === o.id ? "green" : "orange"}>{o.medium === "static" ? "Static" : "Short video"}</Tag></div>
            <p>{o.summary}</p>
            <span className="f-small">You get: {o.outputs.join("; ")}</span>
            <span className="f-small">Client supplies: {o.inputs.join(", ")}</span>
            <span className="f-small">Channels: {o.channelNotes.join(", ")}</span>
          </button>
        ),
      )}
    </div>
  );
}

type Draft = {
  businessName: string; website: string; sector: string; markets: string; approverName: string; approverEmail: string;
  name: string; quantity: string; deadline: string;
  colours: string[]; fonts: string; tone: string; avoid: string;
  liked: string; disliked: string;
  url: string; names: string; benefits: string; offer: string; cta: string;
  socials: Record<string, string>; themes: string[];
};
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const toDraft = (b: StudioBrief): Draft => ({
  businessName: b.client.businessName, website: b.client.website, sector: b.client.sector || "", markets: b.client.markets || "", approverName: b.client.approverName, approverEmail: b.client.approverEmail,
  name: b.project.name, quantity: b.project.quantity ? String(b.project.quantity) : "", deadline: b.project.deadline || "",
  colours: [...b.brandKit.colours], fonts: b.brandKit.fonts.join("\n"), tone: b.brandKit.tone, avoid: b.brandKit.avoid,
  liked: b.references.liked.join("\n"), disliked: b.references.disliked.join("\n"),
  url: b.product.url, names: b.product.names, benefits: b.product.benefits, offer: b.product.offer, cta: b.product.cta,
  socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, b.socials[k] || ""])), themes: [...b.themes],
});
/** The intake as the server's updateStudioBrief command expects it. Files are not part of it. */
export const draftInput = (d: Draft) => ({
  client: { businessName: d.businessName, website: d.website, sector: d.sector, markets: d.markets, approverName: d.approverName, approverEmail: d.approverEmail },
  project: { name: d.name, quantity: d.quantity, deadline: d.deadline },
  brandKit: { colours: d.colours, fonts: lines(d.fonts), tone: d.tone, avoid: d.avoid },
  references: { liked: lines(d.liked), disliked: lines(d.disliked) },
  product: { url: d.url, names: d.names, benefits: d.benefits, offer: d.offer, cta: d.cta },
  socials: d.socials,
  themes: d.themes,
});
/** Lenient view of the draft for the live completeness panel: every non-empty value counts, validation comes separately. */
const lenient = (d: Draft, b: StudioBrief): StudioBrief => ({
  ...b,
  client: { ...b.client, businessName: d.businessName, website: d.website, sector: d.sector, markets: d.markets, approverName: d.approverName, approverEmail: d.approverEmail },
  project: { name: d.name, quantity: Number(d.quantity) || undefined, deadline: d.deadline },
  brandKit: { ...b.brandKit, colours: d.colours, fonts: lines(d.fonts), tone: d.tone, avoid: d.avoid },
  references: { ...b.references, liked: lines(d.liked), disliked: lines(d.disliked) },
  product: { url: d.url, names: d.names, benefits: d.benefits, offer: d.offer, cta: d.cta },
  socials: Object.fromEntries(Object.entries(d.socials).filter(([, v]) => v.trim())),
  themes: d.themes,
});

function Marker({ rule }: { rule: "required" | "recommended" | "optional" }) {
  if (rule === "required") return <span className="f-marker required">Required</span>;
  if (rule === "recommended") return <span className="f-marker recommended">Recommended</span>;
  return null;
}
/** One intake field with its Required or Recommended marker for the chosen offer. Groups of several controls use a labelled group. */
function SField({ field, offer, label, error, group, children }: { field: StudioField; offer: StudioOffer; label?: string; error?: string; group?: boolean; children: ReactNode }) {
  const rule = fieldRule(offer, field);
  const name = label || STUDIO_FIELD_LABELS[field];
  const head = <span>{name}{rule === "required" ? " *" : ""} <Marker rule={rule} /></span>;
  if (group) return <div className="f-field" data-rule={rule} role="group" aria-label={name}>{head}{children}</div>;
  return (
    <label className="f-field" data-rule={rule}>
      {head}
      {children}
      {error && <small className="f-field-error" role="alert">{error}</small>}
    </label>
  );
}
function UploadSlot({ projectId, slot, field, offer, files, onUpload, onRemove, disabled, label }: {
  projectId: string; slot: Exclude<StudioUploadSlot, "piece">; field: StudioField; offer: StudioOffer; files: StudioAssetRef[]; label?: string;
  onUpload: (slot: StudioUploadSlot, file: File) => Promise<boolean> | undefined; onRemove: (id: string) => void; disabled: boolean;
}) {
  const rule = STUDIO_UPLOAD_RULES[slot];
  const id = `studio-upload-${slot}`;
  return (
    <div className="f-upload-slot">
      <div className="f-field">
        <span>
          <label htmlFor={id}>{label || STUDIO_FIELD_LABELS[field]}{fieldRule(offer, field) === "required" ? " *" : ""}</label> <Marker rule={fieldRule(offer, field)} />
        </span>
        <input
          id={id}
          type="file"
          accept={rule.mimes.join(",")}
          multiple={rule.maxFiles > 1}
          disabled={disabled || files.length >= rule.maxFiles}
          onChange={async (e) => {
            const picked = [...(e.target.files || [])];
            e.target.value = "";
            for (const f of picked) if (!(await onUpload(slot, f))) break;
          }}
        />
        <small>{rule.label}</small>
      </div>
      {files.length > 0 && (
        <ul className="f-upload-list">
          {files.map((f) => (
            <li key={f.id}>
              {f.mime.startsWith("image/") ? (
                // Served by the authorised API route; next/image would need a public loader.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studioAssetPath(projectId, f.id)} alt={f.name} loading="lazy" />
              ) : (
                <video src={studioAssetPath(projectId, f.id)} preload="metadata" controls aria-label={f.name} />
              )}
              <span className="f-small">{f.name} · {Math.max(1, Math.round(f.bytes / 1024))} KB</span>
              <button type="button" className="f-icon-button" aria-label={`Remove ${f.name}`} disabled={disabled} onClick={() => onRemove(f.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type StudioIntakeProps = Actions & { onUpload: (slot: StudioUploadSlot, file: File) => Promise<boolean> | undefined };
/** Stage 1: offer first, then the intake groups with markers that follow the offer, uploads, socials, themes, live completeness and the gate. */
export default function StudioIntake({ p, operator, busy, command, onUpload }: StudioIntakeProps) {
  const s = p.studio!;
  const b = s.brief;
  const locked = s.gates.intake.status === "approved";
  const [draft, setDraft] = useState<Draft>(() => toDraft(b));
  const [dirty, setDirty] = useState(false);
  const [synced, setSynced] = useState(s.briefVersion);
  const [theme, setTheme] = useState("");
  const [rights, setRights] = useState(false);
  // Pick up saved changes (another person, an upload or a refresh) unless this form has unsaved edits.
  if (!dirty && synced !== s.briefVersion) {
    setSynced(s.briefVersion);
    setDraft(toDraft(b));
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setDirty(true); };
  const offer = s.offer;
  const urlError = (v: string, name: string) => { try { studioUrl(v, name); return ""; } catch (e) { return (e as Error).message; } };
  const validation = useMemo(() => { try { normaliseStudioBrief(draftInput(draft), b); return ""; } catch (e) { return (e as Error).message; } }, [draft, b]);
  const live = studioCompleteness(lenient(draft, b), offer);
  const save = () => void Promise.resolve(command({ type: "updateStudioBrief", brief: draftInput(draft) }, "Intake saved")).then((ok) => { if (ok) setDirty(false); });
  const remove = (assetId: string) => void command({ type: "removeStudioAsset", assetId }, "File removed from the intake");
  const uploadsDisabled = locked || busy || !rights;
  const text = (k: keyof Draft, field: StudioField, props: { type?: string; max?: number; placeholder?: string; area?: boolean } = {}) => (
    <SField field={field} offer={offer} error={props.type === "url" && draft[k] ? urlError(draft[k] as string, STUDIO_FIELD_LABELS[field]) : undefined}>
      {props.area
        ? <textarea value={draft[k] as string} maxLength={props.max} placeholder={props.placeholder} onChange={(e) => set(k, e.target.value as never)} />
        : <input type={props.type || "text"} value={draft[k] as string} maxLength={props.max} placeholder={props.placeholder} onChange={(e) => set(k, e.target.value as never)} />}
    </SField>
  );
  return (
    <div className="f-studio-intake">
      <section className="f-panel" id="studio-offer">
        <div className="f-section-heading"><h2>1. Choose the offer</h2>{locked && <span className="f-small">Locked: reopen Stage 1 to change it.</span>}</div>
        <p>One offer per project. A client who wants both gets two projects that share one Brand Kit.</p>
        <OfferPicker value={offer} disabled={locked || busy} onChange={(o) => { if (o !== offer) void command({ type: "setStudioOffer", offer: o }, "Offer changed. The required fields below now follow it."); }} />
      </section>
      <div className="f-studio-columns">
        <fieldset className="f-studio-form" disabled={locked}>
          <legend className="f-sr-only">Client intake</legend>
          <section className="f-panel" id="studio-client">
            <h2>2. Client and project</h2>
            <div className="f-form-grid">
              {text("businessName", "client.businessName", { max: 120 })}
              {text("website", "client.website", { type: "url", max: 2000, placeholder: "https://brand.com" })}
              {text("sector", "client.sector", { max: 120 })}
              {text("markets", "client.markets", { max: 300, placeholder: "UK, Ireland; online only" })}
              {text("approverName", "client.approverName", { max: 120 })}
              {text("approverEmail", "client.approverEmail", { type: "email", max: 180 })}
              {text("name", "project.name", { max: 120 })}
              {text("quantity", "project.quantity", { type: "number" })}
              {text("deadline", "project.deadline", { type: "date" })}
            </div>
          </section>
          <section className="f-panel" id="studio-brand-kit">
            <h2>3. Brand Kit</h2>
            <p>Kept for the client account and copied into each new project; this project uses its own copy.</p>
            <label className="f-check">
              <input type="checkbox" checked={rights} disabled={locked} onChange={(e) => setRights(e.target.checked)} />
              <span>I confirm we have the right to use the files I upload for this project (logos, photos, clips and references).</span>
            </label>
            <UploadSlot projectId={p.id} slot="logo" field="brandKit.logo" offer={offer} files={b.brandKit.logo ? [b.brandKit.logo] : []} onUpload={onUpload} onRemove={remove} disabled={uploadsDisabled} />
            <SField field="brandKit.colours" offer={offer} group>
              <div className="f-colour-list">
                {draft.colours.map((c, i) => (
                  <span key={i} className="f-colour-item">
                    <input type="color" aria-label={`Brand colour ${i + 1}`} value={c} onChange={(e) => set("colours", draft.colours.map((x, j) => (j === i ? e.target.value : x)))} />
                    <button type="button" className="f-icon-button" aria-label={`Remove colour ${c}`} onClick={() => set("colours", draft.colours.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
                  </span>
                ))}
                {draft.colours.length < 8 && <button type="button" className="f-button secondary small" onClick={() => set("colours", [...draft.colours, "#ec663c"])}><Plus size={13} aria-hidden="true" /> Add colour</button>}
              </div>
            </SField>
            {text("fonts", "brandKit.fonts", { area: true, placeholder: "One font per line" })}
            {text("tone", "brandKit.tone", { area: true, max: 600 })}
            {text("avoid", "brandKit.avoid", { area: true, max: 1000, placeholder: "Words, claims, colours or imagery to stay away from" })}
          </section>
          <section className="f-panel" id="studio-references">
            <h2>4. References and mood</h2>
            {text("liked", "references.liked", { area: true, placeholder: "One per line: links or short descriptions" })}
            {text("disliked", "references.disliked", { area: true, placeholder: "One per line" })}
            <UploadSlot projectId={p.id} slot="mood" field="references.mood" offer={offer} files={b.references.mood} onUpload={onUpload} onRemove={remove} disabled={uploadsDisabled} />
          </section>
          <section className="f-panel" id="studio-product">
            <h2>5. Product and assets</h2>
            <div className="f-form-grid">
              {text("url", "product.url", { type: "url", max: 2000, placeholder: "https://brand.com/product" })}
              {text("names", "product.names", { max: 600, placeholder: offer === "scene_pack" ? "Up to 5 products" : "The product in the story" })}
              {text("offer", "product.offer", { max: 300, placeholder: "10% off your first order" })}
              {text("cta", "product.cta", { max: 120, placeholder: "Shop now" })}
            </div>
            {text("benefits", "product.benefits", { area: true, max: 1500 })}
            <UploadSlot projectId={p.id} slot="packshots" field="assets.packshots" offer={offer} label={offer === "hook_pack" ? "Product photos" : undefined} files={b.assets.packshots} onUpload={onUpload} onRemove={remove} disabled={uploadsDisabled} />
            <UploadSlot projectId={p.id} slot="clips" field="assets.clips" offer={offer} files={b.assets.clips} onUpload={onUpload} onRemove={remove} disabled={uploadsDisabled} />
          </section>
          <section className="f-panel" id="studio-socials">
            <h2>6. Social accounts and themes</h2>
            <p>Research reads public pages only; it cannot log in to social accounts.</p>
            <div className="f-form-grid">
              {SOCIAL_KEYS.map((k) => {
                const error = draft.socials[k] ? urlError(draft.socials[k], SOCIAL_LABELS[k] + " link") : "";
                return (
                  <SField key={k} field="socials" offer={offer} label={SOCIAL_LABELS[k]} error={error}>
                    <input type="url" value={draft.socials[k]} maxLength={2000} placeholder={`https://${k === "x" ? "x" : k}.com/brand`} aria-invalid={!!error} onChange={(e) => set("socials", { ...draft.socials, [k]: e.target.value })} />
                  </SField>
                );
              })}
            </div>
            <SField field="themes" offer={offer} group>
              <div className="f-theme-add">
                <input aria-label="New theme" value={theme} maxLength={120} placeholder="A theme or occasion, for example Breakfast rituals" onChange={(e) => setTheme(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (theme.trim() && draft.themes.length < 12) { set("themes", [...draft.themes, theme.trim()]); setTheme(""); } } }} />
                <button type="button" className="f-button secondary small" disabled={!theme.trim() || draft.themes.length >= 12} onClick={() => { set("themes", [...draft.themes, theme.trim()]); setTheme(""); }}><Plus size={13} aria-hidden="true" /> Add theme</button>
              </div>
            </SField>
            {draft.themes.length > 0 && (
              <ul className="f-theme-list" aria-label="Themes">
                {draft.themes.map((t, i) => (
                  <li key={t + i}><span>{t}</span><button type="button" className="f-icon-button" aria-label={`Remove theme ${t}`} onClick={() => set("themes", draft.themes.filter((_, j) => j !== i))}><Trash2 size={13} /></button></li>
                ))}
              </ul>
            )}
          </section>
          {!locked && (
            <div className="f-studio-save">
              {validation && <p className="f-small" role="alert">{validation}</p>}
              <button type="button" className="f-button" disabled={busy || !dirty || !!validation} onClick={save}>Save intake</button>
              {dirty && <span className="f-small">Unsaved changes</span>}
            </div>
          )}
        </fieldset>
        <aside className="f-panel f-completeness" aria-label="Completeness" aria-live="polite">
          <h2>Completeness</h2>
          <p className="f-small">{live.requiredDone} of {live.requiredTotal} required items for the {STUDIO_OFFERS.find((o) => o.id === offer)?.label}.</p>
          <div className="f-meter" role="progressbar" aria-label="Required items done" aria-valuemin={0} aria-valuemax={live.requiredTotal} aria-valuenow={live.requiredDone}>
            <span style={{ width: `${Math.round((live.requiredDone / live.requiredTotal) * 100)}%` }} />
          </div>
          {live.missing.length ? (
            <>
              <h3>Still needed</h3>
              <ul>{live.missing.map((m) => <li key={m.field}>{m.label}{m.reason ? `: ${m.reason}` : ""}</li>)}</ul>
            </>
          ) : <p><Tag tone="green">Ready for approval</Tag></p>}
          {live.recommendations.length > 0 && (
            <>
              <h3>Recommended</h3>
              <ul>{live.recommendations.map((m, i) => <li key={m.field + i}>{m.reason || m.label}</li>)}</ul>
            </>
          )}
        </aside>
      </div>
      <GateBar p={p} stage="intake" operator={operator} busy={busy} command={command} blockers={dirty ? ["Save the intake first: the form has unsaved changes"] : []} />
    </div>
  );
}
