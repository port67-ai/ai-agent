import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalRepository } from "../src/lib/factory/repository";
import { createProject, projectView, transition } from "../src/lib/factory/engine";
import { approvalMode, producerApprovalsOn, saveApprovalMode } from "../src/lib/factory/approval-mode";
import { planNext, progressFingerprint, runProducerAgent, PRODUCER_AGENT } from "../src/lib/factory/producer-agent";
import { directionRules, directionView, insightsView, parseReview, scopeView, sourceBatches, sourceRules, insightRules } from "../src/lib/factory/producer-reviews";
import { templateScope } from "../src/lib/factory/scope";
import { segments, type Project, type Segment } from "../src/lib/factory/model";

const op = { role: "operator" as const, workspaceId: "w", subject: "producer" };
const cust = { role: "customer" as const, workspaceId: "w", subject: "customer", identity: "firebase" as const, accountId: "w" };
const at = "2026-11-13T10:00:00Z";
const body = (n: string) => `Detailed excerpt number ${n} describing the offer, the prices and what customers say about it.`;
function base(id: string, extra: Record<string, string> = {}): Project {
  const p = createProject({ business: "Brand", objective: "SENTINEL-OBJECTIVE grow the business", description: "SENTINEL-DESCRIPTION a shop", contact: "a@example.com", ...extra }, op, id);
  let n = 0;
  for (const segment of segments) for (let k = 0; k < 3; k++) p.sources.push({ id: `${segment}${k}`, segment, title: `${segment} source ${k}`, url: `https://example.com/${segment}/${k}`, excerpt: body(String(++n)), kind: "public_source", status: "unreviewed", collectedAt: at, method: "m" });
  for (const segment of segments) p.runs.push({ id: "r-" + segment, stage: "research", segment, at, finishedAt: at, status: "completed" } as never);
  return p;
}
const insight = (id: string, sourceIds: string[], status: "draft" | "reviewed" = "draft") => ({ id, title: "Insight " + id, interpretation: "SENTINEL-INSIGHT customers choose this because the evidence says so clearly.", sourceIds, confidence: "moderate" as const, createdAt: at, status });

async function main() {
  // ---- planning: one next step or one stop; AI steps only when AI is ready; reviews sit between every drafting step
  const p = base("plan");
  assert.deepEqual(planNext(p, false), { step: "reviewSources" });
  p.sources.forEach((s) => (s.status = "supported"));
  assert.deepEqual(planNext(p, true), { step: "draftInsights" });
  assert.equal((planNext(p, false) as { stop: { kind: string } }).stop.kind, "waiting_human");
  p.insights.push(insight("i1", ["brand0"]));
  assert.deepEqual(planNext(p, false), { step: "reviewInsights" });
  p.insights[0].status = "reviewed";
  assert.deepEqual(planNext(p, true), { step: "draftDirection" });
  p.runs.push({ id: "busy", stage: "insights", at, status: "running" } as never);
  assert.equal((planNext(p, true) as { stop: { kind: string } }).stop.kind, "blocked", "never overlaps a provider task");
  p.runs.pop();
  p.scope = templateScope(p, { briefHash: "h", version: 1 });
  assert.deepEqual(planNext(p, true), { step: "reviewScope" }, "the scope producer goes first once a scope exists");
  assert.notEqual(progressFingerprint(p), progressFingerprint({ ...p, sources: p.sources.slice(1) }));

  // ---- walled gardens: each reviewer's input holds its own material and nothing from the other gates
  const w = base("wall");
  w.scope = templateScope(w, { briefHash: "h", version: 1 });
  w.sources.forEach((s) => (s.status = "supported"));
  w.insights.push(insight("i1", ["brand0"]));
  const batchJson = JSON.stringify(sourceBatches(base("wall2"))[0].view);
  assert.ok(batchJson.includes("Detailed excerpt") && !batchJson.includes("SENTINEL-INSIGHT") && !batchJson.includes("SENTINEL-DESCRIPTION"), "source producer sees sources, not insights or the brief description");
  const insJson = JSON.stringify(insightsView(w).view);
  assert.ok(insJson.includes("SENTINEL-INSIGHT") && insJson.includes("Detailed excerpt") && !insJson.includes("SENTINEL-OBJECTIVE") && !insJson.includes("SENTINEL-DESCRIPTION"), "insight producer sees insights and their evidence, not the brief or any direction");
  const scopeJson = JSON.stringify(scopeView(w));
  assert.ok(scopeJson.includes("SENTINEL-OBJECTIVE") && !scopeJson.includes("Detailed excerpt") && !scopeJson.includes("SENTINEL-INSIGHT"), "scope producer sees the brief and scope, no research");
  w.insights[0].status = "reviewed";
  w.strategies.push({ id: "st", version: 1, status: "draft", audience: "a", message: "m", rationale: "r", design: "d", channels: "c", format: "f", cta: "Book now", evidenceIds: ["brand0"], insightIds: ["i1"], positioning: "pos", doNotClaim: "none", keyMessages: [{ message: "k", proof: "pr", sourceIds: ["brand0"] }], hypothesis: "h", uncertainties: "u", createdAt: at, hash: "H" } as never);
  const dirJson = JSON.stringify(directionView(w));
  assert.ok(dirJson.includes("SENTINEL-INSIGHT") && !dirJson.includes("Detailed excerpt") && !dirJson.includes("SENTINEL-DESCRIPTION"), "direction producer sees the direction and its insights, no raw sources");
  assert.equal(directionRules(w).verdict, "pass");
  w.strategies[0].keyMessages = [];
  assert.equal(directionRules(w).verdict, "rework");

  // ---- free rule checks and strict parsing
  const dup = base("dup");
  dup.sources[1].url = dup.sources[0].url;
  dup.sources[2].excerpt = "short";
  const rules = sourceRules(dup, dup.sources.map((s) => s.id));
  assert.deepEqual(rules.filter((x) => x.verdict === "reject").map((x) => x.id), ["brand1", "brand2"], "duplicate and thin sources are rejected by the free checks");
  assert.equal(insightRules(w, ["i1"])[0].verdict, "accept");
  assert.throws(() => parseReview("sources", JSON.stringify({ items: [{ id: "nope", verdict: "accept", reason: "x" }] }), ["a"]), /no usable verdicts/, "unknown ids are ignored, never trusted");
  assert.throws(() => parseReview("direction", JSON.stringify({ verdict: "maybe" }), []), /pass or rework/);
  const parsed = parseReview("sources", JSON.stringify({ items: [{ id: "a", verdict: "accept", reason: "ok" }, { id: "a", verdict: "reject", reason: "dup" }, { id: "b", verdict: "reject", reason: "thin" }] }), ["a", "b", "c"]);
  assert.equal(parsed.items.length, 2, "a repeated id counts once");
  assert.match(parsed.summary, /1 of 3 sources accepted, 1 rejected, 1 left undecided/);

  const dir = await mkdtemp(join(tmpdir(), "port67-producer-agent-"));
  const original = globalThis.fetch;
  try {
    const repo = new LocalRepository(dir);
    // ---- orchestrated pass with free checks only (no model chosen): reviewers act by rules and say so
    let q = base("agent");
    q = transition(q, { type: "authoriseAI", confirm: true }, op);
    await repo.mutate("w", (s) => void s.projects.push(q));
    const first = await runProducerAgent(repo, op, "agent", { force: true });
    assert.ok(first.sources.every((s) => s.status === "supported"), "source producer accepted every source that passed the checks");
    assert.equal(first.reviews!.at(-1)!.gate, "sources");
    assert.equal(first.reviews!.at(-1)!.by, "rules");
    assert.match(first.reviews!.at(-1)!.skipped || "", /not switched on|No model/);
    assert.equal(first.producerAgent?.status, "waiting_human");
    assert.match(first.producerAgent!.reason, /AI drafting is not configured/);
    assert.ok(first.audit.some((x) => x.action === "sources_reviewed_by_producer" && x.actor === PRODUCER_AGENT));
    assert.ok(first.audit.some((x) => x.action === "producer_review"));
    const again = await runProducerAgent(repo, op, "agent", { auto: true });
    assert.equal(again.producerAgent?.passes, 1, "an automatic pass with nothing changed does nothing");

    // Draft insight and a direction missing its key messages: the direction producer sends it back, no redraft is possible, so it holds.
    await repo.mutate("w", (s) => {
      const cur = s.projects.find((x) => x.id === "agent")!;
      cur.insights.push(insight("i1", ["brand0", "brand1"]) as never);
      s.projects[s.projects.indexOf(cur)] = transition(transition(cur, { type: "reviewInsight", id: "i1", status: "reviewed" }, op), { type: "draftStrategy", positioning: "A clear position", doNotClaim: "Prices" }, op);
    });
    const held = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(held.reviews!.at(-1)!.gate, "direction");
    assert.equal(held.reviews!.at(-1)!.verdict, "rework");
    assert.equal(held.producerAgent?.status, "waiting_human");
    assert.match(held.producerAgent!.reason, /redraft allowance is used/);
    // A better draft is reviewed afresh and shared; the agent then stops at the customer.
    await repo.mutate("w", (s) => {
      const i = s.projects.findIndex((x) => x.id === "agent");
      s.projects[i] = transition(s.projects[i], { type: "draftStrategy", keyMessages: [{ message: "Message", proof: "Proof", sourceIds: ["brand0"] }] }, op);
    });
    const shared = await runProducerAgent(repo, op, "agent", { force: true });
    assert.equal(shared.strategies.at(-1)!.status, "shared");
    assert.equal(shared.producerAgent?.status, "waiting_customer");
    const stillShared = await runProducerAgent(repo, op, "agent", { force: true });
    assert.ok(!stillShared.audit.some((x) => x.action === "approveStrategy"), "the agent never approves for the customer");
    // The admin switch: the Render master switch must be on AND the mode must be AI. Default mode is AI.
    assert.equal(approvalMode(), "ai", "AI producer approval is the default");
    assert.ok(!producerApprovalsOn(), "master switch off: nobody but the customer approves");
    process.env.PORT67_PRODUCER_APPROVALS = "true";
    try {
      await saveApprovalMode(repo, "manual", "owner");
      assert.equal(planNext(shared, true).hasOwnProperty("stop"), true, "manual mode waits for the account owner");
      const manual = await runProducerAgent(repo, op, "agent", { force: true });
      assert.equal(manual.strategies.at(-1)!.status, "shared");
      assert.equal(manual.producerAgent?.status, "waiting_customer");
      await saveApprovalMode(repo, "ai", "owner");
      assert.deepEqual(planNext(shared, true), { step: "approveDirection" });
      await assert.rejects(() => saveApprovalMode(repo, "other", "owner"), /ai or manual/);
    } catch (e) { delete process.env.PORT67_PRODUCER_APPROVALS; throw e; }
    const produced = await runProducerAgent(repo, op, "agent", { force: true });
    delete process.env.PORT67_PRODUCER_APPROVALS;
    assert.match(produced.strategies.at(-1)!.approvedBy!, /AI producer \(on behalf of the customer\)/);
    assert.ok(produced.audit.some((x) => x.action === "approved_on_behalf"));
    assert.equal(produced.tasks.length, 3);
    assert.ok(produced.assets.every((x) => x.status === "shared"));
    assert.match(produced.producerAgent!.reason, /approve the storyboard and outline assets/);
    assert.equal(projectView(produced, cust).producerAgent, undefined);
    assert.equal(projectView(produced, cust).reviews, undefined, "customers never see reviewer verdicts");
    assert.ok(projectView(produced, op).reviews?.length);
    await repo.mutate("w", (s) => {
      const i = s.projects.findIndex((x) => x.id === "agent");
      s.projects[i] = transition(s.projects[i], { type: "approveAllAssets" }, cust);
    });
    assert.equal((await runProducerAgent(repo, op, "agent", { force: true })).producerAgent?.status, "done");
    await repo.mutate("w", (s) => void (s.projects.find((x) => x.id === "agent")!.producerAgent!.passes = 30));
    assert.equal((await runProducerAgent(repo, op, "agent", { force: true })).producerAgent?.passes, 30, "pass cap");
    await assert.rejects(() => runProducerAgent(repo, cust, "agent", {}), /operator/i);
    await assert.rejects(() => runProducerAgent(repo, { ...op, demo: true }, "agent", {}), /demo/);

    // ---- with a model: reviewers are metered, see only their own view, and one rework is allowed per gate
    process.env.PORT67_SYNTHESIS_ENABLED = "true";
    process.env.PORT67_OPENAI_API_KEY = "test-only-key";
    process.env.PORT67_SYNTHESIS_MODEL = "contract-model";
    const calls: { name: string; input: string }[] = [];
    let n = 0;
    globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
      const b = JSON.parse(String(init?.body || "{}"));
      const name = String(b.text?.format?.name || "");
      calls.push({ name, input: String(b.input) });
      n++;
      const reply = (text: string) => Response.json({ id: "x" + n, usage: { input_tokens: 50, output_tokens: 20 }, output: [{ content: [{ type: "output_text", text }] }] });
      if (name === "port67_review_sources") {
        const ids = (JSON.parse(String(b.input)).sources as { id: string; title: string }[]);
        return reply(JSON.stringify({ items: ids.map((s) => ({ id: s.id, verdict: s.title.includes("brand source 1") ? "reject" : "accept", reason: s.title.includes("brand source 1") ? "Off topic for this business." : "Specific and on topic." })) }));
      }
      if (name === "port67_review_insights") {
        const ids = (JSON.parse(String(b.input)).insights as { id: string }[]);
        return reply(JSON.stringify({ items: ids.map((i) => ({ id: i.id, verdict: "reject", reason: "Overstates what the evidence shows." })), notes: "Tie each insight to a quoted claim." }));
      }
      return reply("not json"); // the drafting agents answer badly: the pass must stop, not loop
    }) as typeof fetch;
    let r = base("ai");
    r = transition(r, { type: "authoriseAI", confirm: true }, op);
    r.sources.find((s) => s.id === "customer0")!.status = "supported";
    r.insights.push(insight("i1", ["customer0"]) as never, insight("i2", ["customer0"]) as never);
    await repo.mutate("w", (s) => void s.projects.push(r));
    const ai = await runProducerAgent(repo, op, "ai", { force: true });
    const srcReview = ai.reviews!.find((x) => x.gate === "sources")!;
    assert.equal(srcReview.by, "ai");
    assert.equal(ai.sources.find((s) => s.id === "brand1")!.status, "rejected", "the source producer's rejection was applied");
    assert.match(srcReview.items.find((x) => x.id === "brand1")!.reason, /Off topic/);
    const sourceCall = calls.find((c) => c.name === "port67_review_sources")!;
    assert.ok(!sourceCall.input.includes("SENTINEL-INSIGHT") && !sourceCall.input.includes("SENTINEL-DESCRIPTION"), "the source producer's model call held no insights and no brief description");
    const insightCall = calls.find((c) => c.name === "port67_review_insights")!;
    assert.ok(insightCall.input.includes("SENTINEL-INSIGHT") && !insightCall.input.includes("SENTINEL-OBJECTIVE"), "the insight producer's model call held no brief");
    const insReview = ai.reviews!.find((x) => x.gate === "insights")!;
    assert.equal(insReview.verdict, "rework");
    assert.ok(ai.insights.every((i) => i.status === "rejected"));
    const redraft = calls.find((c) => c.name === "port67_insights")!;
    assert.match(redraft.input, /producerFeedback.*Tie each insight to a quoted claim/, "the reviewer's notes went to the drafter, once");
    assert.equal(ai.producerAgent?.reworks?.insights, 1);
    assert.equal(ai.producerAgent?.pending, undefined, "the pending redraft was consumed, not left to repeat");
    assert.equal(ai.producerAgent?.status, "blocked");
    assert.match(ai.producerAgent!.reason, /Draft insights with AI did not complete/);
    assert.ok(ai.runs.filter((x) => x.stage === "review").length >= 2 && ai.runs.filter((x) => x.stage === "review").every((x) => x.status === "completed" && x.capabilityId?.startsWith("review.")), "reviewer calls are recorded runs");
    const callsBefore = calls.length;
    const quiet = await runProducerAgent(repo, op, "ai", { auto: true });
    assert.equal(calls.length, callsBefore, "an automatic pass with nothing changed makes no calls");
    assert.equal(quiet.producerAgent?.passes, 1);
    const human = await runProducerAgent(repo, op, "ai", { force: true });
    assert.equal(human.producerAgent?.status, "waiting_human", "everything rejected and no allowance left: a person decides");
    assert.match(human.producerAgent!.reason, /rejected every draft insight/);
  } finally {
    globalThis.fetch = original;
    delete process.env.PORT67_SYNTHESIS_ENABLED;
    delete process.env.PORT67_OPENAI_API_KEY;
    delete process.env.PORT67_SYNTHESIS_MODEL;
    await rm(dir, { recursive: true, force: true });
  }
  void (segments as readonly Segment[]);
  console.log("Producer reviewers: walled-garden views, free rule checks, strict parsing, metered model calls, one rework per gate, holds for a person, no loops, customer gates untouched");
}
void main();
