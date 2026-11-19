"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, Lock, RotateCcw } from "lucide-react";
import type { StudioStage } from "@/lib/factory/model";
import { STAGE_BADGE_LABELS, STUDIO_GATE_APPROVER, STUDIO_STAGES, STUDIO_STAGE_LABELS, stageBadge, studioStageVisibleToClient } from "@/lib/factory/studio";
import { gateBlockers } from "@/lib/factory/studio-gates";
import { Tag } from "./shared";
import type { Actions } from "./shared";

export const GATE_APPROVE_LABEL: Record<StudioStage, string> = {
  intake: "Approve brief",
  strategy: "Approve research and strategy",
  preproduction: "Approve concepts",
  production: "Approve final work",
};
export const BADGE_TONE: Record<string, string> = { locked: "neutral", in_progress: "orange", waiting_approval: "orange", approved: "green", out_of_date: "stale" };
export type GateBarProps = Actions & {
  stage: StudioStage;
  /** Extra reasons a plain approval is blocked (for example unsaved form changes). The stage's registered checks are always added. */
  blockers?: string[];
};
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");

/**
 * The bar at the end of every stage page: Approve, Approve with a note and, for approved stages, Reopen (producers only).
 * Producer gates (intake, strategy) are for producers; client gates (pre-production, production) are for the client, or a producer on
 * the client's behalf when the workspace allows it (p.producerApprovals). The server enforces the same rules.
 */
export default function GateBar({ p, stage, operator, busy, command, blockers = [] }: GateBarProps) {
  const [mode, setMode] = useState<"" | "note" | "reopen">("");
  const [note, setNote] = useState("");
  const s = p.studio;
  if (!s) return null;
  const g = s.gates[stage];
  const badge = stageBadge(s, stage);
  const clientGate = STUDIO_GATE_APPROVER[stage] === "client";
  const onBehalf = clientGate && operator;
  const canAct = clientGate ? !operator || !!p.producerApprovals : operator;
  const all = [...blockers, ...gateBlockers(s, stage, p)];
  const visible = studioStageVisibleToClient(s, stage);
  const shared = s.readyForClient?.[stage];
  const later = STUDIO_STAGES.slice(STUDIO_STAGES.indexOf(stage) + 1).filter((x) => s.gates[x].status !== "locked");
  const earlierNotes = STUDIO_STAGES.slice(0, STUDIO_STAGES.indexOf(stage)).filter((x) => s.gates[x].note);
  const done = (ok: boolean | undefined) => { if (ok) { setMode(""); setNote(""); } };
  const approve = (withNote: boolean) =>
    void Promise.resolve(command({ type: withNote ? "approveStudioGateWithNote" : "approveStudioGate", stage, ...(withNote ? { note } : {}) }, `${STUDIO_STAGE_LABELS[stage]} approved${onBehalf ? " on the client's behalf" : ""}.`)).then(done);
  return (
    <section className="f-gate-bar" id="studio-gate" aria-label={`Gate: ${STUDIO_STAGE_LABELS[stage]}`}>
      <div className="f-gate-status">
        <Tag tone={BADGE_TONE[badge]}>{STAGE_BADGE_LABELS[badge]}</Tag>
        <strong>{STUDIO_STAGE_LABELS[stage]}</strong>
        <span className="f-small">{clientGate ? "Client approval" : "Producer approval"}</span>
      </div>
      {earlierNotes.length > 0 && (
        <ul className="f-gate-notes" aria-label="Notes from earlier gates">
          {earlierNotes.map((x) => <li key={x}><strong>{STUDIO_STAGE_LABELS[x]}:</strong> {s.gates[x].note}{s.gates[x].gaps?.length ? ` (outstanding at approval: ${s.gates[x].gaps!.join("; ")})` : ""}</li>)}
        </ul>
      )}
      {g.status === "locked" && <p className="f-small"><Lock size={13} aria-hidden="true" /> This stage opens when the earlier stages are approved.</p>}
      {g.status === "approved" && (
        <p className="f-small">
          <Check size={13} aria-hidden="true" /> Approved by {g.approvedBy} on {when(g.approvedAt)}{g.note ? `, with a note: ${g.note}` : "."}
          {g.gaps?.length ? ` Outstanding at approval: ${g.gaps.join("; ")}.` : ""}
        </p>
      )}
      {clientGate && operator && (g.status === "active" || g.status === "stale") && (
        <div className="f-gate-actions">
          <span className="f-small">{shared ? `Shared for client review on ${when(shared.at)}.` : "The client does not see this stage's pieces until you share it."}</span>
          {shared
            ? <button type="button" className="f-button secondary" disabled={busy} onClick={() => void command({ type: "setStudioReadyForClient", stage, ready: false }, "Withdrawn from client review")}><EyeOff size={14} aria-hidden="true" /> Withdraw from client review</button>
            : <button type="button" className="f-button" disabled={busy || !s.pieces.some((x) => x.stage === stage && x.versions.length)} onClick={() => void command({ type: "setStudioReadyForClient", stage }, "Shared with the client for review")}><Eye size={14} aria-hidden="true" /> Ready for client review</button>}
        </div>
      )}
      {clientGate && !operator && !visible && <p className="f-small">Port67 is preparing this stage for your review. You will see the work here when it is ready.</p>}
      {g.status === "stale" && <p className="f-small">An earlier stage was reopened. The work here is kept but is out of date: check it and approve this stage again.</p>}
      {(g.status === "active" || g.status === "stale") && all.length > 0 && (operator || visible) && (
        <div className="f-gate-blockers">
          <span>Before a plain approval:</span>
          <ul>{all.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      {(g.status === "active" || g.status === "stale") && !canAct && (
        <p className="f-small">{clientGate ? "Waiting for the client to approve." : "Waiting for Port67 to approve."}</p>
      )}
      {(g.status === "active" || g.status === "stale") && canAct && (operator || visible) && (
        <div className="f-gate-actions">
          <button type="button" className="f-button" disabled={busy || all.length > 0} onClick={() => approve(false)}>
            {GATE_APPROVE_LABEL[stage]}{onBehalf ? " (on the client's behalf)" : ""}
          </button>
          <button type="button" className="f-button secondary" disabled={busy} aria-expanded={mode === "note"} onClick={() => setMode(mode === "note" ? "" : "note")}>
            Approve with a note
          </button>
        </div>
      )}
      {g.status === "approved" && operator && (
        <div className="f-gate-actions">
          <button type="button" className="f-button secondary" disabled={busy} aria-expanded={mode === "reopen"} onClick={() => setMode(mode === "reopen" ? "" : "reopen")}>
            <RotateCcw size={14} aria-hidden="true" /> Reopen
          </button>
        </div>
      )}
      {mode === "note" && (
        <div className="f-gate-form">
          <label className="f-field">
            <span>Note (required): what is missing and why approving now is acceptable</span>
            <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="f-button" disabled={busy || !note.trim()} onClick={() => approve(true)}>Approve with this note</button>
        </div>
      )}
      {mode === "reopen" && (
        <div className="f-gate-form">
          <p className="f-small">
            Reopening moves the project back to this stage.{" "}
            {later.length ? `These stages become out of date (their work is kept): ${later.map((x) => STUDIO_STAGE_LABELS[x]).join(", ")}.` : "No later stage has started."}
          </p>
          <label className="f-field">
            <span>Reason (optional)</span>
            <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="f-button" disabled={busy} onClick={() => void Promise.resolve(command({ type: "reopenStudioGate", stage, note }, `${STUDIO_STAGE_LABELS[stage]} reopened.`)).then(done)}>
            Confirm reopen
          </button>
        </div>
      )}
    </section>
  );
}
