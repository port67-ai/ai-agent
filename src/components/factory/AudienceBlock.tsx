"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Commission, Generation } from "@/lib/factory/model";
import { GENERATIONS, INPUTS, MAX_ANSWER } from "@/lib/factory/commissions";
import type { GenerateFn } from "./CommissionEditor";
import { Field } from "./shared";

// Input 4 by age group (CHG-0111): five answers per age group, generated or written, saved one group at a time, then at least one group
// is selected to take forward to direction. Presentational: the container owns the requests.
type Draft = Record<string, string>;
const def = INPUTS.find((i) => i.key === "audience")!;

export function AudienceBlock({ commission, busy, onSave, onGenerate }: {
  commission: Commission;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
  onGenerate?: GenerateFn;
}) {
  const [active, setActive] = useState<Generation>("gen_y");
  const [drafts, setDrafts] = useState<Partial<Record<Generation, Draft>>>({});
  const [progress, setProgress] = useState("");
  const saved = commission.audience || {};
  const selected = (commission.directionGenerations || []).filter((g) => saved[g]);
  const g = GENERATIONS.find((x) => x.key === active)!;
  const draft = drafts[active];
  const value = (k: string) => draft?.[k] ?? saved[active]?.answers[k] ?? "";
  const pending = GENERATIONS.filter((x) => drafts[x.key]);
  const working = !!progress;

  async function generate(keys: Generation[]) {
    if (!onGenerate) return;
    for (let i = 0; i < keys.length; i++) {
      setProgress(`Generating ${GENERATIONS.find((x) => x.key === keys[i])!.label} (${i + 1} of ${keys.length})…`);
      const d = await onGenerate("audience", keys[i]);
      if (!d) break;
      setDrafts((all) => ({ ...all, [keys[i]]: d }));
    }
    setProgress("");
  }
  async function save(gen: Generation, answers: Draft) {
    const ok = await onSave("audience-save", { generation: gen, answers, ai: !!drafts[gen] });
    if (ok) setDrafts((all) => { const next = { ...all }; delete next[gen]; return next; });
    return ok;
  }
  const toggle = (gen: Generation, on: boolean) => void onSave("direction", { generations: on ? [...selected, gen] : selected.filter((x) => x !== gen) });

  return (
    <div className="w-audience">
      <p className="f-small">Write or generate the audience for each age group. Save the groups you want, then select at least one to take forward to direction.</p>
      <div className="w-tabs" role="tablist" aria-label="Age groups">
        {GENERATIONS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={active === x.key} className={"f-button small" + (active === x.key ? "" : " secondary")} onClick={() => setActive(x.key)}>
            {x.label} <span className="f-small">{x.range}</span>
            {selected.includes(x.key) ? " (selected)" : saved[x.key] ? " (saved)" : drafts[x.key] ? " (draft)" : ""}
          </button>
        ))}
      </div>
      {onGenerate && (
        <div className="w-generate">
          <button type="button" className="f-button secondary" disabled={busy || working} onClick={() => void generate([active])}><Sparkles size={15} /> {working ? "Generating…" : `Generate ${g.label} from AI`}</button>
          <button type="button" className="f-button secondary" disabled={busy || working} onClick={() => void generate(GENERATIONS.map((x) => x.key))}><Sparkles size={15} /> Generate all age groups</button>
          <span className="f-small">Uses the customer&apos;s Brand Intelligence and this project&apos;s other answers. You review each group before saving.</span>
        </div>
      )}
      {progress && <div className="f-callout" role="status">{progress}</div>}
      {draft && <div className="f-callout" role="status">AI draft for {g.label}, not saved yet. Edit it, then press Save answers.{" "}
        <button type="button" className="f-text-button" onClick={() => setDrafts((all) => { const n = { ...all }; delete n[active]; return n; })}>Discard draft</button></div>}
      {g.minors && <p className="f-small">{g.label} includes people under 18. Parents or guardians are normally the buyers, and content must stay age-appropriate.</p>}
      <form key={active + (draft ? "-ai" : "") + (saved[active]?.savedAt || "")} className="f-form-grid" onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        await save(active, Object.fromEntries(def.prompts.map((p) => [p.key, String(d.get(p.key) || "")])));
      }}>
        {def.prompts.map((p) => (
          <Field key={p.key} label={p.label}><textarea name={p.key} rows={draft ? 6 : 3} maxLength={MAX_ANSWER} defaultValue={value(p.key)} /></Field>
        ))}
        <div>
          <button className="f-button" disabled={busy}>Save answers</button>
          {pending.length > 1 && <> <button type="button" className="f-button secondary" disabled={busy} onClick={async () => { for (const x of pending) { if (!(await save(x.key, drafts[x.key]!))) break; } }}>Save all {pending.length} drafts</button></>}
        </div>
      </form>
      <label className="f-check-line">
        <input type="checkbox" checked={selected.includes(active)} disabled={busy || !saved[active]} onChange={(e) => toggle(active, e.target.checked)} /> Use {g.label} for direction
      </label>
      {!saved[active] && <p className="f-small">Save the answers for {g.label} to be able to select it.</p>}
      <div className={"f-callout" + (selected.length ? "" : " w-warn")} role="status">
        {selected.length ? <>Selected for direction: {selected.map((k) => GENERATIONS.find((x) => x.key === k)!.label).join(", ")}.</> : <>Select at least one saved age group to move on to direction.</>}
      </div>
    </div>
  );
}
