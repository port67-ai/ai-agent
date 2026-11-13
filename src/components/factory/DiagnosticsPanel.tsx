"use client";
import { useState } from "react";
import { useProjectGet } from "./useProjectGet";
import { Bug, Copy, Download } from "lucide-react";
import type { DiagnosticsReport } from "@/lib/factory/diagnostics";

type Project = { id: string; revision: number };
type Data = { report: DiagnosticsReport; markdown: string };

/** Producer and admin only: every failure with timestamps, models, request IDs and the full text, ready to paste into a chat. */
export function DiagnosticsPanel({ p }: { p: Project }) {
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [since, setSince] = useState("latest");
  const { data, error: loadError } = useProjectGet<Data>(`/api/factory/projects/${p.id}/diagnostics?since=${encodeURIComponent(since)}`, p.revision * 1000 + tick);
  const error = actionError || loadError || "";
  if (!data) return <section className="f-panel"><h2><Bug size={18} aria-hidden="true" /> Diagnostics</h2>{error ? <p className="f-team-error" role="alert">Diagnostics unavailable: {error}</p> : <p className="f-small" role="status">Loading diagnostics…</p>}</section>;
  const r = data.report;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Copy was blocked by the browser; use Download or select the text below.");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([data.markdown], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `port67-diagnostics-${since === "all" ? "full" : "latest"}-${r.project.id.slice(0, 8)}-${r.generatedAt.slice(0, 19).replace(/[:T]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="f-panel f-prep">
      <div className="f-section-heading">
        <div>
          <h2><Bug size={18} aria-hidden="true" /> Diagnostics</h2>
          <p className="f-small" role="status">
            {r.failures.length ? `${r.failures.length} failure${r.failures.length === 1 ? "" : "s"} recorded. Latest: ${r.failures.at(-1)!.at} ${r.failures.at(-1)!.agent}: ${r.failures.at(-1)!.text.slice(0, 160)}` : "No failures recorded."} Generated {r.generatedAt} UTC. Producers and admins only.
          </p>
        </div>
        <div className="f-actions">
          <label className="f-small">Show{" "}
            <select value={since} onChange={(e) => setSince(e.target.value)} aria-label="Which executions to include">
              <option value="latest">Latest execution only</option>
              <option value="all">Full history</option>
              {r.executions.slice(0, -1).reverse().map((x) => <option key={x.start} value={x.start}>From {x.start.slice(0, 16).replace("T", " ")} UTC ({x.runs} runs)</option>)}
            </select>
          </label>
          <button type="button" className="f-button secondary small" onClick={() => setTick((n) => n + 1)}>Refresh</button>
          <button type="button" className="f-button small" onClick={() => void copy()}><Copy size={14} /> {copied ? "Copied" : "Copy all"}</button>
          <button type="button" className="f-button secondary small" onClick={download}><Download size={14} /> Download (.md)</button>
        </div>
      </div>
      <details open={r.failures.length > 0}>
        <summary><strong>Full report</strong> <small>timestamps in UTC, safe to paste: no keys or secrets</small></summary>
        <pre className="f-diag">{data.markdown}</pre>
      </details>
    </section>
  );
}
