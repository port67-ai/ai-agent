import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StudioIntake, { OfferPicker } from "../src/components/factory/StudioIntake";
import GateBar from "../src/components/factory/GateBar";
import PieceCard from "../src/components/factory/PieceCard";
import { StudioSidebar, StudioStagePage } from "../src/components/factory/StudioStages";
import { createStudioProject, projectView, transition } from "../src/lib/factory/engine";
import type { Principal, StudioAssetRef } from "../src/lib/factory/model";

const op: Principal = { workspaceId: "w", subject: "producer", role: "operator" };
const owner: Principal = { workspaceId: "w", accountId: "w", subject: "owner", role: "customer", identity: "firebase" };
const command = async () => true;
const brief = { client: { businessName: "Nash's Bakery", approverEmail: "ann@example.com" }, project: { name: "Spring" } };
const p = createStudioProject({ offer: "scene_pack", brief }, op);

// Offer picker: five cards; the two live offers are buttons; the three parked ones are greyed out, not clickable and marked Parked.
const picker = renderToStaticMarkup(<OfferPicker value="scene_pack" onChange={() => {}} />);
assert.equal((picker.match(/class="f-offer-card/g) || []).length, 5);
for (const id of ["hero_spot", "creator_localisation", "b2b_trailer"]) {
  const card = new RegExp(`<div class="f-offer-card parked" aria-disabled="true" data-offer="${id}">.*?Parked`);
  assert.match(picker, card, id + " is a greyed-out parked card");
  assert.ok(!new RegExp(`<button[^>]*data-offer="${id}"`).test(picker), id + " is not a button");
}
assert.match(picker, /<button type="button" class="f-offer-card selected" aria-pressed="true" data-offer="scene_pack"/);
assert.match(picker, /<button type="button" class="f-offer-card" aria-pressed="false" data-offer="hook_pack"/);

// Intake page: offer first, field groups with markers that follow the offer, uploads, socials, themes, completeness and the gate bar.
const intake = renderToStaticMarkup(<StudioIntake p={projectView(p, op)} operator busy={false} command={command} onUpload={async () => true} />);
assert.ok(intake.indexOf("Choose the offer") < intake.indexOf("Client and project"), "the offer picker comes first");
for (const label of ["Brand Kit", "References and mood", "Product and assets", "Social accounts and themes", "Completeness", "Approve brief", "Approve with a note", "Add theme", "TikTok", "Pinterest"]) assert.ok(intake.includes(label), label);
assert.match(intake, /Mood images \*<\/label> <span class="f-marker required">Required<\/span>/, "scene pack requires mood images");
assert.match(intake, /Product URL <span class="f-marker recommended">Recommended<\/span>/, "scene pack recommends a product URL");
assert.match(intake, /<button type="button" class="f-button" disabled="">Approve brief<\/button>/, "plain approval is blocked while items are missing");
assert.ok(intake.includes("Before a plain approval"));
assert.ok(intake.includes('accept="image/png,image/jpeg,image/webp"') && intake.includes('accept="video/mp4,video/quicktime"'));
const hook = transition(p, { type: "setStudioOffer", offer: "hook_pack" }, op);
const hookIntake = renderToStaticMarkup(<StudioIntake p={projectView(hook, op)} operator busy={false} command={command} onUpload={async () => true} />);
assert.match(hookIntake, /Product URL \* <span class="f-marker required">Required<\/span>/, "hook pack requires a product URL");
assert.match(hookIntake, /Mood images<\/label> <span class="f-marker recommended">Recommended<\/span>/, "hook pack recommends mood images");

// Sidebar: four stages with badges; the active stage is expanded with its steps.
const side = renderToStaticMarkup(<StudioSidebar p={p} tab="studio-intake" go={() => {}} admin />);
for (const label of ["Client intake and brand memory", "Creative strategy", "Pre-production", "Production", "In progress", "Locked", "Brand Kit", "Project settings", "Costs", "Diagnostics", "Approve brief"]) assert.ok(side.includes(label), label);
assert.equal((side.match(/class="f-stage-badge locked"/g) || []).length, 3);
assert.ok(!renderToStaticMarkup(<StudioSidebar p={p} tab="studio-intake" go={() => {}} admin={false} />).includes("Diagnostics"), "Costs and Diagnostics are admin only");

// Gate bar: reopen for producers on an approved stage; client gates name the on-behalf approval for producers only.
let q = transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "Logo to follow" }, op);
const approvedBar = renderToStaticMarkup(<GateBar p={projectView(q, op)} stage="intake" operator busy={false} command={command} />);
assert.ok(approvedBar.includes("Reopen") && approvedBar.includes("with a note: Logo to follow"));
assert.ok(!renderToStaticMarkup(<GateBar p={projectView(q, owner)} stage="intake" operator={false} busy={false} command={command} />).includes("Reopen"), "customers cannot reopen");
q = transition(q, { type: "approveStudioGateWithNote", stage: "strategy", note: "Direction approved offline" }, op);
const opBar = renderToStaticMarkup(<GateBar p={projectView(q, op)} stage="preproduction" operator busy={false} command={command} />);
assert.ok(opBar.includes("Approve concepts (on the client&#x27;s behalf)"));
assert.ok(opBar.includes("Logo to follow"), "notes from earlier gates are shown in later stages");
// Piece B: until a producer shares pre-production for client review, the client sees that Port67 is preparing it.
assert.ok(renderToStaticMarkup(<GateBar p={projectView(q, owner)} stage="preproduction" operator={false} busy={false} command={command} />).includes("Port67 is preparing this stage"));
assert.ok(renderToStaticMarkup(<GateBar p={projectView(q, owner)} stage="strategy" operator={false} busy={false} command={command} />).includes("Approved by"));

// Piece card: current version, image pins and boxes, comments and the five actions.
const image: StudioAssetRef = { id: "img1", name: "board.png", mime: "image/png", bytes: 10, storageKey: "studio/w/x/img1.png", uploadedAt: "2026-11-20T00:00:00.000Z", uploadedBy: "producer" };
q = transition(q, { type: "addStudioPiece", stage: "preproduction", kind: "mood_board", title: "Mood board" }, op);
const pieceId = q.studio!.pieces[0].id;
q.studio!.pieces[0].versions.push({ n: 1, image, createdAt: "2026-11-20T00:00:00.000Z", createdBy: "producer", source: "upload" });
q = transition(q, { type: "addStudioPiece", stage: "preproduction", kind: "scene", title: "Scene 1", dependsOn: [pieceId], text: "Kitchen" }, op);
q = transition(q, { type: "setStudioReadyForClient", stage: "preproduction" }, op);
const clientBar = renderToStaticMarkup(<GateBar p={projectView(q, owner)} stage="preproduction" operator={false} busy={false} command={command} />);
assert.ok(clientBar.includes(">Approve concepts</button>"));
q = transition(q, { type: "commentStudioPiece", pieceId, text: "Warmer light", region: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }, op);
q = transition(q, { type: "commentStudioPiece", pieceId, text: "Remove crumb", region: { x: 0.5, y: 0.5, w: 0, h: 0 } }, owner);
const card = renderToStaticMarkup(<PieceCard p={projectView(q, op)} piece={q.studio!.pieces[0]} operator busy={false} command={command} onUpload={async () => true} />);
assert.match(card, /class="f-region box" style="left:10%;top:20%;width:30%;height:40%" aria-label="Comment 1: Warmer light"/);
assert.match(card, /class="f-region pin" style="left:50%;top:50%" aria-label="Comment 2: Remove crumb"/);
assert.ok(card.includes(`/api/factory/projects/${q.id}/studio/asset/img1`));
for (const label of ["Edit", "Comment", "Rerun", "Approve", "Request changes", "Upload version"]) assert.ok(card.includes(label), label);
const clientCard = renderToStaticMarkup(<PieceCard p={projectView(q, owner)} piece={q.studio!.pieces[0]} operator={false} busy={false} command={command} />);
assert.ok(!clientCard.includes("Rerun") && !clientCard.includes(">Edit") && clientCard.includes("Approve"), "clients comment and approve client-stage pieces; producers edit and rerun");

// Stage page placeholder lists what will appear, then pieces and the gate bar.
const stage = renderToStaticMarkup(<StudioStagePage p={projectView(q, op)} stage="production" operator busy={false} command={command} />);
assert.ok(stage.includes("What will appear here") && stage.includes("This stage opens when the earlier stages are approved"));
console.log("Studio UI: parked offers greyed out, intake markers per offer, sidebar badges, gate bar, piece card and stage pages passed");
