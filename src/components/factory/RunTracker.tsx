"use client";
import { CheckCircle2, Circle, Loader2, PauseCircle, UserCheck } from "lucide-react";
import type { Project } from "@/lib/factory/model";
import { nextAction, runTracker, type AiStage, type StepAct, type StepState } from "@/lib/factory/run-tracker";

const LABEL: Record<StepState, string> = { done: "Done", running: "Running", paused: "Needs you", waiting_approval: "Waiting for approval", pending: "Not started" };
const ICON = { done: CheckCircle2, running: Loader2, paused: PauseCircle, waiting_approval: UserCheck, pending: Circle } as const;
const TONE: Record<StepState, string> = { done: "#34d399", running: "#60a5fa", paused: "#f97316", waiting_approval: "#fbbf24", pending: "#94a3b8" };

/** One line per stage of the run: what has run, what is running, what is paused and what waits for a person. Waiting steps link to the page with the button. */
const AI_LABEL: Record<AiStage, string> = { insights: "Draft insights with AI", formats: "Suggest formats with AI", audiences: "Suggest strapline and audiences with AI", strategy: "Draft direction with AI", content: "Draft copy pack with AI" };
type Tab = "research" | "direction" | "assets" | "advert";
type Props = { p: Project; go?: (tab: Tab, anchor?: string) => void; aiReady?: boolean; busy?: boolean; onAi?: (stage: AiStage) => void; onAct?: (act: StepAct) => void; canApproveForCustomer?: boolean; accountBytes?: number; onTrim?: () => void };
/** The overview's single sheet: every deliverable top to bottom, AI agent steps and human review steps, each with the button or link that does it. */
export default function RunTracker({ p, go, aiReady, busy, onAi, onAct, canApproveForCustomer, accountBytes, onTrim }: Props) {
  const allSteps = runTracker(p);
  // With a task plan, only the steps that need an action or are running are listed; without one, the whole sheet.
  const steps = p.taskPlan ? allSteps.filter((s) => s.ai || s.act || s.state === "paused" || s.state === "waiting_approval" || s.state === "running") : allSteps;
  const next = nextAction(allSteps);
  const doneCount = allSteps.filter((s) => s.state === "done").length;
  return (
    <section className="f-panel f-deliverables" aria-label="Campaign deliverables">
      <div className="f-eyebrow">{p.taskPlan ? "Task actions" : "Campaign deliverables"}</div>
      <p className="f-small" style={{ margin: "0 0 6px" }}>{doneCount} of {allSteps.length} steps done. <span className="f-kind agent">AI agent</span> steps run by themselves once started; <span className="f-kind review">Review</span> steps need a person. Press a button to jump straight to it; you come back here when it is done.</p>
      <p className="f-small" data-testid="next-action" style={{ margin: "4px 0 10px", padding: "8px 10px", borderRadius: 8, border: `1px solid ${next.who === "Producer" ? "#f97316" : "#475569"}` }}>
        <strong>{next.who === "Producer" ? "Your turn" : next.who === "AI" ? "AI is working" : "Nothing needs pressing"}</strong>
        {next.who === "Producer" ? `: ${next.label}. ` : ". "}{next.text}
      </p>
      <ol className="f-deliverable-list">
        {steps.map((s, i) => {
          const Icon = ICON[s.state];
          const needs = s.state === "paused" || s.state === "waiting_approval";
          const open = (label: string) => go && s.tab ? (
            <button type="button" className="f-button small" disabled={busy} onClick={() => go(s.tab!, s.anchor)}>{label}</button>
          ) : null;
          return (
            <li key={s.id} data-state={s.state} data-kind={s.kind} className="f-small f-deliverable">
              <span className="f-deliverable-no">{i + 1}</span>
              <Icon size={16} color={TONE[s.state]} className={s.state === "running" ? "f-spin" : undefined} aria-hidden="true" />
              <span className={"f-kind " + s.kind}>{s.kind === "agent" ? "AI agent" : "Review"}</span>
              <strong className="f-deliverable-name">{s.label}</strong>
              <span style={{ color: TONE[s.state] }} className="f-deliverable-state">{LABEL[s.state]}</span>
              <span className="f-deliverable-detail">{s.detail}</span>
              <span className="f-deliverable-actions">
                {s.ai && aiReady && onAi && <button type="button" className="f-button small" disabled={busy} onClick={() => onAi(s.ai!)}>{AI_LABEL[s.ai]}</button>}
                {s.ai && !(aiReady && onAi) && needs && open("Open")}
                {(s.act === "review_sources" || s.act === "review_insights") && onAct && (
                  <button type="button" className="f-button small" disabled={busy} onClick={() => onAct(s.act!)}>{s.act === "review_sources" ? "Review sources" : "Review insights"}</button>
                )}
                {s.act === "share_direction" && onAct && <button type="button" className="f-button small" disabled={busy} onClick={() => onAct("share_direction")}>Share with customer</button>}
                {s.act === "approve_direction" && onAct && canApproveForCustomer && (
                  <button type="button" className="f-button small" disabled={busy} onClick={() => onAct("approve_direction")}>Approve direction</button>
                )}
                {s.state === "done" && s.id === "direction-approval" && <span className="f-button small done" aria-label="Approved">Approved</span>}
                {needs && !s.ai && !s.act && open(s.kind === "review" ? "Open to complete" : "Open")}
                {needs && s.act === "approve_direction" && open("Open the direction")}
                {s.state === "done" && s.tab && <button type="button" className="f-text-button" onClick={() => go?.(s.tab!, s.anchor)} hidden={!go}>View</button>}
              </span>
            </li>
          );
        })}
      </ol>
      {p.storage && (
        <p className="f-small" style={{ marginTop: 10 }} data-testid="storage-gauge">
          Storage: this project {Math.round(p.storage.bytes / 1024)} KB
          {accountBytes !== undefined ? `; this account ${Math.round(accountBytes / 1024)} KB of about ${Math.round(p.storage.limitBytes / 1024)} KB (${Math.round((accountBytes / p.storage.limitBytes) * 100)}%)` : ""}.
          {" "}Biggest: {p.storage.parts.slice(0, 3).map((x) => `${x.name} ${Math.round(x.bytes / 1024)} KB`).join(", ")}.
          {onTrim && <> <button type="button" className="f-button secondary small" disabled={busy} onClick={onTrim}>Trim old run copies</button></>}
        </p>
      )}
    </section>
  );
}
