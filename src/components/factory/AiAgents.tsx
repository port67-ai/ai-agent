"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Building2, CheckCircle2, Clapperboard, Compass, Cpu, Loader2, Palette, PenLine, Search, Sparkles, Target, Users, Wand2 } from "lucide-react";
import type { agentsOverview } from "@/lib/factory/ai-agents";
import type { AiRoute } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";
import SystemMap from "./SystemMap";
import RunTracker from "./RunTracker";
import type { Project } from "@/lib/factory/model";
import { focusMarks, projectLines } from "@/lib/factory/focus-map";
import FlowHealth from "./FlowHealth";
import ModelDialog from "./ModelDialog";
import SkillDialog from "./SkillDialog";
import { post, type Routing, type Suggest } from "./agent-client";
import RerunDialog, { postRerun, type RerunReply } from "./RerunDialog";
import type { FailedAgent } from "@/lib/factory/failed-agents";
/** With a project chosen, the overview also carries that project's failed agents (CHG-0100). */
type Overview = Awaited<ReturnType<typeof agentsOverview>> & { failed?: FailedAgent[] };
type Agent = Overview["agents"][number];
const icons: Record<string, typeof Bot> = {
  "scope:business": Compass, "review:scope": Compass, "review:sources": Search, "review:insights": Search, "review:direction": Sparkles,
  "research:brand": Building2, "research:customer": Users, "research:competitor": Target, "research:creative": Palette,
  "synthesis:insights": Search, "synthesis:strategy": Sparkles, "synthesis:content": PenLine, "synthesis:formats": Compass, "synthesis:audiences": Users, "synthesis:ideas": Sparkles, "production.video": Clapperboard,
};
const usd = (micro: number) => "$" + (micro / 1e6).toFixed(micro >= 1e6 ? 2 : 4);
const ago = (iso?: string) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
};
const groups: { id: string; title: string; note: string }[] = [
  { id: "planning", title: "Research and medium planners", note: "Interpret the brief, propose relevant research and recommend media from reviewed evidence. Producers retain decisions." },
  { id: "scoping", title: "Scoping agent", note: "Classifies the business from the brief and saves the classification and each researcher's questions to Firestore. Optional: without a model a free template scope is used." },
  { id: "research", title: "Research agents", note: "Search the public web and cite every finding." },
  { id: "drafting", title: "Drafting agents", note: "Write only from reviewed evidence and the approved direction." },
  { id: "studio", title: "Studio pre-production", note: "Studio projects only. The pre-production writer drafts mood boards, scenes, scripts and hooks from the approved direction; the image job draws test frames and keyframes (OpenAI Images; gpt-image-1 unless you choose another model or set PORT67_IMAGE_MODEL)." },
  { id: "production", title: "Production agents", note: "Template builders: no AI model, no AI cost." },
  { id: "review", title: "Producer reviewers", note: "Four walled-garden reviewers, each seeing only its own inputs: scope, sources, insights, direction. Free rule checks run first; a model is used only if you choose one here. Pick a different model from the drafters so a model does not mark its own work." },
  { id: "producer", title: "Producer orchestrator", note: "Rules only: no model and no cost of its own. Decides which reviewer or drafter goes next, carries notes back once, and enforces the loop limits. It never approves for the account owner." },
];

type Quota = { provider: string; label: string; at: string; message: string; agents: string[] };
/**
 * CHG-0100: one banner per provider whose latest call failed with a quota or billing error and that agents still use, with the
 * admin's one-press move of those agents to another provider (research agents only to OpenAI or Gemini).
 */
export function QuotaBanners({ quota, target, onMove, busy }: { quota: Quota[]; target: (provider: string) => string; onMove?: (provider: string) => void; busy?: boolean }) {
  return (
    <>
      {quota.filter((q) => q.agents.length > 0).map((q) => {
        const to = target(q.provider);
        return (
          <div key={q.provider} className="f-callout f-quota-banner" role="alert" data-quota={q.provider}>
            <strong>{q.label} has no quota left. {q.agents.length} agent{q.agents.length === 1 ? "" : "s"} still use{q.agents.length === 1 ? "s" : ""} it.</strong>
            <p className="f-small">Its latest call failed with a quota or billing error ({q.at.slice(0, 16).replace("T", " ")} UTC): {q.message} Every call to {q.label} fails the same way until credit is added, so move these agents to another provider, then rerun the failed agents.</p>
            {onMove && (
              <div className="f-actions">
                <button type="button" className="f-button small" disabled={busy || !to} title={to ? "Sets each affected agent's own route; research agents only move to OpenAI or Gemini" : "No other provider has a key in Render"} onClick={() => onMove(q.provider)}>Move these agents to {to || "another provider"}</button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function AiAgents() {
  const [data, setData] = useState<Overview | null>(null);
  const [routing, setRouting] = useState<Routing | null>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [skillFor, setSkillFor] = useState<string | null>(null);
  const closeSkill = useCallback(() => setSkillFor(null), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [approval, setApproval] = useState<{ mode: "ai" | "manual"; masterSwitch: boolean; effective: boolean } | null>(null);
  /** The failed agent being rerun, kept as it was when the dialog opened so the result stays on screen after the map refreshes. */
  const [rerunFor, setRerunFor] = useState<FailedAgent | null>(null);
  const [loadedFor, setLoadedFor] = useState("");
  const [offerRerun, setOfferRerun] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => { if (data?.failed?.length) setMapOpen(true); }, [data?.failed?.length]);
  const load = useCallback(async () => {
    try {
      const [agents, route, mode] = await Promise.all([post<Overview>("ai-agents" + (projectId ? "?projectId=" + encodeURIComponent(projectId) : "")), post<Routing>("ai-routing"), post<NonNullable<typeof approval>>("approval-mode")]);
      setData(agents);
      setLoadedFor(projectId);
      try {
        const r = await fetch("/api/factory/projects");
        if (r.ok) setProjects(((await r.json()) as { projects: Project[] }).projects || []);
      } catch { /* the dropdown keeps the last list */ }
      setApproval(mode);
      setRouting(route);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [projectId]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !picking && !rerunFor) void load();
    }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, picking, rerunFor]);

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
  async function openRerun(slot: string) {
    const entry = data?.failed?.find((x) => x.slot === slot);
    if (!entry) return;
    setNotice("");
    setError("");
    if (!suggest) {
      try { setSuggest(await post<Suggest>("ai-routing", { action: "suggest" })); } catch { /* the model field still accepts typing */ }
    }
    setRerunFor(entry);
  }
  /** "Rerun failed agents (n)": every failed agent of the chosen project in dependency order, stopping at the first new failure. */
  const rerunAll = () =>
    run(async () => {
      setOfferRerun(false);
      const reply: RerunReply = await postRerun(projectId, "rerun-failed", {});
      const done = (reply.results || []).filter((r) => r.ok).map((r) => r.label);
      const skipped = (reply.results || []).filter((r) => r.notRun && r !== reply.stopped);
      if (reply.stopped) {
        await load();
        throw new Error(`${done.length ? `Reran ${done.join(", ")}. ` : ""}Stopped at ${reply.stopped.label}: ${reply.stopped.failure?.title || "it could not run"}. ${reply.stopped.failure?.recommendation || ""} ${reply.stopped.error || ""}`.trim());
      }
      return `${done.length ? `Reran ${done.join(", ")} successfully; the project carries on.` : "Nothing was rerun."}${skipped.length ? ` Not run: ${skipped.map((r) => `${r.label} (${r.error})`).join("; ")}.` : ""}`;
    });
  /** The "no quota left" banner's bulk move: research jobs to the other web-search provider, every other job to a keyed provider. */
  const moveTargets = (from: string, s: Suggest | null) => {
    const keyed = (routing?.providers || []).filter((p) => p.keyConfigured && p.id !== from);
    const known = (id: string) => [routing?.config.defaults?.research, routing?.config.defaults?.synthesis, ...Object.values(routing?.config.slots || {})].find((r) => r?.provider === id)?.model;
    const modelFor = (id: string) => s?.best[id] || known(id);
    const research = keyed.find((p) => p.research && modelFor(p.id));
    const synthesis = research || keyed.find((p) => modelFor(p.id));
    return { research: research ? { provider: research.id, model: modelFor(research.id)! } : null, synthesis: synthesis ? { provider: synthesis.id, model: modelFor(synthesis.id)! } : null, label: (synthesis || research) ? (routing?.providers.find((p) => p.id === (research || synthesis)!.id)?.label || "") : "" };
  };
  const moveOff = (from: string) =>
    run(async () => {
      const s = suggest || (await post<Suggest>("ai-routing", { action: "suggest" }).catch(() => null));
      if (s) setSuggest(s);
      const t = moveTargets(from, s);
      if (!t.research && !t.synthesis) throw new Error("No other provider has a key set in Render and a model to use. Set another provider's key, or choose models on the map first.");
      const r = await post<{ moved: string[]; skipped: { slot: string; why: string }[] }>("ai-routing", { action: "move", from, research: t.research, synthesis: t.synthesis });
      setOfferRerun(!!projectId);
      const where = [t.research && `research agents to ${t.research.provider} ${t.research.model}`, t.synthesis && `other agents to ${t.synthesis.provider} ${t.synthesis.model}`].filter(Boolean).join(", ");
      return `Moved ${r.moved.length} agent${r.moved.length === 1 ? "" : "s"} (${where}).${r.skipped.length ? ` Not moved: ${r.skipped.map((x) => `${x.slot} (${x.why})`).join("; ")}.` : ""} ${projectId ? "Now rerun the failed agents." : "Choose the project above, then press Rerun failed agents on the map."}`;
    });
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
  const chosen = projects.find((x) => x.id === projectId);
  const failed = chosen && loadedFor === projectId ? data.failed || [] : undefined;
  const unset = data.agents.filter((a) => a.kind === "ai" && !a.model).length;
  const pipeline = data.flow.pipeline;
  const providerLabels: Record<string, string> = { openai: "OpenAI", gemini: "Google Gemini", anthropic: "Anthropic", deepseek: "DeepSeek" };
  const providersFor = (ids: string[]) => Array.from(new Set(data.agents.filter((a) => ids.some((id) => id.endsWith(":") ? a.id.startsWith(id) : a.id === id)).flatMap((a) => a.model ? [a.model.provider] : []))).map((id) => providerLabels[id] || id);
  const providerCosts = [
    ["openai", "OpenAI"],
    ["gemini", "Google Gemini"],
    ["anthropic", "Anthropic"],
    ["deepseek", "DeepSeek"],
  ].map(([id, label]) => {
    const models = data.flow.models.filter((m) => m.provider === id);
    return {
      id,
      label,
      calls: models.reduce((n, m) => n + m.calls, 0),
      microUsd: models.reduce((n, m) => n + m.microUsd, 0),
      agents: data.agents.filter((a) => a.model?.provider === id).length,
    };
  });
  const stageUsage = (ids: string[]) => {
    const selected = data.agents.filter((a) => ids.some((id) => id.endsWith(":") ? a.id.startsWith(id) : a.id === id));
    const cost = selected.reduce((n, a) => n + (a.stats?.estimatedMicroUsd || 0), 0);
    const calls = selected.reduce((n, a) => n + (a.stats?.calls || 0), 0);
    const missingPrice = selected.some((a) => a.stats?.calls && a.model && !a.model.priced);
    return `${calls} calls · ${missingPrice ? "partial cost " : ""}${usd(cost)}`;
  };
  const workflowSummary = [
    { no: "1", name: "Plan & scope", detail: `${pipeline.scopes?.classified || 0} classified · ${pipeline.waiting.producerStart || 0} waiting to start`, providers: providersFor(["synthesis:planner", "scope:business", "review:scope"]), usage: stageUsage(["synthesis:planner", "scope:business", "review:scope"]) },
    { no: "2", name: "Research", detail: `${pipeline.sources.total} sources · ${pipeline.sources.unreviewed} awaiting review`, providers: providersFor(["research:", "review:sources"]), usage: stageUsage(["research:", "review:sources"]) },
    { no: "3", name: "Insights", detail: `${pipeline.insights.reviewed} accepted · ${pipeline.insights.draft} awaiting review`, providers: providersFor(["synthesis:insights", "review:insights"]), usage: stageUsage(["synthesis:insights", "review:insights"]) },
    { no: "4", name: "Direction", detail: `${pipeline.directions.shared} shared · ${pipeline.directions.approved} approved`, providers: providersFor(["synthesis:medium", "synthesis:formats", "synthesis:audiences", "synthesis:strategy", "review:direction"]), usage: stageUsage(["synthesis:medium", "synthesis:formats", "synthesis:audiences", "synthesis:strategy", "review:direction"]) },
    { no: "5", name: "Production", detail: `${pipeline.assetsApproved} approved assets · ${pipeline.copyPacks} copy packs`, providers: providersFor(["synthesis:content", "studio:preproduction", "studio:image", "production.video"]), usage: stageUsage(["synthesis:content", "studio:preproduction", "studio:image", "production.video"]) },
  ];
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
            <strong>Direction approval: {approval.mode === "ai" ? "AI producer" : "Manual (a producer)"}</strong>
            <p className="f-small">
              {approval.mode === "ai"
                ? "After the direction producer passes the campaign direction, the AI producer approves it on the customer's behalf (recorded in the audit trail) and the chain carries on to copy pack and production. The account owner still approves the final assets."
                : "The chain stops after the direction producer passes the direction until a producer or admin approves it on the customer's behalf."}
              {!approval.masterSwitch && " The Render switch PORT67_PRODUCER_APPROVALS=true is off, so the AI producer will not approve; a producer or admin presses the approval buttons instead (the account level is paused)."}
            </p>
            <div className="f-actions">
              <button type="button" className="f-button" disabled={busy}
                onClick={async () => { setBusy(true); try { setApproval(await post("approval-mode", { mode: approval.mode === "ai" ? "manual" : "ai" })); setError(""); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
                {approval.mode === "ai" ? "Switch to manual approval" : "Switch to AI producer approval"}
              </button>
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
        <QuotaBanners quota={data.quota || []} target={(provider) => moveTargets(provider, suggest).label} onMove={(provider) => void moveOff(provider)} busy={busy} />
        {error && <p className="f-team-error" role="alert">{error}</p>}
        {notice && <p className="f-team-ok" role="status">{notice}</p>}
        {offerRerun && failed && failed.length > 0 && (
          <div className="f-actions"><button type="button" className="f-button small" disabled={busy} onClick={() => void rerunAll()}>Rerun failed agents ({failed.length})</button></div>
        )}
        {data.ledgerError && <p className="f-team-error" role="alert">{data.ledgerError}</p>}
      </section>
      <section className="f-panel" aria-label="Project progress">
        <div className="f-project-pick">
          <label htmlFor="project-pick"><strong>Project</strong></label>
          <select id="project-pick" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects (the map shows the whole system)</option>
            {projects.map((x) => <option key={x.id} value={x.id}>{x.brief?.business || x.id}</option>)}
          </select>
        </div>
        {chosen ? (
          <>
            <p className="f-small">Orange marks on the map are the steps where a producer has to press something. Blue is the AI working. Green is done. Greyed steps have not started.</p>
            <RunTracker p={chosen} failed={failed} onRerun={(slot) => void openRerun(slot)} busy={busy} />
          </>
        ) : projects.length ? (
          <>
            <p className="f-small">Pick a project to see where it is on the map. Who has to press something, per project:</p>
            <ul className="f-project-lines">
              {projectLines(projects).map((l) => (
                <li key={l.id} className="f-small">
                  <button type="button" className="f-button small" onClick={() => setProjectId(l.id)}>{l.name}</button>
                  <strong>{l.who === "Producer" ? "Your turn" : l.who === "AI" ? "AI working" : "Nothing to press"}</strong>
                  <span>{l.label}: {l.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="f-small">No projects yet.</p>}
      </section>
      <section className="f-panel f-ai-ops-summary" aria-label="AI workflow and cost summary">
        <div className="f-section-heading">
          <div>
            <h2>AI workflow at a glance</h2>
            <p className="f-small">Workspace totals are summarised here; the selected project controls are above. Each stage shows its assigned LLM providers, recorded calls and estimated costs. Open the detailed map only for agent-to-model wiring, storage paths or troubleshooting.</p>
          </div>
          <strong className="f-ai-total">{data.totals.calls} calls · {usd(data.totals.estimatedMicroUsd)}</strong>
        </div>
        <div className="f-ai-stage-grid">
          {workflowSummary.map((stage) => (
            <div className="f-ai-stage-card" key={stage.no}>
              <span>{stage.no}</span>
              <strong>{stage.name}</strong>
              <small>{stage.detail}</small>
              <em>{stage.providers.length ? stage.providers.join(" · ") : "No LLM assigned"}</em>
              <small>{stage.usage} estimated for this stage</small>
            </div>
          ))}
        </div>
        <div className="f-ai-cost-heading">
          <div>
            <h3>LLM connections and estimated cost</h3>
            <p className="f-small">Recorded usage only. Costs are cumulative estimates from configured model prices; “0 calls” means the provider is connected to agents but has not been used.</p>
          </div>
        </div>
        <div className="f-provider-cost-grid">
          {providerCosts.map((provider) => (
            <div className="f-provider-cost" key={provider.id}>
              <strong>{provider.label}</strong>
              <span>{provider.agents} agent{provider.agents === 1 ? "" : "s"}</span>
              <b>{provider.calls} call{provider.calls === 1 ? "" : "s"} · {usd(provider.microUsd)}</b>
            </div>
          ))}
        </div>
      </section>
      <details className="f-map-details" open={mapOpen} onToggle={(event) => setMapOpen(event.currentTarget.open)}>
        <summary className="f-panel">
          <div>
            <strong>Detailed AI / LLM map</strong>
            <span>Agents ↔ providers ↔ Firestore ↔ approvals. Expand for model routing, per-edge cost and reruns.</span>
          </div>
          <b>{failed?.length ? `${failed.length} failed agent${failed.length === 1 ? "" : "s"}` : "Open map"}</b>
        </summary>
        <SystemMap focus={chosen ? focusMarks(chosen) : undefined} agents={data.agents} flow={data.flow} onSelectAgent={(id) => void openPicker(id)} onSkill={setSkillFor} failed={failed} onRerun={(slot) => void openRerun(slot)} onRerunAll={() => void rerunAll()} busy={busy} />
      </details>
      <FlowHealth flow={data.flow} />
      <details className="f-panel f-agent-catalogue">
        <summary>
          <div><strong>Agent catalogue and model settings</strong><span>Expand to inspect every agent, capability, model and skill.</span></div>
          <b>{data.agents.length} agents</b>
        </summary>
      {groups.map((g) => (
        <section className="f-agent-group" key={g.id}>
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
                      <button type="button" className="f-button small secondary" onClick={() => setSkillFor(a.id)}>Skill</button>
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
      {skillFor && (() => {
        const ag = data.agents.find((x) => x.id === skillFor);
        return ag ? <SkillDialog agentId={ag.id} agentName={ag.name} purpose={ag.purpose} onClose={closeSkill} /> : null;
      })()}
      {rerunFor && chosen && (() => {
        const ag = data.agents.find((x) => x.id === rerunFor.slot);
        return (
          <RerunDialog projectId={chosen.id} agent={rerunFor} name={ag?.name} current={ag?.model?.model ? { provider: String(ag.model.provider), model: ag.model.model } : undefined} admin routing={routing} suggest={suggest}
            onClose={() => { setRerunFor(null); void load(); }} onDone={() => void load()} />
        );
      })()}
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
