import assert from "node:assert/strict";
import { classifyFailure, failureStatus } from "../src/lib/factory/failure-class";
import { explainError } from "../src/lib/factory/error-help";
import { failedAgents, providerQuota, slotOfTask, taskOfSlot, RERUN_ORDER } from "../src/lib/factory/failed-agents";
import { SLOTS } from "../src/lib/factory/ai-slots";
import { createProject, transition } from "../src/lib/factory/engine";
import { researchTaskKey } from "../src/lib/factory/planning-context";
import { syncTaskPlan } from "../src/lib/factory/task-plan";
import type { Principal, Project, ResearchRun } from "../src/lib/factory/model";

// CHG-0100 pure parts: failure classification (real provider messages), the per-project failed agents (latest-run semantics, stale
// inputs ignored, guards that decide whether a rerun is possible) and the provider-wide quota warning.

// ---- Classification with real-looking provider messages (stored as "AI provider returned <status>: <message>; no output accepted").
const GEMINI_QUOTA = "AI provider returned 429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://aistudio.google.com/usage; no output accepted";
const OPENAI_QUOTA = "AI provider returned 429: You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.; no output accepted";
const cases: [string, number | undefined, string][] = [
  [GEMINI_QUOTA, undefined, "quota"],
  [OPENAI_QUOTA, undefined, "quota"],
  ["insufficient_quota", 429, "quota"],
  ["AI provider returned 402: Insufficient Balance; no output accepted", undefined, "quota"],
  ["AI provider returned 400: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.; no output accepted", undefined, "quota"],
  ["AI provider returned 429: Rate limit reached for gpt-4o-mini in organization org-abc on tokens per min (TPM): Limit 200000, Used 199000, Requested 3000. Please try again in 1.2s.; no output accepted", undefined, "rate_limit"],
  ["AI provider returned 429: Too Many Requests; no output accepted", undefined, "rate_limit"],
  ["AI provider returned 401: Incorrect API key provided: [redacted]. You can find your API key at https://platform.openai.com/account/api-keys.; no output accepted", undefined, "auth"],
  ["AI provider returned 400: API key not valid. Please pass a valid API key.; no output accepted", undefined, "auth"],
  ["AI provider returned 403: Permission denied; no output accepted", undefined, "auth"],
  ["Research: business and brand uses OpenAI, but PORT67_OPENAI_API_KEY is not set in Render", undefined, "auth"],
  ["AI provider returned 404: The model `gpt-9-ultra` does not exist or you do not have access to it.; no output accepted", undefined, "model"],
  ["AI provider returned 404: models/gemini-0.9-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.; no output accepted", undefined, "model"],
  ["AI provider timed out after 100 seconds; usage unknown unless reported", undefined, "timeout"],
  ["AI provider returned 503: The model is overloaded. Please try again later.; no output accepted", undefined, "provider_down"],
  ["AI provider returned 500: Internal error encountered.; no output accepted", undefined, "provider_down"],
  ["AI provider request failed (ECONNRESET); usage unknown unless reported", undefined, "provider_down"],
  ["Invalid planning output", undefined, "invalid_output"],
  ["No usable cited sources returned (OpenAI returned 0 citations). Add sources manually; do not treat uncited synthesis as evidence.", undefined, "invalid_output"],
  ["The scoping agent returned a scope that failed validation: brand questions needs 2 to 6 items", undefined, "invalid_output"],
  ["AI output failed the pre-production contract (the reply was not valid JSON); usage retained, nothing saved", undefined, "invalid_output"],
  ["AI provider returned 400: Invalid JSON payload received. Unknown name \"tools\"; no output accepted", undefined, "other"],
  ["Research context or authorisation changed; no stale findings accepted", undefined, "other"],
];
for (const [text, status, kind] of cases) assert.equal(classifyFailure(text, status).kind, kind, `${kind}: ${text.slice(0, 70)}`);
assert.equal(failureStatus(GEMINI_QUOTA), 429);
const quota = classifyFailure(GEMINI_QUOTA);
assert.equal(quota.title, "The AI provider account has no quota or credit left");
assert.equal(quota.status, 429);
for (const kind of ["quota", "auth", "model"]) {
  const c = classifyFailure(cases.find((x) => x[2] === kind)![0]);
  assert.equal(c.switchFirst, true, kind + " recommends switching provider first");
  assert.match(c.recommendation, /^Switch this agent to another provider or model, then rerun\./);
}
for (const kind of ["rate_limit", "provider_down", "timeout", "invalid_output"]) {
  const c = classifyFailure(cases.find((x) => x[2] === kind)![0]);
  assert.equal(c.switchFirst, false, kind + " recommends a plain rerun");
  assert.match(c.recommendation, /[Rr]erun/);
}
// The planning error help now says a quota failure needs a change (it used to say "wait a minute and retry").
assert.equal(explainError(GEMINI_QUOTA).kind, "Limit or budget");
assert.equal(explainError(GEMINI_QUOTA).needsChange, true);
assert.equal(explainError("AI provider returned 503: overloaded").kind, "Provider", "other provider errors keep their old help");

// ---- Task and slot mapping, order.
assert.equal(slotOfTask("research:brand"), "research:brand");
assert.equal(slotOfTask("draftInsights"), "synthesis:insights");
assert.equal(slotOfTask("insights-draft"), "synthesis:insights", "legacy run tracker row");
assert.equal(slotOfTask("approveDirection"), undefined, "a human step is not an agent");
assert.equal(taskOfSlot("synthesis:planner"), "planResearch");
// Brand Intelligence (CHG-0108) runs on a customer account, not a project, and is rerun from the account page, so it has no project rerun place.
assert.deepEqual([...RERUN_ORDER].sort(), SLOTS.map((s) => s.id).filter((id) => !id.endsWith(":brand-intel")).sort(), "every project agent has a place in the rerun order");
assert.ok(RERUN_ORDER.indexOf("research:brand") < RERUN_ORDER.indexOf("synthesis:insights"));
assert.ok(RERUN_ORDER.indexOf("synthesis:planner") < RERUN_ORDER.indexOf("research:brand"));

// ---- Failed agents for one project.
const op: Principal = { role: "operator", workspaceId: "w", subject: "producer" };
let p: Project = createProject({ business: "Nash's Bakery", objective: "Understand why customers choose sourdough", contact: "nash@example.com", workRequest: "research", useAIPlanner: false }, op, "nash");
p = transition(p, { type: "authoriseAI", confirm: true }, op);
assert.deepEqual(p.taskPlan!.research, ["brand", "customer"]);
let n = 0;
const run = (over: Partial<ResearchRun>): ResearchRun => ({ id: "run-" + ++n, at: new Date(Date.UTC(2026, 10, 20, 10, n)).toISOString(), status: "failed", provider: "gemini", model: "gemini-2.5-flash", usageStatus: "unknown", ...over });
const research = (segment: "brand" | "customer" | "video", over: Partial<ResearchRun> = {}) => run({ stage: "research", segment, taskInputKey: p.taskPlan!.researchKey, researchTaskKey: researchTaskKey(p, segment), ...over });
p.scope = { version: 1, source: "template", at: p.createdAt, briefHash: "h", classification: { category: "local_shop", businessType: "Bakery", size: "small", reach: "local", audienceModel: "b2c", regulated: false, confidence: "limited", rationale: "" }, competitorSet: [], segments: {} as never };
p.runs.push(research("brand", { error: GEMINI_QUOTA }));
let failed = failedAgents(p);
assert.equal(failed.length, 1);
assert.equal(failed[0].slot, "research:brand");
assert.equal(failed[0].failure.kind, "quota");
assert.equal(failed[0].provider, "gemini");
assert.equal(failed[0].taskId, "research:brand");
assert.equal(failed[0].canRerun, true, failed[0].why);
const synced = structuredClone(p); syncTaskPlan(synced);
assert.equal(synced.taskPlan!.tasks.find((t) => t.id === "research:brand")!.status, "blocked", "the failed run blocks its task");
// Stale inputs are ignored: a failure recorded for another brief or another task key is not this project's failure now.
p.runs.push(research("customer", { taskInputKey: "an older brief" , error: "AI provider returned 503: overloaded" }));
p.runs.push(research("video", { error: "AI provider returned 503: overloaded" }));
assert.deepEqual(failedAgents(p).map((x) => x.slot), ["research:brand"], "stale-input and excluded-agent runs are ignored");
// Guards: not authorised, a running task.
assert.match(failedAgents(p, { authorised: false })[0].why!, /Authorise the project brief/);
p.runs.push(research("customer", { status: "running" }));
assert.match(failedAgents(p)[0].why!, /Another agent task is running/);
p.runs.pop();
// A dependent drafting failure waits for its dependencies.
p.runs.push(run({ stage: "insights", provider: "openai", model: "gpt-test", taskInputKey: p.taskPlan!.researchKey, error: "Invalid insights: the model returned nothing" }));
failed = failedAgents(p);
assert.deepEqual(failed.map((x) => x.slot), ["research:brand", "synthesis:insights"], "dependency order");
assert.equal(failed[1].canRerun, false);
assert.match(failed[1].why!, /Waiting for dependencies: .*Review research evidence/);
assert.equal(failed[1].failure.kind, "invalid_output");
// A newer completed run supersedes the failed one, and the task is no longer blocked.
p.runs.push(research("brand", { status: "completed", provider: "openai", model: "gpt-test" }));
assert.deepEqual(failedAgents(p).map((x) => x.slot), ["synthesis:insights"]);
const after = structuredClone(p); syncTaskPlan(after);
assert.equal(after.taskPlan!.tasks.find((t) => t.id === "research:brand")!.status, "done", "a newer completed run supersedes the failure");
// A reviewer whose work has moved on cannot be rerun.
p.runs.push(run({ stage: "review", capabilityId: "review.sources", provider: "openai", model: "gpt-test", taskInputKey: p.taskPlan!.researchKey, error: "AI provider returned 500: Internal error" }));
const reviewer = failedAgents(p).find((x) => x.slot === "review:sources")!;
assert.equal(reviewer.canRerun, false);
assert.match(reviewer.why!, /Nothing is waiting for this reviewer/);
// Planning is off for this project, so a planner failure for other inputs never shows.
p.runs.push(run({ stage: "planning", planningContextKey: "x", error: "Invalid planning output" }));
assert.ok(!failedAgents(p).some((x) => x.slot === "synthesis:planner"));

// ---- Provider-wide quota: an agent's latest call to the provider failed on quota, and no call to it has succeeded since.
const other: Project = createProject({ business: "Other", objective: "Another objective here", contact: "o@example.com", workRequest: "research", useAIPlanner: false }, op, "other");
other.runs.push(run({ stage: "insights", provider: "openai", model: "gpt-test", status: "completed" }));
const q = providerQuota([p, other]);
assert.deepEqual(q.map((x) => x.provider), ["gemini"]);
assert.equal(q[0].slot, "research:brand");
other.runs.push(run({ stage: "research", segment: "customer", provider: "gemini", model: "gemini-2.5-flash", status: "completed" }));
assert.deepEqual(providerQuota([p, other]), [], "a later successful call to the provider clears the warning");
other.runs.push(run({ stage: "insights", provider: "openai", model: "gpt-test", error: OPENAI_QUOTA }));
assert.deepEqual(providerQuota([p, other]).map((x) => x.provider), ["openai"]);

console.log("Agent rerun: failure classification, failed agents per project (latest run, stale inputs, guards, order) and provider quota passed");
