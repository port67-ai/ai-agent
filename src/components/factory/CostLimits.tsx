"use client";
import { useState } from "react";
import type { AdminCostReport } from "@/lib/factory/costs";

type Limits = AdminCostReport["limits"];
const text = (n: number | undefined) => (n === undefined ? "" : String(n));
/** Owner-editable spend limits. Blank falls back to the Render environment value. Saved limits take effect on the next paid call. */
export default function CostLimits({ limits, known, onSaved }: { limits: Limits; known: string[]; onSaved: () => void }) {
  const s = limits.saved;
  const [monthly, setMonthly] = useState(text(s.monthlyUsd));
  const [project, setProject] = useState(text(s.projectUsd));
  const [run, setRun] = useState(text(s.runUsd));
  const [hold, setHold] = useState(text(s.callHoldUsd));
  const [models, setModels] = useState<{ key: string; usd: string }[]>(Object.entries(s.models || {}).map(([key, usd]) => ({ key, usd: String(usd) })));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/factory/admin/costs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "limits", limits: { monthlyUsd: monthly, projectUsd: project, runUsd: run, callHoldUsd: hold, models: Object.fromEntries(models.filter((m) => m.key.trim() && m.usd.trim()).map((m) => [m.key.trim(), m.usd.trim()])) } }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Could not save the limits");
      setNotice("Limits saved. They apply from the next paid call.");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the limits"); } finally { setBusy(false); }
  }
  const field = (label: string, value: string, set: (v: string) => void, hint: string) => (
    <label className="flex flex-col gap-1">{label}
      <input className="border p-2" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} placeholder={hint} />
    </label>
  );
  return (
    <section className="space-y-3" aria-label="Spend limits">
      <h3 className="text-xl font-semibold">Spend limits</h3>
      <p className="f-small">Amounts are in USD. Leave a box blank to use the Render setting (shown in the box). A paid call is blocked when it could take spend past any limit; calls with no known cost are held at the per-call hold, never counted as free.</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {field("Monthly total (all models)", monthly, setMonthly, limits.env.monthlyUsd ? `Render: ${limits.env.monthlyUsd}` : "Default: 25")}
        {field("Per project, per month", project, setProject, limits.env.projectUsd ? `Render: ${limits.env.projectUsd}` : "No limit")}
        {field("Per run", run, setRun, "No limit")}
        {field("Held per call with unknown cost", hold, setHold, limits.env.callHoldUsd ? `Render: ${limits.env.callHoldUsd}` : "Default: 1")}
      </div>
      <div>
        <h4 className="font-semibold">Per model, per month</h4>
        <datalist id="known-models">{known.map((k) => <option key={k} value={k} />)}</datalist>
        {models.map((m, i) => (
          <div key={i} className="flex flex-wrap gap-2 my-1">
            <input className="border p-2" list="known-models" aria-label="Model as provider:model" placeholder="provider:model, e.g. openai:gpt-5.4-mini" value={m.key} onChange={(e) => setModels((all) => all.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} style={{ minWidth: 280 }} />
            <input className="border p-2" inputMode="decimal" aria-label="Monthly limit in USD" placeholder="USD per month" value={m.usd} onChange={(e) => setModels((all) => all.map((x, j) => (j === i ? { ...x, usd: e.target.value } : x)))} />
            <button type="button" className="f-text-button" onClick={() => setModels((all) => all.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className="f-text-button" onClick={() => setModels((all) => [...all, { key: "", usd: "" }])}>Add a model limit</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="f-button" disabled={busy} onClick={() => void save()}>Save limits</button>
        {s.updatedAt && <span className="f-small">Last saved {s.updatedAt.slice(0, 16).replace("T", " ")} UTC by {s.updatedBy}</span>}
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" className="f-small">{notice}</p>}
    </section>
  );
}
