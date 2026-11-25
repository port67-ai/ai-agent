import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommissionEditor } from "../src/components/factory/CommissionEditor";
import { InspirationBaseline } from "../src/components/factory/InspirationBaseline";
import type { Commission, RedLine } from "../src/lib/factory/model";

// Commission inputs and the Inspiration baseline (CHG-0107, FAC-VWS-011 to 016): server renders.
const noop = async () => true;
const redLines: RedLine[] = [{ id: "r1", category: "competitor", text: "Greggs", reason: "", addedBy: "p", addedAt: "2026-11-25T10:00:00Z" }];
const empty: Commission = {
  id: "comm_" + "b".repeat(32), customerId: "cust_" + "a".repeat(32), name: "Autumn campaign",
  answers: { objective: {}, product: {}, audience: {}, brand: {} }, preserve: [], change: [], wentTooFar: "", evidence: [], confirmed: {},
  createdAt: "2026-11-25T09:00:00Z", createdBy: "p", updatedAt: "2026-11-25T09:00:00Z", updatedBy: "p", audit: [],
};
const full: Commission = {
  ...empty,
  answers: { ...empty.answers, objective: { why: "New range", making: "Film", response: "Visit", success: "Footfall" }, audience: { who: "Locals" } },
  preserve: [{ id: "e1", text: "Warm light", scope: "recurring", addedBy: "p", addedAt: "t" }],
  change: [{ id: "e2", text: "Settings", scope: "single_campaign", kind: "can_change", addedBy: "p", addedAt: "t" }],
  wentTooFar: "The 2019 stunt",
  evidence: [
    { id: "v1", input: "objective", source: "https://client.example.com/brief", where: "client_brief", note: "", basis: "client_confirmed", addedBy: "p", addedAt: "t" },
    { id: "v2", input: "audience", source: "Call notes", where: "conversation", note: "", basis: "inference", addedBy: "p", addedAt: "t" },
  ],
  confirmed: { objective: { by: "p", at: "t" } },
  audit: [{ id: "a1", at: "2026-11-25T09:00:00Z", actor: "p", action: "project_created", detail: "Autumn campaign" }],
};
const ed = (c: Commission, withAi = true) => renderToStaticMarkup(<CommissionEditor commission={c} redLines={redLines} busy={false} onSave={noop} onGenerate={withAi ? async () => null : undefined} />);

const html = ed(empty);
for (const t of ["Input 1: Commission objective", "Input 3: Product or service being commissioned", "Input 4: Current and intended audience", "Input 5: Brand expression and boundaries"]) assert.match(html, new RegExp(t), t);
assert.doesNotMatch(html, /Input 2/);
for (const r of ["The Filter", "The Proof", "The Bridge", "The Anchor"]) assert.match(html, new RegExp(r), r);
assert.match(html, /Why has the client commissioned this work now\?/);
assert.match(html, /Which specific offer is in scope\?/);
assert.match(html, /Who buys it, who uses it and who influences the decision\?/);
assert.match(html, /Which elements recur across years and channels/);
assert.equal((html.match(/Not started/g) || []).length, 4);
// Secondary checks are shown but locked.
for (const s of ["Company story and values", "Competition and alternatives", "Parallels and creative inspiration"]) assert.match(html, new RegExp(s), s);
assert.equal((html.match(/aria-disabled="true"/g) || []).length, 3);
// Confirmation ticks only on objective and audience.
assert.equal((html.match(/Confirmed directly with the client/g) || []).length, 2);
// Brand lists, went-too-far and the account red lines.
for (const t of ["Preserve", "Can change or out of character", "One example that went too far", "Add to preserve", "Greggs"]) assert.match(html, new RegExp(t), t);
assert.match(html, /Add evidence/);
assert.match(html, /History \(0\)/);

const f = ed(full);
assert.match(f, /Warm light/);
assert.match(f, /Client confirmed/);
assert.match(f, /My inference/);
assert.match(f, /<a href="https:\/\/client\.example\.com\/brief"/);
assert.match(f, /The 2019 stunt/);
assert.equal((f.match(/type="checkbox"[^>]*checked=""/g) || []).length, 1, "only the objective is confirmed");

// Baseline: gaps listed, nothing invented.
const b0 = renderToStaticMarkup(<InspirationBaseline commission={empty} redLines={[]} />);
assert.match(b0, /Input 1, Commission objective is not started/);
assert.match(b0, /The objective has not been confirmed with the client/);
const b1 = renderToStaticMarkup(<InspirationBaseline commission={full} redLines={redLines} />);
assert.match(b1, /New range/);
assert.match(b1, /Warm light/);
assert.match(b1, /Greggs/);
assert.doesNotMatch(b1, /The objective has not been confirmed/);
assert.match(b1, /The audience has not been confirmed/);
// Generate from AI: only on the audience input, with a plain explanation, and only when the page offers it.
assert.equal((html.match(/Generate from AI/g) || []).length, 1, "one button, on Input 4");
assert.ok(html.indexOf("Generate from AI") > html.indexOf("Input 4: Current and intended audience") && html.indexOf("Generate from AI") < html.indexOf("Input 5: Brand expression"));
assert.match(html, /Uses the customer(&#x27;|&#39;|')s Brand Intelligence and this project(&#x27;|&#39;|')s other answers\. You review it before saving/);
assert.doesNotMatch(ed(empty, false), /Generate from AI/);
console.log("factory-commissions-ui ok");
