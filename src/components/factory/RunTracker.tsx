"use client";
import { CheckCircle2, Circle, Loader2, PauseCircle, UserCheck } from "lucide-react";
import type { Project } from "@/lib/factory/model";
import { runTracker, type AiStage, type StepAct, type StepState } from "@/lib/factory/run-tracker";

const LABEL: Record<StepState, string> = { done: "Done", running: "Running", paused: "Paused", waiting_approval: "Waiting for approval", pending: "Not started" };
const ICON = { done: CheckCircle2, running: Loader2, paused: PauseCircle, waiting_approval: UserCheck, pending: Circle } as const;
const TONE: Record<StepState, string> = { done: "#34d399", running: "#60a5fa", paused: "#f97316", waiting_approval: "#fbbf24", pending: "#94a3b8" };

/** One line per stage of the run: what has run, what is running, what is paused and what waits for a person. Waiting steps link to the page with the button. */
const AI_LABEL: Record<AiStage, string> = { insights: "Draft insights with AI", formats: "Suggest formats with AI", audiences: "Suggest strapline and audiences with AI", strategy: "Draft direction with AI", content: "Draft copy pack with AI" };
type Props = { p: Project; go: (tab: "research" | "direction" | "assets" | "advert") => void; aiReady?: boolean; busy?: boolean; onAi?: (stage: AiStage) => void; onAct?: (act: StepAct) => void; canApproveForCustomer?: boolean };
export default function RunTracker({ p, go, aiReady, busy, onAi, onAct, canApproveForCustomer }: Props) {
  const steps = runTracker(p);
  return (
    <section className="f-panel" aria-label="Run progress">
      <div className="f-eyebrow">Run progress</div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {steps.map((s) => {
          const Icon = ICON[s.state];
          return (
            <li key={s.id} data-state={s.state} className="f-small" style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
              <Icon size={16} color={TONE[s.state]} className={s.state === "running" ? "f-spin" : undefined} aria-hidden="true" />
              <strong style={{ minWidth: 150 }}>{s.label}</strong>
              <span style={{ color: TONE[s.state], minWidth: 150 }}>{LABEL[s.state]}</span>
              <span>{s.detail}</span>
              {s.ai && aiReady && onAi && (
                <button type="button" className="f-button small" disabled={busy} onClick={() => onAi(s.ai!)}>{AI_LABEL[s.ai]}</button>
              )}
              {s.act === "share_direction" && onAct && (
                <button type="button" className="f-button small" disabled={busy} onClick={() => onAct("share_direction")}>Share with customer</button>
              )}
              {s.act === "approve_direction" && onAct && canApproveForCustomer && (
                <button type="button" className="f-button small" disabled={busy} onClick={() => onAct("approve_direction")}>Approve (on behalf)</button>
              )}
              {s.state === "done" && s.id === "direction-approval" && <span className="f-button small done" aria-label="Approved">Approved</span>}
              {s.tab && (s.state === "waiting_approval" || s.state === "paused") && (
                <button type="button" className="f-button small" onClick={() => { go(s.tab!); if (s.state === "waiting_approval") setTimeout(() => document.getElementById("approval-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }}>{s.state === "waiting_approval" ? "Go to approval" : "Go to step"}</button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
