import { standardPrice } from "./standard-prices";
import type { AiRoute, AiRoutingConfig } from "./model";
import type { Repository } from "./repository";
import { AI_ROUTING_NAMESPACE, normalizePricing, type Pricing } from "./costs";
import {
  keyNames,
  providerConfigured,
  providerSelection,
  type Provider,
  type ProviderSelection,
  type ProviderStage,
} from "./providers";
import { IMAGE_SLOT, PROVIDERS, SLOTS, type SlotId } from "./ai-slots";
export { IMAGE_SLOT, PROVIDERS, SLOTS, researchSlot, synthesisSlot, type SlotId } from "./ai-slots";
type Env = Record<string, string | undefined>;
// Owner-controlled routing: which provider and exact model handles each job. Secrets stay in deployment settings, so a route can only
// use a provider whose key is already configured there. The job and provider lists live in ai-slots.ts (client-safe) since CHG-0100.
const MODEL = /^[a-zA-Z0-9._:/-]{1,180}$/;
export const DEFAULT_IMAGE_MODEL = "gpt-image-1";
const PRICE_KEY = /^(openai|anthropic|deepseek|gemini):[a-zA-Z0-9._:/-]{1,180}$/;
const MAX_PRICES = 40;
const MAX_HISTORY = 100;
const info = (id: Provider) => PROVIDERS.find((p) => p.id === id)!;
const isProvider = (v: unknown): v is Provider => typeof v === "string" && PROVIDERS.some((p) => p.id === v);
export const keyConfigured = (provider: Provider, env: Env = process.env) => !!env[keyNames[provider]]?.trim();
export async function loadRouting(repo: Repository): Promise<AiRoutingConfig> {
  return (await repo.read(AI_ROUTING_NAMESPACE)).aiRouting || {};
}
function validateRoute(raw: unknown, stage: ProviderStage, label: string, env: Env): AiRoute {
  if (!raw || typeof raw !== "object") throw new Error(`${label}: choose a provider and model`);
  const { provider, model } = raw as { provider?: unknown; model?: unknown };
  if (!isProvider(provider)) throw new Error(`${label}: choose a provider`);
  if (stage === "research" && !info(provider).research)
    throw new Error(`${label}: research needs web-grounded search, which only OpenAI and Gemini provide here`);
  const id = typeof model === "string" ? model.trim() : "";
  if (!MODEL.test(id)) throw new Error(`${label}: enter the exact model ID from the provider`);
  if (!keyConfigured(provider, env)) throw new Error(`${label}: ${keyNames[provider]} is not set in Render, so ${info(provider).label} cannot be used yet`);
  return { provider, model: id };
}
/** Validate a full replacement of the routing table. Empty or null entries mean "use the default". */
export function validateRoutingInput(raw: unknown, env: Env = process.env) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid AI model settings");
  const input = raw as { defaults?: Record<string, unknown> | null; slots?: Record<string, unknown> | null; pricing?: Record<string, unknown> | null };
  const defaults: NonNullable<AiRoutingConfig["defaults"]> = {};
  for (const stage of ["research", "synthesis"] as const) {
    const value = input.defaults?.[stage];
    if (value) defaults[stage] = validateRoute(value, stage, stage === "research" ? "Research default" : "Drafting default", env);
  }
  for (const key of Object.keys(input.defaults || {})) if (key !== "research" && key !== "synthesis") throw new Error("Unknown default");
  const slots: Record<string, AiRoute> = {};
  for (const key of Object.keys(input.slots || {})) if (!SLOTS.some((s) => s.id === key)) throw new Error("Unknown job: " + key.slice(0, 40));
  for (const slot of SLOTS) {
    const value = input.slots?.[slot.id];
    if (value) slots[slot.id] = validateRoute(value, slot.stage, slot.label, env);
    if (value && slot.id === IMAGE_SLOT && slots[slot.id].provider !== "openai") throw new Error(`${slot.label}: only OpenAI image models are built so far`);
  }
  const pricing: Record<string, Pricing> = {};
  const entries = Object.entries(input.pricing || {});
  if (entries.length > MAX_PRICES) throw new Error(`At most ${MAX_PRICES} model prices can be saved`);
  for (const [key, value] of entries) {
    if (!PRICE_KEY.test(key)) throw new Error("Price needs a provider and model ID: " + key.slice(0, 60));
    try {
      pricing[key] = normalizePricing(value as Pricing);
    } catch (e) {
      throw new Error(`Price for ${key}: ${(e as Error).message}`);
    }
  }
  return { defaults, slots, pricing };
}
const describe = (r?: AiRoute) => (r ? `${r.provider}:${r.model}` : "default");
function changes(prev: AiRoutingConfig, next: { defaults: AiRoutingConfig["defaults"]; slots: Record<string, AiRoute>; pricing: Record<string, Pricing> }) {
  const out: string[] = [];
  for (const stage of ["research", "synthesis"] as const) {
    const a = describe(prev.defaults?.[stage]);
    const b = describe(next.defaults?.[stage]);
    if (a !== b) out.push(`${stage} default ${a} to ${b}`);
  }
  for (const slot of SLOTS) {
    const a = describe(prev.slots?.[slot.id]);
    const b = describe(next.slots[slot.id]);
    if (a !== b) out.push(`${slot.id} ${a} to ${b}`);
  }
  const before = JSON.stringify(prev.pricing || {});
  if (before !== JSON.stringify(next.pricing)) out.push("prices updated");
  return out.length ? out.join("; ").slice(0, 600) : "saved without changes";
}
/** `note` (CHG-0100) says why, for example "rerun of research:brand on project X"; it is appended to the history line. */
export async function saveRouting(repo: Repository, raw: unknown, actor: string, env: Env = process.env, note?: string) {
  const next = validateRoutingInput(raw, env);
  await repo.mutate(AI_ROUTING_NAMESPACE, (db) => {
    const prev = db.aiRouting || {};
    const at = new Date().toISOString();
    db.aiRouting = {
      ...next,
      updatedAt: at,
      updatedBy: actor,
      history: [...(prev.history || []), { at, actor, summary: ((tail) => changes(prev, next).slice(0, Math.max(0, 600 - tail.length)) + tail)(note ? "; " + note.slice(0, 200) : "") }].slice(-MAX_HISTORY),
    };
  });
}
/** The saved table as a full replacement input, so one job can be changed without touching the others. */
const asInput = (config: AiRoutingConfig, slots: Record<string, AiRoute>) => ({ defaults: { research: config.defaults?.research ?? null, synthesis: config.defaults?.synthesis ?? null }, slots, pricing: config.pricing || {} });
/**
 * Point one job at another provider and model (CHG-0100, used by Switch and rerun). Validated with exactly the rules of the admin
 * AI models page (research jobs need a web-search provider, the provider's key must be set, the image job is OpenAI only) and
 * recorded in the routing history with the reason.
 */
export async function setSlotRoute(repo: Repository, slot: SlotId, route: unknown, actor: string, note: string, env: Env = process.env) {
  const config = await loadRouting(repo);
  await saveRouting(repo, asInput(config, { ...(config.slots || {}), [slot]: route as AiRoute }), actor, env, note);
}
export type MoveTargets = { research?: AiRoute | null; synthesis?: AiRoute | null };
/**
 * Move every job that currently resolves to `from` onto another provider (CHG-0100, the "no quota left" banner). Research jobs take
 * `targets.research` (OpenAI or Gemini only), every other job `targets.synthesis`. The image job is OpenAI only, so it is never moved.
 * Jobs that cannot move are listed with the reason. One validated save, recorded in the routing history.
 */
export async function moveProviderSlots(repo: Repository, from: unknown, targets: MoveTargets, actor: string, env: Env = process.env) {
  if (!isProvider(from)) throw new Error("Choose the provider to move away from");
  const config = await loadRouting(repo);
  const slots: Record<string, AiRoute> = { ...(config.slots || {}) };
  const moved: SlotId[] = [];
  const skipped: { slot: SlotId; why: string }[] = [];
  for (const slot of SLOTS) {
    let current: Provider | undefined;
    try { current = (await resolveSelection(repo, slot.id, env)).provider; } catch { current = undefined; }
    if (current !== from) continue;
    if (slot.id === IMAGE_SLOT) { skipped.push({ slot: slot.id, why: "Image generation is OpenAI only; add credit to OpenAI or upload images by hand" }); continue; }
    const target = slot.stage === "research" ? targets.research : targets.synthesis;
    if (!target) { skipped.push({ slot: slot.id, why: slot.stage === "research" ? "No other web-search provider (OpenAI or Gemini) was chosen" : "No other provider was chosen" }); continue; }
    if (target.provider === from) throw new Error("Choose a different provider to move to");
    slots[slot.id] = { provider: target.provider, model: target.model };
    moved.push(slot.id);
  }
  if (moved.length) await saveRouting(repo, asInput(config, slots), actor, env, `moved ${moved.length} job${moved.length === 1 ? "" : "s"} off ${info(from).label} (no quota left)`);
  return { moved, skipped };
}
export type ResolvedSelection = ProviderSelection & { source: "slot" | "default" | "env" | "inherited" };
/**
 * Which provider and model runs this job. Order: the job's own route, then the stage default set on the
 * admin page, then the original PORT67_*_PROVIDER/MODEL settings. A saved route whose key has since been
 * removed fails loudly instead of silently using another provider.
 */
export async function resolveSelection(repo: Repository, slotId: SlotId, env: Env = process.env): Promise<ResolvedSelection> {
  const slot = SLOTS.find((s) => s.id === slotId);
  if (!slot) throw new Error("Unknown AI job");
  let config: AiRoutingConfig = {};
  try {
    config = await loadRouting(repo);
  } catch {
    config = {};
  }
  const own = config.slots?.[slotId];
  if (slotId === IMAGE_SLOT) {
    // Own route, else PORT67_IMAGE_MODEL, else gpt-image-1; always OpenAI, never the drafting default.
    if (own && own.provider !== "openai") throw new Error(`${slot.label} only supports OpenAI image models`);
    const model = own?.model || env.PORT67_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
    if (!MODEL.test(model)) throw new Error("PORT67_IMAGE_MODEL is not a valid model ID");
    const key = env[keyNames.openai];
    if (!key?.trim()) throw new Error(`${slot.label} uses OpenAI, but ${keyNames.openai} is not set in Render`);
    return { provider: "openai", model, key, source: own ? "slot" : "env" };
  }
  const inherited = slotId === "synthesis:planner" ? config.slots?.["scope:business"] : slotId === "synthesis:medium" ? config.slots?.["synthesis:formats"] : undefined;
  const route = own || config.defaults?.[slot.stage] || inherited;
  if (route) {
    if (!isProvider(route.provider) || !MODEL.test(route.model)) throw new Error("Saved AI model settings are invalid; review them on the AI models page");
    if (slot.stage === "research" && !info(route.provider).research) throw new Error(`${slot.label} is set to a provider without web search`);
    const key = env[keyNames[route.provider]];
    if (!key?.trim()) throw new Error(`${slot.label} uses ${info(route.provider).label}, but ${keyNames[route.provider]} is not set in Render`);
    return { provider: route.provider, model: route.model, key, source: own ? "slot" : config.defaults?.[slot.stage] ? "default" : "inherited" };
  }
  return { ...providerSelection(slot.stage, env), source: "env" };
}
/** True when the stage switch is on and at least one job can resolve a provider and key. */
export async function stageReady(repo: Repository, stage: ProviderStage, env: Env = process.env) {
  if (env[stage === "research" ? "PORT67_RESEARCH_ENABLED" : "PORT67_SYNTHESIS_ENABLED"] !== "true") return false;
  if (providerConfigured(stage, env)) return true;
  for (const slot of SLOTS.filter((s) => s.stage === stage && !/^(scope|review):/.test(s.id) && s.id !== IMAGE_SLOT)) {
    try {
      await resolveSelection(repo, slot.id, env);
      return true;
    } catch {
      /* try the next job */
    }
  }
  return false;
}
function hasPrice(config: AiRoutingConfig, provider: string, model: string, env: Env) {
  const key = `${provider}:${model}`;
  if (config.pricing && Object.hasOwn(config.pricing, key)) return true;
  if (standardPrice(provider, model)) return true;
  try {
    return !!env.PORT67_MODEL_PRICING_JSON && Object.hasOwn(JSON.parse(env.PORT67_MODEL_PRICING_JSON), key);
  } catch {
    return false;
  }
}
type ModelListing = { url: string; headers: Record<string, string>; ids: (d: unknown) => string[]; keep: RegExp; drop: RegExp };
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const field = (o: unknown, k: string): unknown => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined);
const LISTINGS = (key: string): Record<Provider, ModelListing> => ({
  openai: { url: "https://api.openai.com/v1/models", headers: { authorization: `Bearer ${key}` }, ids: (d) => arr(field(d, "data")).map((m) => String(field(m, "id"))), keep: /^(gpt-|o\d)/, drop: /(image|audio|realtime|tts|transcribe|embedding|search|moderation|instruct|codex|chat-latest|dall)/ },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
    headers: { "x-goog-api-key": key },
    ids: (d) => arr(field(d, "models")).filter((m) => arr(field(m, "supportedGenerationMethods")).includes("generateContent")).map((m) => String(field(m, "name")).replace(/^models\//, "")),
    keep: /^gemini-/,
    drop: /(image|tts|audio|live|embedding|robotics|computer|learnlm|veo|imagen|native)/,
  },
  anthropic: { url: "https://api.anthropic.com/v1/models?limit=100", headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, ids: (d) => arr(field(d, "data")).map((m) => String(field(m, "id"))), keep: /^claude-/, drop: /^$/ },
  deepseek: { url: "https://api.deepseek.com/models", headers: { authorization: `Bearer ${key}` }, ids: (d) => arr(field(d, "data")).map((m) => String(field(m, "id"))), keep: /^deepseek-/, drop: /^$/ },
});
const BALANCED: Record<Provider, RegExp> = { openai: /mini/, gemini: /flash(?!-lite)/, anthropic: /sonnet/, deepseek: /chat/ };
const rank = (id: string) => (parseFloat(id.match(/(\d+(?:\.\d+)?)/)?.[1] || "0") * 1000 - (/preview|exp|latest/.test(id) ? 1 : 0) - id.length / 1000);
/** Models the provider reports for this key. Only IDs the provider itself lists, so a suggestion cannot be an invented name. */
export async function listProviderModels(provider: Provider, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<string[]> {
  const key = env[keyNames[provider]]?.trim();
  if (!key) return [];
  const spec = LISTINGS(key)[provider];
  try {
    const response = await fetcher(spec.url, { headers: spec.headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];
    return [...new Set(spec.ids(await response.json()).filter((id) => MODEL.test(id) && spec.keep.test(id) && !spec.drop.test(id)))].sort((a, b) => rank(b) - rank(a));
  } catch {
    return [];
  }
}
/**
 * A starting point, not a benchmark result: the newest mid-tier model (fast and low cost) from a provider that has a key.
 * Research prefers Gemini when keyed; drafting uses the same provider unless only the other one is keyed.
 */
export async function suggestSetup(env: Env = process.env, fetcher: typeof fetch = fetch) {
  const models = {} as Record<Provider, string[]>;
  for (const p of PROVIDERS) models[p.id] = await listProviderModels(p.id, env, fetcher);
  const best = (p: Provider) => models[p].find((m) => BALANCED[p].test(m));
  const research = (["gemini", "openai"] as const).find((p) => best(p));
  const drafting = (["gemini", "openai", "anthropic", "deepseek"] as const).find((p) => best(p) && (p === research || !research)) || (["gemini", "openai", "anthropic", "deepseek"] as const).find((p) => best(p));
  const route = (p?: Provider) => (p ? { provider: p, model: best(p)! } : null);
  const notes: string[] = [];
  if (!research) notes.push("No web-search provider has a working key and model list, so research cannot be suggested. Set PORT67_GEMINI_API_KEY or PORT67_OPENAI_API_KEY in Render.");
  else notes.push(`Research: ${research} ${best(research)}, the newest fast mid-tier model it lists. Gemini is preferred for search because its grounded search is billed per query with a free monthly allowance.`);
  if (drafting) notes.push(`Drafting: ${drafting} ${best(drafting)}, same tier so a full run stays well under the cap.`);
  notes.push("This is a cost-sensible starting point, not a quality ranking: I found no reliable independent benchmark. Run the same brief with two models on a job and compare, then change that job's row.");
  const bestByProvider = Object.fromEntries(PROVIDERS.map((p) => [p.id, best(p.id)])) as Record<Provider, string | undefined>;
  return { models, best: bestByProvider, suggested: { research: route(research), synthesis: route(drafting) }, notes };
}
export const PUBLIC_PRICE_SOURCE = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
type Catalogue = Record<string, { input_cost_per_token?: number; output_cost_per_token?: number; cache_read_input_token_cost?: number; cache_creation_input_token_cost?: number }>;
const perMillion = (v?: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 1e12) / 1e6 : undefined);
/**
 * Look up public list prices for the given models from a fixed public catalogue. Results are suggestions only:
 * the admin reviews and edits them before saving, and web search tool fees are never in the catalogue.
 */
export async function suggestPublicPrices(models: { provider: Provider; model: string }[], fetcher: typeof fetch = fetch) {
  const wanted = models.slice(0, MAX_PRICES).filter((m) => isProvider(m.provider) && MODEL.test(m.model));
  let catalogue: Catalogue;
  try {
    const response = await fetcher(PUBLIC_PRICE_SOURCE, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("status");
    catalogue = (await response.json()) as Catalogue;
  } catch {
    throw new Error("Could not reach the public price list. Enter prices by hand, or try again.");
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    source: PUBLIC_PRICE_SOURCE,
    fetchedAt: today,
    prices: wanted.map(({ provider, model }) => {
      const key = `${provider}:${model}`;
      const standard = standardPrice(provider, model);
      if (standard) return { key, found: true as const, pricing: normalizePricing(standard) };
      const hit = [model, `${provider}/${model}`].map((k) => (Object.hasOwn(catalogue, k) ? catalogue[k] : undefined)).find(Boolean);
      const input = perMillion(hit?.input_cost_per_token);
      const output = perMillion(hit?.output_cost_per_token);
      if (!hit || input === undefined || output === undefined) return { key, found: false as const };
      const cached = perMillion(hit.cache_read_input_token_cost);
      const created = perMillion(hit.cache_creation_input_token_cost);
      const pricing: Pricing = { updatedAt: today, inputPerMillion: input, outputPerMillion: output, ...(cached === undefined ? {} : { cachedInputPerMillion: cached }), ...(created === undefined ? {} : { cacheCreationPerMillion: created }) };
      try {
        return { key, found: true as const, pricing: normalizePricing(pricing) };
      } catch {
        return { key, found: false as const };
      }
    }),
  };
}
/** Everything the admin page needs. Never includes key values, only whether each is set. */
export async function routingOverview(repo: Repository, env: Env = process.env) {
  const config = await loadRouting(repo);
  const effective = [];
  for (const slot of SLOTS) {
    try {
      const s = await resolveSelection(repo, slot.id, env);
      effective.push({ slot: slot.id, provider: s.provider, model: s.model, source: s.source, priced: hasPrice(config, s.provider, s.model, env) });
    } catch (e) {
      const m = (e as Error).message;
      effective.push({ slot: slot.id, error: /requires a model and API key|Unsupported AI provider/.test(m) ? "No model chosen yet" : m });
    }
  }
  const envDefault = (stage: ProviderStage) => {
    try {
      const s = providerSelection(stage, env);
      return { provider: s.provider, model: s.model };
    } catch {
      return null;
    }
  };
  return {
    config,
    providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, research: p.research, keyConfigured: keyConfigured(p.id, env), keyName: keyNames[p.id] })),
    slots: SLOTS,
    effective,
    envDefaults: { research: envDefault("research"), synthesis: envDefault("synthesis") },
    switches: { research: env.PORT67_RESEARCH_ENABLED === "true", synthesis: env.PORT67_SYNTHESIS_ENABLED === "true" },
    images: { available: true, note: "Studio test frames and keyframes use the Studio: image generation job (OpenAI Images; PORT67_IMAGE_MODEL or gpt-image-1 by default). Video generation is not built." },
  };
}
