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
