"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, SkipForward, X } from "lucide-react";
import type { Project } from "@/lib/factory/model";
import { researchLabels } from "./shared";

type Kind = "sources" | "insights";
type Cmd = (data: Record<string, unknown>, success?: string) => Promise<boolean> | undefined;

/**
 * One item at a time: read it, then Accept, Reject or Skip. Keys: A accept, R reject, S skip. "Accept all remaining" is there for test runs.
 * The queue is always built from the live project, so a decision removes the item and the next one appears.
 */
export default function ReviewQueue({ p, kind, busy, command, onClose }: { p: Project; kind: Kind; busy: boolean; command: Cmd; onClose: () => void }) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const [done, setDone] = useState({ accepted: 0, rejected: 0 });
  const waiting = useMemo(
    () => (kind === "sources"
      ? p.sources.filter((s) => s.kind === "public_source" && s.status === "unreviewed").map((s) => ({ id: s.id }))
      : p.insights.filter((i) => i.status === "draft").map((i) => ({ id: i.id }))),
    [p, kind],
  );
  const left = waiting.filter((w) => !skipped.includes(w.id));
  const current = left[0];
  const src = kind === "sources" && current ? p.sources.find((s) => s.id === current.id) : undefined;
  const ins = kind === "insights" && current ? p.insights.find((i) => i.id === current.id) : undefined;
  const label = kind === "sources" ? "source" : "insight";

  async function decide(status: "accept" | "reject") {
    if (!current || busy) return;
    const ok = kind === "sources"
      ? await command({ type: "reviewSource", id: current.id, status: status === "accept" ? "supported" : "rejected" }, status === "accept" ? "Source accepted." : "Source rejected.")
      : await command({ type: "reviewInsight", id: current.id, status: status === "accept" ? "reviewed" : "rejected" }, status === "accept" ? "Insight accepted." : "Insight rejected.");
    if (ok !== false) setDone((d) => ({ ...d, [status === "accept" ? "accepted" : "rejected"]: d[status === "accept" ? "accepted" : "rejected"] + 1 }));
  }
  function acceptAll() {
    const n = waiting.length;
    if (!n || !window.confirm(`Accept all ${n} remaining ${label}s without reading each one? This is logged as a bulk acceptance under your name.`)) return;
    void command(kind === "sources" ? { type: "reviewAllSources", confirm: true } : { type: "reviewAllInsights", confirm: true }, `${n} ${label}s accepted.`);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "a") void decide("accept");
      else if (e.key.toLowerCase() === "r") void decide("reject");
      else if (e.key.toLowerCase() === "s" && current) setSkipped((s) => [...s, current.id]);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  return (
    <div className="f-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="f-modal" role="dialog" aria-modal="true" aria-labelledby="f-queue-title" style={{ width: 760 }}>
        <div className="f-section-heading">
          <div>
            <h2 id="f-queue-title">Review {kind}</h2>
            <p className="f-small">{left.length} left{skipped.length ? `, ${skipped.length} skipped` : ""} · accepted {done.accepted} · rejected {done.rejected}. Keys: A accept, R reject, S skip.</p>
          </div>
          <button type="button" className="f-text-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {!current && (
          <div className="f-approval-banner approved">
            <strong>{waiting.length ? `Only skipped ${label}s remain.` : `All ${label}s are decided.`}</strong>
            <div className="f-actions">
              {waiting.length > 0 && <button className="f-button secondary small" onClick={() => setSkipped([])}>Show skipped again</button>}
              <button className="f-button small" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
        {src && (
          <div>
            <p className="f-small"><strong>{researchLabels[src.segment] || src.segment}</strong> · {src.confidence ? src.confidence + " support · " : ""}{new Date(src.collectedAt).toLocaleDateString("en-GB")}</p>
            <h3>{src.title}</h3>
            <p className="f-prewrap f-small" style={{ maxHeight: 220, overflow: "auto" }}>{src.excerpt}</p>
            {src.grade && <p className="f-small"><strong>Evidence grade {src.grade.reliability}{src.grade.credibility} · {src.grade.score}/100.</strong> {src.grade.notes.slice(0, 2).join(" ")}</p>}
            {src.findings?.length ? <ul className="f-small">{src.findings.slice(0, 3).map((f) => <li key={f.claim}>{f.claim}</li>)}</ul> : null}
            {src.url && <a href={src.url} target="_blank" rel="noreferrer">Open original source</a>}
          </div>
        )}
        {ins && (
          <div>
            <p className="f-small"><strong>{ins.confidence} confidence</strong> · {ins.sourceIds.length} source{ins.sourceIds.length === 1 ? "" : "s"}</p>
            <h3>{ins.title}</h3>
            <p className="f-prewrap f-small">{ins.interpretation}</p>
            <ul className="f-small">{ins.sourceIds.slice(0, 4).map((id) => <li key={id}>{p.sources.find((s) => s.id === id)?.title || id}</li>)}</ul>
          </div>
        )}
        {current && (
          <div className="f-actions" style={{ flexWrap: "wrap" }}>
            <button className="f-button" disabled={busy} onClick={() => void decide("accept")}><Check size={14} /> Accept</button>
            <button className="f-button secondary" disabled={busy} onClick={() => void decide("reject")}><X size={14} /> Reject</button>
            <button className="f-button secondary" disabled={busy} onClick={() => setSkipped((s) => [...s, current.id])}><SkipForward size={14} /> Skip</button>
            <button className="f-text-button" disabled={busy} onClick={acceptAll}>Accept all {waiting.length} remaining</button>
          </div>
        )}
      </div>
    </div>
  );
}
