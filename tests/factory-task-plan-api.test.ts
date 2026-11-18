import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "factory-task-api-"));
  Object.assign(process.env, { PORT67_DATA_DIR: directory, PORT67_SESSION_SECRET: "s".repeat(48), PORT67_OPERATOR_PASSWORD: "p".repeat(24), PORT67_FIREBASE_PROJECT_ID: "ai-agency-3671b", PORT67_OPERATOR_UIDS: "producer", PORT67_RESEARCH_ENABLED: "true", PORT67_SYNTHESIS_ENABLED: "true", PORT67_RESEARCH_MODEL: "test", PORT67_SYNTHESIS_MODEL: "test", PORT67_OPENAI_API_KEY: "fixture-only", PORT67_SCOPING_ENABLED: "false" });
  const { handleFactory } = await import("../src/lib/factory/service");
  const { LocalRepository } = await import("../src/lib/factory/repository");
  const verifier = async (uid: string) => ({ uid, aud: "ai-agency-3671b", iss: "https://securetoken.google.com/ai-agency-3671b", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
  const lookup = async (uid: string) => ({ uid, emailVerified: true, disabled: false });
  let cookie = "";
  const request = async (path: string, data?: unknown) => {
    const result = await handleFactory(new Request("http://localhost:3000/api/factory/" + path, { method: data ? "POST" : "GET", headers: { origin: "http://localhost:3000", cookie, ...(data ? { "content-type": "application/json" } : {}) }, body: data ? JSON.stringify(data) : undefined }), path.split("/"), verifier, lookup);
    const set = result.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0], name = pair.split("=")[0]; cookie = cookie.split(";").filter(x => x.trim() && !x.trim().startsWith(name + "=")).concat(pair).join(";"); }
    return result;
  };
  const login = async (uid: string) => { cookie = ""; await request("session"); return (await (await request("identity-login", { idToken: uid })).json()).principal; };
  const customer = await login("customer");
  const created = await request("projects", { business: "Shop", objective: "Understand customer objections", contact: "a@example.com", workRequest: "research", useAIPlanner: false });
  assert.equal(created.status, 201);
  const safe = (await created.json()).project;
  assert.equal(safe.taskPlan, undefined);
  assert.ok(safe.taskProgress.length);
  const route = "projects/" + safe.id;
  assert.equal((await request(route + "/task-plan")).status, 403);
  assert.equal((await request(route, { type: "reviseTaskPlan", version: 1, research: ["brand", "customer", "video"], reason: "Customer cannot change agent policy" })).status, 403);
  await login("producer");
  await request("accounts", { accountId: customer.accountId });
  const plan = (await (await request(route + "/task-plan")).json()).plan;
  assert.deepEqual(plan.research, ["brand", "customer"]);
  await request(route, { type: "authoriseAI", confirm: true });
  const original = globalThis.fetch;
  let calls = 0;
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  globalThis.fetch = async () => {
    const n = ++calls;
    if (n === 2) { started!(); await held; }
    const url = "https://example.com/source/" + n;
    return Response.json({ id: "fixture-" + n, usage: { input_tokens: 10, output_tokens: 20 }, output: [{ type: "web_search_call" }, { content: [{ type: "output_text", text: `FINDING | Customer evidence | ${url} | Published fixture evidence\nCONFIDENCE | limited`, annotations: [{ type: "url_citation", url, title: "Published fixture" }] }] }] });
  };
  try {
    const excluded = await request(route + "/research", { segment: "video" });
    assert.equal(excluded.status, 400);
    assert.match((await excluded.json()).error, /excluded/);
    assert.equal(calls, 0, "excluded agent cannot invoke scoping or research");
    assert.equal((await request(route + "/synthesis", { stage: "strategy" })).status, 400);
    assert.equal(calls, 0, "research-only projects cannot invoke a strategy agent");
    const brand = await request(route + "/research", { segment: "brand" });
    assert.equal(brand.status, 200, await brand.text());
    const persisted = (await new LocalRepository(directory).read(customer.accountId)).projects[0];
    assert.equal(persisted.taskPlan!.tasks.find(t => t.id === "research:brand")!.status, "done", "task completion survives repository reconstruction");
    assert.equal((await request(route + "/synthesis", { stage: "insights" })).status, 400, "unfinished dependencies block downstream paid calls");
    assert.equal(calls, 1);
    const pending = request(route + "/research", { segment: "customer" });
    await entered;
    assert.equal((await request(route, { type: "updateBrief", objective: "Research a different offer and customer group" })).status, 200);
    release!();
    const late = await pending;
    assert.equal(late.status, 400);
    assert.match((await late.json()).error, /stale|context|authorisation/);
    const after = (await new LocalRepository(directory).read(customer.accountId)).projects[0];
    assert.equal(after.runs.length, 2);
    assert.equal(after.runs.at(-1)!.usageStatus, "recorded");
    assert.equal(after.runs.at(-1)!.usage!.output_tokens, 20);
    assert.equal(after.sources.length, 1, "late evidence is rejected while old evidence remains in history");
    assert.equal(after.sources[0].status, "rejected");
    assert.notEqual(after.taskPlan!.tasks.find(t => t.id === "research:brand")!.status, "done");
    assert.ok(after.taskPlan!.history.length);
    const { transition } = await import("../src/lib/factory/engine");
    const { templateScope } = await import("../src/lib/factory/scope");
    const { reviewGate } = await import("../src/lib/factory/producer-review-run");
    const repo = new LocalRepository(directory);
    const operator = { workspaceId: customer.accountId, accountId: customer.accountId, role: "operator" as const, subject: "producer" };
    await repo.mutate(customer.accountId, state => {
      state.projects[0] = transition(state.projects[0], { type: "authoriseAI", confirm: true }, operator);
      state.projects[0].scope = templateScope(state.projects[0], { briefHash: "fixture", version: 1 });
    });
    globalThis.fetch = async () => {
      await repo.mutate(customer.accountId, state => { state.projects[0] = transition(state.projects[0], { type: "updateBrief", objective: "Another changed requirement during review" }, operator); });
      return Response.json({ id: "review-fixture", usage: { input_tokens: 10, output_tokens: 20 }, output: [{ content: [{ type: "output_text", text: JSON.stringify({ verdict: "pass", summary: "Scope is relevant", notes: "", score: 90, unsupported: [] }) }] }] });
    };
    await assert.rejects(() => reviewGate(repo, operator, safe.id, "scope"), /changed|stale/i, "reviewer cannot approve a superseded task input");
    const reviewed = (await repo.read(customer.accountId)).projects[0].runs.at(-1)!;
    assert.equal(reviewed.status, "failed");
    assert.equal(reviewed.usage!.output_tokens, 20);
    console.log("Task API: selection denial, paid dependency guards, durable status, customer isolation and stale-result usage retention passed");
  } finally { release!(); globalThis.fetch = original; await rm(directory, { recursive: true, force: true }); }
}
void main();
