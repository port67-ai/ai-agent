import assert from "node:assert/strict";
import { activeHold, syncTaskPlan } from "../src/lib/factory/task-plan";
import type { Project } from "../src/lib/factory/model";

// CHG-0101: the AI agents map shows a producer agent hold only while what it names is still open.
const base = (hold: { gate: string; subject: string; notes: string } | undefined, extra: Partial<Project> = {}) =>
  ({ sources: [], insights: [], strategies: [], producerAgent: hold ? { hold } : undefined, ...extra }) as unknown as Project;

const thin = { gate: "sources", subject: "s", notes: "Fewer than 2 accepted sources for customer, competitor, creative: re-run that research" };
assert.equal(activeHold(base(thin, { sources: [{ status: "unreviewed" }] as never })), undefined, "a thin-research hold is never shown");

const undecided = { gate: "sources", subject: "s", notes: "3 sources left undecided" };
assert.ok(activeHold(base(undecided, { sources: [{ status: "unreviewed" }] as never })), "a source hold shows while sources wait");
assert.equal(activeHold(base(undecided, { sources: [{ status: "supported" }] as never })), undefined, "once a person decides the sources the hold is no longer shown");

const insights = { gate: "insights", subject: "i", notes: "Two insights lack evidence" };
assert.ok(activeHold(base(insights, { insights: [{ status: "draft" }] as never })));
assert.equal(activeHold(base(insights, { insights: [{ status: "reviewed" }] as never })), undefined);

const direction = { gate: "direction", subject: "d", notes: "Direction needs proof" };
assert.ok(activeHold(base(direction, { strategies: [{ status: "draft" }] as never })));
assert.equal(activeHold(base(direction, { strategies: [{ status: "approved" }] as never })), undefined);

assert.equal(activeHold(base(undefined)), undefined);

// CHG-0102: a held direction stops blocking "Review campaign direction" once the producer shares it.
{
  const p = { taskPlan: { tasks: [{ id: "reviewDirection", dependsOn: [], status: "pending", title: "Review campaign direction", reason: "" }], researchKey: "k", research: [] }, runs: [], sources: [], insights: [], tasks: [], assets: [], reviews: [], strategies: [{ status: "draft", hash: "d1" }], producerAgent: { hold: { gate: "direction", subject: "d1", notes: "Audience is still not research-based" } } } as unknown as Project;
  syncTaskPlan(p);
  assert.equal(p.taskPlan!.tasks[0].status, "blocked", "a draft direction under a reviewer hold waits for the producer");
  (p.strategies[0] as { status: string }).status = "shared";
  syncTaskPlan(p);
  assert.equal(p.taskPlan!.tasks[0].status, "done", "sharing the held direction settles the hold without a reset");
}
console.log("Active hold: settled and thin-research holds leave the map but stay in the log passed");
