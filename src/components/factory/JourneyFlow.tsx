"use client";
import type { agentsOverview } from "@/lib/factory/ai-agents";

type Agent = Awaited<ReturnType<typeof agentsOverview>>["agents"][number];
type Lane = "O" | "P" | "A";
type Kind = "H" | "G" | "A";
type Step = { lane: Lane; kind: Kind; title: string; sub: string; ids?: string[]; group?: string };

// The approved end-to-end journey: who acts, which agents work, and where a human must approve.
export const JOURNEY: Step[] = [
  { lane: "O", kind: "H", title: "Brief and channels", sub: "Request research" },
  { lane: "P", kind: "H", title: "Start research", sub: "Authorise public data" },
  { lane: "A", kind: "A", title: "Research agents (4)", sub: "Cited findings", ids: ["research:brand", "research:customer", "research:competitor", "research:creative"] },
  { lane: "P", kind: "G", title: "Review sources", sub: "Gate 1: mark supported" },
  { lane: "A", kind: "A", title: "Insights agent", sub: "Drafting group", ids: ["synthesis:insights"] },
  { lane: "P", kind: "G", title: "Accept insights", sub: "Gate 2: human check" },
  { lane: "A", kind: "A", title: "Direction agent", sub: "Drafting group", ids: ["synthesis:strategy"] },
  { lane: "O", kind: "G", title: "Approve direction", sub: "Gate 3: customer" },
  { lane: "A", kind: "A", title: "Copy pack agent", sub: "Drafting group", ids: ["synthesis:content"] },
  { lane: "A", kind: "A", title: "Production agents", sub: "Templates, no AI cost", group: "production" },
  { lane: "P", kind: "G", title: "Review copy, storyboard", sub: "Gate 4: edit, approve" },
  { lane: "O", kind: "G", title: "Approve copy set", sub: "Gate 5: customer" },
  { lane: "A", kind: "A", title: "Video render", sub: "Optional, 480p default", group: "production" },
  { lane: "O", kind: "H", title: "Download assets", sub: "Approved only" },
  { lane: "O", kind: "H", title: "Publish yourself", sub: "Outside Port67" },
];
const X: Record<Lane, number> = { O: 30, P: 245, A: 460 };
const PITCH = 60;
const Y0 = 60;
const BOX_W = 190;
const BOX_H = 44;

export default function JourneyFlow({ agents }: { agents: Agent[] }) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const members = (s: Step) => (s.ids ? s.ids.map((id) => byId.get(id)).filter((a): a is Agent => !!a) : s.group ? agents.filter((a) => a.group === s.group) : []);
  const state = (s: Step) => {
    const m = members(s);
    const running = m.some((a) => (a.stats?.inFlight || 0) > 0);
    const done = m.some((a) => (a.stats?.calls || 0) > 0);
    const ai = m.filter((a) => a.kind === "ai");
    const unset = ai.length > 0 && ai.some((a) => !a.model);
    const models = [...new Set(ai.flatMap((a) => (a.model?.model ? [a.model.model] : [])))];
    return { running, done, unset, models, ai: ai.length > 0 };
  };
  const sub = (s: Step) => {
    if (s.kind !== "A") return s.sub;
    const st = state(s);
    if (!st.ai) return s.sub;
    if (st.running) return "Running now";
    if (st.unset) return "No model chosen yet";
    return st.models.length > 1 ? `${st.models.length} models` : (st.models[0] || s.sub).slice(0, 26);
  };
  const H = Y0 + (JOURNEY.length - 1) * PITCH + BOX_H + 56;
  const jump = (s: Step) => {
    const first = members(s)[0];
    if (first && typeof document !== "undefined") document.getElementById("agent-" + first.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <section className="f-panel" aria-label="Full journey: who acts, which agents work and where a human must approve">
      <div className="f-section-heading">
        <div>
          <h2>The full journey</h2>
          <p className="f-small">Each AI stage waits for a person. Orange boxes are human approval gates: the next agent cannot run until they are passed. Click an agent to jump to its card and model.</p>
        </div>
      </div>
      <div className="f-flow-scroll">
        <svg className="f-journey" viewBox={`0 0 680 ${H}`} role="img" aria-label="Swimlane: account owner, producer and agents from brief to publishing, with five human approval gates">
          <defs>
            <marker id="jf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {([["O", "Account owner"], ["P", "Producer"], ["A", "AI and template agents"]] as [Lane, string][]).map(([l, t]) => (
            <text key={l} x={X[l] + BOX_W / 2} y={30} textAnchor="middle" className="df-label">{t}</text>
          ))}
          {JOURNEY.slice(0, -1).map((s, i) => {
            const n = JOURNEY[i + 1];
            const x1 = X[s.lane] + BOX_W / 2;
            const x2 = X[n.lane] + BOX_W / 2;
            const y1 = Y0 + i * PITCH + BOX_H;
            const y2 = Y0 + (i + 1) * PITCH - 2;
            const ym = y1 + 8;
            const live = state(n).running;
            const d = x1 === x2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} L${x1} ${ym} L${x2} ${ym} L${x2} ${y2}`;
            return <path key={i} d={d} fill="none" className={"df-link df-hand" + (live ? " flow" : "")} markerEnd="url(#jf-arrow)" />;
          })}
          {JOURNEY.map((s, i) => {
            const y = Y0 + i * PITCH;
            const st = state(s);
            const cls = "jf-box " + (s.kind === "G" ? "gate" : s.kind === "A" ? "agent" : "human") + (st.running ? " running" : "") + (s.kind === "A" && st.unset ? " unset" : "");
            const clickable = s.kind === "A" && members(s).length > 0;
            return (
              <g key={i} onClick={clickable ? () => jump(s) : undefined} style={clickable ? { cursor: "pointer" } : undefined}>
                <rect x={X[s.lane]} y={y} width={BOX_W} height={BOX_H} rx={8} className={cls} />
                <text x={X[s.lane] + BOX_W / 2} y={y + 16} textAnchor="middle" className="jf-title">{s.title}</text>
                <text x={X[s.lane] + BOX_W / 2} y={y + 33} textAnchor="middle" className="jf-sub">{sub(s)}</text>
              </g>
            );
          })}
          <g transform={`translate(30 ${H - 28})`}>
            <rect width="16" height="16" rx="3" className="jf-box human" />
            <text x="24" y="12" className="jf-sub">Human action</text>
            <rect x="140" width="16" height="16" rx="3" className="jf-box gate" />
            <text x="164" y="12" className="jf-sub">Human gate: blocks progress</text>
            <rect x="430" width="16" height="16" rx="3" className="jf-box agent" />
            <text x="454" y="12" className="jf-sub">AI or template agent</text>
          </g>
        </svg>
      </div>
    </section>
  );
}
