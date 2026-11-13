"use client";
import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useProjectGet } from "./useProjectGet";

type Project = { id: string; revision: number };
type View = {
  state: { passes: number; status: string; reason: string; at: string; log: { at: string; step: string; outcome: string; detail: string }[]; pending?: { gate: string; notes: string }; hold?: { gate: string; notes: string } } | null;
  reviews: { id: string; at: string; gate: string; by: string; model?: string; subject: string; verdict: string; summary: string; notes?: string; skipped?: string; items: { id: string; verdict: string; reason: string }[] }[];
  next: { step: string; label: string } | null;
  stop: { kind: string; reason: string } | null;
  automatic: boolean;
  aiReady: boolean;
};
const GATE: Record<string, string> = { scope: "Scope producer", sources: "Source producer", insights: "Insight producer", direction: "Direction producer" };
const WHO: Record<string, string> = { waiting_customer: "Waiting for the account owner", waiting_human: "Needs a producer", blocked: "Stopped", done: "Done" };

/** Producers and admins only: the producer agent runs the steps between approvals and stops where the account owner must approve. */
export function ProducerAgentPanel({ p, onChanged }: { p: Project; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [tick, setTick] = useState(0);
  const { data, error: loadError } = useProjectGet<View>(`/api/factory/projects/${p.id}/producer-agent`, p.revision * 1000 + tick);
  const run = async () => {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/factory/projects/${p.id}/producer-agent`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Request failed");
      setTick((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <section className="f-panel"><h2><Bot size={18} aria-hidden="true" /> Producer orchestrator</h2>{loadError ? <p className="f-team-error" role="alert">Producer agent unavailable: {loadError}</p> : <p className="f-small" role="status">Loading producer agent…</p>}</section>;
  const error = actionError || loadError || "";
  const waiting = data.stop ? `${WHO[data.stop.kind] || data.stop.kind}: ${data.stop.reason}` : data.next ? `Next: ${data.next.label}` : "";
  return (
    <section className="f-panel f-prep">
      <div className="f-section-heading">
        <div>
          <h2><Bot size={18} aria-hidden="true" /> Producer orchestrator</h2>
          <p className="f-small" role="status">{waiting}</p>
          <p className="f-small">Runs four walled-garden reviewers (scope, sources, insights, direction), sends work back for one redraft per gate, then hands over to a person. After the account owner approves the direction it creates the drafts and AI copy pack and shares the assets. It never approves for the account owner. {data.automatic ? "Runs automatically after research and after each approval." : "Automatic running is off (PORT67_PRODUCER_AGENT); use the button."}</p>
        </div>
        <div className="f-actions">
          <button type="button" className="f-button" disabled={busy} onClick={() => void run()}>{busy ? <Loader2 size={14} className="f-spin" /> : null} Run producer agent</button>
        </div>
      </div>
      {error && <p className="f-team-error" role="alert">{error}</p>}
      {data.state?.hold && <p className="f-team-error" role="alert">Held for a person ({GATE[data.state.hold.gate] || data.state.hold.gate}): {data.state.hold.notes}</p>}
      {data.reviews.length > 0 && (
        <details open>
          <summary><strong>Reviewer verdicts</strong> <small>newest last; each reviewer saw only its own inputs</small></summary>
          <ul>{data.reviews.slice(-10).map((r) => (
            <li key={r.id}>
              <strong>{GATE[r.gate] || r.gate}</strong> {r.verdict} <small>({r.by === "ai" ? `AI${r.model ? " " + r.model : ""}` : "free checks only"} · {r.at.slice(11, 19)} UTC · {r.subject.slice(0, 40)})</small>: {r.summary}
              {r.notes ? <> Notes: {r.notes}</> : null}
              {r.skipped ? <small> Model not used: {r.skipped}</small> : null}
              {r.items.filter((x) => x.verdict === "reject").slice(0, 6).map((x) => <div key={x.id} className="f-small">Rejected {x.id.slice(0, 8)}: {x.reason}</div>)}
            </li>
          ))}</ul>
        </details>
      )}
      {data.state && (
        <details>
          <summary><strong>Last pass</strong> <small>{data.state.at.slice(0, 19).replace("T", " ")} UTC · {data.state.passes} pass{data.state.passes === 1 ? "" : "es"}</small></summary>
          <ul>{data.state.log.slice(-12).map((l, i) => <li key={l.at + i} className={l.outcome === "failed" ? "f-team-error" : undefined}>{l.at.slice(11, 19)} {l.outcome}: {l.detail}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
