"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Building2, CheckCircle2, Clapperboard, Cpu, Loader2, Palette, PenLine, Search, Sparkles, Target, Users } from "lucide-react";
import type { agentsOverview } from "@/lib/factory/ai-agents";

type Overview = Awaited<ReturnType<typeof agentsOverview>>;
type Agent = Overview["agents"][number];
const icons: Record<string, typeof Bot> = {
  "research:brand": Building2, "research:customer": Users, "research:competitor": Target, "research:creative": Palette,
  "synthesis:insights": Search, "synthesis:strategy": Sparkles, "synthesis:content": PenLine, "production.video": Clapperboard,
};
const usd = (micro: number) => "$" + (micro / 1e6).toFixed(micro >= 1e6 ? 2 : 4);
const ago = (iso?: string) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
};
const groups: { id: string; title: string; note: string }[] = [
  { id: "research", title: "Research agents", note: "Search the public web and cite every finding." },
  { id: "drafting", title: "Drafting agents", note: "Write only from reviewed evidence and the approved direction." },
  { id: "production", title: "Production agents", note: "Template builders: no AI model, no AI cost." },
];
// The chain every campaign follows, with the agents that power each step.
const chain: { label: string; agents: string[] }[] = [
  { label: "Research", agents: ["research:brand", "research:customer", "research:competitor", "research:creative"] },
  { label: "Insights", agents: ["synthesis:insights"] },
  { label: "Direction", agents: ["synthesis:strategy"] },
  { label: "Copy pack", agents: ["synthesis:content"] },
  { label: "Production", agents: [] },
];

export default function AiAgents() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/factory/admin/ai-agents", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Request failed");
      setData(body);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);
  if (!data) return <section className="f-panel">{error ? <p className="f-team-error" role="alert">{error}</p> : <p className="f-small">Loading AI agents…</p>}</section>;
  const byId = new Map(data.agents.map((a) => [a.id, a]));
  const flying = (ids: string[]) => ids.some((id) => (byId.get(id)?.stats?.inFlight || 0) > 0);
  const used = (ids: string[]) => ids.some((id) => (byId.get(id)?.stats?.calls || 0) > 0);
  return (
    <>
      <section className="f-panel">
        <div className="f-section-heading">
          <div>
            <h2>Agents at work</h2>
            <p className="f-small" role="status">
              {data.totals.inFlight > 0 ? `${data.totals.inFlight} agent call${data.totals.inFlight === 1 ? " is" : "s are"} running now.` : "No agent is running right now."} {data.totals.calls} recorded call{data.totals.calls === 1 ? "" : "s"}, about {usd(data.totals.estimatedMicroUsd)} estimated.
            </p>
          </div>
          <Bot size={18} />
        </div>
        {(!data.switches.research || !data.switches.synthesis) && (
          <p className="f-small">Master switches in Render: research {data.switches.research ? "on" : "off"}, drafting {data.switches.synthesis ? "on" : "off"}.</p>
        )}
        {data.ledgerError && <p className="f-team-error" role="alert">{data.ledgerError}</p>}
        <div className="f-chain" aria-label="How a campaign moves through the agents">
          {chain.map((step, i) => (
            <div className="f-chain-part" key={step.label}>
              {i > 0 && <span className={"f-chain-link" + (flying(step.agents) ? " flow" : "")} aria-hidden="true" />}
              <div className={"f-chain-node" + (flying(step.agents) ? " running" : used(step.agents) ? " used" : "")}>
                {flying(step.agents) ? <Loader2 size={15} className="f-spin" /> : used(step.agents) ? <CheckCircle2 size={15} /> : <Cpu size={15} />}
                <strong>{step.label}</strong>
                <small>{step.agents.length ? `${step.agents.length} agent${step.agents.length === 1 ? "" : "s"}` : "templates"}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
      {groups.map((g) => (
        <section className="f-panel" key={g.id}>
          <div className="f-section-heading">
            <div>
              <h2>{g.title}</h2>
              <p className="f-small">{g.note}</p>
            </div>
          </div>
          <div className="f-agent-grid">
            {data.agents.filter((a) => a.group === g.id).map((a: Agent) => {
              const Icon = icons[a.id] || Bot;
              const running = (a.stats?.inFlight || 0) > 0;
              return (
                <article key={a.id} className={"f-agent " + (running ? "running" : a.problem ? "failed" : "")}>
                  <div className="f-agent-head">
                    <span className="f-agent-icon">
                      <Icon size={18} />
                    </span>
                    <strong>{a.name}</strong>
                  </div>
                  <p className="f-small">{a.purpose}</p>
                  {a.kind === "ai" ? (
                    <>
                      <span className={"f-agent-state " + (running ? "running" : a.problem ? "failed" : "")}>
                        {running ? <Loader2 size={14} className="f-spin" /> : <Cpu size={14} />}
                        {running ? `Running now (${a.stats!.inFlight})` : a.problem ? a.problem : a.model ? `${a.model.provider} · ${a.model.model}` : "No model"}
                      </span>
                      {a.model && <span className="f-small">Model source: {a.model.source}{a.model.priced ? "" : ", no price set"}</span>}
                      <span className="f-small">
                        {a.stats!.calls} call{a.stats!.calls === 1 ? "" : "s"} ({a.stats!.completed} done, {a.stats!.failed + a.stats!.unknown} failed or unknown) · {a.stats!.inputTokens.toLocaleString()} in / {a.stats!.outputTokens.toLocaleString()} out tokens · {usd(a.stats!.estimatedMicroUsd)} · last {ago(a.stats!.lastAt)}
                      </span>
                    </>
                  ) : (
                    <span className="f-agent-state">
                      <CheckCircle2 size={14} /> Template, no AI model
                    </span>
                  )}
                  {a.capability && (
                    <details className="f-small">
                      <summary>Contract and permissions</summary>
                      <p>
                        {a.capability.id} v{a.capability.version}
                        <br />
                        Input: {a.capability.input}
                        <br />
                        Output: {a.capability.output}
                        <br />
                        Permissions: {a.capability.permissions.join(", ")}
                      </p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <section className="f-panel">
        <div className="f-section-heading">
          <h2>Recent agent calls</h2>
        </div>
        {data.recent.length === 0 ? (
          <p className="f-small">No agent has run yet.</p>
        ) : (
          <ul className="f-team-list">
            {data.recent.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{(r.agent && byId.get(r.agent)?.name) || r.stage}</strong>
                  <span>
                    {r.provider} · {r.model} · {r.status} · {ago(r.at)}
                    {r.inputTokens !== undefined ? ` · ${r.inputTokens} in / ${r.outputTokens} out` : ""}
                    {r.estimatedMicroUsd !== undefined ? ` · ${usd(r.estimatedMicroUsd)}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data.totals.unattributed > 0 && <p className="f-small">{data.totals.unattributed} earlier call{data.totals.unattributed === 1 ? "" : "s"} were recorded before agents were named and are not counted per agent.</p>}
      </section>
    </>
  );
}
