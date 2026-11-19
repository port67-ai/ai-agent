import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProject, createStudioProject, projectView, strategyHash, transition } from "../src/lib/factory/engine";
import { evidenceWarnings, planNext, runProducerAgent } from "../src/lib/factory/producer-agent";
import { runTracker } from "../src/lib/factory/run-tracker";
import { prepareSynthesis } from "../src/lib/factory/synthesis";
import { syncTaskPlan } from "../src/lib/factory/task-plan";
import { strategyGateBlockers } from "../src/lib/factory/studio-gates";
import { LocalRepository } from "../src/lib/factory/repository";
import { segments, type Principal } from "../src/lib/factory/model";

// Piece B (CHG-0098): stage gating of the orchestrator and commands, thin research as a warning, gate 2 and the offer framing.
const op: Principal = { role: "operator", workspaceId: "w", subject: "producer" };
const owner: Principal = { role: "customer", workspaceId: "w", subject: "owner-uid", identity: "firebase", accountId: "w" };
const at = "2026-11-20T10:00:00.000Z";
const studio = (offer: "scene_pack" | "hook_pack", id: string) =>
  createStudioProject({ offer, brief: { client: { businessName: "Nash's Bakery", website: "https://nashs.example.com", approverName: "Ann", approverEmail: "ann@example.com" }, project: { name: "Spring" }, product: { names: "Sourdough, Rye", benefits: "Fermented for 48 hours" }, brandKit: { colours: ["#aa3300"] }, themes: ["Breakfast"] } }, op, id);

async function main() {
  // ---- Gate 1 bridge: the offer fixes the format; the studio plan ends at the direction approval.
  let p = studio("scene_pack", "s1");
  assert.match((planNext(p, true) as { stop: { reason: string } }).stop.reason, /Approve the studio intake/);
  assert.throws(() => transition(p, { type: "addSource", segment: "brand", title: "x", url: "https://example.com/a", excerpt: "x" }, op), /Approve the studio intake/);
  p = transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "Packshots later" }, op);
  assert.deepEqual(p.formats?.selected, ["static"]);
  assert.match(p.formats!.decidedBy!, /Product Scene Pack/);
  const ids = p.taskPlan!.tasks.map((t) => t.id);
  assert.equal(ids.at(-1), "approveDirection", "the studio plan ends at the direction approval");
  for (const gone of ["formats", "produce", "shareAssets", "assetApproval", "draftCopyPack", "mediumSelection"]) assert.ok(!ids.includes(gone), gone);
  assert.ok(!ids.some((x) => x.startsWith("production:") || x.startsWith("manual:")));
  assert.deepEqual(p.taskPlan!.clarifications, []);
  assert.throws(() => transition(p, { type: "selectFormats", formats: ["video_short"] }, op), /fixes the format/);
  assert.throws(() => transition(p, { type: "suggestFormats" }, op), /fixes the format/);
  for (const type of ["produce", "shareAsset", "approveAllAssets", "draftAdvert", "completeManualTask"]) assert.throws(() => transition(p, { type, id: "x" }, op), /classic production/, type);

  // ---- Creative strategy work runs while the stage is open.
  p = transition(p, { type: "authoriseAI", confirm: true }, op);
  p = transition(p, { type: "addSource", segment: "brand", title: "About the bakery", url: "https://nashs.example.com/about", excerpt: "Nash's bakes sourdough every morning and ferments it for 48 hours." }, op);
  const src = p.sources.at(-1)!.id;
  p = transition(p, { type: "reviewSource", id: src, status: "supported" }, op);
  // Gate 2: needs an accepted insight and an approved direction.
  assert.deepEqual(strategyGateBlockers(p.studio!, p), ["Accept at least one insight", "Draft and approve the campaign direction"]);
  assert.throws(() => transition(p, { type: "approveStudioGate", stage: "strategy" }, op), /Not ready to approve: Accept at least one insight/);
  const noted = transition(p, { type: "approveStudioGateWithNote", stage: "strategy", note: "Client wants to move fast" }, op);
  assert.deepEqual(noted.studio!.gates.strategy.gaps, ["Accept at least one insight", "Draft and approve the campaign direction"], "approve with a note records the gap");
  assert.ok(noted.audit.some((x) => x.action === "studio_gate_approved" && /Outstanding at approval: Accept at least one insight/.test(x.detail)));
  p = transition(p, { type: "addInsight", title: "Freshness matters", interpretation: "Customers choose the bakery for bread baked that morning.", sourceIds: [src] }, op);
  p = transition(p, { type: "draftStrategy", message: "Bread worth waking up for", keyMessages: [{ message: "Baked every morning", proof: "The bakery bakes every morning", sourceIds: [src] }, { message: "Fermented for 48 hours", proof: "Ferments sourdough for 48 hours", sourceIds: [src] }] }, op);
  assert.deepEqual(strategyGateBlockers(p.studio!, p), ["Approve the campaign direction (version 1 is a draft)"]);
  // The direction writer gets the offer framing on studio projects only.
  const payload = prepareSynthesis(p, "strategy").payload as { brief: { studioOffer?: { framing: string; clientThemes: string[] } } };
  assert.match(payload.brief.studioOffer!.framing, /3 to 5 numbered scene themes/);
  assert.deepEqual(payload.brief.studioOffer!.clientThemes, ["Breakfast"]);
  p = transition(p, { type: "shareStrategy" }, op);
  assert.match(strategyGateBlockers(p.studio!, p)[0], /shared, waiting for approval/);
  p = transition(p, { type: "approveStrategy", hash: strategyHash(p.strategies.at(-1)!) }, op);
  assert.deepEqual(strategyGateBlockers(p.studio!, p), []);
  // The orchestrator never runs past the direction approval on a studio project.
  assert.match((planNext(p, true) as { stop: { reason: string } }).stop.reason, /approve research and strategy \(gate 2\)/);
  p = transition(p, { type: "approveStudioGate", stage: "strategy" }, op);
  assert.equal(p.studio!.stage, "preproduction");
  assert.equal(p.studio!.gates.strategy.gaps, undefined);

  // ---- Once Creative strategy is approved, its work is refused and the orchestrator stops.
  const stop = planNext(p, true) as { stop: { kind: string; reason: string } };
  assert.equal(stop.stop.kind, "done");
  assert.match(stop.stop.reason, /pre-production is the open stage/);
  for (const c of [{ type: "addSource", segment: "brand", title: "x", url: "https://example.com/b", excerpt: "x" }, { type: "reviewSource", id: src, status: "rejected" }, { type: "setAudiences", strapline: "x", segments: [] }, { type: "shareStrategy" }, { type: "requestStrategyChanges", feedback: "x" }, { type: "setChannels", channels: ["instagram"] }])
    assert.throws(() => transition(p, c, op), /Creative strategy is approved/, c.type);
  assert.throws(() => transition(p, { type: "approveStrategy", hash: "x" }, owner), /Creative strategy is approved/);
  assert.throws(() => transition(p, { type: "produce" }, op), /classic production/, "never the classic production drafts");
  // Reopening Creative strategy allows the work again; Pre-production becomes out of date.
  const reopened = transition(p, { type: "reopenStudioGate", stage: "strategy", note: "New research" }, op);
  assert.equal(reopened.studio!.gates.preproduction.status, "stale");
  assert.ok(transition(reopened, { type: "addSource", segment: "brand", title: "More", url: "https://example.com/c", excerpt: "More evidence about the bakery." }, op).sources.length > p.sources.length);
  const resumed = planNext(reopened, true);
  assert.ok("stop" in resumed && /approve research and strategy/.test(resumed.stop.reason), "back in Creative strategy: the direction is still approved, so the next step is gate 2");

  // Hook pack framing: three narratives and the opening hooks to test.
  let h = studio("hook_pack", "h1");
  h = transition(h, { type: "approveStudioGateWithNote", stage: "intake", note: "Clips later" }, op);
  assert.deepEqual(h.formats?.selected, ["video_short"]);
  h = transition(h, { type: "authoriseAI", confirm: true }, op);
  h = transition(h, { type: "addSource", segment: "brand", title: "About", url: "https://nashs.example.com/about", excerpt: "Fresh bread daily." }, op);
  h = transition(h, { type: "reviewSource", id: h.sources[0].id, status: "supported" }, op);
  h = transition(h, { type: "addInsight", title: "Fresh", interpretation: "Fresh bread daily is the draw for customers.", sourceIds: [h.sources[0].id] }, op);
  assert.match((prepareSynthesis(h, "strategy").payload as { brief: { studioOffer: { framing: string } } }).brief.studioOffer.framing, /3 numbered narratives/);

  // ---- Legacy projects: unchanged commands, no studio framing.
  let legacy = createProject({ business: "Shop", objective: "Sell more", contact: "a@example.com" }, op, "legacy1");
  legacy = transition(legacy, { type: "authoriseAI", confirm: true }, op);
  legacy = transition(legacy, { type: "addSource", segment: "brand", title: "About", url: "https://shop.example.com", excerpt: "We sell shoes online." }, op);
  legacy = transition(legacy, { type: "reviewSource", id: legacy.sources[0].id, status: "supported" }, op);
  legacy = transition(legacy, { type: "addInsight", title: "Shoes", interpretation: "The shop sells shoes online to its customers.", sourceIds: [legacy.sources[0].id] }, op);
  assert.equal((prepareSynthesis(legacy, "strategy").payload as { brief: Record<string, unknown> }).brief.studioOffer, undefined);
  assert.ok(transition(legacy, { type: "suggestFormats" }, op).formats, "legacy format suggestions still work");

  // ---- Thin research is a warning, not a hold (legacy flow, where the hold used to be set).
  const thin = createProject({ business: "Brand", objective: "Grow", contact: "a@example.com" }, op, "thin");
  for (const segment of ["brand", "customer", "competitor", "creative"] as const) {
    for (let k = 0; k < 3; k++) thin.sources.push({ id: `${segment}${k}`, segment, title: `${segment} ${k}`, url: `https://example.com/${segment}/${k}`, excerpt: `Detailed excerpt ${segment} ${k} about the offer and its customers.`, kind: "public_source", status: segment === "brand" && k > 0 ? "rejected" : "supported", collectedAt: at, method: "m" });
    thin.runs.push({ id: "r-" + segment, stage: "research", segment, at, finishedAt: at, status: "completed", provider: "openai", model: "m" });
  }
  assert.deepEqual(planNext(thin, true), { step: "draftInsights" }, "one accepted brand source does not stop the chain");
  const warnings = evidenceWarnings(thin, at);
  assert.ok(warnings.some((w) => /Thin research: fewer than 2 accepted sources for brand.*warning, not a stop/.test(w.text)), JSON.stringify(warnings));
  const row = runTracker(thin).find((x) => x.id === "sources")!;
  assert.equal(row.state, "done");
  assert.match(row.detail, /Warning: fewer than 2 accepted sources for brand \(thin research; work continues\)/);
  // A thin hold left by an older pass is ignored everywhere and cleared by the next pass.
  thin.producerAgent = { passes: 1, status: "waiting_human", reason: "", at, lastFingerprint: "", log: [], hold: { gate: "sources", subject: "none", notes: "Fewer than 2 accepted sources for brand: re-run that research or add sources by hand, then run the agent again." } };
  assert.deepEqual(planNext(thin, true), { step: "draftInsights" });
  assert.notEqual(runTracker(thin).find((x) => x.id === "sources")!.state, "paused");
  const planned = transition(structuredClone(studio("scene_pack", "s2")), { type: "approveStudioGateWithNote", stage: "intake", note: "x" }, op);
  planned.producerAgent = structuredClone(thin.producerAgent);
  syncTaskPlan(planned);
  assert.notEqual(planned.taskPlan!.tasks.find((t) => t.id === "reviewSources")!.status, "blocked", "a task plan is not blocked by a thin hold");
  const dir = await mkdtemp(join(tmpdir(), "port67-thin-"));
  try {
    const repo = new LocalRepository(dir);
    const quiet = createProject({ business: "Quiet", objective: "Grow", contact: "a@example.com" }, op, "quiet");
    quiet.producerAgent = structuredClone(thin.producerAgent);
    await repo.mutate("w", (db) => { db.projects.push(quiet); });
    const after = await runProducerAgent(repo, op, "quiet", {});
    assert.equal(after.producerAgent!.hold, undefined, "the next pass clears an old thin-research hold");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  // Customers never see producer-only data through these changes.
  assert.equal(projectView(p, owner).taskPlan, undefined);
  void segments;
  console.log("Studio strategy: stage gating, offer-fixed format, gate 2, offer framing and thin research as a warning passed");
}
void main().catch((error) => { console.error(error); process.exit(1); });
