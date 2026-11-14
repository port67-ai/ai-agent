"use client";
import { useEffect, useMemo, useState } from "react";
import type { Line, Series, SeriesRange } from "@/lib/factory/cost-series";

const RANGE_LABEL: Record<SeriesRange, string> = { day: "Day (hourly)", month: "Month (daily)", "3m": "3 months", "6m": "6 months", "12m": "12 months" };
const STEP_NOTE: Record<Series["step"], string> = { hour: "per hour", day: "per day", week: "per week", month: "per month" };
const COLORS = ["#38bdf8", "#f97316", "#a78bfa", "#34d399", "#f43f5e", "#facc15", "#22d3ee", "#fb7185", "#84cc16", "#e879f9", "#60a5fa", "#fdba74"];
const usd = (micro: number) => "$" + (micro / 1e6).toFixed(micro >= 1e7 ? 2 : 4);
const tok = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n));
const when = (iso: string, step: Series["step"]) => {
  const d = new Date(iso);
  if (step === "hour") return d.toISOString().slice(5, 10) + " " + d.toISOString().slice(11, 13) + ":00 UTC";
  if (step === "month") return d.toISOString().slice(0, 7);
  if (step === "week") return "week of " + d.toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};
const W = 860, H = 300, L = 62, R = 16, T = 14, B = 34;

export default function CostChart() {
  const [range, setRange] = useState<SeriesRange>("month");
  const [harness, setHarness] = useState("");
  const [data, setData] = useState<Series | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    fetch(`/api/factory/admin/costs/series?range=${range}${harness ? `&harness=${encodeURIComponent(harness)}` : ""}`, { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Unable to load cost history"); return r.json(); })
      .then((s: Series) => { if (live) { setData(s); setError(""); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [range, harness]);
  const lines: Line[] = useMemo(() => (data ? [data.total, ...data.lines].filter((l) => !hidden.includes(l.key)) : []), [data, hidden]);
  const colour = (key: string) => (data && key === data.total.key ? "currentColor" : COLORS[Math.max(0, data ? data.lines.findIndex((l) => l.key === key) : 0) % COLORS.length]);
  const max = Math.max(1, ...lines.map((l) => l.cumulativeMicroUsd.at(-1) || 0));
  const n = data?.buckets.length || 1;
  const x = (i: number) => L + (n === 1 ? 0 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const path = (l: Line) => l.cumulativeMicroUsd.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  function move(e: React.MouseEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  }
  const toggle = (key: string) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));
  const periodTotal = data?.total.cumulativeMicroUsd.at(-1) || 0;
  return (
    <section className="space-y-3" aria-label="Cost history">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-semibold">Cost history</h3>
        <div role="group" aria-label="Period" className="flex flex-wrap gap-1">
          {(Object.keys(RANGE_LABEL) as SeriesRange[]).map((r) => (
            <button key={r} type="button" className={range === r ? "f-primary" : "f-secondary"} aria-pressed={range === r} onClick={() => { setRange(r); setHover(null); }}>{RANGE_LABEL[r]}</button>
          ))}
        </div>
        <label className="flex items-center gap-2">Harness
          <select className="border p-2" value={harness} onChange={(e) => { setHarness(e.target.value); setHidden([]); setHover(null); }}>
            <option value="">All harnesses</option>
            {data?.harnesses.map((h) => <option key={h.key} value={h.key}>{h.label} ({usd(h.totalMicroUsd)})</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p className="f-small" role="status">
            {harness ? `${harness}: ` : ""}cumulative cost {usd(periodTotal)} over {RANGE_LABEL[range].toLowerCase()} ({data.from.slice(0, 10)} to {data.to.slice(0, 10)} UTC, points {STEP_NOTE[data.step]}) · {tok(data.total.inputTokens)} in / {tok(data.total.outputTokens)} out tokens · {data.total.calls} calls{data.total.unknownCalls ? ` · ${data.total.unknownCalls} with unknown cost (not counted, never free)` : ""}. Each line is the running total for the period; hover a point for the cost and tokens up to then.
          </p>
          <div style={{ position: "relative" }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative API cost over time" onMouseMove={move} onMouseLeave={() => setHover(null)} style={{ display: "block", maxHeight: 340 }}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} stroke="currentColor" opacity={0.12} />
                  <text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.7}>{usd(max * t)}</text>
                </g>
              ))}
              {data.buckets.map((b, i) => i % labelEvery === 0 && <text key={b} x={x(i)} y={H - 12} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>{when(b, data.step).replace(" UTC", "").replace("week of ", "")}</text>)}
              {lines.map((l) => <path key={l.key} d={path(l)} fill="none" stroke={colour(l.key)} strokeWidth={l.key === data.total.key ? 2.5 : 1.8} strokeDasharray={l.key === data.total.key ? undefined : undefined} data-line={l.key} />)}
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="currentColor" opacity={0.4} />
                  {lines.map((l) => <circle key={l.key} cx={x(hover)} cy={y(l.cumulativeMicroUsd[hover])} r={3.5} fill={colour(l.key)} />)}
                </g>
              )}
            </svg>
            {hover !== null && (
              <div role="tooltip" style={{ position: "absolute", top: 8, left: hover > n / 2 ? undefined : `${(x(hover) / W) * 100 + 2}%`, right: hover > n / 2 ? `${100 - (x(hover) / W) * 100 + 2}%` : undefined, background: "rgba(15,23,42,0.96)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.4)", borderRadius: 8, padding: "8px 10px", fontSize: 12, maxWidth: 340, pointerEvents: "none" }}>
                <strong>{when(data.buckets[hover], data.step)}</strong>
                {lines.slice(0, 12).map((l) => (
                  <div key={l.key} style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 3 }}>
                    <span><span style={{ color: l.key === data.total.key ? "#e2e8f0" : colour(l.key) }}>●</span> {l.key === data.total.key ? (harness || "All") + " total" : l.label}</span>
                    <span>{usd(l.cumulativeMicroUsd[hover])} · {tok(l.cumulativeInputTokens[hover])} in / {tok(l.cumulativeOutputTokens[hover])} out · {l.cumulativeCalls[hover]} calls{l.bucketMicroUsd[hover] ? ` (+${usd(l.bucketMicroUsd[hover])} this point)` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3" aria-label="Legend">
            {[data.total, ...data.lines].map((l) => (
              <button key={l.key} type="button" className="f-text-button" aria-pressed={!hidden.includes(l.key)} onClick={() => toggle(l.key)} title="Show or hide this line" style={{ opacity: hidden.includes(l.key) ? 0.4 : 1 }}>
                <span style={{ color: colour(l.key) }}>●</span> {l.key === data.total.key ? (harness || "All harnesses") + " total" : l.label} {usd(l.totalMicroUsd)}
              </button>
            ))}
          </div>
          {!harness && data.harnesses.length > 0 && (
            <div>
              <h4 className="font-semibold">Harnesses in this period</h4>
              <table className="w-full text-left f-small">
                <thead><tr><th>Harness</th><th>Cost</th><th>Tokens in</th><th>Tokens out</th><th>Calls</th><th /></tr></thead>
                <tbody>
                  {data.lines.map((l) => (
                    <tr key={l.key}><td>{l.label}</td><td>{usd(l.totalMicroUsd)}</td><td>{tok(l.inputTokens)}</td><td>{tok(l.outputTokens)}</td><td>{l.calls}{l.unknownCalls ? ` (${l.unknownCalls} unknown cost)` : ""}</td><td><button type="button" className="f-text-button" onClick={() => { setHarness(l.key); setHidden([]); }}>Isolate</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <h4 className="font-semibold">{harness ? `Models used by ${harness}` : "Models used"} in this period</h4>
            {data.models.length === 0 ? <p className="f-small">No calls in this period.</p> : (
              <table className="w-full text-left f-small">
                <thead><tr><th>Model</th>{!harness && <th>Harness</th>}<th>Cost</th><th>Tokens in</th><th>Tokens out</th><th>Calls</th></tr></thead>
                <tbody>
                  {data.models.map((m) => <tr key={m.harness + m.provider + m.model}><td>{m.provider}:{m.model}</td>{!harness && <td>{m.harness}</td>}<td>{usd(m.totalMicroUsd)}</td><td>{tok(m.inputTokens)}</td><td>{tok(m.outputTokens)}</td><td>{m.calls}{m.unknownCalls ? ` (${m.unknownCalls} unknown cost)` : ""}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
