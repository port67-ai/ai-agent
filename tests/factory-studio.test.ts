import assert from "node:assert/strict";
import {
  STUDIO_OFFERS,
  addPieceVersion,
  addStudioPiece,
  approveStudioGate,
  bridgeStudioBrief,
  commentPiece,
  currentStudioStage,
  emptyStudioBrief,
  fieldRule,
  initialStudio,
  normaliseStudioBrief,
  pieceImpact,
  reopenStudioGate,
  rerunBrief,
  resolveComment,
  selectableOffer,
  setPieceStatus,
  sniffMime,
  stageBadge,
  studioCompleteness,
  validRegion,
} from "../src/lib/factory/studio";
import { createProject, createStudioProject, projectView, transition, requireStudioIntakeApproved } from "../src/lib/factory/engine";
import { planNext } from "../src/lib/factory/producer-agent";
import type { Principal, StudioAssetRef, StudioBrief } from "../src/lib/factory/model";

const ref = (id: string, mime = "image/png"): StudioAssetRef => ({ id, name: id + ".png", mime, bytes: 10, storageKey: `studio/w/p/${id}.png`, uploadedAt: "2026-11-20T00:00:00.000Z", uploadedBy: "producer" });
const text = (): StudioBrief => normaliseStudioBrief({
  client: { businessName: "Nash's Bakery", website: "nashs.example.com", approverName: "Ann Nash", approverEmail: "ann@example.com", markets: "UK" },
  project: { name: "Spring launch" },
  brandKit: { colours: ["#AA3300"], fonts: ["Lora"], tone: "Warm", avoid: "Discount language" },
  references: { liked: ["Soft morning light"], disliked: [] },
  product: { url: "https://nashs.example.com/sourdough", names: "Sourdough loaf", benefits: "Slow fermented", offer: "10% off first order", cta: "Order today" },
  socials: { instagram: "https://instagram.com/nashs", tiktok: "https://www.tiktok.com/@nashs", linkedin: "https://linkedin.com/company/nashs" },
  themes: ["Breakfast rituals"],
});

// Offer catalogue: two live offers, three parked offers that cannot be chosen.
assert.equal(STUDIO_OFFERS.filter((o) => !o.parked).length, 2);
assert.deepEqual(STUDIO_OFFERS.filter((o) => o.parked).map((o) => o.id), ["hero_spot", "creator_localisation", "b2b_trailer"]);
assert.ok(STUDIO_OFFERS.every((o) => o.label && o.summary));
assert.equal(selectableOffer("hook_pack"), "hook_pack");
assert.throws(() => selectableOffer("hero_spot"), /parked/);
assert.throws(() => selectableOffer("nonsense"), /Choose an offer/);

// Completeness differs per offer.
const empty = studioCompleteness(emptyStudioBrief(), "scene_pack");
assert.equal(empty.complete, false);
for (const f of ["client.businessName", "client.approverEmail", "brandKit.logo", "assets.packshots", "references.mood"]) assert.ok(empty.missing.some((m) => m.field === f), f);
assert.ok(!empty.missing.some((m) => m.field === "product.url"), "scene pack does not require a product URL");
const hookEmpty = studioCompleteness(emptyStudioBrief(), "hook_pack");
for (const f of ["product.url", "product.offer", "product.cta", "assets.clips"]) assert.ok(hookEmpty.missing.some((m) => m.field === f), f);
assert.ok(!hookEmpty.missing.some((m) => m.field === "references.mood"), "hook pack recommends, not requires, mood images");
assert.equal(fieldRule("hook_pack", "references.mood"), "recommended");
assert.equal(fieldRule("scene_pack", "references.mood"), "required");
assert.equal(fieldRule("scene_pack", "product.cta"), "optional");

const scene = text();
assert.ok(studioCompleteness(scene, "scene_pack").missing.map((m) => m.field).join() === "brandKit.logo,assets.packshots,references.mood");
scene.brandKit.logo = ref("logo");
scene.assets.packshots.push(ref("p1", "image/jpeg"));
scene.references.mood.push(ref("m1"));
const sceneDone = studioCompleteness(scene, "scene_pack");
assert.equal(sceneDone.complete, true);
assert.equal(sceneDone.requiredDone, sceneDone.requiredTotal);
assert.ok(sceneDone.recommendations.some((r) => r.field === "assets.packshots" && /PNG/.test(r.reason || "")), "JPEG packshots draw a PNG recommendation");

const hook = text();
hook.brandKit.logo = ref("logo");
hook.assets.clips.push(ref("c1", "video/mp4"), ref("c2", "video/mp4"));
const two = studioCompleteness(hook, "hook_pack");
assert.equal(two.complete, false);
assert.match(two.missing.find((m) => m.field === "assets.clips")!.reason!, /2 so far/);
hook.assets.packshots.push(ref("photo"));
assert.equal(studioCompleteness(hook, "hook_pack").complete, true, "clips plus product photos count towards three");

// Intake validation: URLs, email, colours; uploaded file references are never taken from the input.
assert.throws(() => normaliseStudioBrief({ socials: { instagram: "not a url at all" } }), /Instagram link/);
assert.throws(() => normaliseStudioBrief({ socials: { tiktok: "http://localhost/x" } }), /public https/);
assert.throws(() => normaliseStudioBrief({ socials: { myspace: "https://myspace.com/x" } }), /Unknown social/);
assert.throws(() => normaliseStudioBrief({ client: { approverEmail: "nope" } }), /valid email/);
assert.throws(() => normaliseStudioBrief({ brandKit: { colours: ["red"] } }), /hex/);
assert.equal(text().client.website, "https://nashs.example.com/");
const sneaky = normaliseStudioBrief({ brandKit: { logo: ref("evil") }, assets: { packshots: [ref("evil")] }, references: { mood: [ref("evil")] } } as never);
assert.equal(sneaky.brandKit.logo, undefined);
assert.equal(sneaky.assets.packshots.length + sneaky.references.mood.length, 0);
const kept = normaliseStudioBrief({ product: { cta: "Shop now" } }, scene);
assert.equal(kept.brandKit.logo?.id, "logo", "absent sections keep their values and files");
assert.equal(kept.product.cta, "Shop now");
assert.equal(kept.client.businessName, "Nash's Bakery");

// File type detection from the first bytes.
assert.equal(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
assert.equal(sniffMime(Buffer.from("RIFF0000WEBPVP8 ")), "image/webp");
assert.equal(sniffMime(Buffer.from("0000ftypisom0000")), "video/mp4");
assert.equal(sniffMime(Buffer.from("0000ftypqt  0000")), "video/quicktime");
assert.equal(sniffMime(Buffer.from("<svg onload=x>")), undefined);

// Gate state machine.
const by = { by: "producer", at: "2026-11-20T10:00:00.000Z" };
const s = initialStudio("scene_pack", text());
assert.deepEqual(Object.values(s.gates).map((g) => g.status), ["active", "locked", "locked", "locked"]);
assert.equal(s.stage, "intake");
assert.equal(stageBadge(s, "intake"), "in_progress");
assert.equal(stageBadge(s, "strategy"), "locked");
assert.throws(() => approveStudioGate(s, "strategy", by), /locked/, "a locked stage cannot be approved");
assert.throws(() => approveStudioGate(s, "intake", by), /Not ready to approve: Logo/, "plain approval needs a complete intake");
assert.throws(() => approveStudioGate(s, "intake", { ...by, withNote: true, note: "   " }), /note is required/);
approveStudioGate(s, "intake", { ...by, withNote: true, note: "Packshots arrive Monday; mood from the website is enough" });
assert.equal(s.gates.intake.status, "approved");
assert.equal(s.gates.intake.note, "Packshots arrive Monday; mood from the website is enough");
assert.equal(s.gates.intake.history.at(-1)!.action, "approve_with_note");
assert.equal(s.gates.strategy.status, "active");
assert.equal(s.stage, "strategy");
assert.throws(() => approveStudioGate(s, "intake", by), /already approved/);
approveStudioGate(s, "strategy", { ...by, withNote: true, note: "Research checked by hand" }); // piece B: a plain approval needs an accepted insight and an approved direction
assert.equal(s.gates.preproduction.status, "active");
assert.equal(s.stage, "preproduction");
// Pieces in an open stage, then reopen an earlier stage: later stages and their pieces go stale, work kept.
const frame = addStudioPiece(s, { stage: "preproduction", kind: "keyframe", title: "Keyframe 1" }, by);
addPieceVersion(s, frame.id, { text: "Loaf on a linen cloth", source: "ai" }, by);
reopenStudioGate(s, "intake", { ...by, note: "Client sent a new logo" });
assert.equal(s.gates.intake.status, "active");
assert.equal(s.gates.strategy.status, "stale");
assert.equal(s.gates.preproduction.status, "stale");
assert.equal(s.gates.production.status, "locked", "a stage never reached stays locked");
assert.equal(s.stage, "intake");
assert.equal(s.pieces[0].status, "stale");
assert.equal(s.pieces[0].versions.length, 1, "work is kept");
assert.equal(stageBadge(s, "strategy"), "out_of_date");
assert.throws(() => approveStudioGate(s, "strategy", by), /Approve client intake/);
assert.throws(() => reopenStudioGate(s, "production", by), /Only an approved stage/);
s.brief.brandKit.logo = ref("logo"); s.brief.assets.packshots.push(ref("p")); s.brief.references.mood.push(ref("m"));
approveStudioGate(s, "intake", by);
assert.equal(s.stage, "strategy", "the project moves to the first stage not approved");
assert.equal(s.gates.strategy.status, "stale", "a stale stage must be re-approved");
approveStudioGate(s, "strategy", { ...by, withNote: true, note: "Research checked by hand" }); // piece B: a plain approval needs an accepted insight and an approved direction
assert.equal(s.gates.preproduction.status, "stale");
assert.equal(currentStudioStage(s), "preproduction");

// Piece impact and stale marking.
const st = initialStudio("hook_pack", text());
approveStudioGate(st, "intake", { ...by, withNote: true, note: "test" });
const a = addStudioPiece(st, { stage: "strategy", kind: "script", title: "Script" }, by);
const b = addStudioPiece(st, { stage: "strategy", kind: "hook", title: "Hook 1", dependsOn: [a.id] }, by);
const c = addStudioPiece(st, { stage: "strategy", kind: "keyframe", title: "Frame 1", dependsOn: [b.id] }, by);
const d = addStudioPiece(st, { stage: "strategy", kind: "hook", title: "Hook 2" }, by);
assert.throws(() => addStudioPiece(st, { stage: "strategy", kind: "hook", title: "Bad", dependsOn: ["missing"] }, by), /existing pieces/);
assert.deepEqual(pieceImpact(st, a.id), [b.id, c.id]);
assert.deepEqual(pieceImpact(st, d.id), []);
for (const piece of [a, b, c, d]) addPieceVersion(st, piece.id, { text: piece.title + " v1", source: "ai" }, by);
setPieceStatus(st, b.id, "approved");
setPieceStatus(st, c.id, "approved");
const edit = addPieceVersion(st, a.id, { text: "Script v2", source: "human" }, by);
assert.deepEqual(edit.stale.sort(), [b.id, c.id].sort());
assert.equal(st.pieces.find((x) => x.id === b.id)!.status, "stale");
assert.equal(st.pieces.find((x) => x.id === c.id)!.status, "stale");
assert.equal(st.pieces.find((x) => x.id === d.id)!.status, "draft", "independent pieces are untouched");
assert.equal(st.pieces.find((x) => x.id === a.id)!.versions.length, 2, "old versions are kept");
assert.equal(st.pieces.find((x) => x.id === a.id)!.aiDisclosure, "ai_edited", "a human edit of AI work is AI-edited");
assert.throws(() => setPieceStatus(st, d.id, "done"), /approved or changes_requested/);
const blank = addStudioPiece(st, { stage: "strategy", kind: "hook", title: "Empty" }, by);
assert.throws(() => setPieceStatus(st, blank.id, "approved"), /no version/);

// Comments and regions (fractions 0..1, inside the image; pins have zero size).
assert.deepEqual(validRegion({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }), { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
assert.deepEqual(validRegion({ x: 0.5, y: 0.5, w: 0, h: 0 }), { x: 0.5, y: 0.5, w: 0, h: 0 });
assert.equal(validRegion(undefined), undefined);
for (const bad of [{ x: 1.2, y: 0, w: 0, h: 0 }, { x: -0.1, y: 0, w: 0.1, h: 0.1 }, { x: 0.8, y: 0, w: 0.5, h: 0.1 }, { x: 0, y: 0, w: Number.NaN, h: 0 }, { x: "0.1", y: 0, w: 0, h: 0 }])
  assert.throws(() => validRegion(bad), /region/i, JSON.stringify(bad));
assert.throws(() => commentPiece(st, a.id, { text: "Move this", region: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 } }, by), /only be marked on an image/);
const img = addStudioPiece(st, { stage: "strategy", kind: "mood_board", title: "Mood board" }, by);
addPieceVersion(st, img.id, { image: ref("mb"), source: "upload" }, by);
const boxed = commentPiece(st, img.id, { text: "Warmer light here", region: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }, by);
const pin = commentPiece(st, img.id, { text: "Remove this crumb", region: { x: 0.7, y: 0.6, w: 0, h: 0 } }, by);
const general = commentPiece(st, img.id, { text: "Less blue overall" }, by);
resolveComment(st, img.id, general.id);
assert.throws(() => resolveComment(st, img.id, general.id), /already resolved/);
const briefText = rerunBrief(st.pieces.find((x) => x.id === img.id)!, "Keep the linen texture");
assert.match(briefText, /Warmer light here \[area x 10%, y 10%, width 20%, height 20%\]/);
assert.match(briefText, /Remove this crumb \[point x 70%, y 60%\]/);
assert.ok(!briefText.includes("Less blue overall"), "resolved comments are not in the rerun brief");
assert.match(briefText, /Instruction: Keep the linen texture/);
assert.ok(boxed.id && pin.id);

// Bridge at gate 1: offer channels first, then the socials supplied, at most five; formats from the offer.
const bridgeState = initialStudio("hook_pack", text());
const bridged = bridgeStudioBrief(bridgeState);
assert.deepEqual(bridged.channels, ["tiktok", "instagram", "facebook", "youtube", "linkedin"]);
assert.deepEqual(bridged.brief.requestedFormats, ["video_short"]);
assert.equal(bridged.brief.workRequest, "campaign");
assert.match(bridged.brief.objective, /Hook-Test Video Pack/);
assert.match(bridged.brief.objective, /Sourdough loaf/);
assert.match(bridged.brief.objective, /10% off first order/);
assert.match(bridged.brief.objective, /Order today/);
assert.equal(bridged.brief.business, "Nash's Bakery");
assert.equal(bridged.brief.contact, "ann@example.com");
assert.equal(bridged.brief.brandColor, "#aa3300");
assert.equal(bridged.brief.market, "UK");
const sceneBridge = bridgeStudioBrief(initialStudio("scene_pack", normaliseStudioBrief({ client: { businessName: "Shop" }, socials: { x: "https://x.com/shop" } })));
assert.deepEqual(sceneBridge.channels, ["instagram", "pinterest", "facebook", "x_threads"]);
assert.deepEqual(sceneBridge.brief.requestedFormats, ["static"]);

// Engine: creation, roles, audit, the bridge and the task plan.
const op: Principal = { workspaceId: "w", subject: "producer", role: "operator" };
const owner: Principal = { workspaceId: "w", accountId: "w", subject: "owner-uid", role: "customer", identity: "firebase" };
assert.throws(() => createStudioProject({ offer: "b2b_trailer", brief: { client: { businessName: "X" } } }, op), /parked/);
assert.throws(() => createStudioProject({ offer: "scene_pack", brief: {} }, op), /Business name/);
let p = createStudioProject({ offer: "hook_pack", brief: text() }, op);
assert.equal(p.studio!.stage, "intake");
assert.equal(p.taskPlan, undefined, "no task plan before gate 1");
assert.equal(p.audit[0].action, "studio_intake_submitted");
assert.throws(() => requireStudioIntakeApproved(p), /Approve the studio intake/);
const stop = planNext(p, true);
assert.ok("stop" in stop && /studio intake/.test(stop.stop.reason), "the orchestrator waits for gate 1");
assert.throws(() => transition(p, { type: "updateBrief", business: "X" }, op), /studio project/);
assert.throws(() => transition(p, { type: "requestResearch", channels: ["tiktok"] }, op), /Approve the studio intake/);
assert.throws(() => transition(p, { type: "enableAIPlanning" }, op), /studio research set/);
p = transition(p, { type: "updateStudioBrief", brief: { product: { cta: "Shop the loaf" } } }, owner);
assert.equal(p.studio!.brief.product.cta, "Shop the loaf");
assert.equal(p.studio!.briefVersion, 2);
assert.ok(p.audit.some((x) => x.action === "studio_brief_updated" && x.role === "customer"));
assert.throws(() => transition(p, { type: "setStudioOffer", offer: "hero_spot" }, op), /parked/);
p = transition(p, { type: "authoriseAI", confirm: true }, op);
assert.throws(() => transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "fine" }, owner), /Requires operator role/, "customers cannot approve the producer gate");
assert.throws(() => transition(p, { type: "approveStudioGate", stage: "intake" }, op), /Not ready to approve/);
assert.throws(() => transition(p, { type: "approveStudioGateWithNote", stage: "intake" }, op), /note is required/);
p = transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "Clips arrive tomorrow" }, op);
assert.equal(p.studio!.gates.intake.status, "approved");
assert.ok(p.audit.some((x) => x.action === "studio_gate_approved" && /Clips arrive tomorrow/.test(x.detail)));
assert.ok(p.audit.some((x) => x.action === "studio_bridge"));
assert.deepEqual(p.channels, ["tiktok", "instagram", "facebook", "youtube", "linkedin"]);
assert.deepEqual(p.brief.requestedFormats, ["video_short"]);
assert.match(p.brief.objective, /Shop the loaf/);
assert.equal(p.aiConsent, undefined, "the mapped brief changed, so AI authorisation is revoked");
assert.deepEqual(p.taskPlan!.research, ["brand", "customer", "competitor", "creative", "channel"]);
assert.equal(p.researchPlanning, undefined);
assert.ok(p.taskPlan!.tasks.find((t) => t.id === "research:trends")!.status === "skipped");
requireStudioIntakeApproved(p);
// Re-approving an unchanged intake keeps the AI authorisation (same brief fingerprint).
p = transition(p, { type: "authoriseAI", confirm: true }, op);
p = transition(p, { type: "reopenStudioGate", stage: "intake", note: "Check the CTA" }, op);
assert.equal(p.studio!.gates.strategy.status, "stale");
assert.ok(p.audit.some((x) => x.action === "studio_gate_reopened" && /Creative strategy/.test(x.detail)));
assert.throws(() => transition(p, { type: "reopenStudioGate", stage: "intake" }, owner), /Requires operator role/);
p = transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "Same intake" }, op);
assert.ok(p.aiConsent, "an unchanged intake keeps its authorisation");
// Strategy (producer gate), then pre-production is a client gate: producers act on the client's behalf unless approvals are required.
p = transition(p, { type: "approveStudioGateWithNote", stage: "strategy", note: "Strategy reviewed" }, op);
const piece = transition(p, { type: "addStudioPiece", stage: "preproduction", kind: "keyframe", title: "Frame", text: "A loaf at dawn" }, op);
assert.equal(piece.studio!.pieces[0].versions[0].source, "human");
assert.throws(() => transition(piece, { type: "addStudioPiece", stage: "preproduction", kind: "keyframe", title: "x" }, owner), /Requires operator role/);
// Piece B: customers act on pre-production only once a producer shares the stage for client review.
assert.throws(() => transition(piece, { type: "commentStudioPiece", pieceId: piece.studio!.pieces[0].id, text: "Too early" }, owner), /not shared this stage/);
const shared = transition(piece, { type: "setStudioReadyForClient", stage: "preproduction" }, op);
const commented = transition(shared, { type: "commentStudioPiece", pieceId: piece.studio!.pieces[0].id, text: "Love it" }, owner);
assert.ok(commented.audit.some((x) => x.action === "studio_piece_commented" && x.role === "customer"));
const clientOk = transition(commented, { type: "setStudioPieceStatus", pieceId: piece.studio!.pieces[0].id, status: "approved" }, owner);
assert.equal(clientOk.studio!.pieces[0].status, "approved");
assert.ok(clientOk.audit.some((x) => x.action === "studio_piece_approved"));
assert.throws(() => transition(commented, { type: "editStudioPiece", pieceId: piece.studio!.pieces[0].id, text: "x" }, owner), /Requires operator role/);
// Piece B gate 3: the keyframe has no image yet, so only an approval with a note is possible.
assert.throws(() => transition(clientOk, { type: "approveStudioGate", stage: "preproduction" }, op), /keyframe is missing/);
const onBehalf = transition(clientOk, { type: "approveStudioGateWithNote", stage: "preproduction", note: "Frame drawn on set" }, op);
assert.equal(onBehalf.studio!.gates.preproduction.onBehalfOfClient, true);
assert.match(onBehalf.studio!.gates.preproduction.approvedBy!, /on behalf of the client/);
assert.ok(onBehalf.audit.some((x) => x.action === "approved_on_behalf"));
process.env.PORT67_ACCOUNT_APPROVALS = "required";
try {
  assert.throws(() => transition(clientOk, { type: "approveStudioGateWithNote", stage: "preproduction", note: "x" }, op), /Customer approval identity required/);
  const byClient = transition(clientOk, { type: "approveStudioGateWithNote", stage: "preproduction", note: "Fine without the frame" }, owner);
  assert.equal(byClient.studio!.gates.preproduction.approvedBy, "owner-uid");
  assert.equal(byClient.studio!.gates.preproduction.onBehalfOfClient, undefined);
} finally { delete process.env.PORT67_ACCOUNT_APPROVALS; }
// Rerun requests: impact recorded, open comments become the brief; customers never see the requests.
const rerun = transition(commented, { type: "requestStudioRerun", pieceId: piece.studio!.pieces[0].id, instruction: "Brighter", confirm: true }, op);
const req = rerun.studio!.rerunRequests!.at(-1)!;
assert.equal(req.status, "pending");
assert.match(req.brief, /Love it/);
assert.match(req.brief, /Instruction: Brighter/);
assert.throws(() => transition(commented, { type: "requestStudioRerun", pieceId: piece.studio!.pieces[0].id }, op), /Confirm the rerun/);
assert.throws(() => transition(rerun, { type: "requestStudioRerun", pieceId: piece.studio!.pieces[0].id, confirm: true }, op), /already waiting/);
assert.equal(projectView(rerun, owner).studio!.rerunRequests, undefined);
assert.ok(projectView(rerun, op).studio!.rerunRequests!.length);

// Legacy projects are unchanged: no studio field, legacy commands still work.
const legacy = createProject({ business: "Shop", objective: "Sell more", contact: "a@example.com", workRequest: "campaign" }, op);
assert.equal(legacy.studio, undefined);
assert.ok(legacy.taskPlan);
assert.equal(transition(legacy, { type: "updateBrief", objective: "Sell even more" }, op).brief.objective, "Sell even more");
assert.throws(() => transition(legacy, { type: "approveStudioGate", stage: "intake" }, op), /not a studio project/);
assert.ok(!("stop" in planNext(legacy, true)) || !/studio/.test((planNext(legacy, true) as { stop: { reason: string } }).stop.reason));

console.log("Studio: offers, completeness, validation, gates, pieces, regions, bridge, roles and legacy passed");
