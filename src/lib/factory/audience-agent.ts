import { randomUUID } from "node:crypto";
import type { BrandIntelVersion, Commission, CustomerAccount, Generation } from "./model";
import type { Repository } from "./repository";
import type { Deps } from "./brand-intel-run";
import { dossierText } from "./brand-intel";
import { INPUTS, MAX_ANSWER, generationDef } from "./commissions";
import { AUDIENCE_BODY, CONTRACTS } from "./agent-prompts";
import { meteredInvoke } from "./metered";

// Intended Audience agent (CHG-0110, CHG-0111): "Generate from AI" on Input 4, once per age group. One short call each, no web search, reads the
// customer's Brand Intelligence dossier and the project's answers, and returns a draft of the five audience answers for that age group.
// Nothing is saved until a producer presses Save answers.
export const AUDIENCE_SLOT = "synthesis:intended-audience" as const;
/** Schema field names (as the owner specified them) and the stored answer each one fills. */
export const AUDIENCE_FIELDS = [
  { field: "who_buys_uses_influences", key: "who" },
  { field: "what_motivates_them", key: "motivations" },
  { field: "what_words_they_use", key: "words" },
  { field: "what_puts_them_off", key: "putOffs" },
  { field: "intended_commission_reach", key: "intended" },
] as const;

/** The default full prompt: the editable body plus the fixed output and age-appropriateness rules. */
export const AUDIENCE_INSTRUCTIONS = `${AUDIENCE_BODY}\n\n${CONTRACTS["synthesis:intended-audience"]}`;

export const audienceSchema = () => ({
  type: "object", additionalProperties: false, required: AUDIENCE_FIELDS.map((f) => f.field),
  properties: Object.fromEntries(AUDIENCE_FIELDS.map((f) => [f.field, { type: "string" }])),
});

const answersBlock = (c: Commission) => INPUTS.filter((d) => d.key !== "audience").map((d) => {
  const lines = d.prompts.map((p) => ({ label: p.label, text: (c.answers[d.key]?.[p.key] || "").trim() })).filter((x) => x.text);
  return lines.length ? `Input ${d.number}, ${d.title}${c.confirmed[d.key as "objective" | "audience"] ? " (confirmed with the client)" : ""}:\n${lines.map((l) => `- ${l.label} ${l.text.slice(0, 3000)}`).join("\n")}` : "";
}).filter(Boolean).join("\n\n");

/** The two filled-in blocks of the prompt: account research (the dossier) and project context (the project's own answers). */
export function audienceInput(customer: CustomerAccount, dossier: BrandIntelVersion, c: Commission, generation: Generation): string {
  const g = generationDef(generation)!;
  const reds = customer.redLines.length ? customer.redLines.map((r) => `- [${r.category}] ${r.text}${r.reason ? ` (${r.reason})` : ""}`).join("\n") : "- none recorded";
  const lists = [
    c.preserve.length ? `Preserve:\n${c.preserve.map((e) => `- ${e.text} (${e.scope === "recurring" ? "recurs" : "single campaign"})`).join("\n")}` : "",
    c.change.length ? `Can change or out of character:\n${c.change.map((e) => `- ${e.text}`).join("\n")}` : "",
    c.wentTooFar.trim() ? `An example that went too far: ${c.wentTooFar.trim()}` : "",
  ].filter(Boolean).join("\n\n");
  return `<input_data>
<customer_account_research>
Business: ${customer.name}
Website: ${customer.website || "(none)"}
Client red lines (verbatim):
${reds}

Brand Foundation Dossier, version ${dossier.version}:
${dossierText(dossier, 8000)}
</customer_account_research>

<target_age_group>
${g.label}, ages ${g.range}${g.minors ? ". This range includes people under 18." : ""}
</target_age_group>

<project_context>
Project: ${c.name}

${answersBlock(c) || "(no answers entered yet)"}${lists ? `\n\n${lists}` : ""}
</project_context>
</input_data>`;
}

export type AudienceDraft = Record<(typeof AUDIENCE_FIELDS)[number]["key"], string>;
/** Why a provider answer was cut short, if it was. Handles the OpenAI, Gemini and Anthropic response shapes. */
export function cutShort(data: unknown): boolean {
  const d = (data || {}) as { status?: string; incomplete_details?: unknown; stop_reason?: string; candidates?: { finishReason?: string }[] };
  return d.status === "incomplete" || !!d.incomplete_details || d.stop_reason === "max_tokens" || d.candidates?.[0]?.finishReason === "MAX_TOKENS";
}
/** Pull the JSON object out of the text, tolerating code fences or a sentence before or after it. */
export function jsonOf(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(t); } catch { /* try the outermost braces */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("no JSON");
}
/** Check the agent's JSON. Every field must be present text; markdown bold marks are removed; length is capped to what an answer may hold. */
export function parseAudience(text: string, truncated = false): AudienceDraft {
  if (!text.trim()) throw new Error(truncated ? "The AI ran out of output length before it wrote anything. Try again, or choose a model with more output room on the AI models page. Nothing was changed." : "The AI sent back an empty answer. Try again; nothing was changed.");
  let raw: unknown;
  try { raw = jsonOf(text); } catch { throw new Error(truncated ? "The AI ran out of output length and its answer was cut off. Try again, or choose a model with more output room on the AI models page. Nothing was changed." : "The AI answer could not be read as the five audience fields. Try again; nothing was changed."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The AI answer was not in the expected form. Try again; nothing was changed.");
  const out = {} as AudienceDraft;
  for (const f of AUDIENCE_FIELDS) {
    const v = (raw as Record<string, unknown>)[f.field];
    if (typeof v !== "string" || !v.trim()) throw new Error(`The AI answer left out "${f.field}". Try again; nothing was changed.`);
    out[f.key] = v.replace(/\*\*/g, "").trim().slice(0, MAX_ANSWER);
  }
  return out;
}

/** One metered call. The caller has checked the dossier exists. `body` is the saved prompt edit, if any. Returns the draft; throws a readable message on any failure. */
export async function generateAudience(repo: Repository, customer: CustomerAccount, commission: Commission, dossier: BrandIntelVersion, generation: Generation, actor: string, deps: Deps, body?: string): Promise<AudienceDraft> {
  if (!deps.enabled()) throw new Error("AI drafting is not configured. Turn on PORT67_SYNTHESIS_ENABLED and set the AI keys in Render.");
  const sel = await deps.resolve(AUDIENCE_SLOT);
  const result = await meteredInvoke(repo, { accountId: customer.id, workspaceId: `factory-commissions-${customer.id}`, projectId: commission.id, runId: randomUUID() }, AUDIENCE_SLOT, "synthesis", sel, actor, deps,
    { instructions: `${body ?? AUDIENCE_BODY}\n\n${CONTRACTS[AUDIENCE_SLOT]}`, input: audienceInput(customer, dossier, commission, generation), schema: audienceSchema(), name: "port67_intended_audience", maxOutputTokens: 8000, reasoningEffort: "low", timeoutMs: 120_000 });
  if (result.error) throw new Error(result.error);
  return parseAudience(result.text, cutShort(result.data));
}
