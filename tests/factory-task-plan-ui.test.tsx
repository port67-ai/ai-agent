import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TaskPlanPanel from "../src/components/factory/TaskPlan";
import RunTracker from "../src/components/factory/RunTracker";
import type { Project } from "../src/lib/factory/model";
import { createProject, projectView } from "../src/lib/factory/engine";
const op = { workspaceId: "w", subject: "producer", role: "operator" as const };
const p = createProject({ business: "Shop", objective: "Written email campaign", contact: "a@example.com", workRequest: "campaign" }, op);
const html = renderToStaticMarkup(<TaskPlanPanel p={p} operator busy={false} command={async () => {}} />);
for (const label of ["Project task plan", "Assigned agent", "Dependencies", "Not selected", "Save agent selection", "Plan version 1"]) assert.ok(html.includes(label), label);
assert.ok(!html.includes("[object Object]"));
const customer = projectView(p, { ...op, role: "customer", identity: "firebase", accountId: "w" });
const safe = renderToStaticMarkup(<TaskPlanPanel p={customer} operator={false} busy={false} command={async () => {}} />);
assert.ok(safe.includes("Project progress"));
assert.ok(!safe.includes("Save agent selection"));
assert.ok(!safe.includes("dependsOn"));

const held = {
  runs: [],
  sources: [{ id: "s", kind: "public_source", segment: "brand", status: "supported" }],
  insights: [{ id: "i", status: "reviewed" }],
  strategies: [{ id: "d", version: 1, status: "draft", hash: "held" }],
  assets: [],
  formats: { suggested: [], selected: ["static"], decidedAt: "2026-11-20T00:00:00Z" },
  audiences: { strapline: "Visit us", segments: [] },
  producerAgent: { hold: { gate: "direction", subject: "held", notes: "Audience evidence is still thin." } },
} as unknown as Project;
const heldHtml = renderToStaticMarkup(<RunTracker p={held} command={async () => {}} go={() => {}} aiReady onAi={() => {}} onProducer={() => {}} />);
for (const label of ["Proceed with caveat", "Redraft with AI skill", "Re-run producer review", "Override is explicit, not silent.", "Current stage · Direction"]) assert.ok(heldHtml.includes(label), label);
assert.ok(heldHtml.includes("All tasks and dependencies"), "full task list remains available behind a disclosure");
console.log("Project task view: assignments, selection, dependencies, explicit direction override and compact task progress passed");
