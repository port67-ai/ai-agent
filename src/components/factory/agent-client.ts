import type { AiRoute, AiRoutingConfig } from "@/lib/factory/model";
import type { Pricing } from "@/lib/factory/costs";

// Shared client helpers for the admin AI agents page and the model picker.
export type Routing = {
  config: AiRoutingConfig;
  providers: { id: AiRoute["provider"]; label: string; research: boolean; keyConfigured: boolean; keyName: string }[];
};
export type Suggest = { models: Record<string, string[]>; best: Record<string, string | undefined>; suggested: { research: AiRoute | null; synthesis: AiRoute | null }; notes: string[] };
export type Price = { input: string; output: string; cached: string; tool: string };
const today = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
export const toPrice = (p?: Pricing): Price => ({ input: p ? String(p.inputPerMillion) : "", output: p ? String(p.outputPerMillion) : "", cached: p?.cachedInputPerMillion === undefined ? "" : String(p.cachedInputPerMillion), tool: p?.toolPerCall === undefined ? "" : String(p.toolPerCall) });
export const fromPrice = (p: Price) => ({ updatedAt: today(), inputPerMillion: num(p.input), outputPerMillion: num(p.output), ...(num(p.cached) === undefined ? {} : { cachedInputPerMillion: num(p.cached) }), ...(num(p.tool) === undefined ? {} : { toolPerCall: num(p.tool) }) });
export async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/factory/admin/" + path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
