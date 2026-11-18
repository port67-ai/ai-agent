import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { segments } from "../src/lib/factory/model";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "factory-planning-api-"));
  Object.assign(process.env, { PORT67_DATA_DIR: directory, PORT67_SESSION_SECRET: "s".repeat(48), PORT67_OPERATOR_PASSWORD: "p".repeat(24), PORT67_FIREBASE_PROJECT_ID: "ai-agency-3671b", PORT67_OPERATOR_UIDS: "producer", PORT67_RESEARCH_ENABLED: "true", PORT67_SYNTHESIS_ENABLED: "true", PORT67_RESEARCH_PROVIDER: "openai", PORT67_SYNTHESIS_PROVIDER: "openai", PORT67_RESEARCH_MODEL: "fixture", PORT67_SYNTHESIS_MODEL: "fixture", PORT67_OPENAI_API_KEY: "fixture-only", PORT67_PRODUCER_AGENT: "false", PORT67_AUTO_APPROVE_PRODUCER: "false" });
  const { handleFactory } = await import("../src/lib/factory/service");
  const verifier = async (uid: string) => ({ uid, aud: "ai-agency-3671b", iss: "https://securetoken.google.com/ai-agency-3671b", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
  const lookup = async (uid: string) => ({ uid, emailVerified: true, disabled: false });
  let cookie = "";
  const req = async (path: string, data?: unknown) => {
    const r = await handleFactory(new Request("http://localhost:3000/api/factory/" + path, { method: data ? "POST" : "GET", headers: { origin: "http://localhost:3000", cookie, ...(data ? { "content-type": "application/json" } : {}) }, body: data ? JSON.stringify(data) : undefined }), path.split("/"), verifier, lookup);
    const set = r.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0], name = pair.split("=")[0]; cookie = cookie.split(";").filter(x => x.trim() && !x.trim().startsWith(name + "=")).concat(pair).join(";"); }
    return r;
  };
  const login = async (uid: string) => { cookie = ""; await req("session"); return (await (await req("identity-login", { idToken: uid })).json()).principal; };
  const customer = await login("customer");
  const created = await req("projects", { business: "Shop", objective: "Explain the offer to buyers", workRequest: "campaign", requestedFormats: ["static"], contact: "private@example.test", differentiators: "Repairable", proof: "Customer supplied award claim", market: "UK" });
  assert.equal(created.status, 201);
  const safe = (await created.json()).project;
  assert.equal(safe.researchPlanning, undefined);
  const route = "projects/" + safe.id;
  assert.equal((await req(route + "/planning", { kind: "research" })).status, 403);
  await login("producer"); await req("accounts", { accountId: customer.accountId });
  await req(route, { type: "setChannels", channels: ["instagram"] });
  await req(route, { type: "authoriseAI", confirm: true });
  const original = globalThis.fetch;
  let calls = 0, plannerCalls = 0, mediumCalls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const sent = JSON.parse(String(init?.body)), input = JSON.parse(sent.input), name = sent.text?.format?.name;
    let value: unknown;
    if (name === "port67_research_planning") {
      plannerCalls++;
      assert.ok(sent.input.includes("Repairable") && !sent.input.includes("private@example.test"));
      value = { summary: "Research the offer and customers", unknowns: ["Medium effectiveness is unmeasured"], agents: segments.map(segment => ({ segment, selected: ["brand", "customer"].includes(segment), reason: "This decision follows the customer's objective and evidence needs", questions: ["What evidence supports the offer?", "What does the audience need to understand?"], sourceTypes: ["Primary public sources"], methods: [segment === "channel" ? "channel_behaviour" : segment === "offer" ? "product_offer" : segment === "measurement" ? "measurement_design" : segment === "brand" ? "brand_claims" : segment === "customer" ? "customer_journey" : segment === "competitor" ? "competitive_category" : segment === "creative" ? "creative_examples" : segment === "adjacent" ? "transfer_limits" : segment === "trends" ? "dated_trends" : "video_provenance"], avoid: ["Unverified performance"], maxPages: 6 })), mediumHypotheses: [], gaps: [] };
    } else if (name === "port67_medium_selection") {
      mediumCalls++;
      value = { summary: "Test visual explanation against the requested static format", recommendations: [{ channel: "instagram", format: "video_short", score: 8, confidence: "moderate", basis: "evidence", reason: "Reviewed evidence supports visual explanation", sourceIds: [input.sources[0].id], insightIds: [input.insights[0].id], counterargument: "Static artwork may be sufficient", uncertainties: ["No measured campaign history supplied"] }], gaps: [] };
    } else {
      const url = "https://example.com/evidence/" + calls;
      return Response.json({ id: "fixture-" + calls, usage: { input_tokens: 20, output_tokens: 10 }, output: [{ type: "web_search_call" }, { content: [{ type: "output_text", text: `FINDING | Visual examples help buyers understand the offer | ${url} | Public example\nCONFIDENCE | limited`, annotations: [{ type: "url_citation", url, title: "Public example" }] }] }] });
    }
    return Response.json({ id: "fixture-" + calls, usage: { input_tokens: 20, output_tokens: 10 }, output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
  };
  try {
    assert.equal((await req(route + "/scope", { action: "classify" })).status, 400, "scope route cannot bypass pending AI planning");
    assert.equal(calls, 0);
    const brand = await req(route + "/research", { segment: "brand" });
    assert.equal(brand.status, 200, await brand.text());
    assert.equal(plannerCalls, 1);
    assert.equal((await req(route + "/research", { segment: "customer" })).status, 200);
    assert.equal(plannerCalls, 1, "one planner invocation for the unchanged request");
    assert.equal((await req(route + "/research", { segment: "video" })).status, 400);
    assert.equal(calls, 3, "excluded research makes no provider call");
    await req(route, { type: "reviewAllSources", confirm: true });
    let p = (await (await req(route)).json()).project;
    await req(route, { type: "addInsight", title: "Visual explanations", interpretation: "Test concrete visual examples for this audience", sourceIds: p.sources.map((s: { id: string }) => s.id), confidence: "limited" });
    const medium = await req(route + "/planning", { kind: "medium" });
    assert.equal(medium.status, 200, await medium.clone().text());
    p = (await medium.json()).project;
    assert.equal(mediumCalls, 1);
    assert.deepEqual(p.brief.requestedFormats, ["static"]);
    assert.equal((await req(route, { type: "selectFormats", formats: ["static"], rationale: "Unseen recommendation", expectedMediumVersion: 0, expectedEvidenceHash: p.mediumContextHash })).status, 400);
    const confirm = await req(route, { type: "selectFormats", formats: ["static"], rationale: "Customer wants a static pilot before testing video", expectedMediumVersion: p.mediumSelection.version, expectedEvidenceHash: p.mediumContextHash });
    assert.equal(confirm.status, 200, await confirm.clone().text());
    assert.deepEqual((await confirm.json()).project.formats.selected, ["static"]);
    assert.equal(calls, 4);
    console.log("AI planning API journey: authorised brief, automatic planner, selected research, medium evidence, stale decisions and customer request preservation passed");
  } finally { globalThis.fetch = original; await rm(directory, { recursive: true, force: true }); }
}
void main();
