"use client";
import { useState } from "react";
import type { Project } from "@/lib/factory/model";
import { formatById, formatNames } from "@/lib/factory/formats";
import { channelById } from "@/lib/factory/channels";
import { mediumCurrent, planningCurrent } from "@/lib/factory/planning-context";
import PlanningErrorHelp from "./PlanningErrorHelp";
import { errorTooltip } from "@/lib/factory/error-help";

type Command = (value: Record<string, unknown>, message: string) => unknown;
export type OnPlanning = (kind: "research" | "medium", retry: boolean, feedback?: string) => unknown;

export function PlanningPanel({ p, busy, command, onRun, admin }: { p: Project; busy: boolean; command: Command; onRun?: OnPlanning; admin?: boolean }) {
  const [feedback, setFeedback] = useState("");
  const [rulesReason, setRulesReason] = useState("");
  const state = p.researchPlanning;
  const running = busy || p.runs.some(r => r.status === "running");
  const locked = !!p.strategies.length;
  if (!state) return locked ? null : <div className="f-callout"><strong>AI research planning</strong><p>Let the LLM interpret the complete authorised brief and propose relevant research. The task manager validates its choices; planning calls use the existing budget.</p><button className="f-button" disabled={running} onClick={() => void command({ type: "enableAIPlanning" }, "AI research planning enabled. Authorise the public brief, then run the planner or start research.")}>Enable AI research planning</button></div>;
  const current = planningCurrent(p);
  return <section aria-label="AI research planning" className="f-callout" style={{ marginBottom: 16 }}>
    <h3>AI research planning</h3>
    <p className="f-small">{p.strategies.length ? "Plan retained for the existing direction; new performance reports inform future campaigns" : state.status === "rules" ? "Producer chose the rules plan" : current ? `AI proposal version ${state.version} validated and applied` : state.status === "running" ? "The AI planner is interpreting the brief" : state.status === "failed" ? "Planning needs attention; no automatic paid retry" : "Research awaits an AI plan for the current brief and channels"}.</p>
    {state.error && <p role={state.status === "failed" ? "alert" : undefined} title={errorTooltip(state.error)}>{state.error} <PlanningErrorHelp p={p} error={state.error} admin={admin} busy={running} command={command} onRetry={onRun && p.aiAuthorised && p.channels?.length ? () => void onRun("research", true, "") : undefined} /></p>}
    {current && state.proposal && <>
      <p>{state.proposal.summary}</p>{!!state.proposal.performanceIds?.length && <p className="f-small">Campaign observations considered: {state.proposal.performanceIds.join(", ")}. See feedback records for context and limitations.</p>}
      {!!state.proposal.unknowns.length && <details><summary>Questions still open</summary><ul>{state.proposal.unknowns.map(q => <li key={q}>{q}</li>)}</ul></details>}
      {!!state.proposal.mediumHypotheses.length && <details><summary>Provisional medium hypotheses</summary><p className="f-small">These use general channel knowledge. They are unvalidated, limited-confidence hypotheses, not production decisions or historical campaign results.</p><ul>{state.proposal.mediumHypotheses.map((h, n) => <li key={n}>{channelById(h.channel)?.name || h.channel}: {formatById(h.format)?.name || h.format} — {h.reason}</li>)}</ul></details>}
      {!!state.proposal.gaps.length && <details><summary>Selective catalogue expansion proposals</summary><p className="f-small">These are saved to Capabilities for review. They cannot launch agents or grant tools.</p><ul>{state.proposal.gaps.map(g => <li key={g.name}><strong>{g.name}</strong>: {g.reason} Existing limitation: {g.existingCapabilityLimit}. Inputs needed: {g.requiredInputs.join(", ")}.</li>)}</ul></details>}
    </>}
    {!locked && <>
      <label className="f-field"><span>Research planning feedback (optional)</span><textarea value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={1000} placeholder="Explain a research gap, changed priority or why a proposed medium needs more evidence" /></label>
      {onRun && <button className="f-button" disabled={running || !p.aiAuthorised || !p.channels?.length} onClick={() => void onRun("research", true, feedback)}>{current ? "Replan with reviewed evidence · paid" : state.status === "failed" ? "Retry AI research plan · paid" : "Plan research with AI · paid"}</button>}
      {!p.aiAuthorised && <p className="f-small">Authorise the public brief in the Research room before any model call.</p>}
      <details><summary>Use the rules plan instead</summary><p className="f-small">Choose this explicitly if a model is unavailable or you want to manage research selection yourself. It is recorded in the audit trail.</p><label className="f-field"><span>Reason for using the rules plan</span><textarea value={rulesReason} onChange={e => setRulesReason(e.target.value)} maxLength={600} /></label><button className="f-button" disabled={running || !rulesReason.trim()} onClick={() => void command({ type: "useRulesResearchPlan", reason: rulesReason }, "Rules research plan selected explicitly. Review the selected researchers before running.")}>Use rules plan</button></details>
    </>}
  </section>;
}

export function MediumPanel({ p, busy, onRun }: { p: Project; busy: boolean; onRun?: () => unknown }) {
  if (!p.researchPlanning) return null;
  const state = p.mediumSelection;
  const current = mediumCurrent(p);
  const ready = p.insights.some(i => (i.status || "reviewed") === "reviewed") && !p.insights.some(i => i.status === "draft") && !p.sources.some(s => s.kind === "public_source" && s.status === "unreviewed");
  return <section aria-label="Evidence-backed medium selection" className="f-callout">
    <h3>Evidence-backed medium selection</h3>
    <p><strong>Customer requested:</strong> {formatNames(p.brief.requestedFormats).join(", ") || "Help choosing the deliverables"}. This request is kept unchanged.</p>
    {state?.status === "failed" && <p role="alert">Medium recommendation failed: {state.error}. Retry deliberately or record a producer rationale when confirming formats.</p>}
    {state?.proposal && !current && <p role="status">The previous recommendation is out of date. Review the changed evidence before relying on it.</p>}
    {current && state?.proposal ? <>
      <p>{state.proposal.summary}</p>
      <p className="f-small">Research supports suitability, not guaranteed performance. A channel prior is general model knowledge; only reviewed and authorised campaign observations are used when supplied.</p>
      {state.proposal.recommendations.map(r => <article key={`${r.channel}:${r.format}`} style={{ borderTop: "1px solid #ddd", padding: "12px 0" }}>
        <strong>{channelById(r.channel)?.name || r.channel} → {formatById(r.format)?.name || r.format}</strong>
        <p className="f-small">{r.basis === "evidence" ? "Reviewed evidence" : r.basis === "observed_performance" ? "Observed performance" : "Channel prior"} · {r.confidence} confidence · relevance {r.score}/10</p>
        {!!p.brief.requestedFormats?.length && !p.brief.requestedFormats.includes(r.format) && <p><strong>Alternative to the requested deliverables.</strong> Requires a deliberate producer/customer decision.</p>}
        <p>{r.reason}</p>{!!r.performanceIds?.length && <p>Observed campaign records: {r.performanceIds.join(", ")} (producer-reviewed observations; causality unproven).</p>}<p><strong>Counterargument:</strong> {r.counterargument}</p>
        <ul>{r.uncertainties.map(u => <li key={u}>{u}</li>)}</ul>
        {!!r.sourceIds.length && <details><summary>Evidence used</summary><ul>{r.sourceIds.map(id => { const s = p.sources.find(s => s.id === id); return <li key={id}>{s ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : id}</li>; })}{r.insightIds.map(id => <li key={id}>Insight: {p.insights.find(i => i.id === id)?.title || id}</li>)}</ul></details>}
      </article>)}
      {!!state.proposal.gaps.length && <details><summary>Research or testing still needed</summary><ul>{state.proposal.gaps.map(g => <li key={g}>{g}</li>)}</ul><p>Use the research planner in Overview to commission a focused revision if these gaps affect the decision.</p></details>}
    </> : <p className="f-small">After source and insight review, the medium strategist compares audience/channel suitability with the requested outputs. It never chooses production formats for you.</p>}
    {onRun && !p.strategies.length && <button className="f-button" disabled={busy || !ready || p.runs.some(r => r.status === "running")} onClick={() => void onRun()}>{current ? "Refresh medium recommendation · paid" : "Recommend media from reviewed evidence · paid"}</button>}
    {p.mediumDecision && <p className="f-small"><strong>Recorded producer decision:</strong> {p.mediumDecision.rationale}</p>}
  </section>;
}
