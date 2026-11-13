"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Clock, FileSearch, Lightbulb, Loader2, Palette, RefreshCw, Target, Users, Megaphone, Send } from "lucide-react";
import type { Project, Segment } from "@/lib/factory/model";
import { segments } from "@/lib/factory/model";
import { channelNames } from "@/lib/factory/channels";
import { researchLabels, researchNotes } from "./shared";

const icons = { brand: Building2, customer: Users, competitor: Target, creative: Palette } as const;
const agentName: Record<Segment, string> = {
  brand: "Business and brand researcher",
  customer: "Customer insight researcher",
  competitor: "Competitor researcher",
  creative: "Creative researcher",
};
function useTick(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB");
const seconds = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}m ${n % 60}s` : `${n}s`);
type Mode = "done" | "active" | "idle";
function FlowNode({ mode, icon: Icon, title, sub }: { mode: Mode; icon: typeof Clock; title: string; sub: string }) {
  return (
    <div className={"f-flow-node " + mode}>
      <span className="f-flow-icon">{mode === "active" ? <Loader2 size={18} className="f-spin" /> : mode === "done" ? <CheckCircle2 size={18} /> : <Icon size={18} />}</span>
      <strong>{title}</strong>
      <small>{sub}</small>
    </div>
  );
}
function FlowLink({ mode }: { mode: "flow" | "done" | "idle" }) {
  return <span className={"f-flow-link " + mode} aria-hidden="true" />;
}
type State = "idle" | "queued" | "running" | "completed" | "failed";

export default function ResearchProgress({
  p,
  operator,
  runningSegment,
  onRefresh,
}: {
  p: Project;
  operator: boolean;
  runningSegment?: Segment | null;
  onRefresh: () => void;
}) {
  const progress = p.researchProgress || [];
  const requested = !!p.researchRequest;
  const stateOf = (segment: Segment): { state: State; sources: number } => {
    const row = progress.find((x) => x.segment === segment);
    const sources = row?.sources || 0;
    if (runningSegment === segment) return { state: "running", sources };
    if (!row || row.status === "idle") return { state: requested ? "queued" : "idle", sources };
    return { state: row.status, sources };
  };
  const states = segments.map((s) => stateOf(s).state);
  const finished = states.every((s) => s === "completed");
  const anyRunning = states.includes("running");
  const watching = (requested || anyRunning) && !finished;
  const anyStarted = states.some((x) => x === "running" || x === "completed" || x === "failed");
  const anyDone = states.includes("completed");
  const sourcesFound = progress.reduce((n, r) => n + r.sources, 0);
  const unreviewed = p.sources.filter((x) => x.kind === "public_source" && x.status === "unreviewed").length;
  const reviewDone = finished && (operator ? unreviewed === 0 && sourcesFound > 0 : p.insights.length > 0);
  const insightsDone = p.insights.length > 0;
  const runningRuns = operator ? p.runs.filter((r) => r.stage === "research" && r.status === "running") : [];
  const now = useTick(runningRuns.length > 0);
  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") onRefresh();
    }, 8000);
    return () => clearInterval(timer);
  }, [watching, onRefresh]);
  const channels = channelNames(p.channels);
  const headline = finished
    ? "Research is complete. Port67 is reviewing the sources before drafting insights."
    : anyRunning
      ? "Research is running now."
      : requested
        ? operator
          ? "The customer has asked for research. Click Start research above to begin."
          : "Waiting for Port67 to start. You will see each researcher switch on here."
        : "Choose your launch channels, then request research.";
  return (
    <section className="f-panel f-progress" aria-labelledby="f-progress-title">
      <div className="f-section-heading">
        <div>
          <h2 id="f-progress-title">What the research is doing</h2>
          <p className="f-small" role="status">
            {headline}
          </p>
        </div>
        <button type="button" className="f-text-button" onClick={onRefresh} aria-label="Refresh research progress">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {!anyStarted && p.researchNote && <p className="f-callout" role="status">{p.researchNote}{operator ? " You can still click Start research above to run it by hand." : ""}</p>}
      <p className="f-small">
        Four specialist researchers each search the public web for their own question and must cite every finding.
        {channels.length ? ` They focus on ${channels.join(", ")}.` : ""} Nothing is used until Port67 has reviewed the sources.
      </p>
      <div className="f-flow" role="group" aria-label="Research progress flow">
        <FlowNode mode={channels.length ? "done" : "active"} icon={Megaphone} title="Brief and channels" sub={channels.length ? channels.join(", ") : "Choose channels"} />
        <FlowLink mode={requested ? "done" : "idle"} />
        <FlowNode mode={requested ? "done" : "idle"} icon={Send} title="Research requested" sub={requested ? new Date(p.researchRequest!.at).toLocaleDateString("en-GB") : "Not yet requested"} />
        <FlowLink mode={anyStarted ? "done" : requested ? "flow" : "idle"} />
        <FlowNode mode={anyStarted ? "done" : requested ? "active" : "idle"} icon={Clock} title="Port67 starts" sub={anyStarted ? "Under way" : requested ? (p.researchNote ? (operator ? "See note below" : p.researchNote) : operator ? "Click Start research above" : "Waiting for a producer") : "After the request"} />
        <FlowLink mode={anyRunning ? "flow" : anyStarted ? "done" : "idle"} />
        <div className="f-flow-agents">
          {segments.map((segment) => {
            const { state } = stateOf(segment);
            const Icon = icons[segment];
            return (
              <div key={segment} className={"f-flow-node small " + (state === "running" ? "active" : state === "completed" ? "done" : state === "failed" ? "failed" : "idle")}>
                <span className="f-flow-icon">{state === "running" ? <Loader2 size={15} className="f-spin" /> : state === "completed" ? <CheckCircle2 size={15} /> : state === "failed" ? <AlertTriangle size={15} /> : <Icon size={15} />}</span>
                <strong>{researchLabels[segment]}</strong>
              </div>
            );
          })}
        </div>
        <FlowLink mode={finished ? "done" : anyRunning || anyDone ? "flow" : "idle"} />
        <FlowNode mode={reviewDone ? "done" : finished ? "active" : "idle"} icon={FileSearch} title="Source review" sub={finished ? (operator && unreviewed ? `${unreviewed} to review` : "Port67 checks every source") : "After research"} />
        <FlowLink mode={reviewDone && !insightsDone ? "flow" : insightsDone ? "done" : "idle"} />
        <FlowNode mode={insightsDone ? "done" : reviewDone ? "active" : "idle"} icon={Lightbulb} title="Insights and direction" sub={insightsDone ? `${p.insights.length} insight${p.insights.length === 1 ? "" : "s"}` : "Next stage"} />
      </div>
      <div className="f-agent-grid">
        {segments.map((segment) => {
          const { state, sources } = stateOf(segment);
          const Icon = icons[segment];
          const gaps = operator ? p.runs.filter((r) => r.segment === segment && r.status === "completed").flatMap((r) => r.gaps || []).length : 0;
          return (
            <article key={segment} className={"f-agent " + state} aria-label={agentName[segment] + ": " + state}>
              <div className="f-agent-head">
                <span className="f-agent-icon">
                  <Icon size={18} />
                </span>
                <strong>{agentName[segment]}</strong>
              </div>
              <p className="f-small">{researchNotes[segment]}</p>
              <span className={"f-agent-state " + state}>
                {state === "running" && <Loader2 size={14} className="f-spin" />}
                {state === "completed" && <CheckCircle2 size={14} />}
                {state === "failed" && <AlertTriangle size={14} />}
                {(state === "idle" || state === "queued") && <Clock size={14} />}
                {state === "idle" && "Not started"}
                {state === "queued" && "Queued"}
                {state === "running" && "Researching now"}
                {state === "completed" && `Done: ${sources} source${sources === 1 ? "" : "s"} found${gaps ? `, ${gaps} gap${gaps === 1 ? "" : "s"} noted` : ""}`}
                {state === "failed" && (operator ? "Failed: see Run history" : "Needs attention. Port67 is looking into it.")}
              </span>
              <span className="f-sr">{researchLabels[segment]}</span>
            </article>
          );
        })}
      </div>
      {operator && p.runs.some((r) => r.stage === "research") && (
        <div className="f-activity">
          <h3>Live activity</h3>
          <ul>
            {[...p.runs]
              .filter((r) => r.stage === "research" && r.segment)
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 8)
              .map((r) => {
                const found = p.sources.filter((x) => x.researchRunId === r.id).length;
                const took = r.finishedAt ? Math.max(0, Math.round((Date.parse(r.finishedAt) - Date.parse(r.at)) / 1000)) : undefined;
                return (
                  <li key={r.id} className={r.status}>
                    <time>{clock(r.at)}</time>
                    <strong>{agentName[r.segment as Segment]}</strong>
                    <span>
                      {r.status === "running" && `searching the web with ${r.provider} ${r.model}${now ? ", " + seconds(Math.max(0, Math.round((now - Date.parse(r.at)) / 1000))) : ""}`}
                      {r.status === "completed" && `found ${found} source${found === 1 ? "" : "s"}${took !== undefined ? " in " + seconds(took) : ""} with ${r.provider} ${r.model}${r.usage?.input_tokens !== undefined ? `, ${r.usage.input_tokens} in / ${r.usage.output_tokens ?? 0} out tokens` : ""}`}
                      {r.status === "failed" && `failed: ${r.error || "see Run history"}`}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </section>
  );
}
