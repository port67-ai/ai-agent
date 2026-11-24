import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Brand Intelligence (CHG-0108): intake rules, parsing, citations, the background run, ledger entries, versions and permissions.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-brandintel-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  const { testHooks } = await import("../src/lib/factory/brand-intel-api");
  const { repository } = await import("../src/lib/factory/repository");
  const { ADMIN_LEDGER_NAMESPACE } = await import("../src/lib/factory/costs");
  const bi = await import("../src/lib/factory/brand-intel");
  const { brandFoundation } = await import("../src/lib/factory/brand-intel-run");

  // ---- Pure rules
  const parsed = bi.splitSections("#### 1. The Reality Gap\nClaim [Website]\n#### 2. Offering\nPies [Reviews]\n#### 9. Stray\nignore", ["1", "2"]);
  assert.equal(parsed.sections["1"], "Claim [Website]");
  assert.equal(parsed.sections["2"], "Pies [Reviews]");
  assert.deepEqual(parsed.warnings, []);
  assert.equal(bi.splitSections("no headings", ["1", "2"]).warnings.length, 2, "missing sections reported");
  const cites = bi.citationsOf({ output: [{ content: [{ annotations: [{ type: "url_citation", url: "https://a.example/x", title: "A" }, { type: "url_citation", url: "http://insecure.example" }, { type: "url_citation", url: "https://a.example/x" }] }] }] });
  assert.deepEqual(cites.sources, [{ url: "https://a.example/x", title: "A" }], "https only, de-duplicated");
  assert.equal(bi.citationsOf({ candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: "https://g.example", title: "G" } }], webSearchQueries: ["q1"] } }] }).queries[0], "q1");
  for (const banned of ["Never fabricate", "untrusted data", "Do not ask questions"]) assert.match(bi.groupInstructions(bi.GROUPS[0]), new RegExp(banned));
  assert.match(bi.groupInstructions(bi.GROUPS[2]), /never rewrite or restate them/);
  const d = bi.groupInstructions(bi.GROUPS[3]);
  for (const k of ["Cultural and Aesthetic Taboos", "Commercial and Pricing Boundaries", "Reputational and Regulatory Risks", "The Anti-Persona", "past collaborations", "Royal Warrants", "[Inference]", "do not repeat those"]) assert.ok(d.includes(k), k);

  // ---- Server flow
  let cookie = "";
  async function call(path: string[], body?: unknown) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie };
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await handleFactory(new Request("http://localhost:3000/api/factory/" + path.join("/"), { method: body !== undefined ? "POST" : "GET", headers, body: body === undefined ? undefined : JSON.stringify(body) }), path);
    const set = response.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0]; const name = pair.split("=")[0]; cookie = [...cookie.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith(name + "=")), pair].join("; "); }
    return response;
  }
  const post = (p: string, b: unknown) => call(p.split("/"), b);
  const get = (p: string) => call(p.split("/"));
  await get("session");
  assert.equal((await get("brand-intel/cust_" + "a".repeat(32))).status, 401, "signed out");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const customer = (await (await post("customers", { name: "Nash's Bakery", website: "https://nashs.example.com" })).json()).customer;
  const cid: string = customer.id;
  await post(`customers/${cid}`, { action: "red-line-add", category: "competitor", text: "Greggs", reason: "Legal dispute" });
  await post(`customers/${cid}`, { action: "brand-text", purposeText: "SECRET PURPOSE", knownFor: "SECRET KNOWN" });

  // The intake never includes text the producer has not authorised.
  const seen: { instructions: string; input: string; research?: boolean }[] = [];
  let failOn = "";
  const reply = (instructions: string) => {
    if (instructions.includes("ONLY section 0")) return "#### 0. Critical Strategic Assumption to Verify\nThe purpose claims craft; reviews say mass produced [Reviews]";
    if (instructions.includes("#### 1.")) return "#### 1. Reality\nGap [Website]\n#### 2. Offering\nLoaf [Website]";
    if (instructions.includes("#### 3.")) return "#### 3. Audience\nCommuters [Reddit r/london]\n#### 4. Visual\nCream tiles [Instagram]";
    if (instructions.includes("#### 5.")) return "#### 5. Verbal\nShort sentences [Website]\n#### 6. Guardrails\nAvoid stock chefs [Reddit]";
    return "#### 7. Researched Red Lines (inferred)\n##### Cultural and Aesthetic Taboos\n* No neon [Inference]\n##### Commercial and Pricing Boundaries\n* No supermarket discounting [Stated by the brand]\n##### Reputational and Regulatory Risks\n* Royal Warrant [Press]\n##### The Anti-Persona\n* Not a chain bakery [Reddit]";
  };
  const sel = { provider: "openai" as const, model: "test-model", key: "k" };
  testHooks.deps = {
    invoke: async (_s, r) => {
      seen.push(r);
      const usage: Record<string, number> = { input_tokens: 100, output_tokens: 200, tool_calls: r.research ? 2 : 0 };
      if (failOn && r.instructions.includes(failOn)) return { text: "", usage: {}, error: "AI provider returned 503; no output accepted", provider: "openai", model: "test-model" };
      return { text: reply(r.instructions), usage, provider: "openai", model: "test-model",
        data: r.research ? { output: [{ content: [{ annotations: [{ type: "url_citation", url: "https://src.example/" + seen.length, title: "S" + seen.length }] }] }] } : undefined };
    },
    resolve: async () => sel, enabled: () => true, today: () => "2026-11-25",
  };
  const runs: Promise<void>[] = [];
  testHooks.onRun = (p) => runs.push(p);

  assert.equal((await post(`brand-intel/${cid}`, { action: "nope" })).status, 400);
  const started = await post(`brand-intel/${cid}`, { action: "submit" });
  assert.equal(started.status, 202);
  await Promise.all(runs);
  let list = await (await get(`brand-intel/${cid}`)).json();
  assert.equal(list.versions.length, 1);
  const v1 = list.versions[0];
  assert.equal(v1.status, "completed", v1.error);
  assert.equal(list.currentId, v1.id);
  assert.equal(v1.calls, 5, "four research calls and one synthesis");
  assert.deepEqual(Object.keys(v1.sections).sort(), ["0", "1", "2", "3", "4", "5", "6", "7"]);
  assert.equal(v1.sections["4"], "Cream tiles [Instagram]");
  assert.match(v1.sections["7"], /##### The Anti-Persona/);
  assert.equal(seen.filter((r) => r.research).length, 4, "only the four research calls search the web");
  assert.equal(seen.at(-1)!.research, undefined, "synthesis does not search");
  assert.ok(v1.sources.length >= 3 && v1.sources.every((s: { url: string }) => s.url.startsWith("https://")));
  assert.equal(v1.intake.purposeTextRead, false, "unauthorised text not read");
  assert.ok(!seen.some((r) => /SECRET/.test(r.input) || /SECRET/.test(r.instructions)), "typed text withheld until authorised");
  assert.ok(seen[0].input.includes("Greggs") && seen[0].input.includes("https://nashs.example.com"), "red lines and website are in the intake");
  assert.deepEqual(v1.redLines, [{ category: "competitor", text: "Greggs", reason: "Legal dispute" }], "red lines stored verbatim, not model written");

  // Cost ledger: five calls, all on this account.
  const ledger = (await repository.read(ADMIN_LEDGER_NAMESPACE)) as { apiCalls?: { projectId: string; agent?: string; status: string; runId: string }[] };
  const mine = (ledger.apiCalls || []).filter((c) => c.runId === v1.id);
  assert.equal(mine.length, 5);
  assert.ok(mine.every((c) => c.projectId === cid && c.status === "completed"));
  assert.deepEqual([...new Set(mine.map((c) => c.agent))].sort(), ["research:brand-intel", "synthesis:brand-intel"]);

  // The foundation for later agents, with red lines first under section 6.
  const foundation = await brandFoundation(repository, cid);
  assert.equal(foundation?.version.id, v1.id);
  assert.match(foundation!.text, /## 6\. Immutable Guardrails[^\n]*\nHard Client Red Lines \(verbatim from intake\):\n- \[competitor\] Greggs \(Legal dispute\)/);

  // Authorised text is then read. A failed run is stored, never becomes current, and the earlier version stays current.
  await post(`customers/${cid}`, { action: "brand-text-authorise", authorise: true });
  seen.length = 0; failOn = "#### 3.";
  assert.equal((await post(`brand-intel/${cid}`, { action: "submit" })).status, 202);
  await Promise.all(runs);
  assert.ok(seen[0].input.includes("SECRET PURPOSE") && seen[0].input.includes("SECRET KNOWN"), "authorised text is read");
  list = await (await get(`brand-intel/${cid}`)).json();
  const v2 = list.versions[1];
  assert.equal(v2.status, "failed");
  assert.match(v2.error, /503/);
  assert.equal(v2.sections["1"], "Gap [Website]", "partial work is kept for reading");
  assert.equal(list.currentId, v1.id);
  assert.equal(((await repository.read(ADMIN_LEDGER_NAMESPACE)) as { apiCalls: { status: string; runId: string }[] }).apiCalls.filter((c) => c.runId === v2.id && c.status === "failed").length, 1);

  // Only one run at a time; versions are capped and the current one is never dropped.
  failOn = "";
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => { release = r; });
  const inner = testHooks.deps!.invoke;
  testHooks.deps!.invoke = async (s, r) => { await gate; return inner(s, r); };
  assert.equal((await post(`brand-intel/${cid}`, { action: "submit" })).status, 202);
  assert.equal((await post(`brand-intel/${cid}`, { action: "submit" })).status, 400, "already running");
  release(); await Promise.all(runs);
  testHooks.deps!.invoke = inner;
  for (let i = 0; i < 4; i++) { await post(`brand-intel/${cid}`, { action: "submit" }); await Promise.all(runs); }
  list = await (await get(`brand-intel/${cid}`)).json();
  assert.equal(list.versions.length, bi.MAX_VERSIONS, "capped");
  assert.equal(list.versions.at(-1).version, 7, "numbers keep rising");
  assert.equal(list.currentId, list.versions.at(-1).id);

  // A run left over from a restarted server shows as interrupted.
  const old = { ...list.versions.at(-1), status: "running", startedAt: new Date(Date.now() - 3 * bi.STALE_MS).toISOString() };
  assert.equal(bi.effectiveStatus(old), "failed");

  // Without live research the run does not start and nothing is recorded or charged.
  testHooks.deps!.enabled = () => false;
  const before = (await (await get(`brand-intel/${cid}`)).json()).versions.length;
  const off = await post(`brand-intel/${cid}`, { action: "submit" });
  assert.equal(off.status, 400);
  assert.match((await off.json()).error, /not configured/);
  assert.equal((await (await get(`brand-intel/${cid}`)).json()).versions.length, before);

  // Unknown account and bad ids.
  assert.equal((await get("brand-intel/nope")).status, 404);
  assert.equal((await post(`brand-intel/cust_${"0".repeat(32)}`, { action: "submit" })).status, 400);
  console.log("brand-intel: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
