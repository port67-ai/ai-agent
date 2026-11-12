"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Building2, CheckCircle2, Clapperboard, Cpu, Download, Loader2, Palette, PenLine, Save, Search, Settings2, Sparkles, Target, Users, Wand2 } from "lucide-react";
import type { agentsOverview } from "@/lib/factory/ai-agents";
import type { AiRoute, AiRoutingConfig } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";
import AiModels from "./AiModels";
import AgentDataFlow from "./AgentDataFlow";
import JourneyFlow from "./JourneyFlow";

type Routing = {
  config: AiRoutingConfig;
  providers: { id: AiRoute["provider"]; label: string; research: boolean; keyConfigured: boolean; keyName: string }[];
};
type Suggest = { models: Record<string, string[]>; best: Record<string, string | undefined>; suggested: { research: AiRoute | null; synthesis: AiRoute | null }; notes: string[] };
type Price = { input: string; output: string; cached: string; tool: string };
const today = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
const toPrice = (p?: Pricing): Price => ({ input: p ? String(p.inputPerMillion) : "", output: p ? String(p.outputPerMillion) : "", cached: p?.cachedInputPerMillion === undefined ? "" : String(p.cachedInputPerMillion), tool: p?.toolPerCall === undefined ? "" : String(p.toolPerCall) });
const fromPrice = (p: Price) => ({ updatedAt: today(), inputPerMillion: num(p.input), outputPerMillion: num(p.output), ...(num(p.cached) === undefined ? {} : { cachedInputPerMillion: num(p.cached) }), ...(num(p.tool) === undefined ? {} : { toolPerCall: num(p.tool) }) });
async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/factory/admin/" + path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
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

export default function AiAgents() {
  const [data, setData] = useState<Overview | null>(null);
  const [routing, setRouting] = useState<Routing | null>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ provider: string; model: string; price: Price }>({ provider: "", model: "", price: toPrice() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const [agents, route] = await Promise.all([post<Overview>("ai-agents"), post<Routing>("ai-routing")]);
      setData(agents);
      setRouting(route);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !editing) void load();
    }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, editing]);

  const priceFor = (provider: string, model: string) => toPrice(routing?.config.pricing?.[`${provider}:${model}`]);
  async function openEditor(agent: Agent) {
    setNotice("");
    setError("");
    setEditing(agent.id);
    const own = routing?.config.slots?.[agent.id];
    const provider = own?.provider || agent.model?.provider || "";
    const model = own?.model || agent.model?.model || "";
    setForm({ provider, model, price: priceFor(provider, model) });
    if (!suggest) {
      try {
        setSuggest(await post<Suggest>("ai-routing", { action: "suggest" }));
      } catch {
        /* the model field still accepts typing */
      }
    }
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
  const fetchPrice = () =>
    run(async () => {
      if (!form.provider || !form.model.trim()) throw new Error("Choose a provider and model first");
      const r = await post<{ fetchedAt: string; prices: { key: string; found: boolean; pricing?: Pricing }[] }>("ai-routing", { action: "public-prices", models: [{ provider: form.provider, model: form.model.trim() }] });
      const hit = r.prices[0];
      if (!hit?.found || !hit.pricing) throw new Error("No public price found for that model. Enter the price by hand.");
      setForm((f) => ({ ...f, price: { ...toPrice(hit.pricing), tool: f.price.tool } }));
      return `Public price filled in (${r.fetchedAt}). Review it, add the search fee, then save.`;
    });
  const saveAgent = (agent: Agent) =>
    run(async () => {
      const cfg = routing!.config;
      const slots: Record<string, AiRoute> = { ...(cfg.slots || {}) };
      const pricing: Record<string, Pricing> = { ...(cfg.pricing || {}) };
      if (form.provider) {
        slots[agent.id] = { provider: form.provider as AiRoute["provider"], model: form.model.trim() };
        if (form.price.input.trim() !== "" || form.price.output.trim() !== "") pricing[`${form.provider}:${form.model.trim()}`] = fromPrice(form.price) as Pricing;
      } else delete slots[agent.id];
      await post("ai-routing", { action: "save", settings: { defaults: { research: cfg.defaults?.research ?? null, synthesis: cfg.defaults?.synthesis ?? null }, slots, pricing } });
      setEditing(null);
      return `${agent.name} saved. New runs use it straight away.`;
    });
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
      return "Suggested defaults saved with public prices. Add each model's search fee on its card, then check the prices.";
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
      <JourneyFlow agents={data.agents} />
      <AgentDataFlow agents={data.agents} />
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
              const open = editing === a.id;
              const keyed = (id: string) => routing?.providers.find((p) => p.id === id);
              const options = (routing?.providers || []).filter((p) => a.group !== "research" || p.research);
              const models = suggest?.models[form.provider] || [];
              return (
                <article id={"agent-" + a.id} key={a.id} className={"f-agent " + (open ? "editing " : "") + (running ? "running" : a.problem || (a.kind === "ai" && !a.model) ? "failed" : "")}>
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
                      {!open && (
                        <button className="f-button secondary small" disabled={busy || !routing} onClick={() => void openEditor(a)}>
                          <Settings2 size={14} /> {a.model ? "Change model" : "Choose model"}
                        </button>
                      )}
                      {open && (
                        <div className="f-agent-editor">
                          <label>
                            Provider
                            <select value={form.provider} disabled={busy} onChange={(e) => {
                              const provider = e.target.value;
                              const model = provider ? suggest?.best[provider] || "" : "";
                              setForm({ provider, model, price: priceFor(provider, model) });
                            }}>
                              <option value="">Use the stage default</option>
                              {options.map((p) => (
                                <option key={p.id} value={p.id} disabled={!p.keyConfigured}>
                                  {p.label}{p.keyConfigured ? "" : " (key not set in Render)"}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Model ID
                            <input list={"agent-models-" + a.id} disabled={busy || !form.provider} maxLength={180} placeholder="Exact model ID" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value, price: priceFor(f.provider, e.target.value.trim()) }))} />
                            <datalist id={"agent-models-" + a.id}>
                              {models.map((m) => (
                                <option key={m} value={m} />
                              ))}
                            </datalist>
                          </label>
                          {form.provider && (
                            <>
                              <p className="f-small">
                                Prices, USD per million tokens ({keyed(form.provider)?.label}). Spend caps use these figures.
                              </p>
                              <div className="f-ai-price">
                                {(["input", "output", "cached", "tool"] as const).map((k) => (
                                  <label key={k}>
                                    {k === "input" ? "Input" : k === "output" ? "Output" : k === "cached" ? "Cached input" : "Search per call"}
                                    <input inputMode="decimal" disabled={busy} value={form.price[k]} onChange={(e) => setForm((f) => ({ ...f, price: { ...f.price, [k]: e.target.value } }))} />
                                  </label>
                                ))}
                              </div>
                              <button type="button" className="f-text-button" disabled={busy || !form.model.trim()} onClick={() => void fetchPrice()}>
                                <Download size={14} /> Fetch public price
                              </button>
                            </>
                          )}
                          <div className="f-actions">
                            <button className="f-button small" disabled={busy || (!!form.provider && !form.model.trim())} onClick={() => void saveAgent(a)}>
                              <Save size={14} /> Save
                            </button>
                            <button className="f-text-button" disabled={busy} onClick={() => setEditing(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
      <details className="f-panel f-advanced">
        <summary>
          <Settings2 size={16} /> Stage defaults, every agent at once and all prices
        </summary>
        <AiModels />
      </details>
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
