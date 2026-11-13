"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Save, X } from "lucide-react";
import type { AiRoute } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";
import { fromPrice, post, toPrice, type Price, type Routing, type Suggest } from "./agent-client";

export type DialogAgent = { id: string; name: string; group: string; model?: { provider: string; model: string } };

/** The one place a model is chosen for an agent. Opened by clicking the agent on the system map. */
export default function ModelDialog({ agent, routing, suggest, onClose, onSaved }: { agent: DialogAgent; routing: Routing; suggest: Suggest | null; onClose: () => void; onSaved: (message: string) => void }) {
  const research = agent.group === "research";
  const own = routing.config.slots?.[agent.id];
  const pick = research ? suggest?.suggested.research : suggest?.suggested.synthesis;
  const start = own || (agent.model ? { provider: agent.model.provider, model: agent.model.model } : pick || { provider: "", model: "" });
  const priceOf = (provider: string, model: string) => toPrice(routing.config.pricing?.[`${provider}:${model}`]);
  const [provider, setProvider] = useState<string>(start.provider);
  const [model, setModel] = useState(start.model);
  const [price, setPrice] = useState<Price>(priceOf(start.provider, start.model));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    first.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const options = routing.providers.filter((p) => !research || p.research);
  const models = suggest?.models[provider] || [];
  const label = options.find((p) => p.id === provider)?.label || provider;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const fetchPrice = () =>
    run(async () => {
      if (!provider || !model.trim()) throw new Error("Choose a provider and model first");
      const r = await post<{ fetchedAt: string; prices: { key: string; found: boolean; pricing?: Pricing }[] }>("ai-routing", { action: "public-prices", models: [{ provider, model: model.trim() }] });
      const hit = r.prices[0];
      if (!hit?.found || !hit.pricing) throw new Error("No public price found for that model. Enter the price by hand.");
      setPrice((f) => ({ ...toPrice(hit.pricing), tool: f.tool }));
      setNote(`Public price filled in (${r.fetchedAt}). Review it and add the search fee.`);
    });
  const save = () =>
    run(async () => {
      const cfg = routing.config;
      const slots: Record<string, AiRoute> = { ...(cfg.slots || {}) };
      const pricing: Record<string, Pricing> = { ...(cfg.pricing || {}) };
      if (provider) {
        slots[agent.id] = { provider: provider as AiRoute["provider"], model: model.trim() };
        if (price.input.trim() !== "" || price.output.trim() !== "") pricing[`${provider}:${model.trim()}`] = fromPrice(price) as Pricing;
      } else delete slots[agent.id];
      await post("ai-routing", { action: "save", settings: { defaults: { research: cfg.defaults?.research ?? null, synthesis: cfg.defaults?.synthesis ?? null }, slots, pricing } });
      onSaved(provider ? `${agent.name} now uses ${label} ${model.trim()}.` : `${agent.name} now uses the stage default.`);
    });

  return (
    <div className="f-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="f-modal" role="dialog" aria-modal="true" aria-labelledby="f-modal-title">
        <div className="f-section-heading">
          <div>
            <h2 id="f-modal-title">Choose the model for {agent.name}</h2>
            <p className="f-small">{research ? "Research agents can use OpenAI or Gemini, the providers with live web search." : "Drafting agents can use any provider with a key set in Render."} API keys stay in Render and are never shown here.</p>
          </div>
          <button type="button" className="f-text-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <label>
          Provider
          <select ref={first} value={provider} disabled={busy} onChange={(e) => {
            const next = e.target.value;
            const m = next ? suggest?.best[next] || "" : "";
            setProvider(next);
            setModel(m);
            setPrice(priceOf(next, m));
          }}>
            <option value="">Use the stage default or Render settings</option>
            {options.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.keyConfigured}>{p.label}{p.keyConfigured ? "" : " (key not set in Render)"}</option>
            ))}
          </select>
        </label>
        <label>
          Model ID
          <input list={"model-list-" + agent.id} disabled={busy || !provider} maxLength={180} placeholder="Exact model ID" value={model} onChange={(e) => { setModel(e.target.value); setPrice(priceOf(provider, e.target.value.trim())); }} />
          <datalist id={"model-list-" + agent.id}>{models.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        {provider && (
          <>
            <p className="f-small">Prices, USD per million tokens. Spend caps and every cost figure use these.</p>
            <div className="f-ai-price">
              {(["input", "output", "cached", "tool"] as const).map((k) => (
                <label key={k}>
                  {k === "input" ? "Input" : k === "output" ? "Output" : k === "cached" ? "Cached input" : "Search per call"}
                  <input inputMode="decimal" disabled={busy} value={price[k]} onChange={(e) => setPrice((f) => ({ ...f, [k]: e.target.value }))} />
                </label>
              ))}
            </div>
            <button type="button" className="f-text-button" disabled={busy || !model.trim()} onClick={() => void fetchPrice()}><Download size={14} /> Fetch public price</button>
          </>
        )}
        {error && <p className="f-team-error" role="alert">{error}</p>}
        {note && <p className="f-team-ok" role="status">{note}</p>}
        <div className="f-actions">
          <button type="button" className="f-button small" disabled={busy || (!!provider && !model.trim())} onClick={() => void save()}><Save size={14} /> Accept</button>
          <button type="button" className="f-text-button" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
