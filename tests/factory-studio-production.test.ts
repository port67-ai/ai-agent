import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { projectView, transition } from "../src/lib/factory/engine";
import { addPieceVersion, approveStudioGate, currentStudioStage } from "../src/lib/factory/studio";
import { applyPieceUpload } from "../src/lib/factory/studio-commands";
import { cropPngToRatio, decodePng, encodePng, mediaInfo, minimalMp4 } from "../src/lib/factory/studio-media";
import { buildStillPrompt, planProduction, productionPieces, scriptBeats, stillReferences, variantPromptPack } from "../src/lib/factory/studio-production";
import {
  claimFlags, deliveryManifest, fileBase, gtmChecks, handoffMarkdown, manifestMarkdown, productionGateBlockers, readback, readbackTemplateCsv, specCheck, testMatrixCsv,
} from "../src/lib/factory/studio-gtm";
import { studioGateBlockers } from "../src/lib/factory/studio";
import { parsePerformanceCsv, validatePerformance, type PerformanceRecord } from "../src/lib/factory/performance";
import type { Principal } from "../src/lib/factory/model";
import { op } from "./factory-studio-fixtures";
import { fakeRef, productionProject } from "./factory-studio-production-fixtures";

// Piece C (CHG-0099): media headers, production planning, prompts, go-to-market checks, naming, test plan, manifest, gate 4,
// delivery, read-back and resetProject gating. No network.
const admin: Principal = { ...op, admin: true };

// ---------- Media headers: real PNG, JPEG, WebP and MP4 fixtures built in code ----------
const rows = (w: number, h: number, bpp = 3) => Array.from({ length: h }, (_, y) => Uint8Array.from({ length: w * bpp }, (_, x) => (x + y * 7) & 0xff));
const png = encodePng(20, 30, 2, rows(20, 30));
assert.deepEqual(mediaInfo(png, "image/png"), { width: 20, height: 30 });
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x07, 0x80, 0x04, 0x38, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
assert.deepEqual(mediaInfo(jpeg, "image/jpeg"), { width: 1080, height: 1920 });
const vp8x = Buffer.alloc(30); vp8x.write("RIFF", 0); vp8x.write("WEBP", 8); vp8x.write("VP8X", 12); vp8x.writeUIntLE(1079, 24, 3); vp8x.writeUIntLE(1349, 27, 3);
assert.deepEqual(mediaInfo(vp8x, "image/webp"), { width: 1080, height: 1350 });
assert.deepEqual(mediaInfo(minimalMp4(1080, 1920, 23.5), "video/mp4"), { width: 1080, height: 1920, seconds: 23.5 });
assert.deepEqual(mediaInfo(minimalMp4(1920, 1080, 5, true), "video/mp4"), { width: 1080, height: 1920, seconds: 5 }, "a quarter-turn matrix swaps width and height");
assert.equal(mediaInfo(Buffer.from("not a file"), "video/mp4"), undefined);
assert.equal(mediaInfo(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 3)]), "image/png"), undefined, "a PNG signature without IHDR has no size");
// Crop 2:3 to 4:5 keeps the full width and the centre rows.
const cropped = cropPngToRatio(png, 4 / 5);
assert.equal(cropped.cropped, true);
assert.deepEqual([cropped.width, cropped.height], [20, 25]);
const back = decodePng(cropped.bytes);
assert.deepEqual(back.rows.map((r) => Buffer.from(r).toString("hex")), rows(20, 30).slice(2, 27).map((r) => Buffer.from(r).toString("hex")));
assert.deepEqual(mediaInfo(cropped.bytes, "image/png"), { width: 20, height: 25 });
assert.equal(cropPngToRatio(encodePng(10, 10, 2, rows(10, 10)), 1).cropped, false, "already the right ratio");
// Filtered rows (Sub and Paeth) decode correctly: write a PNG by hand with filter bytes 1 and 4.
const raw = Buffer.concat([Buffer.from([1, 10, 20, 30, 5, 5, 5]), Buffer.from([4, 1, 1, 1, 2, 2, 2])]);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 2;
const manual = encodePng(2, 2, 2, [new Uint8Array(6), new Uint8Array(6)]);
const decoded = decodePng(Buffer.concat([manual.subarray(0, 33), ((): Buffer => { const body = deflateSync(raw); const h = Buffer.alloc(8); h.writeUInt32BE(body.length, 0); h.write("IDAT", 4); const c = Buffer.alloc(4); return Buffer.concat([h, body, c]); })()]));
assert.deepEqual([...decoded.rows[0]], [10, 20, 30, 15, 25, 35]);
assert.deepEqual([...decoded.rows[1]], [11, 21, 31, 17, 27, 37]);

// ---------- Scene Pack: preparation, prompts, references ----------
let scene = productionProject("scene_pack", "c1");
assert.equal(currentStudioStage(scene.studio!), "production");
let plan = planProduction(scene.studio!);
assert.equal(plan.create.length, 12, "6 approved scenes x 2 ratios");
const scenes = scene.studio!.pieces.filter((x) => x.kind === "scene");
const frames = scene.studio!.pieces.filter((x) => x.kind === "test_frame");
assert.deepEqual(plan.create[0].dependsOn, [scenes[0].id, frames[0].id], "each still depends on its scene and its test frame");
assert.deepEqual(plan.create.slice(0, 2).map((x) => x.id), [`still-${scenes[0].id}-4x5`, `still-${scenes[0].id}-1x1`]);
// The intake quantity caps the stills; unapproved scenes are skipped and listed.
const capped = structuredClone(scene);
capped.studio!.brief.project.quantity = 5;
capped.studio!.pieces.find((x) => x.id === scenes[1].id)!.status = "changes_requested";
plan = planProduction(capped.studio!);
assert.equal(plan.create.length, 5);
assert.ok(plan.skipped.some((x) => /not approved/.test(x)) && plan.skipped.some((x) => /already has 5 stills/.test(x)));
assert.throws(() => transition(scene, { type: "prepareStudioProduction" }, { ...op, role: "customer", projectId: scene.id }), /operator/);
scene = transition(scene, { type: "prepareStudioProduction" }, op);
assert.equal(productionPieces(scene.studio!).length, 12);
assert.throws(() => transition(scene, { type: "prepareStudioProduction" }, op), /already prepared/, "preparing again adds only what is missing");
const stills = productionPieces(scene.studio!);
const portrait = stills[0], square = stills[1];
const prompt = buildStillPrompt(scene.studio!, portrait);
assert.match(prompt, /^Final photographic lifestyle still/);
assert.match(prompt, /Scene: Sourdough on an oak board at breakfast/);
assert.match(prompt, /Lighting: Soft window key from camera left/);
assert.match(prompt, /Reference images: the first is the approved test frame.*packshots: reproduce the product exactly/);
assert.match(prompt, /drawn at 2:3 and cropped to 4:5/);
assert.ok(!prompt.includes("SENTINEL-AVOID"), "the client's raw brief text is never an instruction");
assert.match(buildStillPrompt(scene.studio!, square), /Format: square 1:1/);
const refs = stillReferences(scene.studio!, portrait);
assert.equal(refs.frame?.id, frames[0].versions[0].image!.id);
assert.deepEqual(refs.packshots.map((x) => x.id), ["pack-sourdough"]);
// Loops: up to ten upload pieces spread over the scenes with stills.
assert.throws(() => transition(scene, { type: "setStudioLoops", count: 11 }, op), /0 to 10/);
scene = transition(scene, { type: "setStudioLoops", count: 2 }, op);
const loops = productionPieces(scene.studio!).filter((x) => x.kind === "loop");
assert.deepEqual(loops.map((x) => x.dependsOn), [[scenes[0].id], [scenes[1].id]]);
scene = transition(scene, { type: "removeStudioPiece", pieceId: loops[1].id }, op);
assert.equal(productionPieces(scene.studio!).filter((x) => x.kind === "loop").length, 1);

// ---------- Naming determinism and the test matrix ----------
const st = scene.studio!;
assert.equal(fileBase(st, portrait), "nash-s-bakery_scene-pack_scene01_4x5_v1");
assert.equal(fileBase(st, square), "nash-s-bakery_scene-pack_scene01_1x1_v1");
assert.equal(fileBase(st, loops[0]), "nash-s-bakery_scene-pack_scene01_loop01_v1");
assert.equal(fileBase(structuredClone(st), portrait), fileBase(st, portrait), "the same inputs always give the same name");
const csv = testMatrixCsv(st);
assert.match(csv, /^file_name,variant,kind,narrative_or_scene,hook_or_ratio/);
assert.match(csv, /nash-s-bakery_scene-pack_scene01_4x5_v1\.png,nash-s-bakery_scene-pack_scene01_4x5,still,scene 1,4:5,Theme 1,Sourdough/);
assert.equal(csv.trim().split("\n").length, 1 + 13);

// ---------- Gate 4 and the go-to-market checks (Scene Pack) ----------
assert.ok(productionGateBlockers(scene.studio!, scene).some((x) => /no file yet/.test(x)));
assert.ok(studioGateBlockers(scene.studio!, "production", scene).length > 0, "registered as the production gate check");
assert.throws(() => transition(scene, { type: "approveStudioGate", stage: "production" }, op), /Not ready to approve/);
// Draw every still (fake files at the delivered sizes) and upload the loop.
for (const x of productionPieces(scene.studio!).filter((y) => y.kind === "still")) {
  const four = x.id.endsWith("4x5");
  addPieceVersion(scene.studio!, x.id, { image: fakeRef(`f-${x.id.slice(-12)}`, "image/png", 1024, four ? 1280 : 1024, { aiDisclosure: "ai_generated", rights: { source: "AI generated with OpenAI gpt-image-1", licence: "Generated for this project" } }), source: "ai" }, { by: "producer" });
}
applyPieceUpload(scene, loops[0].id, fakeRef("loop-file", "video/mp4", 1080, 1350, { seconds: 5, aiDisclosure: "ai_generated" }), op);
let checks = gtmChecks(scene.studio!, scene);
const state = (id: string) => checks.find((c) => c.id === id)!;
assert.equal(state("rights").state, "needs_you", "the uploaded loop has no source and licence: missing rights block delivery");
assert.ok(state("rights").items.some((x) => x.state === "needs_you" && x.assetId === "loop-file"));
assert.equal(state("specs").state, "pass", `${JSON.stringify(state("specs").items.filter((x) => x.state !== "pass"))}`);
assert.match(state("specs").items[0].text, /1024 x 1280 meets 4:5 image.*below the recommended 1080 px/);
assert.equal(state("disclosure").state, "needs_you");
assert.ok(state("disclosure").items.some((x) => /EU AI Act Article 50: from 2 August 2026/.test(x.text)) && state("disclosure").items.some((x) => /AI info/.test(x.text)));
assert.equal(state("scope").state, "needs_you");
assert.ok(state("scope").items.some((x) => /25 stills in scope.*12 planned/.test(x.text)));
assert.equal(state("product").state, "needs_you");
assert.equal(state("safe_zones").state, "needs_you", "the loop is video: safe zones checked by a person");
assert.equal(state("claims").state, "pass", JSON.stringify(state("claims").items));
assert.equal(state("delivery").state, "blocked", "nothing approved yet: the manifest cannot be built");
assert.throws(() => deliveryManifest(scene.studio!, scene), /No approved final pieces/);
// A spec failure needs a new file or a confirmed exception with a reason.
const wrong = structuredClone(scene);
const wrongStill = productionPieces(wrong.studio!)[0];
addPieceVersion(wrong.studio!, wrongStill.id, { image: fakeRef("wide", "image/png", 1024, 1536), source: "ai" }, { by: "producer" });
assert.match(specCheck(productionPieces(wrong.studio!)[0]).problems.join(), /Aspect ratio 1024 x 1536 is not 4:5/);
assert.throws(() => transition(wrong, { type: "confirmStudioPieceCheck", check: "specs", pieceIds: [wrongStill.id] }, op), /record why it is acceptable/);
const excepted = transition(wrong, { type: "confirmStudioPieceCheck", check: "specs", pieceIds: [wrongStill.id], note: "Client will crop in Ads Manager" }, op);
assert.equal(gtmChecks(excepted.studio!, excepted).find((c) => c.id === "specs")!.items.find((x) => x.pieceId === wrongStill.id)!.state, "pass");
// Records a producer decides.
scene = transition(scene, { type: "setStudioAssetRights", assetId: "loop-file", source: "Made in Runway from the approved still", licence: "Owned by the client" }, op);
assert.throws(() => transition(scene, { type: "confirmStudioGtm", check: "scope" }, op), /revision rounds/);
scene = transition(scene, { type: "confirmStudioGtm", check: "scope", note: "Two rounds of client changes agreed" }, op);
scene = transition(scene, { type: "confirmStudioGtm", check: "disclosure" }, op);
const prodIds = productionPieces(scene.studio!).map((x) => x.id);
assert.throws(() => transition(scene, { type: "confirmStudioPieceCheck", check: "safeZones", pieceIds: [prodIds[0]] }, op), /safe zones are checked on video/);
scene = transition(scene, { type: "confirmStudioPieceCheck", check: "safeZones", pieceIds: [loops[0].id] }, op);
scene = transition(scene, { type: "confirmStudioPieceCheck", check: "productAccuracy", pieceIds: prodIds }, op);
for (const id of prodIds) scene = transition(scene, { type: "setStudioPieceStatus", pieceId: id, status: "approved" }, op);
checks = gtmChecks(scene.studio!, scene);
assert.deepEqual(checks.filter((c) => c.blocking && c.state !== "pass").map((c) => c.id), [], JSON.stringify(checks.filter((c) => c.blocking && c.state !== "pass")));
assert.deepEqual(productionGateBlockers(scene.studio!, scene), []);
// A new version makes the product check lapse (confirmations are tied to the version).
const lapsed = structuredClone(scene);
addPieceVersion(lapsed.studio!, prodIds[0], { image: fakeRef("v2", "image/png", 1024, 1280), source: "ai" }, { by: "producer" });
assert.ok(gtmChecks(lapsed.studio!, lapsed).find((c) => c.id === "product")!.items.some((x) => x.pieceId === prodIds[0] && x.state === "needs_you"));
assert.ok(gtmChecks(lapsed.studio!, lapsed).find((c) => c.id === "disclosure")!.state === "needs_you", "and the disclosure confirmation lapses too");

// ---------- Manifest: approved versions only, gaps included ----------
const partial = structuredClone(scene);
partial.studio!.pieces.find((x) => x.id === prodIds[1])!.status = "changes_requested";
const m = deliveryManifest(partial.studio!, partial);
assert.equal(m.files.length, 12, "11 stills and 1 loop approved");
assert.ok(m.notIncluded.some((x) => x.reason === "changes requested"));
assert.ok(m.files.every((x) => x.download.startsWith(`/api/factory/projects/${scene.id}/studio/asset/`) && x.download.endsWith("?download=1")));
assert.deepEqual(m.folders.map((f) => [f.folder, f.files.length]), [["instagram-feed", 12], ["meta-ads", 12], ["pinterest", 6]]);
assert.ok(m.gateNotes.some((x) => x.stage === "Client intake and brand memory" && x.note === "Assets later" && x.gaps?.length), "the gate 1 note and its gaps travel with the pack");
assert.equal(m.files[0].headline, "Fermented for 48 hours");
assert.match(m.files[0].primaryText, /Order today/);
const md = manifestMarkdown(m);
assert.match(md, /## Gate notes and gaps[\s\S]*Assets later[\s\S]*Outstanding at approval/);
assert.match(md, /instagram-feed/);
assert.match(handoffMarkdown(scene.studio!, scene), /## Test plan[\s\S]*scene-test-sourdough-4x5/);

// ---------- Delivery (gate 4) and the delivered state ----------
assert.throws(() => transition(scene, { type: "approveStudioGate", stage: "production" }, { ...op, role: "customer", identity: "firebase", accountId: "w", subject: "owner" }), /not shared this stage/, "the client approves only once Production is shared");
scene = transition(scene, { type: "approveStudioGate", stage: "production" }, op);
assert.equal(scene.studio!.stage, "delivered");
assert.equal(scene.studio!.gates.production.onBehalfOfClient, true);
assert.ok(scene.audit.some((x) => x.action === "studio_delivered" && /13 approved files|12 approved files/.test(x.detail)), JSON.stringify(scene.audit.filter((x) => x.action === "studio_delivered")));
assert.equal(deliveryManifest(scene.studio!, scene).status, "delivered");
assert.throws(() => transition(scene, { type: "confirmStudioGtm", check: "disclosure" }, op), /Production is not the open stage/, "records are frozen after delivery");
scene = transition(scene, { type: "setStudioWinner", pieceId: prodIds[0], winner: true }, op);
assert.deepEqual(scene.studio!.gtm!.winners, [prodIds[0]], "winners are marked after delivery");
// resetProject is refused on studio projects (legacy projects keep it; see factory-source-review.test.ts).
assert.throws(() => transition(scene, { type: "resetProject", confirm: true }, admin), /Studio projects cannot be restarted from the brief: reopen Stage 1/);

// ---------- Read-back: results per variant, unknown stays unknown ----------
const rec = (o: Partial<PerformanceRecord>): PerformanceRecord => ({ campaign: "Spring", channel: "instagram", format: "static", objective: "Scene test", audience: "UK", offer: "10% off", start: "2025-01-01", end: "2025-01-10", provenance: "Ads Manager export", attribution: "7-day click", currency: "GBP", publicAuthorised: false, id: Math.random().toString(36), status: "accepted", createdAt: "2026-11-11T00:00:00.000Z", createdBy: "producer", ...o });
const key = fileBase(scene.studio!, productionPieces(scene.studio!)[0]).replace(/_v\d+$/, "");
const rb = readback(scene.studio!, [rec({ variant: key + "_v1", impressions: 1000, clicks: 20, spend: 50, purchases: 5 }), rec({ variant: key, impressions: 1000, views3s: 300 }), rec({ variant: key, impressions: 5000, clicks: 999, status: "rejected" })]);
assert.equal(rb[0].records, 2);
assert.equal(rb[0].ctr, 0.02, "click-through uses only records with both numbers");
assert.equal(rb[0].hookRate, 0.3);
assert.equal(rb[0].holdRate, null, "no ThruPlays reported: unknown, not zero");
assert.equal(rb[0].costPerPurchase, 10);
assert.equal(rb[1].records, 0);
const template = readbackTemplateCsv(scene.studio!);
assert.match(template, /^campaign,channel,format,objective,audience,offer,start,end,provenance,attribution,currency,variant,impressions,views3s,thruplays,clicks,conversions,purchases,spend,revenue\n/);
assert.ok(template.includes(`,${key},`));
const imported = parsePerformanceCsv("campaign,channel,format,objective,audience,offer,start,end,provenance,attribution,currency,variant,impressions,views3s,thruplays,purchases,spend\nSpring,tiktok,video_short,Hook test,UK,10% off,2025-01-01,2025-01-10,TikTok export,7-day click,GBP,nash_hook-pack_narrative1_hook1-close-up,1000,320,90,4,40\n");
assert.equal(imported[0].variant, "nash_hook-pack_narrative1_hook1-close-up");
assert.equal(imported[0].views3s, 320);
assert.throws(() => validatePerformance({ ...imported[0], variant: "bad name; drop" }), /variant must be a file name/);
const legacyRow = validatePerformance({ campaign: "a", channel: "tiktok", format: "video_short", objective: "o", audience: "a", offer: "o", start: "2025-01-01", end: "2025-01-02", provenance: "p", attribution: "a", currency: "GBP", clicks: 3 });
assert.ok(!("variant" in legacyRow) && !("views3s" in legacyRow), "legacy rows gain no new fields");

// ---------- Hook pack: variants, prompt pack, uploads with real MP4 headers, claims and rights ----------
let hook = productionProject("hook_pack", "c2");
plan = planProduction(hook.studio!);
assert.equal(plan.create.length, 12, "3 narratives x 4 hooks");
const hooks = hook.studio!.pieces.filter((x) => x.kind === "hook");
const keyframes = hook.studio!.pieces.filter((x) => x.kind === "keyframe");
const script = hook.studio!.pieces.find((x) => x.kind === "script")!;
assert.deepEqual(plan.create[5].dependsOn, [hooks[5].id, keyframes[5].id, script.id], "each variant depends on its hook, its keyframe and the script");
assert.equal(plan.create[5].title, "Variant 2.2: Extreme close-up");
hook = transition(hook, { type: "prepareStudioProduction" }, op);
const variants = productionPieces(hook.studio!);
assert.equal(fileBase(hook.studio!, variants[5]), "nash-s-bakery_hook-pack_narrative2_hook2-extreme-close-up_v1");
assert.equal(scriptBeats(script.versions[0].text).length, 3);
const pack = variantPromptPack(hook.studio!, variants[0]);
assert.equal(pack.shots.length, 4, "hook plus three body beats");
assert.match(pack.shots[0].at, /0-3s \(hook\)/);
assert.equal(pack.shots[1].at, "3-8s");
assert.deepEqual(pack.voLines, ["Wait for the crunch.", "This loaf took two days.", "Baked every morning.", "Order today."]);
assert.equal(pack.music, "Soft acoustic");
assert.match(pack.narrative.keyMessage, /key message 2: Fermented for 48 hours/);
// Uploads: the real MP4 header gives the size; a 720p upload fails the spec.
const good = minimalMp4(1080, 1920, 23);
const small = minimalMp4(720, 1280, 23);
for (const [i, v] of variants.entries()) {
  const bytes = i === 0 ? small : good;
  applyPieceUpload(hook, v.id, fakeRef(`clip-${i}`, "video/mp4", 0, 0, { ...mediaInfo(bytes, "video/mp4"), aiDisclosure: i === 1 ? "none" : "ai_generated", rights: { source: "Made in-house", licence: "Owned by the client" } }), op);
}
const hs = hook.studio!;
let hc = gtmChecks(hs, hook);
const h = (id: string) => hc.find((c) => c.id === id)!;
assert.match(h("specs").items.find((x) => x.pieceId === variants[0].id)!.text, /Resolution 720 x 1280 is below the minimum/);
assert.equal(h("specs").items.find((x) => x.pieceId === variants[2].id)!.state, "pass");
assert.ok(h("rights").items.some((x) => x.id === "sound" && x.state === "needs_you"), "the Hook pack needs its music and voice rights recorded");
assert.ok(h("disclosure").items.some((x) => /Variant 1.2.*No AI \(it was made from an AI-generated frame/.test(x.text)));
assert.ok(h("disclosure").items.some((x) => /TikTok: apply the AI-generated content \(AIGC\) label/.test(x.text)));
// Claims: every hook links to its narrative's key message; split-screen hooks, superlatives and prices not in the offer are flagged.
let flags = claimFlags(hs, hook);
assert.ok(flags.some((f) => f.kind === "before_after" && /Split-screen/.test(f.pieceTitle)), JSON.stringify(flags.map((f) => [f.kind, f.pieceTitle])));
assert.ok(!flags.some((f) => f.kind === "no_key_message"));
const edited = structuredClone(hook);
const hookPiece = edited.studio!.pieces.find((x) => x.id === hooks[0].id)!;
hookPiece.versions.push({ ...hookPiece.versions[0], n: 2, text: hookPiece.versions[0].text!.replace("First VO line: Wait for the crunch.", "First VO line: The best bread, now 20% off and £5 delivery. Before and after one bite.") });
flags = claimFlags(edited.studio!, edited);
assert.ok(flags.some((f) => f.kind === "absolute" && /"best"/.test(f.why)));
assert.ok(flags.some((f) => f.kind === "price" && /"20% off" is not in the brief's offer/.test(f.why)));
assert.ok(flags.some((f) => f.kind === "price" && /"£5"/.test(f.why)));
assert.ok(flags.some((f) => f.kind === "before_after" && /Before-and-after/.test(f.why)));
const okOffer = structuredClone(edited);
okOffer.studio!.pieces.find((x) => x.id === hooks[0].id)!.versions.at(-1)!.text = "First VO line: Now 10% off your first order.";
assert.ok(!claimFlags(okOffer.studio!, okOffer).some((f) => f.kind === "price"), "a discount that is in the brief's offer is fine");
const unknownKm = structuredClone(edited);
const sc = unknownKm.studio!.pieces.find((x) => x.kind === "script")!;
sc.versions.at(-1)!.text = sc.versions.at(-1)!.text!.replace("| Key message 1", "| Key message 7");
assert.ok(claimFlags(unknownKm.studio!, unknownKm).some((f) => f.kind === "unknown_key_message" && /approved direction has 2/.test(f.why)));
// Clearing a flag needs a reason and an existing flag.
const flag = claimFlags(hook.studio!, hook)[0];
assert.throws(() => transition(hook, { type: "clearStudioClaimFlag", flagId: flag.id, reason: "" }, op), /reason/);
assert.throws(() => transition(hook, { type: "clearStudioClaimFlag", flagId: "nope", reason: "x" }, op), /no longer applies/);
hook = transition(hook, { type: "clearStudioClaimFlag", flagId: flag.id, reason: "The split screen compares two loaves, not a result" }, op);
assert.equal(hook.studio!.gtm!.claimClearances[flag.id].by, "producer");
hook = transition(hook, { type: "addStudioRights", kind: "music", name: "Soft acoustic bed", source: "Epidemic Sound", licence: "Commercial subscription" }, op);
assert.throws(() => transition(hook, { type: "addStudioRights", kind: "music", name: "x", source: "", licence: "y" }, op), /needs a name, a source and a licence/);
hc = gtmChecks(hook.studio!, hook);
assert.ok(!hc.find((c) => c.id === "rights")!.items.some((x) => x.id === "sound"));
const hm = testMatrixCsv(hook.studio!);
assert.match(hm, /hook-test-N1,"Which of the 4 hooks of narrative 1/);
assert.match(hm, /narrative-test-H2,Which narrative works best when the hook position is the same \(hook 2/);
// Customers see go-to-market records only once Production is shared.
const owner: Principal = { workspaceId: "w", accountId: "w", subject: "owner", role: "customer", identity: "firebase" };
assert.equal(projectView(hook, owner).studio!.gtm, undefined);
assert.ok(projectView(transition(hook, { type: "setStudioReadyForClient", stage: "production" }, op), owner).studio!.gtm);
// approveStudioGate directly also respects the registered production check.
assert.throws(() => approveStudioGate(structuredClone(hook.studio!), "production", { by: "x", project: hook }), /Not ready to approve/);
console.log("Studio production: media headers, crop, preparation, prompts, naming, test plan, go-to-market checks, manifest, gate 4, delivery, read-back and reset gating passed");
