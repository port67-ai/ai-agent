"use client";
import { Activity, Bell, Bot, Building2, Clapperboard, Cloud, Compass, Database, Download, FileText, Film, Globe, HardDrive, LayoutDashboard, PenLine, Palette, Search, Send, Share2, ShieldCheck, Sparkles, Target, UserCheck, Users } from "lucide-react";
import { useRef, useState, type ComponentType, type MouseEvent } from "react";
import { edgeTip, usd, type Tip } from "./edge-tip";
import type { agentsOverview } from "@/lib/factory/ai-agents";

type Overview = Awaited<ReturnType<typeof agentsOverview>>;
type Agent = Overview["agents"][number];
type Flow = Overview["flow"];
type Icon = ComponentType<{ size?: number; x?: number; y?: number; color?: string; strokeWidth?: number }>;

const W = 1100;
const COLS = [30, 244, 458, 672];
const NW = 190;
const PROVIDERS: { id: string; label: string; color: string }[] = [
  { id: "openai", label: "OpenAI", color: "#34d399" },
  { id: "gemini", label: "Google Gemini", color: "#60a5fa" },
  { id: "anthropic", label: "Anthropic", color: "#fb923c" },
  { id: "deepseek", label: "DeepSeek", color: "#f472b6" },
];
const COLOR = { input: "#22d3ee", agent: "#a78bfa", producer: "#f97316", store: "#34d399", gate: "#fbbf24", mon: "#60a5fa", out: "#94a3b8", bad: "#f87171" };
const AGENT_ICON: Record<string, Icon> = {
  "scope:business": Compass, "research:brand": Building2, "research:customer": Users, "research:competitor": Target, "research:creative": Palette,
  "synthesis:insights": Search, "synthesis:strategy": Sparkles, "synthesis:content": PenLine,
  "review:scope": Compass, "review:sources": ShieldCheck, "review:insights": Search, "review:direction": Sparkles,
};
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const secs = (ms?: number) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

type NodeProps = { x: number; y: number; w?: number; h: number; color: string; icon: Icon; title: string; lines?: string[]; pill?: { text: string; color: string }; state?: "running" | "blocked" | "failed" | "idle" | ""; badge?: string; dashed?: boolean; id?: string; onSelect?: () => void; onHover?: (e: MouseEvent<SVGGElement>) => void; onLeave?: () => void; hint?: string };
function Node({ x, y, w = NW, h, color, icon: I, title, lines = [], pill, state = "", badge, dashed, id, onSelect, onHover, onLeave, hint }: NodeProps) {
  const stroke = state === "failed" ? COLOR.bad : state === "blocked" ? COLOR.gate : color;
  return (
    <g
      className={"sm-node" + (state ? " " + state : "") + (onSelect ? " sm-clickable" : "")}
      data-node={id}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `${title}: ${hint || "choose model"}` : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect()) : undefined}
      onMouseMove={onHover}
      onMouseLeave={onLeave}
    >
      <rect x={x} y={y} width={w} height={h} rx={14} className="sm-box" stroke={stroke} fill={stroke} strokeDasharray={dashed || state === "idle" ? "5 4" : undefined} />
      <I size={20} x={x + 12} y={y + 10} color={stroke} strokeWidth={1.8} />
      <text x={x + 40} y={y + 25} className="sm-title">{short(title, Math.floor((w - 50) / 7.2))}</text>
      {pill && (
        <g>
          <rect x={x + 12} y={y + 38} width={w - 24} height={20} rx={10} className="sm-pill" stroke={pill.color} />
          <text x={x + w / 2} y={y + 52} textAnchor="middle" className="sm-pilltext" fill={pill.color}>{short(pill.text, 26)}</text>
        </g>
      )}
      {lines.map((l, i) => (
        <text key={i} x={x + w / 2} y={y + (pill ? 76 : 48) + i * 15} textAnchor="middle" className="sm-sub">{short(l, Math.floor(w / 6.3))}</text>
      ))}
      {badge && (
        <g>
          <rect x={x + w - 78} y={y - 9} width={72} height={18} rx={9} className={"sm-badge " + state} />
          <text x={x + w - 42} y={y + 4} textAnchor="middle" className="sm-badgetext">{badge}</text>
        </g>
      )}
    </g>
  );
}
function Bar({ y, title, sub, x = 30, w = 832 }: { y: number; title: string; sub: string; x?: number; w?: number }) {
  return (
    <g className="sm-node" data-node={"store-" + title}>
      <rect x={x} y={y} width={w} height={46} rx={12} className="sm-box" stroke={COLOR.store} fill={COLOR.store} />
      <Database size={20} x={x + 14} y={y + 13} color={COLOR.store} strokeWidth={1.8} />
      <text x={x + 46} y={y + 20} className="sm-title">{title}</text>
      <text x={x + 46} y={y + 36} className="sm-sub left">{sub}</text>
    </g>
  );
}
function Link({ d, color, live = false, dim = false, hot = false, label, lx, ly, warn }: { d: string; color: string; live?: boolean; dim?: boolean; hot?: boolean; label?: string; lx?: number; ly?: number; warn?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={dim ? 1.2 : 1.8} strokeDasharray={live || dim ? "6 5" : undefined} className={"sm-link" + (live ? " flow" : "") + (dim ? " dim" : "") + (hot ? " hot" : "")} markerEnd={"url(#sm-" + (dim ? "dim" : "arrow") + ")"} />
      {label && lx !== undefined && ly !== undefined && <text x={lx} y={ly} className={"sm-edge" + (warn ? " warn" : "")}>{label}</text>}
    </g>
  );
}

export default function SystemMap({ agents, flow, onSelectAgent }: { agents: Agent[]; flow: Flow; onSelectAgent?: (id: string) => void }) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const showAt = (id: string, clientX: number, clientY: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    setHover({ id, x: Math.max(4, Math.min(clientX - r.left + 14, r.width - 296)), y: Math.max(4, clientY - r.top + 14) });
  };
  const tipFor = (id: string): Tip | null => {
    const a = byId.get(id);
    return a ? edgeTip(a.name, a.model?.model ? { provider: String(a.model.provider), model: a.model.model } : undefined, flow.edges.filter((e) => e.agent === id), flow.errors?.[id]) : null;
  };
  const P = flow.pipeline;
  const edgesFor = (id: string) => flow.edges.filter((e) => e.agent === id);
  const provColor = (id?: string) => PROVIDERS.find((p) => p.id === id)?.color || COLOR.out;
  // The LLM column starts below the producer orchestrator and its three right-hand reviewers; the scope reviewer sits in the scoping band.
  const providerY: Record<string, number> = { openai: 602, gemini: 740, anthropic: 850, deepseek: 960 };
  const PX = 906;
  const PW = 170;
  const PH = 74;

  // Agent positions (each row is a lane of the journey).
  const place: Record<string, { x: number; y: number }> = {
    "scope:business": { x: COLS[0], y: 150 },
    "research:brand": { x: COLS[0], y: 300 },
    "research:customer": { x: COLS[1], y: 300 },
    "research:competitor": { x: COLS[2], y: 300 },
    "research:creative": { x: COLS[3], y: 300 },
    "synthesis:insights": { x: COLS[1], y: 590 },
    "synthesis:strategy": { x: COLS[3], y: 590 },
    "synthesis:content": { x: COLS[1], y: 840 },
  };
  const AH = 104;
  const lane: Record<string, number> = {};
  let k = 0;
  const agentNode = (id: string) => {
    const a = byId.get(id);
    const pos = place[id];
    if (!a || !pos) return null;
    const es = edgesFor(id);
    const stat = a.stats!;
    const running = stat.inFlight > 0;
    const failed = stat.lastStatus ? stat.lastStatus === "failed" || stat.lastStatus === "unknown" : stat.failed + stat.unknown > 0;
    const earlier = stat.failed + stat.unknown;
    const unpriced = es.some((e) => e.unpriced > 0);
    const state = running ? "running" : failed ? "failed" : !a.model ? "idle" : stat.calls === 0 ? "idle" : "";
    const lat = es.map((e) => e.avgLatencyMs).filter((n): n is number => n !== undefined);
    const avg = lat.length ? Math.round(lat.reduce((x, y) => x + y, 0) / lat.length) : undefined;
    return (
      <Node key={id} id={id} x={pos.x} y={pos.y} h={AH} color={COLOR.agent} icon={AGENT_ICON[id] || Sparkles} title={a.name.replace(" researcher", "")}
        pill={a.model ? { text: `${a.model.provider} · ${a.model.model}`, color: provColor(a.model.provider) } : { text: "No model chosen yet", color: COLOR.gate }}
        lines={[stat.calls ? `${stat.calls} call${stat.calls === 1 ? "" : "s"} · ${unpriced ? "cost unknown" : usd(stat.estimatedMicroUsd)}${avg ? " · " + secs(avg) : ""}` : "No calls yet", running ? "Running now" : failed ? `Last call failed (${earlier} in total)` : stat.calls ? (earlier ? `Healthy now · ${earlier} earlier failed` : "Healthy") : a.model ? "Idle: no data has flowed" : onSelectAgent ? "Click to choose a model" : "Cannot run"]}
        state={state as NodeProps["state"]} badge={running ? "RUNNING" : failed ? "FAILED" : undefined}
        onSelect={onSelectAgent ? () => onSelectAgent(id) : undefined} hint={a.model ? "change model" : "choose a model"}
        onHover={(e) => showAt(id, e.clientX, e.clientY)} onLeave={() => setHover(null)} />
    );
  };
  // API connector from an agent to the provider it uses, routed along its own lane so lines do not merge.
  const apiLink = (id: string) => {
    const a = byId.get(id);
    const pos = place[id];
    if (!a?.model || !pos) return null;
    const prov = String(a.model.provider);
    const py = providerY[prov];
    if (py === undefined) return null;
    const stat = a.stats!;
    const idx = (lane[id] = k++);
    const x0 = pos.x + 34;
    const y0 = pos.y + AH;
    const ly = y0 + 14 + (idx % 4) * 8;
    const gx = 868 + idx * 4;
    const ty = py + 18 + (idx % 4) * 11;
    const d = `M${x0} ${y0} L${x0} ${ly} L${gx} ${ly} L${gx} ${ty} L${PX - 2} ${ty}`;
    const tip = tipFor(id);
    return (
      <g key={"api-" + id} className={hover?.id === "edge:" + id ? "sm-hot" : ""}>
        <Link d={d} color={provColor(prov)} live={stat.inFlight > 0} dim={stat.calls === 0} hot={hover?.id === "edge:" + id} label={stat.calls ? `${stat.calls} · ${edgesFor(id).some((e) => e.unpriced > 0) ? "cost ?" : usd(stat.estimatedMicroUsd)}` : ""} lx={x0 + 8} ly={ly - 3} warn={stat.lastStatus ? stat.lastStatus === "failed" || stat.lastStatus === "unknown" : stat.failed + stat.unknown > 0} />
        <path d={d} className="sm-hit" tabIndex={0} role="img" aria-label={tip?.summary} data-edge={id}
          onMouseMove={(e) => showAt("edge:" + id, e.clientX, e.clientY)} onMouseLeave={() => setHover(null)}
          onFocus={(e) => { const b = e.currentTarget.getBoundingClientRect(); showAt("edge:" + id, b.left + b.width / 2, b.top + b.height / 2); }} onBlur={() => setHover(null)} />
      </g>
    );
  };
  // A producer reviewer: purple like every agent, model or free checks, calls and cost, click to choose its model.
  const reviewNode = (rid: string, x: number, y: number, w: number, h: number, waiting = 0, extra = "") => {
    const a = byId.get(rid);
    if (!a) return null;
    const stat = a.stats!;
    const running = stat.inFlight > 0;
    const failed = stat.lastStatus ? stat.lastStatus === "failed" || stat.lastStatus === "unknown" : false;
    return (
      <Node id={rid} x={x} y={y} w={w} h={h} color={COLOR.producer} icon={AGENT_ICON[rid] || Sparkles} title={REVIEW_TITLE[rid]}
        pill={a.model ? { text: `${a.model.provider} · ${a.model.model}`, color: provColor(a.model.provider) } : { text: "Free checks only", color: COLOR.gate }}
        lines={[stat.calls ? `${stat.calls} call${stat.calls === 1 ? "" : "s"} · ${edgesFor(rid).some((e) => e.unpriced > 0) ? "cost unknown" : usd(stat.estimatedMicroUsd)}` : "Sees only its own inputs", ...(h > 90 && extra ? [extra] : [])]}
        state={running ? "running" : failed ? "failed" : waiting > 0 ? "blocked" : ""} badge={running ? "RUNNING" : failed ? "FAILED" : waiting > 0 ? `${waiting} WAITING` : undefined}
        onSelect={onSelectAgent ? () => onSelectAgent(rid) : undefined} hint={a.model ? "change model" : "choose a model"}
        onHover={(e) => showAt(rid, e.clientX, e.clientY)} onLeave={() => setHover(null)} />
    );
  };
  // Verdicts flow from an in-flow reviewer, along the free channel under its row, up the producer bus into the orchestrator.
  const verdictLink = (x: number, y: number) => <Link d={`M${x} ${y} L${x} 718 L1090 718 L1090 196 L${PX + PW} 196`} color={COLOR.producer} dim={!PR.reviews} />;
  const total = flow.models.reduce((n, m) => n + m.microUsd, 0);
  const calls = flow.models.reduce((n, m) => n + m.calls, 0);
  const failedCalls = flow.models.reduce((n, m) => n + (m.failed || 0) + (m.unknown || 0), 0);
  const H = 1590;
  const waiting = P.waiting;
  const insightGate = waiting.insightReview;
  const gateState = (n: number) => (n > 0 ? "blocked" : "");
  const gateBadge = (n: number) => (n > 0 ? `${n} WAITING` : undefined);
  const researchIds = ["research:brand", "research:customer", "research:competitor", "research:creative"];
  const columnIds = ["review:direction"];
  const REVIEW_TITLE: Record<string, string> = { "review:scope": "Scope review", "review:sources": "Source review", "review:insights": "Insight review", "review:direction": "Direction review" };
  const PR = P.producer || { passes: 0, reviews: 0, byAi: 0, byRules: 0, holds: 0, pending: 0 };
  const ids = ["scope:business", ...researchIds, "synthesis:insights", "synthesis:strategy", "synthesis:content"];
  const S = P.scopes || { classified: 0, ai: 0, template: 0, manual: 0, stale: 0, byCategory: {} };
  const top = Object.entries(S.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k.replace(/_/g, " ")} ${n}`).join(" · ");
  const DY = 150;
  return (
    <section className="f-panel f-systemmap" aria-label="System map: how every agent, store, form and API connection fits together">
      <div className="f-section-heading">
        <div>
          <h2>How data flows through Port67</h2>
          <p className="f-small">Every line between a form, agent, store or model is a real call or write. Hover a line to see its calls, tokens and cost; click an agent to choose its model. Line colour is the provider; moving dashes mean a call is running now; faint dashes mean nothing has flowed yet; amber means a person is blocking the next step.</p>
        </div>
      </div>
      <div className="sm-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
      <div className="f-flow-scroll">
        <svg className="sm-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of forms, AI agents with their models, Firestore stores, LLM API connections, human gates, monitoring and outputs">
          <defs>
            <marker id="sm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></marker>
            <marker id="sm-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></marker>
          </defs>
          <rect x="0" y="0" width={W} height={H} className="sm-bg" />
          <text x={W / 2} y="38" textAnchor="middle" className="sm-heading">Port67 agent system: data in, data out</text>

          <text x="30" y="78" className="sm-band">1 · INPUTS</text>
          <Node id="form-brief" x={COLS[0]} y={90} h={64} color={COLOR.input} icon={FileText} title="Business brief" lines={["Account owner form"]} />
          <Node id="form-channels" x={COLS[1]} y={90} h={64} color={COLOR.input} icon={Share2} title="Launch channels" lines={[`${P.channelsChosen} of ${P.projects} projects chosen`]} />
          <Node id="form-request" x={COLS[2]} y={90} h={64} color={COLOR.input} icon={Send} title="Request research" lines={[`${P.researchRequested} requested`]} />
          <Node id="producer-start" x={COLS[3]} y={90} h={64} color={COLOR.gate} icon={UserCheck} title="Producer start" lines={[P.waiting.producerStart ? `${P.waiting.producerStart} waiting` : "Authorise and start"]} state={gateState(P.waiting.producerStart) as NodeProps["state"]} badge={gateBadge(P.waiting.producerStart)} />
          {COLS.map((x, i) => <Link key={"in" + i} d={`M${x + NW / 2} 154 L${x + NW / 2} 196`} color={COLOR.input} />)}
          <Bar y={198} title="Firestore · project record" sub={`${P.projects} projects · ${P.consented} authorised · ${P.researchRequested} research requests · ${S.classified} classified`} />
          <Link d={`M${COLS[0] + NW / 2} 244 L${COLS[0] + NW / 2} 298`} color={COLOR.store} label="reads brief and channels" lx={COLS[0] + NW / 2 + 8} ly={276} />

          {/* Everything below sits in a group moved down to make room for the scoping band. */}
          <g transform={`translate(0 ${DY})`}>
          <text x="30" y="136" className="sm-band">2 · SCOPING</text>
          {agentNode("scope:business")}
          <Link d={`M${COLS[0] + NW} 202 L${COLS[1] - 2} 202`} color={COLOR.agent} dim={!S.classified} />
          <Node id="store-scope" x={COLS[1]} y={150} w={COLS[2] + NW - COLS[1]} h={AH} color={COLOR.store} icon={Database} title="Firestore · classification and scope"
            lines={[`${S.classified} classified · ${S.ai} AI · ${S.template} template · ${S.manual} edited${S.stale ? " · " + S.stale + " stale" : ""}`, top || "No business classified yet", "Read by: research agents, preparation panel, dossier, GET /scope"]} />
          <Link d={`M${COLS[2] + NW} 202 L${COLS[3] - 2} 202`} color={COLOR.producer} dim={!PR.reviews} />
          {reviewNode("review:scope", COLS[3], 150, NW, AH, 0, "Checks scope before research")}
          <Link d={`M${COLS[3] + NW} 198 L${PX - 2} 198`} color={COLOR.producer} dim={!PR.reviews} label="verdicts" lx={COLS[3] + NW + 6} ly={190} />
          <Link d={`M${COLS[0] + NW / 2} ${150 + AH} L${COLS[0] + NW / 2} 298`} color={COLOR.store} dim={!S.classified} />
          {[1, 2].map((i) => <Link key={"sc" + i} d={`M${COLS[i] + NW / 2} ${150 + AH} L${COLS[i] + NW / 2} 298`} color={COLOR.store} dim={!S.classified} label={i === 1 ? "scoped questions" : undefined} lx={COLS[i] + NW / 2 + 8} ly={286} />)}
          <Link d={`M${COLS[3] + NW / 2} ${150 + AH} L${COLS[3] + NW / 2} 298`} color={COLOR.producer} dim={!PR.reviews} />

          <text x="30" y="286" className="sm-band">3 · RESEARCH</text>
          {researchIds.map(agentNode)}
          {COLS.map((x, i) => <Link key={"wr" + i} d={`M${x + NW - 34} ${300 + AH} L${x + NW - 34} 470`} color={COLOR.store} dim={!(byId.get(researchIds[i])?.stats?.calls)} label={i === 0 ? "cited findings" : undefined} lx={x + NW - 26} ly={452} />)}
          <Bar y={472} title="Firestore · sources and findings" sub={`${P.sources.total} sources · ${P.sources.findings} claim-level findings · ${P.gaps} gaps · ${P.sources.unreviewed} unreviewed`} />

          <text x="30" y="568" className="sm-band">4 · REVIEW</text>
          <Link d={`M${COLS[0] + NW / 2} 518 L${COLS[0] + NW / 2} 588`} color={waiting.sourceReview ? COLOR.gate : COLOR.store} dim={!P.sources.total} />
          {reviewNode("review:sources", COLS[0], 590, NW, AH, waiting.sourceReview, `${P.sources.supported} supported · ${P.sources.rejected} rejected`)}
          {verdictLink(COLS[0] + NW / 2, 590 + AH)}
          <Link d={`M${COLS[0] + NW} 642 L${COLS[1] - 2} 642`} color={COLOR.gate} dim={!P.sources.supported} />
          {agentNode("synthesis:insights")}
          <Link d={`M${COLS[1] + NW} 642 L${COLS[2] - 2} 642`} color={COLOR.agent} dim={!P.insights.total} />
          {reviewNode("review:insights", COLS[2], 590, NW, AH, insightGate, `${P.insights.reviewed} accepted · ${P.insights.draft} draft`)}
          {verdictLink(COLS[2] + NW / 2, 590 + AH)}
          <Link d={`M${COLS[2] + NW} 642 L${COLS[3] - 2} 642`} color={COLOR.gate} dim={!P.insights.reviewed} />
          {agentNode("synthesis:strategy")}
          <Link d={`M${COLS[1] + NW - 34} ${590 + AH} L${COLS[1] + NW - 34} 742`} color={COLOR.store} dim={!P.insights.total} />
          <Link d={`M${COLS[3] + NW - 34} ${590 + AH} L${COLS[3] + NW - 34} 742`} color={COLOR.store} dim={!P.directions.total} />
          <Bar y={744} title="Firestore · insights and direction" sub={`${P.insights.total} insights · ${P.directions.total} direction versions · ${P.directions.shared} shared · ${P.directions.approved} approved`} />

          <text x="30" y="816" className="sm-band">5 · APPROVAL</text>
          <Link d={`M${COLS[0] + NW / 2} 790 L${COLS[0] + NW / 2} 838`} color={waiting.directionApproval ? COLOR.gate : COLOR.store} dim={!P.directions.total} />
          <Node id="gate-3" x={COLS[0]} y={840} h={AH} color={COLOR.gate} icon={ShieldCheck} title="Approve direction" lines={["Gate 3 · customer", `${P.directions.approved} approved`]} state={gateState(waiting.directionApproval) as NodeProps["state"]} badge={gateBadge(waiting.directionApproval)} />
          <Link d={`M${COLS[0] + NW} 892 L${COLS[1] - 2} 892`} color={COLOR.gate} dim={!P.directions.approved} />
          {agentNode("synthesis:content")}
          <Link d={`M${COLS[1] + NW} 892 L${COLS[2] - 2} 892`} color={COLOR.agent} dim={!P.copyPacks} />
          <Node id="production" x={COLS[2]} y={840} h={AH} color={COLOR.agent} icon={Clapperboard} title="Production agents" lines={["Templates, no AI model", `${P.storyboards} storyboards · ${P.copyPacks} copy packs`]} />
          <Link d={`M${COLS[2] + NW} 892 L${COLS[3] - 2} 892`} color={COLOR.agent} dim={!P.storyboards} />
          <Node id="gate-5" x={COLS[3]} y={840} h={AH} color={COLOR.gate} icon={ShieldCheck} title="Review and approve" lines={["Gates 4, 5 · human", `${P.assetsApproved} approved`]} state={gateState(waiting.assetApproval) as NodeProps["state"]} badge={gateBadge(waiting.assetApproval)} />
          <Link d={`M${COLS[3] + NW / 2} ${840 + AH} L${COLS[3] + NW / 2} 1002`} color={COLOR.store} dim={!P.assetsApproved} />
          <Bar y={1004} title="Firestore · copy, storyboards and approvals" sub={`${P.copyPacks} copy packs · ${P.storyboards} storyboards · ${P.assetsApproved} approved assets`} />

          <text x="30" y="1076" className="sm-band">6 · OUTPUT</text>
          <Link d={`M${COLS[0] + NW / 2} 1050 L${COLS[0] + NW / 2} 1098`} color={COLOR.store} dim={!P.assetsApproved} />
          <Node id="video" x={COLS[0]} y={1100} h={80} color={COLOR.agent} icon={Film} title="Video render" lines={["Optional · 480p draft", `${P.videos} rendered`]} />
          <Link d={`M${COLS[0] + NW} 1140 L${COLS[1] - 2} 1140`} color={COLOR.store} dim={!P.videos} />
          <Node id="mp4-store" x={COLS[1]} y={1100} h={80} color={COLOR.store} icon={HardDrive} title="Firebase Storage" lines={["MP4 files only", "Not in Firestore"]} />
          <Link d={`M${COLS[1] + NW} 1140 L${COLS[2] - 2} 1140`} color={COLOR.out} dim={!P.assetsApproved} />
          <Node id="download" x={COLS[2]} y={1100} h={80} color={COLOR.out} icon={Download} title="Download assets" lines={["Approved only"]} />
          <Link d={`M${COLS[2] + NW} 1140 L${COLS[3] - 2} 1140`} color={COLOR.out} dim={!P.assetsApproved} />
          <Node id="publish" x={COLS[3]} y={1100} h={80} color={COLOR.out} icon={Globe} title="Publish yourself" lines={["Outside Port67", "Port67 never posts"]} dashed />

          {/* Producer orchestrator: drawn like an LLM at the top of the LLM column, but it is a rules-only agent that steers its four reviewers. */}
          <text x={PX} y={136} className="sm-band">PRODUCER AGENT</text>
          <Node id="producer-orchestrator" x={PX} y={150} w={PW} h={96} color={COLOR.producer} icon={Bot} title="Orchestrator"
            lines={["Rules only · no model", `${PR.passes} passes · ${PR.reviews} verdicts`, PR.holds ? `${PR.holds} held for a person` : PR.pending ? `${PR.pending} redraft${PR.pending === 1 ? "" : "s"} pending` : "Stops at customer gates"]}
            state={PR.holds ? "blocked" : ""} badge={PR.holds ? `${PR.holds} HELD` : undefined} />
          <Link d={`M${COLS[3] + NW - 20} 590 L${COLS[3] + NW - 20} 545 L${PX + PW / 2} 545 L${PX + PW / 2} 350`} color={COLOR.producer} dim={!P.directions.total} label="draft direction" lx={COLS[3] + NW - 12} ly={538} />
          {columnIds.map((rid, i) => {
            const y = 262 + i * 98;
            return (
              <g key={rid}>
                <Link d={`M${PX + PW + 2} ${y + 43} L1090 ${y + 43} L1090 ${196} L${PX + PW} ${196}`} color={COLOR.producer} dim={!PR.reviews} />
                {reviewNode(rid, PX, y, PW, 86, 0)}
              </g>
            );
          })}

          {/* LLM providers: each connector from an agent is one API call path. */}
          <text x={PX} y={586} className="sm-band">LLM APIS (CALLS OUT)</text>
          {PROVIDERS.map((p) => {
            const used = flow.models.filter((m) => m.provider === p.id);
            const c = used.reduce((n, m) => n + m.calls, 0);
            const cost = used.reduce((n, m) => n + m.microUsd, 0);
            const users = agents.filter((a) => a.model?.provider === p.id).length;
            return <Node key={p.id} id={"provider-" + p.id} x={PX} y={providerY[p.id]} w={PW} h={PH} color={p.color} icon={Cloud} title={p.label} lines={[`${users} agent${users === 1 ? "" : "s"} · ${c} calls`, usd(cost)]} state={users === 0 ? "idle" : ""} />;
          })}
          {ids.map(apiLink)}
          {PROVIDERS.map((p, i) => <Link key={"tel" + p.id} d={`M${PX + PW} ${providerY[p.id] + PH / 2} L${1088 - i * 4} ${providerY[p.id] + PH / 2} L${1088 - i * 4} 1280 L${COLS[1] + 62 + 380} 1280`} color={COLOR.mon} dim />)}

          <text x="30" y="1236" className="sm-band">7 · MONITORING</text>
          <Node id="monitoring" x={COLS[1] + 60} y={1240} w={380} h={80} color={COLOR.mon} icon={Activity} title="Monitoring · API call ledger" lines={[`${calls} calls · ${usd(total)} estimated`, `${failedCalls} failed or unknown`]} />
          {[COLS[0] + NW / 2, COLS[1] + 250, COLS[3] + NW / 2].map((x, i) => <Link key={"mo" + i} d={`M${COLS[1] + 250} 1320 L${COLS[1] + 250} 1344 L${x} 1344 L${x} 1366`} color={COLOR.mon} />)}
          <Node id="out-dash" x={COLS[0]} y={1368} h={56} color={COLOR.mon} icon={LayoutDashboard} title="Dashboards" lines={["Private API costs"]} />
          <Node id="out-alerts" x={COLS[1] + 155} y={1368} h={56} color={flow.blockers.some((b) => b.level !== "idle") ? COLOR.gate : COLOR.mon} icon={Bell} title="Alerts" lines={[`${flow.blockers.filter((b) => b.level !== "idle").length} blocked or failed`]} />
          <Node id="out-trouble" x={COLS[3]} y={1368} h={56} color={COLOR.mon} icon={Search} title="Troubleshooting" lines={["Recent calls, below"]} />
          </g>
        </svg>
      </div>
      {hover && (() => {
        const t = tipFor(hover.id.replace(/^edge:/, ""));
        return t ? (
          <div className="sm-tip" role="tooltip" style={{ left: hover.x, top: hover.y }}>
            <strong>{t.title}</strong>
            <dl>{t.rows.map((r) => (<><dt key={"k" + r.label}>{r.label}</dt><dd key={"v" + r.label} className={r.warn ? "warn" : ""}>{r.value}</dd></>))}</dl>
          </div>
        ) : null;
      })()}
      </div>
      <ul className="f-legend sm-legend">
        <li><i style={{ background: COLOR.input }} /> Input form</li>
        <li><i style={{ background: COLOR.agent }} /> AI or template agent</li>
        <li><i style={{ background: COLOR.producer }} /> Producer: orchestrator and its four reviewers</li>
        <li><i style={{ background: COLOR.store }} /> Stored in Firestore or Storage</li>
        <li><i style={{ background: COLOR.gate }} /> Human gate, amber when blocking</li>
        <li><i style={{ background: COLOR.mon }} /> Monitoring</li>
        <li><i style={{ background: COLOR.bad }} /> Failed or unknown</li>
      </ul>
      <p className="f-small">Stored in Firestore: the business classification and each agent\u2019s question list (saved on the project, versioned, readable at any time), parsed results, usage counters, run records and the brief snapshot. Passed on without storing: prompts and raw model responses (OpenAI is asked not to retain requests; other providers follow their account terms). The producer orchestrator (top right, drawn like a model but rules only, with no cost of its own) steers the four producer reviewers (scope in the scoping band, the others beneath it): each sees only its own inputs, sends work back for at most one redraft, and then hands over to a person. It runs the steps in bands 4 and 5, audits every step on the project, and stops at the two customer gates: direction approval and asset approval. Port67 never posts to a channel.</p>
    </section>
  );
}
