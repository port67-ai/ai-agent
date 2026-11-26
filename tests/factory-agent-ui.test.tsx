import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentPanel, type AgentSettings } from "../src/components/factory/AgentPopout";
import { CommissionEditor } from "../src/components/factory/CommissionEditor";
import type { Commission } from "../src/lib/factory/model";

// The AI agent box and Generate from AI on Inputs 1 and 3 (CHG-0113).
const settings: AgentSettings = {
  slot: "research:commission-objective", label: "Commission: objective", stage: "research",
  route: { provider: "openai", model: "gpt-5-mini", source: "slot" },
  providers: [{ id: "openai", label: "OpenAI", models: ["gpt-5-mini", "gpt-5"] }, { id: "gemini", label: "Google Gemini", models: ["gemini-2.5-flash"] }],
  switches: { research: true, synthesis: false },
  prompt: { body: "Act as a senior marketing strategist. {{company}}", isDefault: true, version: 0, defaultBody: "Act as a senior marketing strategist. {{company}}", placeholders: [{ key: "company", label: "Company" }, { key: "product", label: "Product" }], contract: "OUTPUT RULES (fixed) Return only JSON" },
};
const panel = (s: AgentSettings, busy = false) => renderToStaticMarkup(<AgentPanel s={s} busy={busy} onRoute={() => {}} onPrompt={() => {}} onReset={() => {}} />);
const h = panel(settings);
assert.match(h, /Commission: objective/);
assert.match(h, /Searches the web, so it needs a model with web search/);
assert.match(h, /shared by every project/);
// Model dropdown: grouped by provider, current model selected, Save disabled until it changes.
assert.match(h, /<select aria-label="Large language model"/);
assert.match(h, /<optgroup label="OpenAI"><option value="openai\|gpt-5-mini" selected="">gpt-5-mini — Fast \/ economical<\/option><option value="openai\|gpt-5">gpt-5 — General writing \/ structured output<\/option><\/optgroup>/);
assert.match(h, /<optgroup label="Google Gemini"><option value="gemini\|gemini-2.5-flash">/);
assert.match(h, /<button type="button" class="f-button" disabled="">Save model<\/button>/);
assert.match(h, /Now using openai: gpt-5-mini \(set for this agent\)/);
// Prompt: collapsed editor with placeholders, original marker, save and reset (reset disabled while original), fixed rules shown read-only.
assert.match(h, /<summary>Prompt <span class="f-small">\(original\)<\/span><\/summary>/);
assert.match(h, /<code>\{\{company\}\} <\/code><code>\{\{product\}\} <\/code>/);
assert.match(h, /<textarea aria-label="Prompt" class="w-prompt" rows="20">Act as a senior marketing strategist\. \{\{company\}\}<\/textarea>/);
assert.match(h, /<button type="button" class="f-button" disabled="">Save prompt<\/button>/);
assert.match(h, /<button type="button" class="f-button secondary" disabled="">Reset to original<\/button>/);
assert.match(h, /Fixed output rules <span class="f-small">\(added after your prompt, not editable\)/);
assert.match(h, /<pre class="w-contract">OUTPUT RULES \(fixed\) Return only JSON<\/pre>/);
// Switch warnings and an edited prompt.
assert.doesNotMatch(h, /switched off in Render/);
assert.match(panel({ ...settings, switches: { research: false, synthesis: false } }), /Live research is switched off in Render/);
const syn = panel({ ...settings, slot: "synthesis:intended-audience", stage: "synthesis", prompt: { ...settings.prompt, isDefault: false, version: 3, by: "jed", at: "2026-11-25T10:00:00Z", placeholders: [] } });
assert.match(syn, /no web search/);
assert.match(syn, /AI drafting is switched off in Render/);
assert.match(syn, /\(version 3, edited 2026-11-25 10:00 UTC by jed\)/);
assert.doesNotMatch(syn, /Filled in automatically/, "no placeholders for the audience agent");
assert.match(syn, /<button type="button" class="f-button secondary">Reset to original<\/button>/, "reset enabled once edited");
// No key set, and a model that is not in the provider list is still shown.
assert.match(panel({ ...settings, providers: [], route: { error: "No model chosen yet" } }), /No AI provider key with web search \(OpenAI or Gemini\) is set in Render yet/);
const unavailable = panel({ ...settings, route: { provider: "openai", model: "old-model", source: "default" } });
assert.doesNotMatch(unavailable, /<option value="openai\|old-model"/);
assert.match(unavailable, /outside the current recommended shortlist/);

// ---- On the project: AI agent box on Inputs 1, 3 and 4 only; Generate from AI on 1 and 3; project details; AI notes.
const base: Commission = {
  id: "comm_" + "b".repeat(32), customerId: "cust_" + "a".repeat(32), name: "Autumn campaign",
  answers: { objective: {}, product: {}, audience: {}, brand: {} }, preserve: [], change: [], wentTooFar: "", evidence: [], confirmed: {},
  createdAt: "t", createdBy: "p", updatedAt: "t", updatedBy: "p", audit: [],
};
const ed = (c: Commission, gen = true) => renderToStaticMarkup(<CommissionEditor commission={c} redLines={[]} busy={false} onSave={async () => true} onGenerate={gen ? async () => null : undefined} />);
const html = ed(base);
assert.equal((html.match(/<summary><svg[^>]*>.*?<\/svg> AI agent<\/summary>/g) || []).length, 4, "AI agent box on Inputs 1, 3, 4 and 5");
const at = (needle: string) => html.indexOf(needle);
assert.ok(at("Input 1: Commission objective") < at("AI agent</summary>") && at("AI agent</summary>") < at("Input 3:"), "first box sits under Input 1's heading");
assert.equal((html.match(/AI agent<\/summary>/g) || []).length, 4);
const brandStart = at("Input 5: Brand expression");
assert.ok(html.slice(brandStart).includes("AI agent</summary>"), "Input 5 has the AI agent box");
assert.equal((html.match(/>(<svg[^>]*>.*?<\/svg> )?Generate from AI</g) || []).length, 3, "Generate from AI on Inputs 1, 3 and 5");
assert.ok(html.indexOf("Generate from AI", brandStart) > brandStart, "one of them is on Input 5");
assert.ok(html.indexOf("Generate from AI", brandStart) < html.indexOf("Preserve", brandStart), "it sits with the two brand questions, before the Preserve list");
assert.match(html, /Product page link \(optional\)/);
assert.match(html, /Sub-brand or collection \(optional\)/);
assert.match(html, /Proposed video format \(optional\)/);
assert.match(html, /Searches the web for the company and the product or service entered in the Project box/);
assert.ok(at("Generate from AI") > at("Input 1: Commission objective") && at("Generate from AI") < at("Input 3:"));
assert.doesNotMatch(ed(base, false), />Generate from AI</);
assert.match(html, /Product, service or offer this project is about/);
assert.match(html, /Market or geography \(optional\)/);
assert.match(html, /Campaign timing or season \(optional\)/);
assert.match(html, /Save project details/);
const noted = ed({ ...base, brief: { product: "The loaf", market: "UK", timing: "Autumn" }, aiNotes: { objective: { sections: [{ title: "Assumptions", text: "Price unverified" }], sources: [{ title: "Their site", url: "https://nashs.example.com" }], generatedAt: "t", by: "p", model: "openai gpt-5-mini" } } });
assert.match(noted, /value="The loaf"/);
const brandNoted = ed({ ...base, aiNotes: { brand: { sections: [{ title: "Sources and confidence", text: "Three years, two channels" }], sources: [], generatedAt: "t", by: "p", model: "openai gpt-5" } } });
assert.match(brandNoted, /<h5>Sources and confidence<\/h5>/, "brand notes show on Input 5");
const longBrand = ed({ ...base, answers: { ...base.answers, brand: { recognisable: "Imagery. Evidence and interpretation: x. Application: y." } } });
assert.match(longBrand, /<textarea name="recognisable" rows="6" maxLength="12000">Imagery\. Evidence/, "the brand boxes are taller and take long prose");
assert.match(html, /<textarea name="why" rows="3" maxLength="2000"/, "other boxes keep their size");
assert.match(noted, /AI notes <span class="f-small">\(from the last Generate from AI, openai gpt-5-mini\)/);
assert.match(noted, /<h5>Assumptions<\/h5><p class="w-prewrap">Price unverified<\/p>/);
assert.match(noted, /<a href="https:\/\/nashs\.example\.com" target="_blank" rel="noopener noreferrer">Their site<\/a>/);
assert.doesNotMatch(html, /AI notes/);
console.log("agent-ui: all assertions passed");
