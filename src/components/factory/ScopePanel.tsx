"use client";
import { useState } from "react";
import { useProjectGet } from "./useProjectGet";
import { Compass, Loader2, Pencil } from "lucide-react";
import { AUDIENCES, CATEGORIES, CATEGORY_LABEL, REACHES, SIZES, type ResearchScope, type ScopeEntry } from "@/lib/factory/scope";
import { SEGMENT_LABEL } from "@/lib/factory/research-plan";
import { segments, type Segment } from "@/lib/factory/model";

type View = { scope: Omit<ResearchScope, "provider" | "model" | "runId" | "by" | "note"> & Partial<Pick<ResearchScope, "provider" | "model" | "runId" | "by" | "note">>; stored: boolean; current: boolean; history: ScopeEntry[]; scoping: { enabled: boolean } };
type Project = { id: string; revision: number };
async function call<T>(id: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/factory/projects/${id}/scope`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
type Draft = { c: View["scope"]["classification"]; competitors: string; seg: Record<Segment, { questions: string; sources: string; avoid: string; pages: string }> };
const toDraft = (s: View["scope"]): Draft => ({ c: { ...s.classification }, competitors: s.competitorSet.join("\n"), seg: Object.fromEntries(segments.map((k) => [k, { questions: s.segments[k].questions.join("\n"), sources: s.segments[k].sourceTypes.join("\n"), avoid: s.segments[k].avoid.join("\n"), pages: String(s.segments[k].maxPages) }])) as Draft["seg"] });
const fromDraft = (d: Draft) => ({ classification: d.c, competitorSet: lines(d.competitors), segments: Object.fromEntries(segments.map((k) => [k, { questions: lines(d.seg[k].questions), sourceTypes: lines(d.seg[k].sources), avoid: lines(d.seg[k].avoid), maxPages: Number(d.seg[k].pages) || 10 }])) });

/** What kind of business this is and what each researcher will ask, saved on the project. Producers can re-run or edit it. */
export function ScopePanel({ p, operator }: { p: Project; operator: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [tick, setTick] = useState(0);
  const { data: view, error: loadError } = useProjectGet<View>(`/api/factory/projects/${p.id}/scope`, p.revision * 1000 + tick);
  if (!view) return <section className="f-panel f-prep"><h2><Compass size={18} aria-hidden="true" /> Business scope</h2>{loadError ? <p className="f-team-error" role="alert">Could not load the business scope: {loadError}</p> : <p className="f-small" role="status">Loading business scope…</p>}</section>;
  const error = actionError || loadError || "";
  const s = view.scope;
  const c = s.classification;
  const run = async (body: unknown) => {
    setBusy(true);
    setActionError("");
    try {
      await call<unknown>(p.id, body);
      setDraft(null);
      setTick((n) => n + 1);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const origin = !view.stored ? "Preview from the brief, not saved yet. It is saved when research starts." : s.source === "ai" ? `Classified by the scoping agent${s.model ? ` (${s.model})` : ""}` : s.source === "manual" ? "Edited by a producer" : "Classified by the free template";
  return (
    <section className="f-panel f-prep">
      <div className="f-section-heading">
        <div>
          <h2><Compass size={18} aria-hidden="true" /> Business scope</h2>
          <p className="f-small" role="status">
            {c.businessType} · {CATEGORY_LABEL[c.category]} · size {c.size} · reach {c.reach} · audience {c.audienceModel}{c.regulated ? " · regulated sector" : ""} · confidence {c.confidence}. {origin}{view.stored ? ` · version ${s.version}` : ""}.
            {view.stored && !view.current ? " The brief has changed since this was saved; it will be redone when research starts." : ""}
          </p>
          {c.rationale && <p className="f-small">{c.rationale}</p>}
          {s.note && operator && <p className="f-small">{s.note}</p>}
        </div>
        {operator && !draft && (
          <div className="f-actions">
            <button className="f-button secondary small" disabled={busy} onClick={() => void run({ action: "classify" })}>{busy ? <Loader2 size={14} className="f-spin" /> : null} {view.stored ? "Classify again" : "Classify now"}</button>
            <button className="f-button secondary small" disabled={busy} onClick={() => setDraft(toDraft(s))}><Pencil size={14} /> Edit</button>
          </div>
        )}
      </div>
      {error && <p className="f-team-error" role="alert">{error}</p>}
      {operator && !view.scoping.enabled && !draft && <p className="f-small">The scoping agent is off (PORT67_RESEARCH_ENABLED or PORT67_SCOPING_ENABLED), so the free template is used.</p>}
      {draft ? (
        <form className="f-form" onSubmit={(e) => { e.preventDefault(); void run({ action: "save", scope: fromDraft(draft) }); }}>
          <div className="f-form-grid">
            <label>Business type<input value={draft.c.businessType} maxLength={60} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, businessType: e.target.value } })} /></label>
            <label>Category<select value={draft.c.category} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, category: e.target.value as Draft["c"]["category"] } })}>{CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}</select></label>
            <label>Size<select value={draft.c.size} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, size: e.target.value as Draft["c"]["size"] } })}>{SIZES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Reach<select value={draft.c.reach} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, reach: e.target.value as Draft["c"]["reach"] } })}>{REACHES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Audience<select value={draft.c.audienceModel} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, audienceModel: e.target.value as Draft["c"]["audienceModel"] } })}>{AUDIENCES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="f-check-line"><input type="checkbox" checked={draft.c.regulated} onChange={(e) => setDraft({ ...draft, c: { ...draft.c, regulated: e.target.checked } })} /> Regulated sector</label>
          </div>
          <label>Suggested competitors (one per line, only used when the brief names none)<textarea rows={2} value={draft.competitors} onChange={(e) => setDraft({ ...draft, competitors: e.target.value })} /></label>
          {segments.map((k) => (
            <fieldset key={k} className="f-prep-edit">
              <legend>{SEGMENT_LABEL[k]}</legend>
              <label>Questions, one per line (2 to 6)<textarea rows={4} value={draft.seg[k].questions} onChange={(e) => setDraft({ ...draft, seg: { ...draft.seg, [k]: { ...draft.seg[k], questions: e.target.value } } })} /></label>
              <label>Preferred source types<textarea rows={2} value={draft.seg[k].sources} onChange={(e) => setDraft({ ...draft, seg: { ...draft.seg, [k]: { ...draft.seg[k], sources: e.target.value } } })} /></label>
              <label>Out of scope<textarea rows={2} value={draft.seg[k].avoid} onChange={(e) => setDraft({ ...draft, seg: { ...draft.seg, [k]: { ...draft.seg[k], avoid: e.target.value } } })} /></label>
              <label>Page budget (4 to 20)<input type="number" min={4} max={20} value={draft.seg[k].pages} onChange={(e) => setDraft({ ...draft, seg: { ...draft.seg, [k]: { ...draft.seg[k], pages: e.target.value } } })} /></label>
            </fieldset>
          ))}
          <div className="f-actions">
            <button className="f-button" disabled={busy}>{busy ? "Saving" : "Save scope"}</button>
            <button type="button" className="f-button secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="f-prep-segments">
          {segments.map((k) => (
            <details key={k}>
              <summary><strong>{SEGMENT_LABEL[k]}</strong> <small>{s.segments[k].questions.length} questions · up to {s.segments[k].maxPages} pages</small></summary>
              <ul>{s.segments[k].questions.map((q) => <li key={q}>{q}</li>)}</ul>
              {s.segments[k].sourceTypes.length > 0 && <p className="f-small"><strong>Prefers:</strong> {s.segments[k].sourceTypes.join(" · ")}</p>}
              {s.segments[k].avoid.length > 0 && <p className="f-small"><strong>Skips:</strong> {s.segments[k].avoid.join(" · ")}</p>}
            </details>
          ))}
        </div>
      )}
      {operator && view.history.length > 1 && <p className="f-small">History: {view.history.map((h) => `v${h.version} ${h.source} ${h.businessType}`).join(" → ")}</p>}
    </section>
  );
}
