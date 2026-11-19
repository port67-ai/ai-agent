import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioSidebar, StudioStagePage } from "../src/components/factory/StudioStages";
import StudioProduction from "../src/components/factory/StudioProduction";
import { projectView, transition } from "../src/lib/factory/engine";
import { addPieceVersion } from "../src/lib/factory/studio";
import { applyPieceUpload } from "../src/lib/factory/studio-commands";
import { productionPieces } from "../src/lib/factory/studio-production";
import type { Principal, Project } from "../src/lib/factory/model";
import { op } from "./factory-studio-fixtures";
import { fakeRef, productionProject } from "./factory-studio-production-fixtures";

// Piece C (CHG-0099): server render of the Stage 4 Production page and the Delivered view for producers and clients.
const owner: Principal = { workspaceId: "w", accountId: "w", subject: "owner", role: "customer", identity: "firebase" };
const command = async () => true;
const page = (p: Project, operator: boolean, aiReady = true, results?: React.ReactNode) =>
  renderToStaticMarkup(
    <StudioStagePage p={p} stage="production" operator={operator} busy={false} command={command} hidePieces>
      <StudioProduction p={p} operator={operator} busy={false} command={command} aiReady={aiReady} onPrepare={() => {}} onLoops={() => {}} onStills={() => {}} onUpload={async () => true} onNextCycle={() => {}} results={results} />
    </StudioStagePage>,
  );
const count = (html: string, re: RegExp) => (html.match(re) || []).length;

// ---- Scene Pack before preparation: the button, the gate blocker, no checklist yet.
let scene = productionProject("scene_pack", "pg1");
let html = page(projectView(scene, op), true);
for (const text of ["Stills (25 in scope) and optional motion loops", "Prepare production (12 stills)", "Prepare production first", "Approve final work"]) assert.ok(html.includes(text), text);
assert.ok(!html.includes("Go-to-market checks") && !html.includes("What will appear here"));
for (const id of ["production-prepare", "studio-pieces", "studio-gate"]) assert.ok(html.includes(`id="${id}"`), id);
// Nothing approved in pre-production: a clear empty state.
const none = structuredClone(scene);
none.studio!.pieces.filter((x) => x.kind === "scene").forEach((x) => (x.status = "changes_requested"));
assert.ok(page(projectView(none, op), true).includes("Nothing to prepare: no scene is approved in pre-production"));

// ---- After preparation: grouped stills, batch draw, checklist states and the delivery pack's empty state.
scene = transition(scene, { type: "prepareStudioProduction" }, op);
html = page(projectView(scene, op), true);
for (const text of ["Generate next 5 stills", "Generate all remaining stills (12)", "Go-to-market checks", "Scope and revision rounds", "Rights and consent", "Claims", "AI disclosure", "Channel specs", "Product accuracy", "Variant naming and test plan", "Delivery pack", "Launch handoff", "Performance read-back", "Next cycle", "No approved final pieces with a file yet", "Manifest (JSON)", "Test plan (CSV)", "Results template (CSV)"])
  assert.ok(html.includes(text), text);
assert.equal(count(html, /class="f-piece-card"/g), 12);
assert.equal(count(html, /class="f-piece-group"/g), 6, "stills grouped by scene");
assert.ok(html.includes(">Blocked<") && html.includes(">Needs you<"), "states are shown");
assert.ok(html.includes("Motion loops (optional, 0 to 10)") && html.includes("Add motion loops"), "loops are an option once the stills are prepared");
assert.ok(page(projectView(scene, op), true, false).includes("No model chosen: image generation is not configured"));
const drawing = renderToStaticMarkup(<StudioProduction p={projectView(scene, op)} operator busy={false} command={command} aiReady drawing onStop={() => {}} stillProgress="Drawing still 2 of 5…" />);
assert.ok(drawing.includes("Stop after this image") && drawing.includes("Drawing still 2 of 5…"));
// Customers: nothing until shared.
html = page(projectView(scene, owner), false);
assert.ok(html.includes("Port67 is producing the final pieces") && !html.includes("Go-to-market checks") && !html.includes("f-piece-card"));

// ---- Delivered: approved files, read-back with variant names, winners, next cycle, sidebar links.
const ids = productionPieces(scene.studio!).map((x) => x.id);
for (const x of productionPieces(scene.studio!)) addPieceVersion(scene.studio!, x.id, { image: fakeRef(`f-${x.id.slice(-12)}`, "image/png", 1080, x.id.endsWith("4x5") ? 1350 : 1080, { aiDisclosure: "ai_generated", rights: { source: "AI generated", licence: "Generated for this project" } }), source: "ai" }, { by: "producer" });
scene = transition(scene, { type: "confirmStudioGtm", check: "scope", note: "Two rounds" }, op);
scene = transition(scene, { type: "confirmStudioGtm", check: "disclosure" }, op);
scene = transition(scene, { type: "confirmStudioPieceCheck", check: "productAccuracy", pieceIds: ids }, op);
for (const id of ids) scene = transition(scene, { type: "setStudioPieceStatus", pieceId: id, status: "approved" }, op);
html = page(projectView(scene, op), true);
assert.ok(html.includes("Ready for final approval"), "every blocking check passes");
assert.match(html, /<button type="button" class="f-button">Approve final work \(on the client&#x27;s behalf\)<\/button>/);
assert.ok(html.includes("nash-s-bakery_scene-pack_scene01_4x5_v1.png"));
assert.ok(html.includes("Add motion loops"));
scene = transition(scene, { type: "approveStudioGate", stage: "production" }, op);
scene.performance = [{ campaign: "Spring", channel: "instagram", format: "static", objective: "Scene test", audience: "UK", offer: "10% off", start: "2025-01-01", end: "2025-01-10", provenance: "Export", attribution: "7-day click", currency: "GBP", publicAuthorised: false, id: "r1", status: "accepted", createdAt: "2025-01-11T00:00:00.000Z", createdBy: "producer", variant: "nash-s-bakery_scene-pack_scene01_4x5", impressions: 1000, clicks: 25, spend: 40, purchases: 4 }];
html = page(projectView(scene, op), true, true, <p>RESULTS-PANEL</p>);
for (const text of ["Delivered", "Performance read-back", "nash-s-bakery_scene-pack_scene01_4x5", "2.5%", "10.00 GBP", "unknown", "Start next cycle", "Results template with variant names (CSV)", "RESULTS-PANEL"]) assert.ok(html.includes(text), text);
assert.ok(html.includes('id="delivery-readback"') && html.includes('id="delivery-pack"'));
assert.ok(!html.includes("Prepare production") && !html.includes("Generate next"), "no production controls once delivered");
const sidebar = renderToStaticMarkup(<StudioSidebar p={projectView(scene, op)} tab="studio-production" go={() => {}} admin={false} />);
assert.ok(sidebar.includes("Delivered") && sidebar.includes("Delivery pack") && sidebar.includes("Read-back"));
// The client after delivery: the pack and downloads, no producer controls or read-back numbers.
html = page(projectView(scene, owner), false);
assert.ok(html.includes("Delivered") && html.includes("Manifest (readable)") && !html.includes("Results template") && !html.includes("Start next cycle") && !html.includes("Confirm scope"));

// ---- Hook pack: variants with prompt packs and upload slots, the no-video-tool state, and checks after an upload.
let hook = productionProject("hook_pack", "pg2");
hook = transition(hook, { type: "prepareStudioProduction" }, op);
html = page(projectView(hook, op), true);
for (const text of ["Twelve video variants (3 narratives x 4 hooks)", "No video tool connected; upload the clip", "AI disclosure for this file (required)", "Prompt pack: 4 shots, voice-over, captions and music", "Download prompt pack", "Narrative 1: Story 1", "Upload MP4"]) assert.ok(html.includes(text), text);
assert.equal(count(html, /class="f-gate-form f-upload-slot"/g), 12);
assert.ok(!html.includes("Generate next"), "variants are uploaded, not drawn");
const v = productionPieces(hook.studio!)[0];
applyPieceUpload(hook, v.id, fakeRef("clip", "video/mp4", 720, 1280, { seconds: 23, aiDisclosure: "ai_edited" }), op);
html = page(projectView(hook, op), true);
assert.ok(html.includes("Resolution 720 x 1280 is below the minimum") && html.includes("Confirm exception"));
assert.ok(html.includes("Sound: record the music and voice-over"));
assert.ok(html.includes("Safe zones") && html.includes("overlay template"));
console.log("Studio production pages: Stage 4 for both offers, checklist states, delivery pack, delivered view and sidebar render for producers and clients passed");
