import type { Principal } from "./model";
import { repository } from "./repository";
import { PROVIDERS, SLOTS, type SlotId } from "./ai-slots";
import { listProviderModels, routingOverview, setSlotRoute } from "./ai-routing";
import { CONTRACTS, PLACEHOLDERS, isAgentSlot, type AgentSlot } from "./agent-prompts";
import { effectivePrompt, resetPrompt, savePrompt } from "./agent-settings";

// Model and prompt settings for the project input agents (CHG-0113), shown in the AI agent box on each input.
// Any producer or admin may change them; they apply to every project. Changes are versioned (prompts) and recorded in the routing history (models).
//   GET  agent-settings/:slot   the effective model, the models to choose from, the prompt and its placeholders
//   POST agent-settings/:slot   {action: route {provider, model} | prompt {body} | reset-prompt}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const isAgentSettingsRoute = (path: string[]) => path[0] === "agent-settings";
/** Test seam only: replaces the provider model listing. Never set in production code. */
export const testHooks: { listModels?: (provider: (typeof PROVIDERS)[number]["id"]) => Promise<string[]> } = {};
const cache = new Map<string, { at: number; ids: string[] }>();
async function models(provider: (typeof PROVIDERS)[number]["id"]) {
  if (testHooks.listModels) return testHooks.listModels(provider);
  const hit = cache.get(provider);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.ids;
  const ids = await listProviderModels(provider);
  if (ids.length) cache.set(provider, { at: Date.now(), ids });
  return ids;
}

export async function handleAgentSettings(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "AI agent settings are not available in the synthetic demo" }, 403);
  const slot = path[1];
  if (path.length !== 2 || !isAgentSlot(slot)) return json({ error: "Unknown AI agent" }, 404);
  const def = SLOTS.find((s) => s.id === slot)!;

  if (request.method === "POST") {
    const action = typeof data.action === "string" ? data.action : "";
    if (action === "route") {
      const provider = String(data.provider || ""), model = String(data.model || "");
      await setSlotRoute(repository, slot as SlotId, { provider, model }, a.subject, "changed from the project AI agent box");
    } else if (action === "prompt") await savePrompt(repository, slot, data.body, a.subject);
    else if (action === "reset-prompt") await resetPrompt(repository, slot);
    else return json({ error: "Unknown action" }, 400);
  }
  const overview = await routingOverview(repository);
  const effective = overview.effective.find((e) => e.slot === slot);
  const eligible = overview.providers.filter((p) => p.keyConfigured && (def.stage !== "research" || p.research));
  const lists = await Promise.all(eligible.map(async (p) => [p.id, await models(p.id)] as const));
  const prompt = await effectivePrompt(repository, slot);
  return json({
    slot, label: def.label, stage: def.stage,
    route: effective && !("error" in effective && effective.error) ? { provider: (effective as { provider: string }).provider, model: (effective as { model: string }).model, source: (effective as { source: string }).source } : { error: (effective as { error?: string } | undefined)?.error || "No model chosen yet" },
    providers: eligible.map((p) => ({ id: p.id, label: p.label, models: Object.fromEntries(lists)[p.id] || [] })),
    switches: overview.switches,
    prompt: { ...prompt, placeholders: PLACEHOLDERS[slot as AgentSlot], contract: CONTRACTS[slot as AgentSlot] },
  });
}
