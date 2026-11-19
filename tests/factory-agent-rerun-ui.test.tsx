import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SystemMap from "../src/components/factory/SystemMap";
import RunTracker from "../src/components/factory/RunTracker";
import TaskPlanPanel from "../src/components/factory/TaskPlan";
import RerunDialog, { FailedAgentsBar, suggestSwitch } from "../src/components/factory/RerunDialog";
import { QuotaBanners } from "../src/components/factory/AiAgents";
import { pipelineStats, edgeStats, modelStats, findBlockers } from "../src/lib/factory/observability";
import { failedAgents } from "../src/lib/factory/failed-agents";
import { createProject, transition } from "../src/lib/factory/engine";
import { researchTaskKey } from "../src/lib/factory/planning-context";
import { syncTaskPlan } from "../src/lib/factory/task-plan";
import type { Principal, Project } from "../src/lib/factory/model";

// CHG-0100 server renders: the map node with its Rerun button and per-project FAILED badges, the task planner row and the "Your
// turn" banner, the rerun dialog (admin and producer), the studio page bar, and the provider quota banner.
const GEMINI_QUOTA = "AI provider returned 429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.google.com/usage; no output accepted";
const op: Principal = { role: "operator", workspaceId: "w", subject: "producer" };
let p: Project = createProject({ business: "Nash's Bakery", objective: "Understand why customers choose sourdough", contact: "nash@example.com", workRequest: "research", useAIPlanner: false }, op, "nash");
p = transition(p, { type: "authoriseAI", confirm: true }, op);
p.aiAuthorised = true;
p.scope = { version: 1, source: "template", at: p.createdAt, briefHash: "h", classification: { category: "local_shop", businessType: "Bakery", size: "small", reach: "local", audienceModel: "b2c", regulated: false, confidence: "limited", rationale: "" }, competitorSet: [], segments: {} as never };
p.runs.push({ id: "r1", at: "2026-11-20T10:00:00.000Z", finishedAt: "2026-11-20T10:00:05.000Z", stage: "research", segment: "brand", status: "failed", provider: "gemini", model: "gemini-2.5-flash", taskInputKey: p.taskPlan!.researchKey, researchTaskKey: researchTaskKey(p, "brand"), error: GEMINI_QUOTA });
const failed = failedAgents(p);
assert.equal(failed.length, 1);

// ---- System map: per-project FAILED badge and Rerun button; a globally failing agent that did not fail here is not marked.
const stats = (calls: number, failedCalls = 0) => ({ calls, completed: calls - failedCalls, failed: failedCalls, unknown: 0, inFlight: 0, inputTokens: 10, outputTokens: 5, estimatedMicroUsd: calls * 1000, lastStatus: failedCalls ? "failed" : "completed" });
const ai = (id: string, group: string, name: string, provider: string, model: string, st = stats(1)) => ({ id, group, name, purpose: "", kind: "ai", model: { provider, model, source: "slot", priced: true }, stats: st });
const agents = [
  ai("scope:business", "scoping", "Scoping agent", "openai", "gpt-s"),
  ai("research:brand", "research", "Business and brand researcher", "gemini", "gemini-2.5-flash", stats(2, 2)),
  ai("research:customer", "research", "Customer insight researcher", "gemini", "gemini-2.5-flash", stats(1, 1)),
  ...["competitor", "creative", "adjacent", "trends", "video"].map((s) => ai("research:" + s, "research", s + " researcher", "gemini", "gemini-2.5-flash")),
  ai("synthesis:insights", "drafting", "Insights agent", "openai", "gpt-a"),
  ai("synthesis:strategy", "drafting", "Direction agent", "openai", "gpt-a"),
  ai("synthesis:content", "drafting", "Copy pack agent", "openai", "gpt-a"),
  ...["scope", "sources", "insights", "direction"].map((g) => ai("review:" + g, "review", g + " producer", "openai", "gpt-r")),
] as unknown as React.ComponentProps<typeof SystemMap>["agents"];
const pipeline = pipelineStats([]);
const edges = edgeStats([]);
const flow = { pipeline, edges, scopes: [], models: modelStats([]), blockers: findBlockers(pipeline, edges, []), projectsError: "", errors: {}, quota: [] } as unknown as React.ComponentProps<typeof SystemMap>["flow"];
const whole = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow }));
assert.equal((whole.match(/>FAILED</g) || []).length, 2, "without a project the map shows system-wide health");
assert.ok(!whole.includes("data-rerun="), "no Rerun without a chosen project");
const mapHtml = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow, failed, onRerun: () => undefined, onRerunAll: () => undefined }));
assert.equal((mapHtml.match(/>FAILED</g) || []).length, 1, "with a project chosen only its failed agent is marked");
assert.match(mapHtml, /data-rerun="research:brand"/);
assert.match(mapHtml, /aria-label="Business and brand: rerun for this project"/);
assert.ok(!mapHtml.includes('data-rerun="research:customer"'));
assert.match(mapHtml, /Rerun failed agents \(1\)/);

// ---- Task planner: the blocked row explains the failure in plain English with a Rerun button; the banner offers the rerun.
const tracker = renderToStaticMarkup(React.createElement(RunTracker, { p, failed, onRerun: () => undefined }));
assert.match(tracker, /data-rerun-task="research:brand"/);
assert.match(tracker, /The AI provider account has no quota or credit left\. Switch this agent to another provider or model, then rerun\./);
assert.match(tracker, /data-rerun-next="research:brand"[^>]*>Rerun Research: business and brand</);
assert.match(tracker, /Your turn/);
const banner = tracker.slice(tracker.indexOf('data-testid="next-action"'), tracker.indexOf("</p>", tracker.indexOf('data-testid="next-action"')));
assert.ok(!/Run ready tasks/.test(banner), "the banner does not tell the user to press Run ready tasks");
const view = structuredClone(p);
syncTaskPlan(view); // as the project view the portal receives
const plan = renderToStaticMarkup(React.createElement(TaskPlanPanel, { p: view, operator: true, busy: false, command: () => undefined, failed, onRerun: () => undefined }));
assert.match(plan, /data-rerun-task="research:brand"/);

// ---- Rerun dialog: an admin sees the switch prefilled with another keyed web-search provider; a producer cannot switch.
const routing = { config: { slots: {} }, providers: [{ id: "openai", label: "OpenAI", research: true, keyConfigured: true, keyName: "PORT67_OPENAI_API_KEY" }, { id: "gemini", label: "Google Gemini", research: true, keyConfigured: true, keyName: "PORT67_GEMINI_API_KEY" }, { id: "anthropic", label: "Anthropic Claude", research: false, keyConfigured: true, keyName: "PORT67_ANTHROPIC_API_KEY" }] } as unknown as React.ComponentProps<typeof RerunDialog>["routing"];
const suggest = { models: { openai: ["gpt-5-mini"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-sonnet"] }, best: { openai: "gpt-5-mini", gemini: "gemini-2.5-flash", anthropic: "claude-sonnet" }, suggested: { research: null, synthesis: null }, notes: [] };
assert.deepEqual(suggestSwitch(failed[0], routing, suggest), { provider: "openai", model: "gpt-5-mini" }, "research agents only switch to OpenAI or Gemini, never the failing one");
const dialog = renderToStaticMarkup(React.createElement(RerunDialog, { projectId: p.id, agent: failed[0], admin: true, routing, suggest, onClose: () => undefined, onDone: () => undefined }));
for (const t of ["Rerun Research: business and brand", "The AI provider account has no quota or credit left", "Raw error message", "exceeded your current quota", "Switch to gpt-5-mini and rerun", "Rerun with gemini-2.5-flash", "Google Gemini gemini-2.5-flash", "for every project"]) assert.ok(dialog.includes(t), t);
assert.ok(dialog.indexOf("Switch to gpt-5-mini and rerun") < dialog.indexOf("Rerun with gemini-2.5-flash"), "for a quota failure switching is the first, main action");
assert.ok(!dialog.includes(">Anthropic Claude<"), "a provider without web search is not offered for research");
const producerDialog = renderToStaticMarkup(React.createElement(RerunDialog, { projectId: p.id, agent: failed[0], admin: false, onClose: () => undefined, onDone: () => undefined }));
assert.ok(!producerDialog.includes("Switch to"));
assert.match(producerDialog, /Only an admin can switch this agent/);
assert.match(producerDialog, /Rerun with gemini-2\.5-flash/);

// ---- Studio page bar and the quota banner.
const bar = renderToStaticMarkup(React.createElement(FailedAgentsBar, { failed, onRerun: () => undefined }));
assert.match(bar, /An AI agent failed on this project/);
assert.match(bar, /data-failed="research:brand"/);
assert.match(bar, />Rerun</);
const quota = renderToStaticMarkup(React.createElement(QuotaBanners, { quota: [{ provider: "gemini", label: "Google Gemini", at: "2026-11-20T10:00:05.000Z", message: GEMINI_QUOTA, agents: ["research:brand", "research:customer", "research:competitor"] }, { provider: "deepseek", label: "DeepSeek", at: "2026-11-20T09:00:00.000Z", message: "x", agents: [] }], target: () => "OpenAI", onMove: () => undefined }));
assert.match(quota, /Google Gemini has no quota left\. 3 agents still use it\./);
assert.match(quota, /Move these agents to OpenAI/);
assert.ok(!quota.includes("DeepSeek has no quota"), "a provider no agent uses any more needs no banner");

console.log("Agent rerun UI: map node Rerun and per-project FAILED, task row and Your turn banner, rerun dialog, studio bar and quota banner render passed");
