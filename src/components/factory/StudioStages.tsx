"use client";
import type { ReactNode } from "react";
import { Check, Circle, Clock, Lock, AlertTriangle, Palette, Settings2, ShieldCheck, Bug, ChevronRight } from "lucide-react";
import type { Project, StudioStage } from "@/lib/factory/model";
import { STAGE_BADGE_LABELS, STUDIO_STAGES, STUDIO_STAGE_LABELS, STUDIO_STAGE_STEPS, offerInfo, stageBadge, type StageBadge } from "@/lib/factory/studio";
import { channelNames } from "@/lib/factory/channels";
import { formatNames } from "@/lib/factory/formats";
import { Tag } from "./shared";
import type { Actions } from "./shared";
import GateBar from "./GateBar";
import PieceCard from "./PieceCard";

export type StudioTab = "studio-intake" | "studio-strategy" | "studio-preproduction" | "studio-production" | "studio-settings" | "diagnostics";
export const stageTab = (stage: StudioStage | "delivered"): StudioTab => `studio-${stage === "delivered" ? "production" : stage}` as StudioTab;
export const tabStage = (tab: string): StudioStage | undefined => {
  const s = tab.startsWith("studio-") ? tab.slice(7) : "";
  return (STUDIO_STAGES as readonly string[]).includes(s) ? (s as StudioStage) : undefined;
};
export const STUDIO_TAB_TITLES: Record<StudioTab, string> = {
  "studio-intake": "Stage 1: Client intake and brand memory",
  "studio-strategy": "Stage 2: Creative strategy",
  "studio-preproduction": "Stage 3: Pre-production",
  "studio-production": "Stage 4: Production",
  "studio-settings": "Project settings",
  diagnostics: "Diagnostics",
};
const BADGE_ICON: Record<StageBadge, typeof Lock> = { locked: Lock, in_progress: Circle, waiting_approval: Clock, approved: Check, out_of_date: AlertTriangle };

/**
 * Left sidebar for a studio project: the four stages in order with a status badge, the active one expanded with its steps, then
 * Brand Kit and Project settings, then admin-only Costs and Diagnostics. Extra links (engine pages, admin pages) are passed in.
 */
export function StudioSidebar({ p, tab, go, admin, extra }: { p: Project; tab: string; go: (tab: string, anchor?: string) => void; admin: boolean; extra?: ReactNode }) {
  const s = p.studio!;
  const open = tabStage(tab) || (s.stage === "delivered" ? "production" : s.stage);
  return (
    <>
      <nav aria-label="Studio stages" className="f-stage-nav">
        <ol>
          {STUDIO_STAGES.map((stage, i) => {
            const badge = stageBadge(s, stage);
            const Icon = BADGE_ICON[badge];
            const current = tabStage(tab) === stage;
            return (
              <li key={stage} className={"f-stage-item " + badge + (current ? " active" : "")}>
                <button type="button" className={current ? "active" : ""} aria-current={current ? "page" : undefined} onClick={() => go(stageTab(stage))}>
                  <span className="f-stage-number" aria-hidden="true">{i + 1}</span>
                  <span className="f-stage-label">{STUDIO_STAGE_LABELS[stage]}</span>
                  <span className={"f-stage-badge " + badge}><Icon size={11} aria-hidden="true" /> {STAGE_BADGE_LABELS[badge]}</span>
                </button>
                {open === stage && (
                  <ul className="f-stage-steps" aria-label={`${STUDIO_STAGE_LABELS[stage]} steps`}>
                    {STUDIO_STAGE_STEPS[stage].map((step) => (
                      <li key={step.id}><button type="button" onClick={() => go(stageTab(stage), step.id)}><ChevronRight size={11} aria-hidden="true" /> {step.label}</button></li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        {s.stage === "delivered" && (
          <div className="f-stage-delivered">
            <p><Check size={12} aria-hidden="true" /> Delivered</p>
            <ul className="f-stage-steps" aria-label="Delivered">
              <li><button type="button" onClick={() => go("studio-production", "delivery-pack")}><ChevronRight size={11} aria-hidden="true" /> Delivery pack</button></li>
              <li><button type="button" onClick={() => go("studio-production", "delivery-readback")}><ChevronRight size={11} aria-hidden="true" /> Read-back</button></li>
            </ul>
          </div>
        )}
      </nav>
      <nav aria-label="Project">
        <button type="button" onClick={() => go("studio-intake", "studio-brand-kit")}><Palette size={18} /> Brand Kit</button>
        <button type="button" className={tab === "studio-settings" ? "active" : ""} onClick={() => go("studio-settings")}><Settings2 size={18} /> Project settings</button>
        {admin && <button type="button" className={tab === "admin" ? "active" : ""} onClick={() => go("admin")}><ShieldCheck size={18} /> Costs</button>}
        {admin && <button type="button" className={tab === "diagnostics" ? "active" : ""} onClick={() => go("diagnostics")}><Bug size={18} /> Diagnostics</button>}
      </nav>
      {extra}
    </>
  );
}

const STAGE_PREVIEW: Record<Exclude<StudioStage, "intake">, { intro: string; items: string[] }> = {
  strategy: {
    intro: "Research and the campaign direction for this offer. The producer approves the research (a note is allowed when it is thin), then the strategy is approved.",
    items: ["Research from the brand, customer, competitor, creative and channel agents (public pages only)", "Thin research shown as a warning, not a stop", "Insights, strapline and audiences", "The campaign direction, approved by the producer or the client"],
  },
  preproduction: {
    intro: "Concepts and test frames for the client to approve before production.",
    items: ["Scene Pack: mood boards, scene concepts and test stills", "Hook pack: three narratives, four opening hooks, scripts and keyframes", "Each piece can be edited, marked up, rerun on its own, approved or sent back"],
  },
  production: {
    intro: "The finished pieces, go-to-market checks and the client's final approval, then delivery.",
    items: ["Scene Pack: 25 stills at 4:5 and 1:1 (optional motion loops)", "Hook pack: 12 vertical variants with captions and sound", "Checks: rights, claims, AI disclosure, specs and safe zones, naming and the delivery manifest", "After the client's final approval: the delivery pack, the launch handoff and the performance read-back"],
  },
};
export type StudioStagePageProps = Actions & {
  stage: Exclude<StudioStage, "intake">;
  /** Stage content supplied by pieces B and C. Without it the page explains what will appear here. */
  children?: ReactNode;
  onUpload?: (pieceId: string, file: File) => Promise<boolean> | undefined;
  /** The children already show this stage's pieces (grouped), so the plain piece grid is not repeated. */
  hidePieces?: boolean;
};
/** Stages 2 to 4: content from pieces B and C, the stage's piece cards, then the gate bar. */
export function StudioStagePage({ p, stage, operator, busy, command, children, onUpload, hidePieces }: StudioStagePageProps) {
  const s = p.studio!;
  const preview = STAGE_PREVIEW[stage];
  const pieces = s.pieces.filter((x) => x.stage === stage);
  const status = s.gates[stage].status;
  return (
    <div className="f-studio-stage">
      <section className="f-panel">
        <h2>{STUDIO_STAGE_LABELS[stage]}</h2>
        <p>{preview.intro}</p>
        {status === "locked" && <p className="f-small"><Lock size={13} aria-hidden="true" /> This stage opens when the earlier stages are approved.</p>}
        {!children && (
          <>
            <h3>What will appear here</h3>
            <ul className="f-studio-preview">{preview.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        )}
      </section>
      {children}
      {hidePieces ? null : (
        <section id="studio-pieces" className="f-piece-grid" aria-label="Pieces">
          {pieces.map((piece) => <PieceCard key={piece.id} p={p} piece={piece} operator={operator} busy={busy} command={command} onUpload={onUpload} />)}
        </section>
      )}
      <GateBar p={p} stage={stage} operator={operator} busy={busy} command={command} />
    </div>
  );
}

/** Project settings for a studio project: offer, stage, what gate 1 sends to the research engine and the AI authorisation. */
export function StudioSettings({ p, operator, busy, command }: Actions) {
  const s = p.studio!;
  const offer = offerInfo(s.offer)!;
  const rows: [string, ReactNode][] = [
    ["Offer", offer.label],
    ["Current stage", s.stage === "delivered" ? "Delivered" : STUDIO_STAGE_LABELS[s.stage]],
    ["Intake version", String(s.briefVersion)],
    ["Approval contact", s.brief.client.approverName ? `${s.brief.client.approverName} (${s.brief.client.approverEmail})` : s.brief.client.approverEmail || "Not supplied"],
    ["Launch channels", p.channels?.length ? channelNames(p.channels).join(", ") : "Set when the intake is approved"],
    ["Requested formats", formatNames(p.brief.requestedFormats).join(", ") || "Set when the intake is approved"],
  ];
  if (operator) rows.push(["Research agents", p.taskPlan ? p.taskPlan.research.join(", ") : "Planned when the intake is approved"]);
  return (
    <section className="f-panel">
      <h2>Project settings</h2>
      {rows.map(([k, v]) => <div className="f-detail" key={k}><span>{k}</span><p>{v}</p></div>)}
      {operator && (
        <div className="f-detail">
          <span>AI authorisation</span>
          <p>
            {p.aiAuthorised ? <Tag tone="green">Authorised for this brief</Tag> : <Tag tone="orange">Not authorised</Tag>}{" "}
            {p.aiAuthorised
              ? <button type="button" className="f-button secondary small" disabled={busy} onClick={() => void command({ type: "revokeAI" }, "AI authorisation revoked")}>Revoke</button>
              : <button type="button" className="f-button small" disabled={busy} onClick={() => { if (window.confirm("Confirm the brief is PUBLIC information that may be sent to the configured AI providers.")) void command({ type: "authoriseAI", confirm: true }, "AI authorised for this brief"); }}>Authorise AI for this brief</button>}
          </p>
          <small className="f-small">Approving the intake maps it onto the research brief. If that changes the brief, the authorisation is revoked and must be given again.</small>
        </div>
      )}
    </section>
  );
}
