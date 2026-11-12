import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalRepository } from "../src/lib/factory/repository";
import { createProject, transition, keyMessagesInput, strategyHash } from "../src/lib/factory/engine";
import { runContent } from "../src/lib/factory/content-run";
import { validateContent, prepareContent } from "../src/lib/factory/content";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "port67-content-"));
  const repo = new LocalRepository(dir);
  const op = { role: "operator" as const, workspaceId: "work", subject: "producer" };
  process.env.PORT67_SYNTHESIS_ENABLED = "true";
  process.env.PORT67_OPENAI_API_KEY = "test-only-key";
  process.env.PORT67_SYNTHESIS_MODEL = "contract-model";
  process.env.PORT67_SYNTHESIS_PROVIDER = "openai";
  let p = createProject({ business: "Brand", objective: "Explain", contact: "a@example.com" }, op, "content-project");
  p = transition(p, { type: "authoriseAI", confirm: true }, op);
  p = transition(p, { type: "addSource", segment: "brand", title: "Source", url: "https://example.com/source", excerpt: "Customers wait 3 days for an appointment" }, op);
  p = transition(p, { type: "reviewSource", id: p.sources[0].id, status: "supported" }, op);
  const sid = p.sources[0].id;

  // Manual key messages: proof is mandatory and may cite only reviewed sources.
  assert.throws(() => keyMessagesInput([{ message: "m", proof: "p", sourceIds: ["nope"] }], [sid]), /proof/);
  assert.throws(() => keyMessagesInput("x", [sid]), /list/);
  assert.equal(keyMessagesInput(undefined, [sid]), undefined);
  assert.equal(keyMessagesInput([{ message: "Book fast", proof: "Waits are long", sourceIds: [sid] }], [sid])![0].sourceIds[0], sid);

  const strategy = (hash: string) => ({ id: "s1", version: 1, status: "approved" as const, audience: "a", message: "Book fast", rationale: "r", design: "d", channels: "Instagram, email", format: "f", cta: "Book now", evidenceIds: [sid], insightIds: [], hypothesis: "h", uncertainties: "u", positioning: "Fast booking", tone: "Plain", doNotClaim: "No guarantees", keyMessages: [{ message: "Book fast", proof: "Waits are long", sourceIds: [sid] }], createdAt: new Date().toISOString(), hash });
  await repo.mutate("work", (db) => { db.projects.push(p); });

  // Gates: approved direction with key messages, and production drafts first.
  await assert.rejects(() => runContent(repo, op, p.id), /Approve the campaign direction/);
  await repo.mutate("work", (db) => { const x = db.projects[0]; const s = { ...strategy(""), keyMessages: undefined } as never; x.strategies.push(s); (x.strategies[0] as { status: string }).status = "approved"; });
  await assert.rejects(() => runContent(repo, op, p.id), /no key messages/);
  await repo.mutate("work", (db) => { const x = db.projects[0]; x.strategies = [strategy("")]; x.strategies[0].hash = strategyHash(x.strategies[0]); });
  await assert.rejects(() => runContent(repo, op, p.id), /production drafts first/);
  const hash = (await repo.read("work")).projects[0].strategies[0].hash;
  await repo.mutate("work", (db) => { db.projects[0].assets.push({ id: "c1", version: 1, kind: "copy", title: "Copy & script", strategyId: "s1", strategyHash: hash, taskId: "t1", evidenceIds: [sid], status: "draft", content: "x", hash: "h", createdAt: new Date().toISOString() }); });

  const good = { items: [
    { channel: "Instagram", kind: "social_post", headline: "Skip the wait", body: "Customers wait 3 days. Book in minutes instead.", cta: "Book now", keyMessage: "Book fast", sourceIds: [sid] },
    { channel: "Email", kind: "email", headline: "Faster booking", body: "A simpler way to book.", cta: "Book now", keyMessage: "Book fast", sourceIds: [sid] },
    { channel: "Search", kind: "headline", headline: "Book today", body: "Plain, quick booking.", cta: "Book now", keyMessage: "Book fast", sourceIds: [sid] },
  ] };
  const ctx = prepareContent((await repo.read("work")).projects[0]);
  assert.equal(validateContent(good, ctx).length, 3);
  const mutate = (f: (i: Record<string, unknown>) => void) => { const c = structuredClone(good); f(c.items[0]); return c; };
  for (const [label, bad] of [
    ["unknown key message", mutate((i) => (i.keyMessage = "Invented message"))],
    ["unsupported source", mutate((i) => (i.sourceIds = ["other"]))],
    ["invented figure", mutate((i) => (i.body = "Book in 90% less time"))],
    ["bad kind", mutate((i) => (i.kind = "tweetstorm"))],
    ["extra field", mutate((i) => (i.extra = 1))],
    ["too few items", { items: good.items.slice(0, 2) }],
  ] as const) assert.throws(() => validateContent(bad, ctx), Error, label);

  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = (async () => { calls++; return Response.json({ id: "c", usage: { input_tokens: 5, output_tokens: 6 }, output: [{ content: [{ type: "output_text", text: JSON.stringify(good) }] }] }); }) as typeof fetch;
    const done = await runContent(repo, op, p.id);
    const pack = done.assets.find((a) => a.title === "AI copy pack")!;
    assert.equal(pack.status, "draft");
    assert.equal(pack.kind, "copy");
    assert.equal(pack.taskId, "t1");
    assert.equal(pack.strategyHash, hash);
    assert.ok(pack.content.includes("Skip the wait") && pack.content.includes("Evidence: Source"));
    assert.deepEqual(pack.evidenceIds, [sid]);
    assert.equal(done.runs.at(-1)?.stage, "content");
    assert.equal(done.runs.at(-1)?.usage?.input_tokens, 5);
    assert.equal(calls, 1);

    // A rejected draft keeps the usage and creates nothing.
    globalThis.fetch = (async () => Response.json({ id: "c2", usage: { input_tokens: 4, output_tokens: 4 }, output: [{ content: [{ type: "output_text", text: JSON.stringify(mutate((i) => (i.body = "Up 250% sales"))) }] }] })) as typeof fetch;
    await assert.rejects(() => runContent(repo, op, p.id), /evidence contract/);
    const after = (await repo.read("work")).projects[0];
    assert.equal(after.assets.filter((a) => a.title === "AI copy pack").length, 1);
    assert.equal(after.runs.at(-1)?.status, "failed");
    assert.equal(after.runs.at(-1)?.usage?.input_tokens, 4);
    await assert.rejects(() => runContent(repo, { ...op, demo: true }, p.id), /demo/);
  } finally {
    globalThis.fetch = original;
    await rm(dir, { recursive: true, force: true });
  }
  console.log("AI copy pack: approved-direction gate, evidence-bound validation, no invented figures, metered draft asset passed");
}
void main().catch((e) => { console.error(e); process.exit(1); });
