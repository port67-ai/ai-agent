import assert from "node:assert/strict";
import { runTracker } from "../src/lib/factory/run-tracker";
import type { Project } from "../src/lib/factory/model";

const at = "2026-11-15T00:00:00Z";
const by = (p: Project, id: string) => runTracker(p).find((s) => s.id === id)!;
const p = { sources: [], insights: [], strategies: [], assets: [], runs: [] } as unknown as Project;
assert.equal(by(p, "scope").state, "pending");
assert.equal(by(p, "direction-approval").state, "pending");

p.runs.push({ id: "r1", stage: "research", segment: "brand", status: "running", at } as never);
assert.equal(by(p, "research:brand").state, "running");
p.runs[0].status = "completed";
p.runs.push({ id: "r2", stage: "research", segment: "customer", status: "failed", at } as never);
assert.equal(by(p, "research:brand").state, "done");
assert.equal(by(p, "research:customer").state, "paused");
assert.equal(by(p, "research:customer").tab, "research");

p.sources.push({ kind: "public_source", segment: "brand", status: "unreviewed" } as never);
assert.equal(by(p, "sources").state, "paused");
p.sources[0].status = "supported";
assert.equal(by(p, "sources").state, "done");
p.insights.push({ status: "reviewed" } as never);
assert.equal(by(p, "insights").state, "done");
assert.equal(by(p, "formats").state, "paused", "a producer must choose formats");
p.formats = { suggested: [], suggestedAt: at, selected: ["static"], decidedAt: at } as never;
assert.equal(by(p, "formats").state, "done");

p.strategies.push({ status: "shared", hash: "h", version: 1 } as never);
const gate = by(p, "direction-approval");
assert.equal(gate.state, "waiting_approval");
assert.equal(gate.tab, "direction", "the waiting step links to the page with the approve button");
p.strategies[0].status = "approved";
assert.equal(by(p, "direction-approval").state, "done");
p.assets.push({ strategyHash: "h", status: "shared" } as never);
assert.equal(by(p, "asset-approval").state, "waiting_approval");
assert.equal(by(p, "asset-approval").tab, "assets");
p.producerAgent = { hold: { gate: "insights", subject: "x", notes: "Too few supported" } } as never;
p.insights[0].status = "draft";
assert.equal(by(p, "insights").state, "paused");
assert.match(by(p, "insights").detail, /Too few supported/);
console.log("Run tracker: running, done, paused with reason, and waiting-for-approval steps link to the approval page");

// row actions: AI generation and the human decisions are offered on the row where they belong
{
  const base = { runs: [], sources: [{ id: "s", kind: "public_source", status: "supported", segment: "brand" }], insights: [{ id: "i", status: "reviewed" }], assets: [], strategies: [], formats: { selected: ["static"], suggested: [], suggestedAt: "", decidedAt: "x" } } as unknown as Project;
  assert.equal(by(base, "audiences").ai, "audiences");
  assert.equal(by(base, "direction").ai, "strategy");
  const shared = { ...base, audiences: { strapline: "S", segments: [] }, strategies: [{ status: "shared", version: 1, hash: "h" }] } as unknown as Project;
  assert.equal(by(shared, "direction-approval").act, "approve_direction");
  const approved = { ...shared, strategies: [{ status: "approved", version: 1, hash: "h" }] } as unknown as Project;
  assert.equal(by(approved, "production").ai, "content");
  console.log("Run tracker row actions passed");
}

// review actions sit on the row: sources and draft insights can be reviewed one by one from Run progress
{
  const mk = (sourceStatus: string, insightStatus: string) => ({ runs: [], sources: [{ id: "s", kind: "public_source", status: sourceStatus, segment: "brand" }], insights: [{ id: "i", status: insightStatus }], assets: [], strategies: [] }) as unknown as Project;
  assert.equal(by(mk("unreviewed", "draft"), "sources").act, "review_sources");
  assert.equal(by(mk("supported", "draft"), "insights").act, "review_insights");
  assert.equal(by(mk("supported", "reviewed"), "sources").act, undefined);
  console.log("Run tracker review actions passed");
}
