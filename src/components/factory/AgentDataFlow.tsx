"use client";
import type { agentsOverview } from "@/lib/factory/ai-agents";

type Agent = Awaited<ReturnType<typeof agentsOverview>>["agents"][number];

// Layout: providers across the top, agents in the middle, storage at the bottom.
const W = 980;
const AGENT_Y = 190;
const AGENT_W = 118;
const AGENT_H = 58;
const lane: { id: string; label: string; x: number }[] = [
  { id: "research:brand", label: "Brand", x: 10 },
  { id: "research:customer", label: "Customer", x: 140 },
  { id: "research:competitor", label: "Competitor", x: 270 },
  { id: "research:creative", label: "Creative", x: 400 },
  { id: "synthesis:insights", label: "Insights", x: 560 },
  { id: "synthesis:strategy", label: "Direction", x: 690 },
  { id: "synthesis:content", label: "Copy pack", x: 820 },
];
const PROVIDER_LABEL: Record<string, string> = { openai: "OpenAI", gemini: "Google Gemini", anthropic: "Anthropic", deepseek: "DeepSeek" };
const mid = (x: number) => x + AGENT_W / 2;

export default function AgentDataFlow({ agents }: { agents: Agent[] }) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const providers: string[] = [...new Set(agents.flatMap((a) => (a.model?.provider ? [String(a.model.provider)] : [])))];
  const provX = (p: string) => 60 + providers.indexOf(p) * (W - 120) / Math.max(1, providers.length - 1 || 1);
  const px = (p: string) => (providers.length === 1 ? W / 2 : provX(p));
  const running = (id: string) => (byId.get(id)?.stats?.inFlight || 0) > 0;
  const handoffs: [string, string][] = [
    ["research:creative", "synthesis:insights"],
    ["synthesis:insights", "synthesis:strategy"],
    ["synthesis:strategy", "synthesis:content"],
  ];
  return (
    <section className="f-panel" aria-label="How the agents pass data to each other and where data is stored">
      <div className="f-section-heading">
        <div>
          <h2>How the agents talk and where data goes</h2>
          <p className="f-small">
            Agents never message each other directly. Each one reads saved results from Firestore, sends a trimmed copy to its AI model, and saves only the parsed answer back. People approve every step between stages.
          </p>
        </div>
      </div>
      <div className="f-flow-scroll">
        <svg className="f-dataflow" viewBox={`0 0 ${W} 440`} role="img" aria-label="Diagram: agents read and write Firestore, call AI providers, and pass work to the next stage only after human approval">
          <defs>
            <marker id="df-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="#64748b" />
            </marker>
          </defs>

          <text x="10" y="18" className="df-band">AI providers (prompt sent, answer returned, not stored by Port67)</text>
          {providers.length === 0 && <text x="10" y="48" className="df-note">No model chosen yet for any agent.</text>}
          {providers.map((p) => (
            <g key={p}>
              <rect x={px(p) - 70} y={28} width={140} height={36} rx={10} className="df-provider" />
              <text x={px(p)} y={51} textAnchor="middle" className="df-label">{PROVIDER_LABEL[p] || p}</text>
            </g>
          ))}
          {lane.map((l) => {
            const a = byId.get(l.id);
            const p = a?.model?.provider ? String(a.model.provider) : "";
            if (!p) return null;
            return <path key={"p" + l.id} d={`M${mid(l.x)} ${AGENT_Y} C ${mid(l.x)} 130, ${px(p)} 110, ${px(p)} 64`} className={"df-link df-ai" + (running(l.id) ? " flow" : "")} markerEnd="url(#df-arrow)" />;
          })}

          {handoffs.map(([from, to]) => {
            const a = lane.find((l) => l.id === from)!;
            const b = lane.find((l) => l.id === to)!;
            return <line key={from + to} x1={a.x + AGENT_W} y1={AGENT_Y + AGENT_H / 2} x2={b.x} y2={AGENT_Y + AGENT_H / 2} className="df-link df-hand" markerEnd="url(#df-arrow)" />;
          })}
          {/* Human gates sit between stages */}
          {[{ x: 520, t: "Producer reviews sources" }, { x: 650, t: "Accept insights" }, { x: 780, t: "Customer approves direction" }].map((g) => (
            <g key={g.t}>
              <circle cx={g.x} cy={AGENT_Y + AGENT_H / 2} r={9} className="df-gate" />
              <text x={g.x} y={AGENT_Y + AGENT_H + 24} textAnchor="middle" className="df-note">{g.t}</text>
            </g>
          ))}

          {lane.map((l) => {
            const a = byId.get(l.id);
            const on = running(l.id);
            return (
              <g key={l.id} className={on ? "df-on" : ""}>
                <rect x={l.x} y={AGENT_Y} width={AGENT_W} height={AGENT_H} rx={12} className={"df-agent" + (on ? " running" : a?.model ? "" : " unset")} />
                <text x={mid(l.x)} y={AGENT_Y + 22} textAnchor="middle" className="df-label">{l.label}</text>
                <text x={mid(l.x)} y={AGENT_Y + 40} textAnchor="middle" className="df-model">{a?.model?.model ? a.model.model.slice(0, 18) : "no model"}</text>
              </g>
            );
          })}

          {/* Reads and writes to storage */}
          {lane.map((l) => (
            <path key={"w" + l.id} d={`M${mid(l.x)} ${AGENT_Y + AGENT_H} L ${mid(l.x)} 330`} className={"df-link df-store" + (running(l.id) ? " flow" : "")} markerEnd="url(#df-arrow)" />
          ))}
          <rect x={10} y={330} width={W - 20} height={50} rx={12} className="df-store-box" />
          <text x={W / 2} y={352} textAnchor="middle" className="df-label">Firestore (server only)</text>
          <text x={W / 2} y={370} textAnchor="middle" className="df-note">Sources and findings, insights, directions, copy packs, run records, usage counters, brief snapshot</text>
          <rect x={10} y={394} width={300} height={36} rx={10} className="df-store-box" />
          <text x={160} y={417} textAnchor="middle" className="df-label">Firebase Storage: rendered MP4 files</text>
          <text x={330} y={417} className="df-note">Not stored anywhere: prompts and raw model responses. OpenAI is asked not to retain requests (store off); other providers follow their account terms.</text>
        </svg>
      </div>
      <ul className="f-small f-legend">
        <li><strong>Solid blue line:</strong> a call to an AI model.</li>
        <li><strong>Grey arrow:</strong> work handed to the next stage once a person approves.</li>
        <li><strong>Down arrow:</strong> saved to Firestore. Moving dashes mean the agent is running now.</li>
      </ul>
    </section>
  );
}
