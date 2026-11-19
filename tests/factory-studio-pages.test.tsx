import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioStagePage } from "../src/components/factory/StudioStages";
import StudioStrategy from "../src/components/factory/StudioStrategy";
import StudioPreproduction from "../src/components/factory/StudioPreproduction";
import { projectView, transition } from "../src/lib/factory/engine";
import { createPreproductionPieces, preproductionContext, validateHookPack, validateScenePack } from "../src/lib/factory/studio-preproduction";
import type { Principal, Project } from "../src/lib/factory/model";
import { hookDraft, op, preproductionProject, sceneDraft } from "./factory-studio-fixtures";

// Piece B (CHG-0098): server render of the Stage 2 (Creative strategy) and Stage 3 (Pre-production) pages.
const owner: Principal = { workspaceId: "w", accountId: "w", subject: "owner", role: "customer", identity: "firebase" };
const command = async () => true;
const strategyPage = (p: Project, operator: boolean) =>
  renderToStaticMarkup(
    <StudioStagePage p={p} stage="strategy" operator={operator} busy={false} command={command}>
      <StudioStrategy p={p} operator={operator} busy={false} command={command} live aiReady onRefresh={() => {}} onStartResearch={() => {}} onAi={() => {}} onDirection={async () => true} />
    </StudioStagePage>,
  );
const preproPage = (p: Project, operator: boolean, aiReady = true) =>
  renderToStaticMarkup(
    <StudioStagePage p={p} stage="preproduction" operator={operator} busy={false} command={command} hidePieces>
      <StudioPreproduction p={p} operator={operator} busy={false} command={command} aiReady={aiReady} onDraft={() => {}} onImages={() => {}} />
    </StudioStagePage>,
  );

// ---- Stage 2: one page through research, sources, insights, strapline and audiences, ideas and the direction; no format choice.
const ready = preproductionProject("scene_pack", "ui1");
let strategy = transition(ready, { type: "reopenStudioGate", stage: "strategy", note: "Check the ideas" }, op);
let html = strategyPage(projectView(strategy, op), true);
for (const text of ["Start research", "Source review", "Insights", "Strapline and audiences", "Ideas", "Campaign direction", "Approve research and strategy", "fixed by the Product Scene Pack", "3 to 5 numbered scene themes", "Research reads public pages only"])
  assert.ok(html.includes(text), text);
for (const id of ["strategy-research", "strategy-sources", "strategy-insights", "strategy-audiences", "strategy-ideas", "strategy-direction", "studio-gate"]) assert.ok(html.includes(`id="${id}"`), id);
assert.ok(!html.includes("Confirm formats") && !html.includes("Ad formats"), "the offer fixes the format: no format choice");
assert.ok(!html.includes("What will appear here"), "the placeholder is replaced");
// Gate 2 is ready (accepted insight, approved direction): plain approval is enabled.
assert.match(html, /<button type="button" class="f-button">Approve research and strategy<\/button>/);
// Without an accepted insight the gate lists the blocker and only approve with a note is possible.
const noInsight = structuredClone(strategy);
noInsight.insights.forEach((i) => (i.status = "rejected"));
html = strategyPage(projectView(noInsight, op), true);
assert.ok(html.includes("Accept at least one insight"));
assert.match(html, /disabled="">Approve research and strategy<\/button>/);
assert.ok(html.includes("Approve with a note"));
// Not authorised: the orange button authorises and starts in one step.
const unauth = transition(strategy, { type: "revokeAI" }, op);
assert.ok(strategyPage(projectView(unauth, op), true).includes("Authorise public data and start research"));
// Customers see progress and the direction but no producer controls.
const client = strategyPage(projectView(strategy, owner), false);
assert.ok(!client.includes("Start research") && !client.includes("Review one by one") && !client.includes("Ideas bank"));

// ---- Stage 3 before the draft: the button and clear error states.
strategy = ready;
html = preproPage(projectView(strategy, op), true);
assert.ok(html.includes("Draft pre-production") && !html.includes("Generate test frames"));
assert.ok(html.includes("then the first 5 test frames are drawn"));
assert.ok(preproPage(projectView(strategy, op), true, false).includes("No model chosen: AI drafting is not configured"));
assert.ok(preproPage(projectView(transition(strategy, { type: "revokeAI" }, op), op), true).includes("AI is not authorised for this brief"));
assert.ok(html.includes("Draft pre-production first"), "gate 3 blocker before anything exists");
assert.ok(html.includes("Ready for client review"));
const failed = structuredClone(strategy);
failed.runs.push({ id: "r", stage: "studio", capabilityId: "studio.preproduction", at: "2026-11-20T00:00:00.000Z", status: "failed", provider: "openai", model: "m", error: "AI provider returned 429: Rate limit reached; no output accepted" });
assert.ok(preproPage(projectView(failed, op), true).includes("The last pre-production call failed: AI provider returned 429: Rate limit reached"));

// ---- Stage 3 after the draft: grouped pieces, progress, the generate button and sharing.
const drafted = structuredClone(strategy);
createPreproductionPieces(drafted.studio!, validateScenePack(sceneDraft(), preproductionContext(drafted)), preproductionContext(drafted), { by: "producer", runId: "run" });
html = preproPage(projectView(drafted, op), true);
for (const text of ["Mood board and continuity", "Scenes and test frames", "0 of 14 approved", "Generate test frames (6)", "6 test frames not drawn yet", "Ready for client review", "Rerun", "Request changes"]) assert.ok(html.includes(text), text);
assert.ok(!html.includes(">Draft pre-production<"), "drafting happens once");
assert.equal((html.match(/class="f-piece-pair"/g) || []).length, 6, "each scene sits next to its test frame");
assert.equal((html.match(/class="f-piece-card"/g) || []).length, 14, "every piece shown once");
const firstFrameDrawn = structuredClone(drafted);
firstFrameDrawn.studio!.pieces.find((x) => x.kind === "test_frame")!.versions.push({ n: 1, image: { id: "i", name: "f.png", mime: "image/png", bytes: 1, storageKey: "studio/w/ui1/i.png", uploadedAt: "2026-11-20T00:00:00.000Z", uploadedBy: "producer" }, createdAt: "2026-11-20T00:00:00.000Z", createdBy: "producer", source: "ai" });
assert.ok(preproPage(projectView(firstFrameDrawn, op), true).includes("Generate remaining test frames (5)"));
// Customers: nothing until shared; then the pieces and the client approval.
assert.ok(preproPage(projectView(drafted, owner), false).includes("Port67 is preparing"));
assert.ok(!preproPage(projectView(drafted, owner), false).includes("f-piece-card"));
const shared = transition(drafted, { type: "setStudioReadyForClient", stage: "preproduction" }, op);
html = preproPage(projectView(shared, owner), false);
assert.equal((html.match(/class="f-piece-card"/g) || []).length, 14);
assert.ok(html.includes("Approve concepts") && !html.includes("Rerun") && !html.includes("Draft pre-production"));
assert.ok(preproPage(projectView(shared, op), true).includes("Withdraw from client review"));

// ---- Hook pack grouping: script, each narrative with its hooks and keyframes, then shot list and voice notes.
const hook = preproductionProject("hook_pack", "ui2");
createPreproductionPieces(hook.studio!, validateHookPack(hookDraft(), preproductionContext(hook)), preproductionContext(hook), { by: "producer", runId: "run" });
html = preproPage(projectView(hook, op), true);
for (const text of ["Body script", "Narrative 1: Story 1", "Narrative 3: Story 3", "Shot list, voice and captions", "Generate keyframes (12)", "Hook 2.3: Split-screen comparison"]) assert.ok(html.includes(text), text);
assert.equal((html.match(/class="f-piece-pair"/g) || []).length, 12, "each hook sits next to its keyframe");
console.log("Studio pages: Stage 2 walk-through and Stage 3 pre-production render for producers and clients passed");
