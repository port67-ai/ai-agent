import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalRepository } from "../src/lib/factory/repository";
import { createProject, projectView, transition } from "../src/lib/factory/engine";
import { planNext, progressFingerprint, runProducerAgent, PRODUCER_AGENT } from "../src/lib/factory/producer-agent";
import { segments, type Project } from "../src/lib/factory/model";

const op = { role: "operator" as const, workspaceId: "w", subject: "producer" };
const cust = { role: "customer" as const, workspaceId: "w", subject: "customer", identity: "firebase" as const, accountId: "w" };
const at = "2026-11-13T10:00:00Z";
function base(id: string): Project {
  const p = createProject({ business: "Brand", objective: "Grow the business", contact: "a@example.com" }, op, id);
  p.sources.push({ id: "s1", segment: "brand", title: "s1", url: "https://example.com/1", excerpt: "e", kind: "public_source", status: "unreviewed", collectedAt: at, method: "m" });
  for (const segment of segments) p.runs.push({ id: "r-" + segment, stage: "research", segment, at, finishedAt: at, status: "completed" } as never);
  return p;
}

async function main() {
  // Pure planning: each state names exactly one next step or one stop, and AI steps are only planned when AI is ready.
  let p = base("plan");
  assert.deepEqual(planNext(p, false), { step: "acceptSources" });
  p.runs.pop();
  assert.match((planNext(p, true) as { stop: { reason: string } }).stop.reason, /creative research has not run/);
  p = base("plan2");
  p.sources[0].status = "supported";
  assert.deepEqual(planNext(p, true), { step: "draftInsights" });
  assert.equal((planNext(p, false) as { stop: { kind: string } }).stop.kind, "waiting_human", "without AI the agent hands over instead of failing");
  p.insights.push({ id: "i1", title: "t", interpretation: "i", sourceIds: ["s1"], confidence: "limited", createdAt: at, status: "draft" } as never);
  assert.deepEqual(planNext(p, true), { step: "acceptInsights" });
  p.insights[0].status = "reviewed";
  assert.deepEqual(planNext(p, true), { step: "draftDirection" });
  p.runs.push({ id: "busy", stage: "insights", at, status: "running" } as never);
  assert.equal((planNext(p, true) as { stop: { kind: string } }).stop.kind, "blocked", "never overlaps a running provider task");
  p.runs.pop();
  assert.notEqual(progressFingerprint(p), progressFingerprint({ ...p, sources: [{ ...p.sources[0], status: "rejected" }] }), "a change of state changes the fingerprint");

  // A full pass without AI: accepts sources, stops because AI drafting is not configured, and records where it stopped.
  const dir = await mkdtemp(join(tmpdir(), "port67-producer-agent-"));
  try {
    const repo = new LocalRepository(dir);
    let q = base("agent");
    q = transition(q, { type: "authoriseAI", confirm: true }, op);
    await repo.mutate("w", (s) => void s.projects.push(q));
    const first = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(first.sources[0].status, "supported");
    assert.equal(first.producerAgent?.status, "waiting_human");
    assert.match(first.producerAgent!.reason, /AI drafting is not configured/);
    assert.ok(first.audit.some((x) => x.action === "sources_bulk_accepted" && x.actor === PRODUCER_AGENT), "the step is audited as the agent");
    assert.ok(first.audit.some((x) => x.action === "producer_agent_pass"));
    // Loop guard: an automatic pass with nothing changed does nothing and does not even count as a pass.
    const again = await runProducerAgent(repo, op, "agent", { auto: true });
    assert.equal(again.producerAgent?.passes, 1);
    assert.equal(again.audit.filter((x) => x.action === "producer_agent_pass").length, 1);

    // The producer supplies insight and direction by hand; the agent shares the direction and then stops at the customer.
    await repo.mutate("w", (s) => {
      const cur = s.projects.find((x) => x.id === "agent")!;
      s.projects[s.projects.indexOf(cur)] = transition(transition(cur, { type: "addInsight", title: "Insight", interpretation: "Because", sourceIds: ["s1"], confidence: "moderate" }, op), { type: "draftStrategy", keyMessages: [{ message: "Message", proof: "Proof", sourceIds: ["s1"] }] }, op);
    });
    const shared = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(shared.strategies.at(-1)!.status, "shared");
    assert.equal(shared.producerAgent?.status, "waiting_customer");
    const stillShared = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(stillShared.strategies.at(-1)!.status, "shared", "the agent never approves for the customer");
    assert.ok(!stillShared.audit.some((x) => x.action === "approveStrategy"));

    // The customer approves; the agent then creates the drafts and shares them, and stops waiting for the customer's asset approval.
    await repo.mutate("w", (s) => {
      const i = s.projects.findIndex((x) => x.id === "agent");
      s.projects[i] = transition(s.projects[i], { type: "approveStrategy", hash: s.projects[i].strategies.at(-1)!.hash }, cust);
    });
    const produced = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(produced.tasks.length, 3);
    assert.ok(produced.assets.every((x) => x.status === "shared"), "all drafts are shared with the account owner");
    assert.equal(produced.producerAgent?.status, "waiting_customer");
    assert.match(produced.producerAgent!.reason, /approve the storyboard and outline assets/);
    // Customers never see the agent's state; producers do.
    assert.equal(projectView(produced, cust).producerAgent, undefined);
    assert.ok(projectView(produced, op).producerAgent);
    // Once the customer approves everything the agent reports done and does nothing more.
    await repo.mutate("w", (s) => {
      const i = s.projects.findIndex((x) => x.id === "agent");
      s.projects[i] = transition(s.projects[i], { type: "approveAllAssets" }, cust);
    });
    const done = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(done.producerAgent?.status, "done");
    assert.equal(done.strategies.length, 1, "no extra direction versions were created");
    // Pass limit: a project cannot be driven forever.
    await repo.mutate("w", (s) => void (s.projects.find((x) => x.id === "agent")!.producerAgent!.passes = 30));
    const capped = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(capped.producerAgent?.passes, 30);
    // Customers cannot run it by hand, and it never runs in the demo.
    await assert.rejects(() => runProducerAgent(repo, cust, "agent", {}), /operator/i);
    await assert.rejects(() => runProducerAgent(repo, { ...op, demo: true }, "agent", {}), /demo/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  console.log("Producer agent: plans one step at a time, stops at customer gates, never approves for the customer, audited, loop-guarded and pass-capped");
}
void main();
