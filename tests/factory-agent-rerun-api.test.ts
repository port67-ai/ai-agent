import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PNG, sceneDraft } from "./factory-studio-fixtures";

// CHG-0100 through the API with stubbed providers (no paid calls): rerun one failed agent (research, scoping, insights, planner and
// studio pieces), switch its model first (admin only, validated like the AI models page), every guard (role, confirm, not failed,
// task-plan exclusion, running task, consent, studio stage), audit entries, "Rerun failed agents" order and stop-on-failure, the
// provider quota warning and the bulk move, and the producer agent carrying the project on after a successful rerun.
const GEMINI_QUOTA = "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://aistudio.google.com/usage";
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "factory-rerun-api-"));
  Object.assign(process.env, {
    PORT67_DATA_DIR: directory, PORT67_SESSION_SECRET: "s".repeat(48), PORT67_OPERATOR_PASSWORD: "p".repeat(24), PORT67_FIREBASE_PROJECT_ID: "ai-agency-3671b",
    PORT67_OPERATOR_UIDS: "producer", PORT67_ADMIN_UIDS: "owner", PORT67_RESEARCH_ENABLED: "true", PORT67_SYNTHESIS_ENABLED: "true",
    PORT67_RESEARCH_PROVIDER: "gemini", PORT67_RESEARCH_MODEL: "gemini-2.5-flash", PORT67_SYNTHESIS_PROVIDER: "openai", PORT67_SYNTHESIS_MODEL: "gpt-test-mini",
    PORT67_GEMINI_API_KEY: "gemini-test-only", PORT67_OPENAI_API_KEY: "openai-test-only", PORT67_PROVIDER_RETRY: "off",
  });
  delete process.env.PORT67_PRODUCER_AGENT;
  delete process.env.PORT67_SCOPING_ENABLED;
  delete process.env.PORT67_ANTHROPIC_API_KEY;
  const { handleFactory } = await import("../src/lib/factory/service");
  const { LocalRepository } = await import("../src/lib/factory/repository");
  const { templateScope } = await import("../src/lib/factory/scope");
  const { segments } = await import("../src/lib/factory/model");
  const repo = new LocalRepository(directory);

  // ---- Stubbed providers.
  const mode = { scope: "ok", insights: "ok", planner: "ok", image: "ok", studio: [] as unknown[] };
  const calls: string[] = [];
  let insightSources: string[] = [];
  let n = 0;
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const text = (value: unknown) => reply(200, { id: "resp-" + ++n, usage: { input_tokens: 10, output_tokens: 20 }, output: [{ type: "message", content: [{ type: "output_text", text: typeof value === "string" ? value : JSON.stringify(value) }] }] });
  const scopeReply = (() => { const t = templateScope({ brief: { business: "Nash's Bakery", description: "An independent bakery", objective: "Understand why customers choose sourdough", audience: "Local families", competitors: "", inspiration: "" } as never, channels: [] }, { briefHash: "x", version: 1 }); return { classification: { ...t.classification, rationale: "Small local bakery from the brief" }, competitorSet: t.competitorSet, segments: t.segments }; })();
  const proposal = { summary: "Understand the offer and audience first", unknowns: ["No measured history"], agents: segments.map((segment) => ({ segment, selected: ["brand", "customer"].includes(segment), reason: "Bounded decision for this customer's research objective", questions: ["What public evidence supports this offer?", "Which audience objections matter?"], sourceTypes: ["Primary public sources"], methods: [segment === "channel" ? "channel_behaviour" : segment === "offer" ? "product_offer" : segment === "measurement" ? "measurement_design" : segment === "brand" ? "brand_claims" : segment === "customer" ? "customer_journey" : segment === "competitor" ? "competitive_category" : segment === "creative" ? "creative_examples" : segment === "adjacent" ? "transfer_limits" : segment === "trends" ? "dated_trends" : "video_provenance"], avoid: ["Invented performance"], maxPages: 6 })), mediumHypotheses: [{ channel: "instagram", format: "video_short", confidence: "limited", basis: "channel_prior", reason: "A provisional visual explanation hypothesis" }], gaps: [] };
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const body = JSON.parse(String(init?.body || "{}"));
    if (u.startsWith("https://generativelanguage.googleapis.com/")) {
      calls.push("gemini");
      return reply(429, { error: { code: 429, message: GEMINI_QUOTA, status: "RESOURCE_EXHAUSTED" } });
    }
    if (u === "https://api.openai.com/v1/images/generations") {
      calls.push("openai:image");
      return mode.image === "quota" ? reply(429, { error: { message: "You exceeded your current quota, please check your plan and billing details.", type: "insufficient_quota", code: "insufficient_quota" } }) : reply(200, { data: [{ b64_json: PNG.toString("base64") }], usage: { input_tokens: 50, output_tokens: 4160, total_tokens: 4210 } });
    }
    if (u === "https://api.openai.com/v1/responses") {
      const name = body.tools ? "research" : String(body.text?.format?.name || "");
      calls.push("openai:" + name);
      if (name === "research") {
        const k = ++n;
        const link = `https://www.bakery-review-${k}.co.uk/sourdough`;
        return reply(200, { id: "fixture-" + k, usage: { input_tokens: 10, output_tokens: 20 }, output: [{ type: "web_search_call" }, { content: [{ type: "output_text", text: `FINDING | Customers praise the long-fermented sourdough at Nash's Bakery | ${link} | Reviewers say the sourdough is fermented for two days and sells out by noon most weekends\nCONFIDENCE | limited`, annotations: [{ type: "url_citation", url: link, title: "Bakery review " + k }] }] }] });
      }
      if (name === "port67_scope") return mode.scope === "down" ? reply(503, { error: { message: "The model is overloaded. Please try again later." } }) : text(scopeReply);
      if (name === "port67_insights") return mode.insights === "bad" ? text("this is not JSON") : text({ insights: [{ title: "Freshness sells", interpretation: "Customers choose the bakery because the long-fermented sourdough sells out early, which signals freshness.", sourceIds: insightSources, confidence: "limited" }] });
      if (name === "port67_research_planning") return mode.planner === "bad" ? text({ summary: "" }) : text(proposal);
      if (name === "port67_studio_preproduction") return text(mode.studio.shift());
      if (name === "port67_review_scope" || name === "port67_review_direction") return text({ verdict: "pass", summary: "Fits the brief.", notes: "", score: 90, unsupported: [] });
      if (name === "port67_review_sources" || name === "port67_review_insights") {
        const input = JSON.parse(body.input);
        const ids = (input.sources || input.insights || []).map((x: { id: string }) => x.id);
        return text({ items: ids.map((id: string) => ({ id, verdict: "accept", reason: "Supported by its evidence.", score: 80 })), notes: "" });
      }
    }
    throw new Error("Unexpected fetch in test: " + u + " " + JSON.stringify(body).slice(0, 80));
  }) as typeof fetch;

  // ---- Sessions.
  const verifier = async (uid: string) => ({ uid, aud: "ai-agency-3671b", iss: "https://securetoken.google.com/ai-agency-3671b", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
  const lookup = async (uid: string) => ({ uid, emailVerified: true, disabled: false });
  let cookie = "";
  const request = async (path: string, data?: unknown) => {
    const result = await handleFactory(new Request("http://localhost:3000/api/factory/" + path, { method: data ? "POST" : "GET", headers: { origin: "http://localhost:3000", cookie, ...(data ? { "content-type": "application/json" } : {}) }, body: data ? JSON.stringify(data) : undefined }), path.split("?")[0].split("/"), verifier, lookup);
    const set = result.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0], name = pair.split("=")[0]; cookie = cookie.split(";").filter((x) => x.trim() && !x.trim().startsWith(name + "=")).concat(pair).join(";"); }
    return result;
  };
  const login = async (uid: string) => { cookie = ""; await request("session"); return (await (await request("identity-login", { idToken: uid })).json()).principal; };
  const ok = async (path: string, data?: unknown) => { const r = await request(path, data); const out = await r.json(); assert.equal(r.status, 200, `${path}: ${out.error}`); return out; };
  const refused = async (path: string, data: unknown, status: number, re: RegExp) => { const r = await request(path, data); const out = await r.json(); assert.equal(r.status, status, `${path} ${JSON.stringify(data)}: ${out.error}`); assert.match(out.error, re); return out; };

  const customer = await login("customer");
  const account = customer.accountId as string;
  const as = async (uid: string) => { await login(uid); await ok("accounts", { accountId: account }); };
  const created = await request("projects", { business: "Nash's Bakery", description: "An independent bakery", objective: "Understand why customers choose sourdough", audience: "Local families", contact: "nash@example.com", workRequest: "research", useAIPlanner: false });
  assert.equal(created.status, 201);
  const id = (await created.json()).project.id as string;
  const at = "projects/" + id;
  const stored = async (pid = id) => (await repo.read(account)).projects.find((x) => x.id === pid)!;
  const failedNow = async (pid = id) => (await ok(`projects/${pid}/agents/failed`)).failed as { slot: string; runId: string; canRerun: boolean; why?: string; failure: { kind: string; switchFirst: boolean }; error: string }[];
  const task = async (taskId: string, pid = id) => ((await ok(`projects/${pid}/task-plan`)).plan.tasks as { id: string; status: string }[]).find((t) => t.id === taskId)!.status;

  // ---- Research on Gemini fails with the owner's quota error and blocks the task.
  await as("producer");
  await ok(at, { type: "authoriseAI", confirm: true });
  await refused(at + "/research", { segment: "brand" }, 400, /AI provider returned 429: You exceeded your current quota/);
  assert.deepEqual(calls, ["openai:port67_scope", "gemini"], "scoping ran on OpenAI, research on Gemini");
  let failed = await failedNow();
  assert.deepEqual(failed.map((x) => x.slot), ["research:brand"]);
  assert.equal(failed[0].failure.kind, "quota");
  assert.equal(failed[0].failure.switchFirst, true);
  assert.equal(failed[0].canRerun, true);
  assert.equal(await task("research:brand"), "blocked");
  const firstFailure = failed[0].runId;

  // ---- Guards. Customers cannot rerun; a rerun must be confirmed; only a failed agent; plan exclusion; one run at a time; consent.
  await login("customer");
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true }, 403, /operator/);
  await as("producer");
  await refused(at + "/agents/rerun", { slot: "research:brand" }, 400, /Confirm the rerun/);
  await refused(at + "/agents/rerun", { slot: "nonsense", confirm: true }, 400, /Unknown AI agent/);
  await refused(at + "/agents/rerun", { slot: "research:customer", confirm: true }, 400, /has not failed for this project/);
  await refused(at + "/agents/rerun", { slot: "research:video", confirm: true }, 400, /excluded from the project task plan/);
  await repo.mutate(account, (db) => { db.projects.find((x) => x.id === id)!.runs.push({ id: "busy", at: new Date().toISOString(), stage: "insights", status: "running", provider: "openai", model: "gpt-test-mini" }); });
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true }, 400, /Another agent task is running/);
  await repo.mutate(account, (db) => { const p = db.projects.find((x) => x.id === id)!; p.runs = p.runs.filter((r) => r.id !== "busy"); });
  const consent = (await stored()).aiConsent;
  await repo.mutate(account, (db) => { delete db.projects.find((x) => x.id === id)!.aiConsent; });
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true }, 400, /Authorise this exact project brief/);
  await repo.mutate(account, (db) => { db.projects.find((x) => x.id === id)!.aiConsent = consent; });
  // Switching the model is owner admin only (routing is admin-only), so a producer is refused before anything runs.
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true, switchTo: { provider: "openai", model: "gpt-test-search" } }, 403, /admin/);
  assert.equal(calls.length, 2, "no refused rerun made a call");

  // ---- A plain rerun on the same quota-less provider fails again and keeps the new error.
  let out = await ok(at + "/agents/rerun", { slot: "research:brand", confirm: true });
  assert.equal(out.result.ok, false);
  assert.equal(out.result.failure.kind, "quota");
  assert.match(out.result.error, /exceeded your current quota/);
  failed = out.failed;
  assert.equal(failed[0].slot, "research:brand");
  assert.notEqual(failed[0].runId, firstFailure, "the new failure replaces the old one");
  assert.equal(await task("research:brand"), "blocked");
  assert.match((await stored()).audit.at(-1)!.detail, /^research:brand: gemini gemini-2\.5-flash; failed: AI provider returned 429/);

  // ---- The admin's switch is validated like the AI models page, then the rerun succeeds and unblocks the task.
  await as("owner");
  const overview = await ok("admin/ai-agents?projectId=" + id);
  assert.deepEqual(overview.failed.map((x: { slot: string }) => x.slot), ["research:brand"], "the AI agents page gets the chosen project's failed agents");
  assert.equal(overview.quota[0].provider, "gemini", "the quota warning names the provider");
  assert.ok(overview.quota[0].agents.includes("research:brand") && overview.quota[0].agents.length >= 10, "every research agent still uses Gemini");
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true, switchTo: { provider: "anthropic", model: "claude-test" } }, 400, /web-grounded search/);
  await refused(at + "/agents/rerun", { slot: "research:brand", confirm: true, switchTo: { provider: "openai", model: "bad model id!" } }, 400, /exact model ID/);
  assert.equal(calls.length, 3, "invalid switches never run the agent");
  out = await ok(at + "/agents/rerun", { slot: "research:brand", confirm: true, switchTo: { provider: "openai", model: "gpt-test-search" } });
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal(out.result.switched, true);
  assert.equal(out.result.from, "gemini gemini-2.5-flash");
  assert.equal(out.result.to, "openai gpt-test-search");
  assert.deepEqual(out.failed, []);
  assert.equal(await task("research:brand"), "done", "the newer completed run supersedes the failure");
  const routing = (await repo.read("factory-ai-routing")).aiRouting!;
  assert.deepEqual(routing.slots!["research:brand"], { provider: "openai", model: "gpt-test-search" });
  assert.match(routing.history!.at(-1)!.summary, /research:brand default to openai:gpt-test-search; switched for a rerun on project /);
  assert.equal(routing.history!.at(-1)!.actor, "owner");
  const audit = (await stored()).audit.at(-1)!;
  assert.equal(audit.action, "agent_rerun");
  assert.equal(audit.actor, "owner");
  assert.equal(audit.detail, "research:brand: gemini gemini-2.5-flash switched to openai gpt-test-search; completed");

  // ---- Customer research also fails on Gemini; the bulk move takes every Gemini job to OpenAI, then Rerun failed agents fixes it.
  await as("producer");
  await refused(at + "/research", { segment: "customer" }, 400, /exceeded your current quota/);
  await as("owner");
  await refused("admin/ai-routing", { action: "move", from: "gemini", research: { provider: "gemini", model: "x" } }, 400, /different provider/);
  const moved = await ok("admin/ai-routing", { action: "move", from: "gemini", research: { provider: "openai", model: "gpt-test-search" }, synthesis: { provider: "openai", model: "gpt-test-mini" } });
  assert.ok(moved.moved.includes("research:customer") && !moved.moved.includes("research:brand") && !moved.moved.includes("synthesis:insights"), JSON.stringify(moved.moved));
  assert.deepEqual(moved.skipped, []);
  assert.match((await repo.read("factory-ai-routing")).aiRouting!.history!.at(-1)!.summary, /moved \d+ jobs off Google Gemini \(no quota left\)/);
  assert.equal((await ok("admin/ai-agents")).quota[0].agents.length, 0, "no agent still uses Gemini, so the banner has nothing to move");
  await as("producer");
  out = await ok(at + "/agents/rerun-failed", { confirm: true });
  assert.deepEqual(out.results.map((r: { slot: string; ok: boolean }) => [r.slot, r.ok]), [["research:customer", true]]);
  assert.equal(out.stopped, undefined);
  assert.equal(await task("research:customer"), "done");

  // ---- Scoping and insights both fail; Rerun failed agents goes in dependency order and stops at the first new failure.
  await ok(at, { type: "reviewAllSources", confirm: true });
  insightSources = (await stored()).sources.filter((s) => s.status === "supported").map((s) => s.id);
  mode.scope = "down";
  await ok(at + "/scope", { action: "classify" });
  mode.insights = "bad";
  await refused(at + "/synthesis", { stage: "insights" }, 400, /JSON|valid/);
  failed = await failedNow();
  assert.deepEqual(failed.map((x) => x.slot), ["scope:business", "synthesis:insights"]);
  assert.equal(failed[0].failure.kind, "provider_down");
  assert.equal(failed[1].failure.kind, "invalid_output");
  assert.equal(await task("draftInsights"), "blocked");
  mode.scope = "ok";
  out = await ok(at + "/agents/rerun-failed", { confirm: true });
  assert.deepEqual(out.results.map((r: { slot: string; ok: boolean }) => [r.slot, r.ok]), [["scope:business", true], ["synthesis:insights", false]]);
  assert.equal(out.stopped.slot, "synthesis:insights");
  assert.equal(out.stopped.failure.kind, "invalid_output");
  assert.equal((await stored()).scope!.source, "ai", "the scoping rerun stored an AI classification");
  assert.deepEqual(out.failed.map((x: { slot: string }) => x.slot), ["synthesis:insights"]);
  // A switch to a provider without a key is refused (same rule as the AI models page).
  await as("owner");
  await refused(at + "/agents/rerun", { slot: "synthesis:insights", confirm: true, switchTo: { provider: "anthropic", model: "claude-test" } }, 400, /PORT67_ANTHROPIC_API_KEY is not set/);
  // The insights rerun succeeds; the producer agent then carries the project on by itself (automatic pass after the rerun).
  await as("producer");
  mode.insights = "ok";
  process.env.PORT67_PRODUCER_AGENT = "true";
  out = await ok(at + "/agents/rerun", { slot: "synthesis:insights", confirm: true });
  assert.equal(out.result.ok, true, out.result.error);
  let pass;
  for (let i = 0; i < 100 && !pass; i++) {
    await new Promise((r) => setTimeout(r, 50));
    pass = (await stored()).audit.find((x) => x.action === "producer_agent_pass" && x.detail.startsWith("automatic after agent rerun"));
  }
  delete process.env.PORT67_PRODUCER_AGENT;
  assert.ok(pass, "a producer agent pass followed the successful rerun");
  assert.match(pass!.detail, /review\w+ done/, "the pass carried on to the next step");
  assert.equal(await task("draftInsights"), "done");
  assert.ok(!(await failedNow()).length);

  // ---- Planner: a failed AI research plan needs a deliberate retry; the rerun is that retry.
  await login("customer");
  const planned = await request("projects", { business: "Nash's Bakery Online", objective: "Sell more sourdough subscriptions online", contact: "nash@example.com", workRequest: "campaign", requestedFormats: ["static"], useAIPlanner: true });
  const pid = (await planned.json()).project.id as string;
  await ok(`projects/${pid}`, { type: "setChannels", channels: ["instagram"] });
  await as("producer");
  await ok(`projects/${pid}`, { type: "authoriseAI", confirm: true });
  mode.planner = "bad";
  await refused(`projects/${pid}/planning`, { kind: "research" }, 400, /Invalid/);
  await refused(`projects/${pid}/planning`, { kind: "research" }, 400, /explicitly retry/);
  failed = await failedNow(pid);
  assert.deepEqual(failed.map((x) => x.slot), ["synthesis:planner"]);
  assert.equal(await task("planResearch", pid), "blocked");
  mode.planner = "ok";
  out = await ok(`projects/${pid}/agents/rerun`, { slot: "synthesis:planner", confirm: true });
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal((await stored(pid)).researchPlanning!.status, "completed");
  assert.equal(await task("planResearch", pid), "done");

  // ---- Studio: stage gating, a failed first pre-production draft and a failed image, each rerun through the studio paths.
  cookie = "";
  await request("session");
  assert.equal((await request("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const studio = await request("projects", { studio: { offer: "scene_pack", brief: { client: { businessName: "Nash's Bakery", website: "https://nashs.example.com", approverName: "Ann", approverEmail: "ann@example.com" }, project: { name: "Spring" }, product: { names: "Sourdough, Rye", benefits: "Fermented for 48 hours" }, brandKit: { colours: ["#aa3300"] } } } });
  const sid = (await studio.json()).project.id as string;
  const st = "projects/" + sid;
  const studioRepo = async () => (await repo.read("port67")).projects.find((x) => x.id === sid)!;
  await ok(st, { type: "approveStudioGateWithNote", stage: "intake", note: "Packshots later" });
  await ok(st, { type: "authoriseAI", confirm: true });
  let sp = (await ok(st, { type: "addSource", segment: "brand", title: "About", url: "https://nashs.example.com/about", excerpt: "Nash's bakes every morning and ferments sourdough for 48 hours." })).project;
  const src = sp.sources[0].id;
  await ok(st, { type: "reviewSource", id: src, status: "supported" });
  await ok(st, { type: "addInsight", title: "Freshness", interpretation: "Customers choose bread baked that morning.", sourceIds: [src] });
  await ok(st, { type: "draftStrategy", message: "Bread worth waking up for", keyMessages: [{ message: "Baked every morning", proof: "Nash's bakes every morning", sourceIds: [src] }, { message: "Fermented for 48 hours", proof: "Ferments sourdough for 48 hours", sourceIds: [src] }] });
  sp = (await ok(st, { type: "shareStrategy" })).project;
  await ok(st, { type: "approveStrategy", hash: sp.strategies.at(-1).hash });
  await ok(st, { type: "approveStudioGate", stage: "strategy" });
  // A Creative strategy agent that failed is not rerun once Pre-production is the open stage.
  await repo.mutate("port67", (db) => { const p = db.projects.find((x) => x.id === sid)!; p.runs.push({ id: "old-insights", at: new Date().toISOString(), finishedAt: new Date().toISOString(), stage: "insights", status: "failed", provider: "openai", model: "gpt-test-mini", taskInputKey: p.taskPlan!.researchKey, error: "Invalid insights" }); });
  await refused(st + "/agents/rerun", { slot: "synthesis:insights", confirm: true }, 400, /Creative strategy is approved/);
  const invented = sceneDraft();
  invented.scenes[2].message = "Loved by 98% of locals";
  mode.studio.push(invented);
  await refused(st + "/studio/preproduction", { action: "draft" }, 400, /states 98%/);
  failed = (await ok(st + "/agents/failed")).failed;
  const draftFailure = failed.find((x) => x.slot === "studio:preproduction") as unknown as { wholeDraft: boolean; canRerun: boolean };
  assert.equal(draftFailure.wholeDraft, true);
  assert.equal(draftFailure.canRerun, true);
  mode.studio.push(sceneDraft());
  out = await ok(st + "/agents/rerun", { slot: "studio:preproduction", confirm: true });
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal(out.project.studio.pieces.length, 14);
  assert.ok(!out.failed.some((x: { slot: string }) => x.slot === "studio:preproduction"));
  const frame = out.project.studio.pieces.find((x: { kind: string }) => x.kind === "test_frame");
  mode.image = "quota";
  await refused(st + "/studio/preproduction", { action: "image", pieceId: frame.id }, 400, /quota/);
  failed = (await ok(st + "/agents/failed")).failed;
  const imageFailure = failed.find((x) => x.slot === "studio:image") as unknown as { pieces: { id: string }[]; failure: { kind: string }; canRerun: boolean };
  assert.deepEqual(imageFailure.pieces.map((x) => x.id), [frame.id], "the failed run names its piece");
  assert.equal(imageFailure.failure.kind, "quota");
  assert.equal(imageFailure.canRerun, true);
  mode.image = "ok";
  out = await ok(st + "/agents/rerun", { slot: "studio:image", confirm: true });
  assert.equal(out.result.ok, true, out.result.error);
  const redrawn = (await studioRepo()).studio!.pieces.find((x) => x.id === frame.id)!;
  assert.equal(redrawn.versions.length, 1, "the piece got its image through the studio rerun path");
  assert.equal((await studioRepo()).studio!.rerunRequests!.at(-1)!.status, "done");
  assert.ok(!out.failed.some((x: { slot: string }) => x.slot === "studio:image"));
  assert.deepEqual((await studioRepo()).audit.filter((x) => x.action === "agent_rerun").map((x) => x.detail.replace(/^(\S+): .*; (\w+)$/, "$1 $2")), ["studio:preproduction completed", "studio:image completed"], "each attempt that passed the guards is audited; a guard refusal changes nothing");

  await rm(directory, { recursive: true, force: true });
  console.log("Agent rerun API: research, scoping, insights, planner and studio reruns, switch validation, guards, audit, rerun-failed order and stop, quota warning, bulk move and continuation passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
