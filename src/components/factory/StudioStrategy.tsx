"use client";
import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import type { Segment } from "@/lib/factory/model";
import { channelNames } from "@/lib/factory/channels";
import { formatNames } from "@/lib/factory/formats";
import { MIN_ACCEPTED_PER_SEGMENT, thinResearchSegments } from "@/lib/factory/producer-reviews";
import { offerInfo, studioDirectionFraming, studioStrategyClosed } from "@/lib/factory/studio";
import { Tag, researchLabels, type Actions } from "./shared";
import ResearchProgress from "./ResearchProgress";
import ReviewQueue from "./ReviewQueue";
import InsightEditor from "./InsightEditor";
import CampaignPlan from "./CampaignPlan";
import Ideas from "./Ideas";
import Direction from "./Direction";

export type StudioStrategyProps = Actions & {
  /** Research can run (provider configured and not the demo). */
  live: boolean;
  /** AI drafting can run. */
  aiReady: boolean;
  runningSegment?: Segment | null;
  onRefresh: () => void;
  /** Runs the studio research set through the producer agent (the existing Run ready tasks path). */
  onStartResearch: () => void;
  onAi: (stage: "insights" | "audiences" | "ideas") => void;
  onDirection: () => Promise<boolean>;
};
function Step({ id, n, title, done, children }: { id: string; n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="f-panel f-studio-step" id={id} aria-labelledby={id + "-title"}>
      <div className="f-section-heading">
        <h3 id={id + "-title"}><span className="f-step-no">{n}</span> {title}</h3>
        {done ? <Tag tone="green">Done</Tag> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Stage 2 (Creative strategy) for a studio project: one page that walks through research, source review, insights, strapline and
 * audiences, ideas and the campaign direction, reusing the existing components. The offer fixes the format, so there is no format
 * or medium choice. The gate bar below the page approves research and strategy together.
 */
export default function StudioStrategy(props: StudioStrategyProps) {
  const { p, operator, busy, command, live, aiReady, runningSegment, onRefresh, onStartResearch, onAi, onDirection } = props;
  const [queue, setQueue] = useState<"sources" | "insights" | null>(null);
  const s = p.studio!;
  const offer = offerInfo(s.offer)!;
  const closed = studioStrategyClosed(s);
  const publicSources = p.sources.filter((x) => x.kind === "public_source");
  const unreviewed = publicSources.filter((x) => x.status === "unreviewed");
  const accepted = publicSources.filter((x) => x.status === "supported");
  const drafts = p.insights.filter((i) => i.status === "draft");
  const insights = p.insights.filter((i) => (i.status || "reviewed") === "reviewed");
  const ran = p.runs.some((r) => (r.stage || "research") === "research");
  const thin = operator ? thinResearchSegments(p) : [];
  const d = p.strategies.at(-1);
  const framing = studioDirectionFraming(s);
  const research = p.taskPlan?.research || [];
  return (
    <div className="f-studio-strategy">
      {closed && <p className="f-callout f-small" role="status">{closed}.</p>}
      <Step id="strategy-research" n={1} title={operator ? "Start research" : "Research"} done={ran && !runningSegment && research.every((seg) => p.runs.some((r) => r.segment === seg && r.status === "completed"))}>
        <p className="f-small">
          Research agents for the {offer.label}: {research.length ? research.map((x) => researchLabels[x] || x).join(", ") : "set when the intake is approved"}. Channels: {p.channels?.length ? channelNames(p.channels).join(", ") : "from the offer"}. Format: {formatNames(p.brief.requestedFormats).join(", ")} (fixed by the offer). Research reads public pages only and cannot log in to social accounts.
        </p>
        {operator && !closed && (
          <div className="f-actions">
            {p.aiAuthorised ? (
              <button type="button" className="f-button" disabled={busy || !live} title={live ? "Runs the studio research set, one paid call per agent, then the producer reviews" : "Configure the research provider first"} onClick={onStartResearch}>
                <Sparkles size={15} aria-hidden="true" /> {ran ? "Run ready research tasks" : "Start research"}
              </button>
            ) : (
              <button type="button" className="f-button" disabled={busy || !live} onClick={async () => { if (await command({ type: "authoriseAI", confirm: true }, "Project brief authorised as PUBLIC data for the configured provider")) onStartResearch(); }}>
                <Sparkles size={15} aria-hidden="true" /> Authorise public data and start research
              </button>
            )}
            {!live && <p className="f-small" role="status">Research is not configured: choose a model for the research agents on the AI agents page and set PORT67_RESEARCH_ENABLED.</p>}
            {!p.aiAuthorised && live && <p className="f-small">The brief must be authorised as public data before any paid call; the orange button does both in one step.</p>}
          </div>
        )}
        <ResearchProgress p={p} operator={operator} runningSegment={runningSegment} onRefresh={onRefresh} />
        {thin.length > 0 && (
          <p className="f-callout f-small" role="status">
            <AlertTriangle size={14} aria-hidden="true" /> Thin research: fewer than {MIN_ACCEPTED_PER_SEGMENT} accepted sources for {thin.map((x) => researchLabels[x] || x).join(", ")}. This is a warning, not a stop. Re-run that research or add sources by hand if the work needs more evidence, or record the gap when you approve research and strategy.
          </p>
        )}
      </Step>
      <Step id="strategy-sources" n={2} title="Source review" done={!!accepted.length && !unreviewed.length}>
        <p className="f-small">{publicSources.length ? `${accepted.length} accepted, ${unreviewed.length} waiting for review, ${publicSources.length - accepted.length - unreviewed.length} rejected.` : "Sources appear here when research has run."} Insights can only use accepted sources.</p>
        {operator && !closed && unreviewed.length > 0 && (
          <div className="f-actions">
            <button type="button" className="f-button" disabled={busy} onClick={() => setQueue("sources")}>Review one by one</button>
            <button type="button" className="f-button secondary" disabled={busy} onClick={() => { if (window.confirm(`Accept all ${unreviewed.length} unreviewed sources as evidence without reading each one? This is logged under your name.`)) void command({ type: "reviewAllSources", confirm: true }, `${unreviewed.length} sources accepted.`); }}>
              Accept all {unreviewed.length} unreviewed sources
            </button>
          </div>
        )}
      </Step>
      <Step id="strategy-insights" n={3} title="Insights" done={!!insights.length && !drafts.length}>
        {insights.length ? <ul className="f-small">{insights.map((i) => <li key={i.id}><strong>{i.title}</strong> <Tag>{i.confidence}</Tag></li>)}</ul> : <p className="f-small">No accepted insight yet. Gate 2 needs at least one.</p>}
        {operator && !closed && (
          <>
            <div className="f-actions">
              <button type="button" className="f-button" disabled={busy || !aiReady || !p.aiAuthorised || !accepted.length} onClick={() => onAi("insights")}><Sparkles size={15} aria-hidden="true" /> Draft insights with AI</button>
              {drafts.length > 0 && <button type="button" className="f-button secondary" disabled={busy} onClick={() => setQueue("insights")}>Review {drafts.length} draft insight{drafts.length === 1 ? "" : "s"}</button>}
            </div>
            {!aiReady && <p className="f-small">AI drafting is not configured; write insights by hand below.</p>}
            <details><summary>Write an insight by hand</summary><InsightEditor p={p} busy={busy} command={command} /></details>
          </>
        )}
      </Step>
      <div id="strategy-audiences">
        <h3 className="f-studio-subhead"><span className="f-step-no">4</span> Strapline and audiences</h3>
        <CampaignPlan key={p.revision} p={p} operator={operator && !closed} busy={busy} command={command} aiReady={aiReady} onAiAudiences={() => onAi("audiences")} fixedFormat={`${formatNames(p.brief.requestedFormats).join(", ")}, fixed by the ${offer.label}.`} />
      </div>
      {operator && (
        <div id="strategy-ideas">
          <h3 className="f-studio-subhead"><span className="f-step-no">5</span> Ideas</h3>
          <Ideas p={p} operator={operator} busy={busy || !!closed} command={command} aiReady={aiReady && !closed} onAi={() => onAi("ideas")} />
        </div>
      )}
      <Step id="strategy-direction" n={6} title="Campaign direction" done={d?.status === "approved"}>
        <p className="f-small">For this offer the direction also frames the work ahead: {framing.framing}</p>
        {d?.status === "approved" && <p className="f-small"><Check size={13} aria-hidden="true" /> Version {d.version} approved{d.approvedBy ? ` by ${d.approvedBy}` : ""}. Approve research and strategy below to open Pre-production.</p>}
      </Step>
      <Direction p={p} operator={operator && !closed} busy={busy} command={command} aiReady={aiReady} onGenerate={onDirection} />
      {operator && queue && <ReviewQueue p={p} kind={queue} busy={busy} command={command} onClose={() => setQueue(null)} />}
    </div>
  );
}
