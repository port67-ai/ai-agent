import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptsSection, ReferencesSection, ScriptSection, SheetsSection } from "../src/components/factory/VideoStepsSections";
import type { VideoPlan } from "../src/lib/factory/model";

// Video steps sections (CHG-0115): static render checks.
const noop = async () => true;
const plan: VideoPlan = {
  id: "vp1", commissionId: "c1", generation: "gen_z",
  references: [
    { id: "r1", title: "Dawn window", link: "", why: "warm", palette: "amber", composition: "centred", camera: "static", film: "35mm", lens: "50mm", searchTerms: "bakery dawn", source: "producer", accepted: true, addedBy: "a", addedAt: "2026-11-25T10:00:00Z" },
    { id: "r2", title: "Flour cloud", link: "", why: "", palette: "", composition: "", camera: "", film: "", lens: "", searchTerms: "", source: "ai", accepted: false, addedBy: "ai", addedAt: "2026-11-25T10:00:00Z" },
  ],
  referenceSummary: "Warm and tactile.",
  script: { template: "15", title: "Morning", shots: [{ seconds: 5, visual: "Hands knead dough", line: "Fresh daily", onScreen: "" }], savedBy: "a", savedAt: "2026-11-25T10:00:00Z" },
  chat: [{ id: "k1", instruction: "faster hook", reply: "Done", at: "2026-11-25T10:00:00Z" }] as VideoPlan["chat"],
  sheets: [{ id: "s1", kind: "location", name: "Bakery", description: "Small brick bakery", details: "", source: "ai", accepted: false }] as VideoPlan["sheets"],
  prompts: { overall: "Warm film look", shots: [{ shot: 1, prompt: "Hands knead dough", negative: "text" }], generatedAt: "2026-11-25T09:00:00Z", by: "a", model: "openai test" },
  createdAt: "", updatedAt: "", updatedBy: "a",
};
const p = { busy: false, generating: false, onSave: noop, onGenerate: () => {} };

const refs = renderToStaticMarkup(<ReferencesSection plan={plan} {...p} />);
assert.match(refs, /Dawn window/);
assert.match(refs, /Accepted/);
assert.match(refs, /AI draft, not accepted/);
assert.match(refs, /Warm and tactile\./);
assert.match(refs, /Generate reference brief/);
assert.match(refs, /Add reference/);

const script = renderToStaticMarkup(<ScriptSection plan={plan} {...p} />);
assert.match(script, /Story, themes and creative expectations/);
assert.match(script, /Develop script with AI/);
assert.match(script, /Developed script/);
assert.doesNotMatch(script, /Start from template/);
assert.match(script, /Save script/);
assert.match(script, /Revise with AI/);
assert.match(script, /faster hook/);
const noScript = renderToStaticMarkup(<ScriptSection plan={null} {...p} />);
assert.match(noScript, /Only the saved script is used/);

const sheets = renderToStaticMarkup(<SheetsSection plan={plan} {...p} />);
assert.match(sheets, /Small brick bakery/);
assert.match(sheets, /AI draft, not accepted/);
assert.match(renderToStaticMarkup(<SheetsSection plan={{ ...plan, script: undefined }} {...p} />), /Save a script first\./);

const prompts = renderToStaticMarkup(<PromptsSection plan={plan} {...p} />);
assert.match(prompts, /Copy everything/);
assert.match(prompts, /Copy shot 1/);
assert.match(prompts, /Regenerate prompts/);
assert.match(prompts, /The script was saved after these prompts were generated/);
assert.doesNotMatch(renderToStaticMarkup(<PromptsSection plan={{ ...plan, script: { ...plan.script!, savedAt: "2026-11-25T08:00:00Z" } }} {...p} />), /saved after these prompts/);
console.log("video-steps-ui: all assertions passed");
