"use client";
import { useEffect, useMemo, useState } from "react";
import { Cpu, Download, Save } from "lucide-react";
import type { AiRoutingConfig, AiRoute } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";

type Overview = {
  config: AiRoutingConfig;
  providers: { id: AiRoute["provider"]; label: string; research: boolean; keyConfigured: boolean; keyName: string }[];
  slots: readonly { id: string; stage: "research" | "synthesis"; label: string; hint: string }[];
  effective: { slot: string; provider?: string; model?: string; source?: string; priced?: boolean; error?: string }[];
  envDefaults: { research: { provider: string; model: string } | null; synthesis: { provider: string; model: string } | null };
  switches: { research: boolean; synthesis: boolean };
  images: { available: boolean; note: string };
};
type Draft = { provider: string; model: string };
type PriceDraft = { input: string; output: string; cached: string; tool: string; updatedAt: string; note?: string };

async function call<T = Overview>(body?: unknown): Promise<T> {
  const response = await fetch("/api/factory/admin/ai-routing", {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
const blank: Draft = { provider: "", model: "" };
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const toDraft = (p: Pricing): PriceDraft => ({
  input: String(p.inputPerMillion),
  output: String(p.outputPerMillion),
  cached: p.cachedInputPerMillion === undefined ? "" : String(p.cachedInputPerMillion),
  tool: p.toolPerCall === undefined ? "" : String(p.toolPerCall),
  updatedAt: p.updatedAt,
});

export default function AiModels() {
  const [data, setData] = useState<Overview | null>(null);
  const [routes, setRoutes] = useState<Record<string, Draft>>({});
  const [prices, setPrices] = useState<Record<string, PriceDraft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load(d: Overview) {
    setData(d);
    const r: Record<string, Draft> = {};
    for (const stage of ["research", "synthesis"] as const) {
      const v = d.config.defaults?.[stage];
      r["default:" + stage] = v ? { provider: v.provider, model: v.model } : blank;
    }
    for (const s of d.slots) {
      const v = d.config.slots?.[s.id];
      r[s.id] = v ? { provider: v.provider, model: v.model } : blank;
    }
    setRoutes(r);
    setPrices(Object.fromEntries(Object.entries(d.config.pricing || {}).map(([k, v]) => [k, toDraft(v)])));
  }
  useEffect(() => {
    let active = true;
    call()
      .then((d) => active && load(d))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  const inUse = useMemo(() => {
    const keys = new Set<string>();
    for (const r of Object.values(routes)) if (r.provider && r.model.trim()) keys.add(`${r.provider}:${r.model.trim()}`);
    for (const e of data?.effective || []) if (e.provider && e.model) keys.add(`${e.provider}:${e.model}`);
    for (const k of Object.keys(prices)) keys.add(k);
    return [...keys].sort();
  }, [routes, prices, data]);

  const setRoute = (key: string, patch: Partial<Draft>) => setRoutes((r) => ({ ...r, [key]: { ...(r[key] || blank), ...patch } }));
  const setPrice = (key: string, patch: Partial<PriceDraft>) =>
    setPrices((p) => ({ ...p, [key]: { ...(p[key] || { input: "", output: "", cached: "", tool: "", updatedAt: new Date().toISOString().slice(0, 10) }), ...patch } }));

  async function fetchPublic() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const models = inUse.map((k) => ({ provider: k.split(":")[0], model: k.slice(k.indexOf(":") + 1) }));
      const result = await call<{ fetchedAt: string; prices: { key: string; found: boolean; pricing?: Pricing }[] }>({ action: "public-prices", models });
      let found = 0;
      for (const p of result.prices) {
        if (p.found && p.pricing) {
          found++;
          setPrices((cur) => ({ ...cur, [p.key]: { ...toDraft(p.pricing!), tool: cur[p.key]?.tool || "", note: "Public list price" } }));
        }
      }
      setNotice(`Filled ${found} of ${models.length} prices from the public list (${result.fetchedAt}). Review, edit if needed, then save. Search tool fees are never in the public list; enter them yourself.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const route = (k: string) => (routes[k]?.provider ? { provider: routes[k].provider, model: routes[k].model } : null);
      const settings = {
        defaults: { research: route("default:research"), synthesis: route("default:synthesis") },
        slots: Object.fromEntries((data?.slots || []).flatMap((s) => (route(s.id) ? [[s.id, route(s.id)]] : []))),
        pricing: Object.fromEntries(
          Object.entries(prices)
            .filter(([, p]) => p.input.trim() !== "" || p.output.trim() !== "")
            .map(([k, p]) => [
              k,
              {
                updatedAt: p.updatedAt,
                inputPerMillion: num(p.input),
                outputPerMillion: num(p.output),
                ...(num(p.cached) === undefined ? {} : { cachedInputPerMillion: num(p.cached) }),
                ...(num(p.tool) === undefined ? {} : { toolPerCall: num(p.tool) }),
              },
            ]),
        ),
      };
      load(await call({ action: "save", settings }));
      setNotice("Saved. New research and drafting runs use these models and prices straight away.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <section className="f-panel">{error ? <p className="f-team-error" role="alert">{error}</p> : <p className="f-small">Loading AI models…</p>}</section>;

  const picker = (key: string, stage: "research" | "synthesis", inheritLabel: string) => {
    const r = routes[key] || blank;
    return (
      <div className="f-ai-pick">
        <select aria-label="Provider" value={r.provider} disabled={busy} onChange={(e) => setRoute(key, { provider: e.target.value })}>
          <option value="">{inheritLabel}</option>
          {data.providers
            .filter((p) => stage !== "research" || p.research)
            .map((p) => (
              <option key={p.id} value={p.id} disabled={!p.keyConfigured}>
                {p.label}
                {p.keyConfigured ? "" : " (key not set)"}
              </option>
            ))}
        </select>
        <input aria-label="Model ID" placeholder="Exact model ID" maxLength={180} value={r.model} disabled={busy || !r.provider} onChange={(e) => setRoute(key, { model: e.target.value })} />
      </div>
    );
  };
  const eff = (id: string) => data.effective.find((e) => e.slot === id);
  const envLabel = (s: "research" | "synthesis") => (data.envDefaults[s] ? `Render setting: ${data.envDefaults[s]!.provider}` : "Not set");

  return (
    <>
      <section className="f-panel">
        <div className="f-section-heading">
          <h2>AI models</h2>
          <Cpu size={18} />
        </div>
        <p className="f-small">
          Choose which provider and model runs each job. A job with no choice uses its stage default, then the older Render settings. API keys stay in Render; a provider is only selectable once its key is set there. Research needs web search, so only OpenAI and Gemini are offered.
        </p>
        {(!data.switches.research || !data.switches.synthesis) && (
          <p className="f-small">
            Master switches in Render: research {data.switches.research ? "on" : "off"}, drafting {data.switches.synthesis ? "on" : "off"} (PORT67_RESEARCH_ENABLED, PORT67_SYNTHESIS_ENABLED).
          </p>
        )}
        <h3>Stage defaults</h3>
        <div className="f-ai-grid">
          <div>
            <strong>Research</strong>
            {picker("default:research", "research", envLabel("research"))}
          </div>
          <div>
            <strong>Drafting</strong>
            {picker("default:synthesis", "synthesis", envLabel("synthesis"))}
          </div>
        </div>
        <h3>Per job</h3>
        <div className="f-ai-grid">
          {data.slots.map((s) => {
            const e = eff(s.id);
            return (
              <div key={s.id}>
                <strong>{s.label}</strong>
                <span className="f-small">{s.hint}</span>
                {picker(s.id, s.stage, "Use stage default")}
                <span className="f-small" role="status">
                  {e?.error ? "Not usable: " + e.error : `Runs on ${e?.provider}:${e?.model} (${e?.source})${e?.priced ? "" : ", no price set"}`}
                </span>
              </div>
            );
          })}
          <div>
            <strong>Images and video</strong>
            <span className="f-small">{data.images.note}</span>
          </div>
        </div>
      </section>
      <section className="f-panel">
        <div className="f-section-heading">
          <h2>Prices (USD per million tokens)</h2>
          <button className="f-button small" disabled={busy || inUse.length === 0} onClick={() => void fetchPublic()}>
            <Download size={16} /> Fetch public prices
          </button>
        </div>
        <p className="f-small">
          Public list prices are fetched first as a starting point; you can edit any value. Spend caps use these figures, and a model with no price is held at the per-call hold until one is set. Web search fees (per call) are entered by hand.
        </p>
        {inUse.length === 0 ? (
          <p className="f-small">Choose a model above to price it.</p>
        ) : (
          <div className="f-ai-prices">
            {inUse.map((k) => {
              const p = prices[k] || { input: "", output: "", cached: "", tool: "", updatedAt: "" };
              const field = (label: string, key: "input" | "output" | "cached" | "tool") => (
                <label>
                  {label}
                  <input inputMode="decimal" value={p[key]} disabled={busy} onChange={(e) => setPrice(k, { [key]: e.target.value, updatedAt: new Date().toISOString().slice(0, 10), note: "Edited by you" })} />
                </label>
              );
              return (
                <div key={k} className="f-ai-price">
                  <strong>{k}</strong>
                  {field("Input", "input")}
                  {field("Output", "output")}
                  {field("Cached input", "cached")}
                  {field("Search per call", "tool")}
                  <span className="f-small">{p.note || (p.updatedAt ? "Saved " + p.updatedAt : "No price yet")}</span>
                </div>
              );
            })}
          </div>
        )}
        {error && (
          <p className="f-team-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="f-team-ok" role="status">
            {notice}
          </p>
        )}
        <button className="f-button" disabled={busy} onClick={() => void save()}>
          <Save size={16} /> Save AI settings
        </button>
        {data.config.history && data.config.history.length > 0 && (
          <>
            <h3>Recent changes</h3>
            <ul className="f-team-list">
              {[...data.config.history].reverse().slice(0, 8).map((h) => (
                <li key={h.at}>
                  <div>
                    <strong>{h.summary}</strong>
                    <span>
                      {h.at.slice(0, 16).replace("T", " ")} UTC
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
