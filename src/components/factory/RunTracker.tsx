"use client";
import { CheckCircle2, Circle, Loader2, PauseCircle, PlayCircle, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/lib/factory/model";
import PlanningErrorHelp from "./PlanningErrorHelp";
import { errorTooltip } from "@/lib/factory/error-help";
import { nextAction, runTracker, type AiStage, type StepAct, type StepState } from "@/lib/factory/run-tracker";
import { slotOfTask, type FailedAgent } from "@/lib/factory/failed-agents";

const LABEL: Record<StepState, string> = { done: "Done", running: "Running", paused: "Needs you", waiting_approval: "Waiting for approval", ready: "Ready to run", pending: "Not started" };
const ICON = { done: CheckCircle2, running: Loader2, paused: PauseCircle, waiting_approval: UserCheck, ready: PlayCircle, pending: Circle } as const;
const TONE: Record<StepState, string> = { done: "#34d399", running: "#60a5fa", paused: "#f97316", waiting_approval: "#fbbf24", ready: "#38bdf8", pending: "#94a3b8" };

/** One line per stage of the run: what has run, what is running, what is paused and what waits for a person. Waiting steps link to the page with the button. */
const AI_LABEL: Record<AiStage, string> = { insights: "Draft insights with AI", formats: "Suggest formats with AI", audiences: "Suggest strapline and audiences with AI", strategy: "Draft direction with AI", content: "Draft copy pack with AI" };
type Tab = "research" | "direction" | "assets" | "advert";
type Props = { onPlanning?: (kind: "research" | "medium", retry: boolean, feedback?: string) => unknown; settings?: ReactNode; onRunReady?: () => void; command?: (c: Record<string, unknown>, message: string) => unknown; p: Project; go?: (tab: Tab, anchor?: string) => void; aiReady?: boolean; busy?: boolean; onAi?: (stage: AiStage) => void; onAct?: (act: StepAct) => void; onProducer?: () => void; canApproveForCustomer?: boolean; accountBytes?: number; onTrim?: () => void; admin?: boolean;
  /** CHG-0100: the agents that failed for this project; a blocked agent row shows the failure in plain English and a Rerun button. */
  failed?: FailedAgent[]; onRerun?: (slot: string) => void };

const FLOW_STAGES = ["Plan & scope", "Research", "Insights", "Direction", "Production & approval"] as const;
type FlowStage = typeof FLOW_STAGES[number];
function stageOf(id: string): FlowStage {
  if (id === "planResearch" || id === "scope") return "Plan & scope";
  if (id.startsWith("research:") || id === "reviewSources" || id === "sources") return "Research";
  if (id === "draftInsights" || id === "reviewInsights" || id === "insights" || id === "insights-draft") return "Insights";
  if (["mediumSelection", "formats", "formats-suggest", "audiences", "audiences-suggest", "draftDirection", "reviewDirection", "approveDirection", "direction", "direction-approval"].includes(id)) return "Direction";
  return "Production & approval";
}
/** The overview's single sheet: every deliverable top to bottom, AI agent steps and human review steps, each with the button or link that does it. */
export default function RunTracker({ onPlanning, settings, onRunReady, command, onProducer, p, go, aiReady, busy, onAi, onAct, canApproveForCustomer, accountBytes, onTrim, admin, failed, onRerun }: Props) {
  const steps = runTracker(p);
  /** The failed agent behind a row that needs a person (a blocked agent task), if any. */
  const failedAt = (id: string, state: StepState) => (state === "paused" ? failed?.find((f) => f.slot === slotOfTask(id)) : undefined);
  const allSteps = steps;
  const readyCount = steps.filter((s) => s.state === "ready").length;
  const pct = steps.length ? Math.round((steps.filter((s) => s.state === "done").length / steps.length) * 100) : 0;
  const next = nextAction(allSteps);
  const nextFailed = next.who === "Producer" ? failedAt(next.id, allSteps.find((x) => x.id === next.id)?.state || "pending") : undefined;
  const doneCount = allSteps.filter((s) => s.state === "done").length;
  const heldGate = p.producerAgent?.hold?.gate;
  const heldStrategy = p.strategies.at(-1);
  const heldDirection = heldGate === "direction" && heldStrategy?.status === "draft" && (!p.producerAgent?.hold?.subject || p.producerAgent.hold.subject === heldStrategy.hash);
  const heldEvidence = heldGate === "sources" || heldGate === "insights";
  const nextIndex = allSteps.findIndex((s) => s.id === next.id);
  const afterNext = nextIndex >= 0 ? allSteps.slice(nextIndex + 1).find((s) => s.state !== "done") : undefined;
  const stageSummaries = FLOW_STAGES.map((name) => {
    const rows = allSteps.filter((s) => stageOf(s.id) === name);
    const done = rows.length > 0 && rows.every((s) => s.state === "done");
    const active = rows.find((s) => ["paused", "waiting_approval", "ready", "running"].includes(s.state));
    const target = active || rows.find((s) => s.state !== "done") || rows[0];
    return { name, done, active: !!active, target };
  });
  return (
    <section className="f-panel f-deliverables" aria-label={p.taskPlan ? "Project task plan" : "Campaign deliverables"}>
      <div className="f-section-heading">
        <div>
          <div className="f-eyebrow">Task planner</div>
          <p className="f-small" style={{ margin: 0 }}>{p.taskPlan ? `Plan version ${p.taskPlan.version} · ${p.taskPlan.mode === "research" ? "Research and insights only" : "Managed campaign"} · ` : ""}{doneCount} of {steps.length} tasks done ({pct}%)</p>
        </div>
        {onRunReady && readyCount > 0 && <button type="button" className="f-button" disabled={busy || p.runs.some((r) => r.status === "running")} onClick={onRunReady}>Run ready tasks ({readyCount})</button>}
      </div>
      <nav className="f-stage-nav" aria-label="Project stages">
        {stageSummaries.map((stage, i) => {
          const target = stage.target;
          const clickable = !!go && !!target?.tab;
          return (
            <button type="button" key={stage.name} className={"f-stage-nav-item" + (stage.done ? " done" : stage.active ? " active" : "")} disabled={!clickable} onClick={() => clickable && go!(target!.tab!, target!.anchor)}>
              <span>{i + 1}</span>
              <strong>{stage.name}</strong>
              <small>{stage.done ? "Done" : stage.active ? "Needs attention" : "Explore"}</small>
            </button>
          );
        })}
      </nav>
      <div className="f-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + "%" }} /></div>
      <p className="f-small" style={{ margin: "0 0 6px" }}><span className="f-kind agent">AI agent</span> tasks are done by an agent. <span className="f-kind review">Review</span> tasks need a person. Select any stage above to see its work, including future stages. Opening a stage does not approve or skip its gates. Use the task rows for the exact next action.</p>
      <div className={"f-next-card" + (next.who === "Producer" ? " action" : "")}>
        <div className="f-next-card-head">
          <div>
            <div className="f-eyebrow">Current stage · {stageOf(next.id)}</div>
            <p className="f-small" data-testid="next-action">
              <strong>{next.who === "Producer" ? "Your turn" : next.who === "AI" ? "AI is working" : "Nothing needs pressing"}</strong>
              {next.who === "Producer" ? `: ${next.label}. ` : ". "}
              {nextFailed ? (
                <>
                  {nextFailed.label} failed: {nextFailed.failure.title}. {nextFailed.failure.recommendation}{" "}
                  {onRerun && <button type="button" className="f-button small" data-rerun-next={nextFailed.slot} disabled={busy || !nextFailed.canRerun} title={nextFailed.why || nextFailed.error} onClick={() => onRerun(nextFailed.slot)}>Rerun {nextFailed.label}</button>}
                  {!nextFailed.canRerun && nextFailed.why && <> {nextFailed.why}</>}
                </>
              ) : next.text}
            </p>
            {afterNext && <p className="f-small f-next-after"><strong>After this:</strong> {afterNext.label} · {stageOf(afterNext.id)}</p>}
          </div>
        </div>
        <div className="f-next-actions">
          {heldDirection && command && (
            <>
              {go && <button type="button" className="f-button secondary small" disabled={busy} onClick={() => go("direction", "approval-anchor")}>Open direction</button>}
              {aiReady && onAi && <button type="button" className="f-button secondary small" disabled={busy} onClick={() => onAi("strategy")}>Redraft with AI skill</button>}
              <button type="button" className="f-button small" disabled={busy} onClick={() => {
                const reason = typeof window !== "undefined" ? window.prompt("Explain why you are proceeding despite the evidence gap or low review score. Your reason is retained in the project audit trail. Customer approval and later QA still apply:") : null;
                if (reason?.trim() && reason.trim().length >= 20) void command({ type: "shareStrategy", overrideReason: reason.trim() }, "Producer override recorded. Direction shared with caveat; approval is the next gate.");
                else if (reason !== null && typeof window !== "undefined") window.alert("Give a reason of at least 20 characters, or open Direction to edit the caveat first.");
              }}>Proceed with caveat</button>
            </>
          )}
          {!heldDirection && next.who === "Producer" && go && next.tab && !nextFailed && (
            <button type="button" className="f-button secondary small" disabled={busy} onClick={() => go(next.tab!, allSteps.find((s) => s.id === next.id)?.anchor)}>{heldEvidence ? "Review manually and continue" : "Open this stage"}</button>
          )}
        </div>
        {heldDirection && <p className="f-small f-override-note"><strong>Override is explicit, not silent.</strong> Record a reason (at least 20 characters) and ensure the direction includes its low-evidence limitation. The reviewer note stays recorded. This shares the version into the normal approval gate; customer approval and later QA are not bypassed.</p>}
        {heldGate === "sources" && <p className="f-small f-override-note"><strong>Thin or mixed research does not have to stop the project.</strong> Review the remaining sources and accept or reject what is usable. Once every source has a human decision, the workflow continues with any thin-evidence warning still visible.</p>}
        {heldGate === "insights" && <p className="f-small f-override-note"><strong>A low review score is a judgement point, not a dead end.</strong> Review the remaining insight drafts and accept only the interpretations you are comfortable using. Once every draft has a human decision, the workflow can continue with the caveat recorded.</p>}
      </div>
      {(p.producerAgent?.hold || p.researchNote) && (
        <p className="f-small" role="status">{p.producerAgent?.hold ? `Producer decision needed (${p.producerAgent.hold.gate}): ${p.producerAgent.hold.notes}` : p.researchNote}</p>
      )}
      {onProducer && (
        <p className="f-small" style={{ margin: "0 0 8px" }}>
          <button type="button" className="f-button secondary small" disabled={busy} onClick={onProducer}>Re-run producer review</button>{" "}
          Run the current checks again against the latest evidence. If this reviewer uses a model, the re-check can be a metered AI call and may return the same result.
        </p>
      )}
      <details className="f-task-details"><summary>All tasks and dependencies ({steps.length})</summary><ol className="f-deliverable-list">
        {steps.map((s, i) => {
          const Icon = ICON[s.state];
          const needs = s.state === "paused" || s.state === "waiting_approval";
          const broken = failedAt(s.id, s.state);
          const open = (label: string) => go && s.tab ? (
            <button type="button" className="f-button small" disabled={busy} onClick={() => go(s.tab!, s.anchor)}>{label}</button>
          ) : null;
          return (
            <li key={s.id} data-task={s.id} data-state={s.state} data-kind={s.kind} className={"f-small f-deliverable" + (s.no && /[A-Z]$/.test(s.no) ? " child" : "")}>
              <span className="f-deliverable-no">{s.no || i + 1}</span>
              <Icon size={16} color={TONE[s.state]} className={s.state === "running" ? "f-spin" : undefined} aria-hidden="true" />
              <span className={"f-kind " + s.kind}>{s.kind === "agent" ? "AI agent" : "Review"}</span>
              <strong className="f-deliverable-name">{s.label}</strong>
              <span style={{ color: TONE[s.state] }} className="f-deliverable-state">{LABEL[s.state]}</span>
              {broken ? (
                <span className="f-deliverable-detail" title={broken.error}>{broken.failure.title}. {broken.failure.recommendation}{!broken.canRerun && broken.why ? ` ${broken.why}` : ""}</span>
              ) : (
                <span className="f-deliverable-detail" title={s.state === "paused" && /fail|invalid|unknown|limit|capacity|cap reached|authoris|choose|enable/i.test(s.detail) ? errorTooltip(s.detail) : undefined}>{s.detail}</span>
              )}
              <span className="f-deliverable-actions">
                {broken && onRerun && <button type="button" className="f-button small" data-rerun-task={broken.slot} disabled={busy || !broken.canRerun} title={broken.why || "Run this agent again for this project"} onClick={() => onRerun(broken.slot)}>Rerun</button>}
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
                {s.id === "planResearch" && needs && onPlanning && (
                  <>
                    <button type="button" className="f-button small" disabled={busy || !p.aiAuthorised || !p.channels?.length} title={!p.aiAuthorised ? "Authorise public project data first" : !p.channels?.length ? "Choose launch channels first" : "Runs the AI research planner again (one paid model call)"} onClick={() => void onPlanning("research", true, "")}>Retry AI plan (paid)</button>
                    <button type="button" className="f-button secondary small" onClick={() => { const d = document.getElementById("plan-settings") as HTMLDetailsElement | null; if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } }}>Use rules plan instead</button>
                    {p.researchPlanning?.error && <PlanningErrorHelp p={p} error={p.researchPlanning.error} admin={admin} busy={busy} command={command} onRetry={() => void onPlanning("research", true, "")} />}
                  </>
                )}
                {needs && s.id !== "planResearch" && !s.ai && !s.act && open(s.kind === "review" ? "Open to complete" : "Open")}
                {needs && s.act === "approve_direction" && open("Open the direction")}
                {s.state === "done" && s.tab && <button type="button" className="f-text-button" onClick={() => go?.(s.tab!, s.anchor)} hidden={!go}>View</button>}
              </span>
              {(() => {
                const t = p.taskPlan?.tasks.find((x) => x.id === s.taskId);
                if (!t) return null;
                const deps = t.dependsOn.map((d) => steps.find((x) => x.id === d)?.no || d).join(", ");
                return (
                  <details className="f-deliverable-more">
                    <summary>Why this task{deps ? `, depends on ${deps}` : ""}</summary>
                    <p>{t.reason}</p>
                    {!!t.questions?.length && <ul>{t.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
                    {!!t.methods?.length && <p>Methods: {t.methods.join(", ")}</p>}
                    <ul>{t.acceptance.map((x) => <li key={x}>{x}</li>)}</ul>
                    {t.completion && <p>Completed by {t.completion.by}: {t.completion.note}</p>}
                    {!!t.runIds.length && <p>{t.runIds.length} recorded execution{t.runIds.length === 1 ? "" : "s"}</p>}
                    {t.status === "manual" && t.id.startsWith("manual:") && command && p.taskPlan && (
                      <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void command({ type: "completeManualTask", id: t.id, version: p.taskPlan!.version, note: String(data.get("note") || "") }, "Manual production task completed; customer approval is still required for shared assets"); }}>
                        <label className="f-field"><span>Completion and handoff note</span><textarea name="note" required maxLength={1000} /></label>
                        <button className="f-button small" disabled={busy}>Mark producer work complete</button>
                      </form>
                    )}
                  </details>
                );
              })()}
            </li>
          );
        })}
      </ol></details>
      {settings}
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
