import { randomUUID } from "node:crypto";
import type { AiNotes, Commission, CommissionInput, CustomerAccount } from "./model";
import type { Repository } from "./repository";
import type { Deps } from "./brand-intel-run";
import { meteredInvoke } from "./metered";
import { CONTRACTS, DEFAULT_PROMPTS, fillPrompt, type AgentSlot } from "./agent-prompts";
import { cutShort, jsonOf } from "./audience-agent";
import { citationsOf } from "./brand-intel";
import { GENERATIONS, MAX_ANSWER, MAX_LONG_ANSWER } from "./commissions";

// Generate from AI for Input 1 (commission objective) and Input 3 (product or service) (CHG-0113). One grounded web-search call each.
// The result is a draft for the form plus notes; nothing is saved as an answer until a producer presses Save answers.
export type ResearchInput = "objective" | "product" | "brand";
export const RESEARCH_SLOT: Record<ResearchInput, AgentSlot> = { objective: "research:commission-objective", product: "research:commission-product", brand: "research:commission-brand" };
const text = { type: "string" } as const;
const sources = { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: text, url: text } } } as const;
const schema = (fields: string[]) => ({ type: "object", additionalProperties: false, required: [...fields, "sources"], properties: { ...Object.fromEntries(fields.map((f) => [f, text])), sources } });
const OBJECTIVE_FIELDS = ["objective_statement", "why_campaign", "why_now", "target_audience", "video_concept", "channel_plan", "think", "feel", "do", "call_to_action", "deliverables", "measures_of_success", "assumptions", "missing_inputs"];
const BRAND_FIELDS = ["opening_anchor", "section_one", "section_two", "sources_and_confidence"];
const PRODUCT_FIELDS = ["offer", "need", "price", "usage", "choice", "proof", "creative_proof_points", "claim_boundaries", "unknowns"];
export const researchSchema = (input: ResearchInput) => schema(input === "objective" ? OBJECTIVE_FIELDS : input === "brand" ? BRAND_FIELDS : PRODUCT_FIELDS);

const NOT_GIVEN = "(not supplied)";
/** The values for the prompt's placeholders, from the customer account and the project. Blank values say so, so the agent can label assumptions. */
export function promptValues(customer: CustomerAccount, c: Commission, input: ResearchInput): Record<string, string> {
  const saved = GENERATIONS.filter((g) => c.audience?.[g.key] && (c.directionGenerations || []).includes(g.key));
  const audience = saved.length ? saved.map((g) => `${g.label} (${g.range}): ${(c.audience![g.key]!.answers.who || "").slice(0, 400)}`).join("; ") : "(unknown)";
  const goal = (c.answers.objective.why || c.answers.objective.success || "").trim();
  return {
    company: customer.name,
    product: c.brief?.product?.trim() || "(not specified: identify the options and proceed with a clearly labelled assumption)",
    website: customer.website || "(none supplied)",
    market: c.brief?.market?.trim() || "(not specified: infer and label it)",
    timing: c.brief?.timing?.trim() || NOT_GIVEN,
    audience, goal: goal || "(unknown)", constraints: "(none supplied)",
    variant: "(not specified)",
    product_url: c.brief?.productUrl?.trim() || "(none supplied)",
    sub_brand: c.brief?.subBrand?.trim() || "(none supplied)",
    format: c.brief?.format?.trim() || "(not specified)",
    ...(input === "product" ? { goal: "" } : {}),
  };
}
const redLinesBlock = (customer: CustomerAccount) => customer.redLines.length
  ? `CLIENT RED LINES (verbatim; never contradict or work around them)\n${customer.redLines.map((r) => `- [${r.category}] ${r.text}${r.reason ? ` (${r.reason})` : ""}`).join("\n")}`
  : "CLIENT RED LINES: none recorded.";
export const researchInstructions = (input: ResearchInput, customer: CustomerAccount, c: Commission, body?: string) =>
  `${fillPrompt(body ?? DEFAULT_PROMPTS[RESEARCH_SLOT[input]], promptValues(customer, c, input))}\n\n${redLinesBlock(customer)}\n\n${CONTRACTS[RESEARCH_SLOT[input]]}`;

const clean = (v: unknown, max = MAX_ANSWER) => (typeof v === "string" ? v.replace(/\*\*/g, "").trim().slice(0, max) : "");
const join = (...parts: [string, string][]) => parts.filter(([, t]) => t).map(([h, t]) => (h ? `${h}: ${t}` : t)).join("\n\n").slice(0, MAX_ANSWER);
const longText = (...parts: string[]) => parts.filter(Boolean).join("\n\n").slice(0, MAX_LONG_ANSWER);
export type ResearchDraft = { draft: Record<string, string>; notes: Omit<AiNotes, "generatedAt" | "by" | "model"> };

/** Check the agent's JSON and map it onto the input's boxes. Core answers are required; extra notes may be empty. */
export function parseResearch(input: ResearchInput, raw: string, truncated = false, cites: { title: string; url: string }[] = []): ResearchDraft {
  if (!raw.trim()) throw new Error(truncated ? "The AI ran out of output length before it wrote anything. Try again, or choose a model with more output room in the AI agent box. Nothing was changed." : "The AI sent back an empty answer. Try again; nothing was changed.");
  let o: Record<string, unknown>;
  try { const j = jsonOf(raw); if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("x"); o = j as Record<string, unknown>; }
  catch { throw new Error(truncated ? "The AI ran out of output length and its answer was cut off. Try again, or choose a model with more output room in the AI agent box. Nothing was changed." : "The AI answer could not be read. Try again; nothing was changed."); }
  const g = (k: string) => clean(o[k], input === "brand" ? MAX_LONG_ANSWER : MAX_ANSWER);
  const required = input === "objective" ? ["why_campaign", "video_concept", "think", "feel", "do", "measures_of_success"] : input === "brand" ? ["opening_anchor", "section_one", "section_two"] : ["offer", "need", "price", "usage", "choice", "proof"];
  for (const k of required) if (!g(k)) throw new Error(`The AI answer left out "${k}". Try again; nothing was changed.`);
  const listed = Array.isArray(o.sources) ? (o.sources as { title?: unknown; url?: unknown }[]).map((s) => ({ title: clean(s?.title, 200), url: clean(s?.url, 800) })) : [];
  const seen = new Set<string>();
  const srcs = [...listed, ...cites].filter((s) => /^https:\/\//i.test(s.url) && !seen.has(s.url) && !!seen.add(s.url)).slice(0, 30).map((s) => ({ title: s.title || s.url, url: s.url }));
  if (input === "objective") {
    return {
      draft: {
        why: join(["", g("why_campaign")], ["Why now", g("why_now")]),
        making: join(["For", g("target_audience")], ["Video", g("video_concept")], ["Where", g("channel_plan")]),
        think: g("think"), feel: g("feel"), do: join(["", g("do")], ["Call to action", g("call_to_action")]),
        success: g("measures_of_success"),
      },
      notes: { sections: [["Commission objective", g("objective_statement")], ["Deliverables", g("deliverables")], ["Assumptions", g("assumptions")], ["Missing inputs", g("missing_inputs")]].filter(([, t]) => t).map(([title, t]) => ({ title, text: t })), sources: srcs },
    };
  }
  if (input === "brand") {
    return {
      draft: { recognisable: longText(g("opening_anchor"), g("section_one")), recurring: longText(g("section_two")) },
      notes: { sections: g("sources_and_confidence") ? [{ title: "Sources and confidence", text: g("sources_and_confidence") }] : [], sources: srcs },
    };
  }
  return {
    draft: { offer: g("offer"), need: g("need"), price: g("price"), usage: g("usage"), choice: g("choice"), proof: g("proof") },
    notes: { sections: [["Creative proof points", g("creative_proof_points")], ["Claim boundaries", g("claim_boundaries")], ["Unknowns", g("unknowns")]].filter(([, t]) => t).map(([title, t]) => ({ title, text: t })), sources: srcs },
  };
}

/** One grounded call. Throws a readable message on any failure; the paid call stays on the ledger. */
export async function generateResearch(repo: Repository, input: ResearchInput, customer: CustomerAccount, commission: Commission, actor: string, deps: Deps, body?: string): Promise<ResearchDraft & { model: string }> {
  if (!deps.enabled()) throw new Error("Live research is not configured. Turn on PORT67_RESEARCH_ENABLED and set the AI keys in Render.");
  const slot = RESEARCH_SLOT[input];
  const sel = await deps.resolve(slot);
  const result = await meteredInvoke(repo, { accountId: customer.id, workspaceId: `factory-commissions-${customer.id}`, projectId: commission.id, runId: randomUUID() }, slot, "research", sel, actor, deps,
    { research: true, instructions: researchInstructions(input, customer, commission, body), input: `Produce the answer now for ${customer.name}${commission.brief?.product ? `: ${commission.brief.product}` : ""}. Research date: ${deps.today()}.`, schema: researchSchema(input), name: `port67_${input}`, maxOutputTokens: input === "brand" ? 14000 : 9000, timeoutMs: input === "brand" ? 300_000 : 240_000 });
  if (result.error) throw new Error(result.error);
  const found = citationsOf(result.data).sources;
  return { ...parseResearch(input, result.text, cutShort(result.data), found), model: `${sel.provider} ${sel.model}` };
}
export const isResearchInput = (v: unknown): v is ResearchInput => v === "objective" || v === "product" || v === "brand";
export type { CommissionInput };
