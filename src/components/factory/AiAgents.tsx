"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Building2, CheckCircle2, Clapperboard, Compass, Cpu, Loader2, Palette, PenLine, Search, Sparkles, Target, Users, Wand2 } from "lucide-react";
import type { agentsOverview } from "@/lib/factory/ai-agents";
import type { AiRoute } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";
import SystemMap from "./SystemMap";
import FlowHealth from "./FlowHealth";
import ModelDialog from "./ModelDialog";
import { post, type Routing, type Suggest } from "./agent-client";
type Overview = Awaited<ReturnType<typeof agentsOverview>>;
type Agent = Overview["agents"][number];
const icons: Record<string, typeof Bot> = {
  "scope:business": Compass, "review:scope": Compass, "review:sources": Search, "review:insights": Search, "review:direction": Sparkles,
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
  { id: "scoping", title: "Scoping agent", note: "Classifies the business from the brief and saves the classification and each researcher's questions to Firestore. Optional: without a model a free template scope is used." },
  { id: "research", title: "Research agents", note: "Search the public web and cite every finding." },
  { id: "drafting", title: "Drafting agents", note: "Write only from reviewed evidence and the approved direction." },
  { id: "production", title: "Production agents", note: "Template builders: no AI model, no AI cost." },
  { id: "review", title: "Producer reviewers", note: "Four walled-garden reviewers, each seeing only its own inputs: scope, sources, insights, direction. Free rule checks run first; a model is used only if you choose one here. Pick a different model from the drafters so a model does not mark its own work." },
  { id: "producer", title: "Producer orchestrator", note: "Rules only: no model and no cost of its own. Decides which reviewer or drafter goes next, carries notes back once, and enforces the loop limits. It never approves for the account owner." },
];

export default function AiAgents() {
  const [data, setData] = useState<Overview | null>(null);
  const [routing, setRouting] = useState<Routing | null>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [approval, setApproval] = useState<{ mode: "ai" | "manual"; masterSwitch: boolean; effective: boolean } | null>(null);
  const load = useCallback(async () => {
    try {
      const [agents, route, mode] = await Promise.all([post<Overview>("ai-agents"), post<Routing>("ai-routing"), post<NonNullable<typeof approval>>("approval-mode")]);
      setData(agents);
      setApproval(mode);
      setRouting(route);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !picking) void load();
    }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, picking]);

  async function openPicker(id: string) {
    setNotice("");
    setError("");
    if (!suggest) {
      try {
        setSuggest(await post<Suggest>("ai-routing", { action: "suggest" }));
      } catch {
        /* the model field still accepts typing */
      }
    }
    setPicking(id);
  }
  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await fn();
      await load();
      if (message) setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const applySuggested = () =>
    run(async () => {
      const r = await post<Suggest>("ai-routing", { action: "suggest" });
      setSuggest(r);
      const picks = [r.suggested.research, r.suggested.synthesis].filter((x): x is AiRoute => !!x);
      if (!picks.length) throw new Error(r.notes[0] || "No provider has a key in Render yet");
      const cfg = routing!.config;
      const pub = await post<{ prices: { key: string; found: boolean; pricing?: Pricing }[] }>("ai-routing", { action: "public-prices", models: picks });
      const pricing: Record<string, Pricing> = { ...(cfg.pricing || {}) };
      for (const x of pub.prices) if (x.found && x.pricing) pricing[x.key] = x.pricing;
      await post("ai-routing", { action: "save", settings: { defaults: { research: r.suggested.research ?? cfg.defaults?.research ?? null, synthesis: r.suggested.synthesis ?? cfg.defaults?.synthesis ?? null }, slots: cfg.slots || {}, pricing } });
      return "Suggested defaults saved with public prices. Click an agent on the map to add its search fee and check the prices.";
    });

  if (!data) return <section className="f-panel">{error ? <p className="f-team-error" role="alert">{error}</p> : <p className="f-small">Loading AI agents…</p>}</section>;
  const byId = new Map(data.agents.map((a) => [a.id, a]));
  const unset = data.agents.filter((a) => a.kind === "ai" && !a.model).length;
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
          <p className="f-small">Master switches in Render: research {data.switches.research ? "on" : "off"}, drafting {data.switches.synthesis ? "on" : "off"} (PORT67_RESEARCH_ENABLED, PORT67_SYNTHESIS_ENABLED). Agents cannot run while a switch is off.</p>
        )}
        {approval && (
          <div className="f-callout" role="group" aria-label="Direction approval">
            <strong>Direction approval: {approval.mode === "ai" ? "AI producer" : "Manual (account owner)"}</strong>
            <p className="f-small">
              {approval.mode === "ai"
                ? "After the direction producer passes the campaign direction, the AI producer approves it on the customer's behalf (recorded in the audit trail) and the chain carries on to copy pack and production. The account owner still approves the final assets."
                : "The chain stops after the direction producer passes the direction until the account owner approves it."}
              {!approval.masterSwitch && " The Render switch PORT67_PRODUCER_APPROVALS=true is off, so only the account owner can approve until it is set."}
            </p>
            <div className="f-actions">
              {(["ai", "manual"] as const).map((m) => (
                <button key={m} type="button" className={approval.mode === m ? "f-primary" : "f-secondary"} aria-pressed={approval.mode === m} disabled={busy || approval.mode === m}
                  onClick={async () => { setBusy(true); try { setApproval(await post("approval-mode", { mode: m })); setError(""); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
                  {m === "ai" ? "AI producer approval" : "Manual approval"}
                </button>
              ))}
            </div>
          </div>
        )}
        {data.switches.autoApproveProducer && (
          <p className="f-callout" role="status">
            <strong>Test mode: producer start step is auto-approved.</strong> When a customer requests research, public data is authorised and the four research agents start straight away. Source review, insight acceptance and every later approval stay human. Remove PORT67_AUTO_APPROVE_PRODUCER in Render to put a Port67 person back in the loop.
          </p>
        )}
        {unset > 0 && (
          <div className="f-callout">
            <strong>{unset} agent{unset === 1 ? " has" : "s have"} no model yet.</strong> Pick one on each card below, or let the page choose a sensible low-cost starting point from the providers whose keys are set in Render.
            <div className="f-actions">
              <button className="f-button small" disabled={busy} onClick={() => void applySuggested()}>
                <Wand2 size={15} /> Apply suggested setup
              </button>
            </div>
          </div>
        )}
        {error && <p className="f-team-error" role="alert">{error}</p>}
        {notice && <p className="f-team-ok" role="status">{notice}</p>}
        {data.ledgerError && <p className="f-team-error" role="alert">{data.ledgerError}</p>}
      </section>
      <SystemMap agents={data.agents} flow={data.flow} onSelectAgent={(id) => void openPicker(id)} />
      <FlowHealth flow={data.flow} />
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
                <article id={"agent-" + a.id} key={a.id} className={"f-agent " + (running ? "running" : a.problem || (a.kind === "ai" && !a.model) ? "failed" : "")}>
                  <div className="f-agent-head">
                    <span className="f-agent-icon">
                      <Icon size={18} />
                    </span>
                    <strong>{a.name}</strong>
                  </div>
                  <p className="f-small">{a.purpose}</p>
                  {a.kind === "ai" ? (
                    <>
                      <span className={"f-agent-state " + (running ? "running" : a.model ? "" : "failed")}>
                        {running ? <Loader2 size={14} className="f-spin" /> : <Cpu size={14} />}
                        {running ? `Running now (${a.stats!.inFlight})` : a.model ? `${a.model.provider} · ${a.model.model}` : "No model chosen yet"}
                      </span>
                      <span className="f-small">
                        {a.model ? `From ${a.model.source === "slot" ? "this agent's own setting" : a.model.source === "default" ? "the stage default" : "the Render settings"}${a.model.priced ? "" : ", no price set"}` : a.problem && a.problem !== "No model chosen yet" ? a.problem : "Choose a model to enable this agent"}
                      </span>
                      <span className="f-small">
                        {a.stats!.calls} call{a.stats!.calls === 1 ? "" : "s"} ({a.stats!.completed} done, {a.stats!.failed + a.stats!.unknown} failed or unknown) · {a.stats!.inputTokens.toLocaleString()} in / {a.stats!.outputTokens.toLocaleString()} out tokens · {usd(a.stats!.estimatedMicroUsd)} · last {ago(a.stats!.lastAt)}
                      </span>
                      {data.flow.errors?.[a.id] && <span className="f-team-error">Last error: {data.flow.errors[a.id].message}</span>}
                      <span className="f-small">Change this agent&apos;s model by clicking it on the map above.</span>
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
      {picking && routing && (() => {
        const ag = data.agents.find((x) => x.id === picking);
        return ag ? (
          <ModelDialog
            agent={{ id: ag.id, name: ag.name, group: ag.group, model: ag.model?.model ? { provider: String(ag.model.provider), model: ag.model.model } : undefined }}
            routing={routing}
            suggest={suggest}
            onClose={() => setPicking(null)}
            onSaved={(message) => { setPicking(null); setNotice(message); void load(); }}
          />
        ) : null;
      })()}
    </>
  );
}
