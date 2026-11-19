"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Project } from "@/lib/factory/model";
import { explainError } from "@/lib/factory/error-help";

type Command = (c: Record<string, unknown>, message: string) => unknown;

/** A "Reset or see more" button that sits next to a planning error and opens a popup with the kind of problem, the cause, the numbers and the ways out. */
export default function PlanningErrorHelp({ p, error, admin, busy, command, onRetry }: { p: Project; error: string; admin?: boolean; busy?: boolean; command?: Command; onRetry?: () => void }) {
  const [open, setOpen] = useState(false);
  const info = explainError(error);
  const planning = p.runs.filter((r) => r.stage === "planning");
  const failed = planning.filter((r) => r.status === "failed").length;
  const counting = planning.length - failed;
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className="f-button secondary small" onClick={() => setOpen(true)} data-testid="planning-error-help">Reset or see more</button>
      {open && (
        <div className="f-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="f-modal" role="dialog" aria-modal="true" aria-labelledby="f-planerr-title">
            <div className="f-section-heading">
              <div>
                <div className="f-eyebrow">{info.kind}</div>
                <h2 id="f-planerr-title">{info.title}</h2>
                <p className="f-small" role="alert">{error}</p>
              </div>
              <button type="button" className="f-text-button" onClick={close} aria-label="Close"><X size={16} /></button>
            </div>
            <h3>What it means</h3>
            <p className="f-small">{info.what}</p>
            <h3>Why it happened</h3>
            <p className="f-small">{info.cause}</p>
            <h3>What to do</h3>
            <p className="f-small">{info.fix}</p>
            <p className="f-small">{info.needsChange ? "Retrying will not help until the change above is made." : "Retrying is reasonable."} This project has {planning.length} AI planning run{planning.length === 1 ? "" : "s"} on record: {failed} failed (not counted) and {counting} counted towards the limit of 6.</p>
            <div className="f-actions" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {onRetry && <button type="button" className="f-button" disabled={busy || !p.aiAuthorised || !p.channels?.length} onClick={() => { close(); onRetry(); }}>Retry AI plan (paid)</button>}
              <button type="button" className="f-button secondary" onClick={() => { close(); const d = document.getElementById("plan-settings") as HTMLDetailsElement | null; if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } }}>Use rules plan instead</button>
              {admin && command && (
                <button type="button" className="f-button secondary" disabled={busy} onClick={() => { if (window.confirm("Remove everything except the brief for this project? This cannot be undone.")) { close(); void command({ type: "resetProject", confirm: true }, "Project restarted from the brief"); } }}>Restart from the brief (admin)</button>
              )}
            </div>
            {admin && <p className="f-small" style={{ marginTop: 8 }}>Restart keeps the brief, logo and account, removes sources, insights, directions, assets and run records, and keeps the audit trail and the cost ledger.</p>}
          </div>
        </div>
      )}
    </>
  );
}
