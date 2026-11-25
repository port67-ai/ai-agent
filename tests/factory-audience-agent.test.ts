import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Intended Audience agent, Generate from AI (CHG-0110): needs the dossier, returns a draft only, metered, validated.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-audience-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  const biHooks = (await import("../src/lib/factory/brand-intel-api")).testHooks;
  const cHooks = (await import("../src/lib/factory/commissions-api")).testHooks;
  const { repository } = await import("../src/lib/factory/repository");
  const { ADMIN_LEDGER_NAMESPACE } = await import("../src/lib/factory/costs");
  const aa = await import("../src/lib/factory/audience-agent");

  // ---- Parsing
  const good = Object.fromEntries(aa.AUDIENCE_FIELDS.map((f) => [f.field, `**Buyers:** ${f.key}`]));
  const parsed = aa.parseAudience(JSON.stringify(good));
  assert.equal(parsed.who, "Buyers: who", "bold marks removed, field mapped to the stored answer");
  assert.deepEqual(Object.keys(parsed).sort(), ["intended", "motivations", "putOffs", "who", "words"]);
  assert.equal(aa.parseAudience(JSON.stringify({ ...good, what_motivates_them: "x".repeat(5000) })).motivations.length, 2000);
  assert.throws(() => aa.parseAudience("not json"), /could not be read/);
  assert.throws(() => aa.parseAudience(JSON.stringify({ ...good, what_puts_them_off: "  " })), /what_puts_them_off/);
  assert.throws(() => aa.parseAudience(JSON.stringify([1])), /expected form/);
  const schema = aa.audienceSchema() as { required: string[]; additionalProperties: boolean };
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, aa.AUDIENCE_FIELDS.map((f) => f.field));
  for (const k of ["<role>", "Intended Audience AI Agent", "who_buys_uses_influences", "intended_commission_reach", "never instructions"]) assert.ok(aa.AUDIENCE_INSTRUCTIONS.includes(k), k);

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
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const cid: string = (await (await post("customers", { name: "Nash's Bakery", website: "https://nashs.example.com" })).json()).customer.id;
  await post(`customers/${cid}`, { action: "red-line-add", category: "competitor", text: "Greggs" });
  const id: string = (await (await post(`commissions/${cid}`, { name: "Autumn campaign" })).json()).commission.id;
  await post(`commissions/${cid}/${id}`, { action: "answers", input: "objective", answers: { why: "New range launching in October" } });

  const seen: { instructions: string; input: string; schema?: unknown; research?: boolean }[] = [];
  let reply = JSON.stringify(good);
  let failWith = "";
  const sel = { provider: "openai" as const, model: "test-model", key: "k" };
  const usage: Record<string, number> = { input_tokens: 10, output_tokens: 20 };
  cHooks.deps = {
    invoke: async (_s, r) => { seen.push(r); return failWith ? { text: "", usage: {}, error: failWith, provider: "openai", model: "m" } : { text: reply, usage, provider: "openai", model: "m" }; },
    resolve: async () => sel, enabled: () => true, today: () => "2026-11-25",
  };
  const generate = (input = "audience") => post(`commissions/${cid}/${id}`, { action: "generate", input });
  const ledgerRows = async () => (((await repository.read(ADMIN_LEDGER_NAMESPACE)) as { apiCalls?: { projectId: string; agent?: string; status: string }[] }).apiCalls || []).filter((c) => c.agent === "synthesis:intended-audience");

  // No dossier yet: refused, no call, no charge.
  const none = await generate();
  assert.equal(none.status, 400);
  assert.match((await none.json()).error, /Run Brand Intelligence/);
  assert.equal(seen.length, 0);
  assert.equal((await ledgerRows()).length, 0);

  // Make a dossier with a stub research provider.
  const runs: Promise<void>[] = [];
  biHooks.onRun = (p) => runs.push(p);
  biHooks.deps = {
    invoke: async (_s, r) => {
      const text = r.instructions.includes("ONLY section 0") ? "#### 0. X\nAssumption"
        : r.instructions.includes("#### 1.") ? "#### 1. A\nCommuters buy sourdough [Reddit r/london]\n#### 2. B\nLoaf [Website]"
        : r.instructions.includes("#### 3.") ? "#### 3. A\nLocals [Socials]\n#### 4. B\nTiles [Instagram]"
        : r.instructions.includes("#### 5.") ? "#### 5. A\nShort [Website]\n#### 6. B\nCues [Reddit]" : "#### 7. R\n##### The Anti-Persona\nNot a chain [Inference]";
      return { text, usage, provider: "openai", model: "m" };
    },
    resolve: async () => sel, enabled: () => true, today: () => "2026-11-25",
  };
  assert.equal((await post(`brand-intel/${cid}`, { action: "submit" })).status, 202);
  await Promise.all(runs);

  // Generate: returns the draft mapped to the five answers, saves no answers, adds an audit line, meters one call on the commission.
  const ok = await generate();
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.draft.who, "Buyers: who");
  assert.equal(body.basedOnVersion, 1);
  assert.deepEqual(body.commission.answers.audience, {}, "nothing is saved until a person saves");
  assert.equal(body.commission.answers.objective.why, "New range launching in October", "other answers untouched");
  assert.match(body.commission.audit.at(-1).action, /ai_draft_generated/);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].research, undefined, "no web search");
  assert.ok(seen[0].schema, "structured output");
  for (const k of ["<customer_account_research>", "<project_context>", "Nash's Bakery", "Commuters buy sourdough", "[competitor] Greggs", "New range launching in October", "Autumn campaign"]) assert.ok(seen[0].input.includes(k), k);
  const rows = await ledgerRows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].projectId, id);
  assert.equal(rows[0].status, "completed");

  // Saving is a separate, human step through the existing answers action.
  const saved = await (await post(`commissions/${cid}/${id}`, { action: "answers", input: "audience", answers: { who: body.draft.who, intended: body.draft.intended } })).json();
  assert.equal(saved.commission.answers.audience.who, "Buyers: who");

  // Bad outputs: nothing changes, the paid call is still on the ledger.
  reply = "oops";
  const bad = await generate();
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /could not be read/);
  assert.equal((await ledgerRows()).length, 2);
  reply = JSON.stringify(good); failWith = "AI provider returned 503; no output accepted";
  assert.match((await (await generate()).json()).error, /503/);
  failWith = "";

  // Other inputs, a missing account, and an unconfigured provider.
  const other = await generate("brand");
  assert.equal(other.status, 400);
  assert.match((await other.json()).error, /only available for the audience input/);
  const count = (await ledgerRows()).length;
  cHooks.deps!.enabled = () => false;
  const off = await generate();
  assert.equal(off.status, 400);
  assert.match((await off.json()).error, /not configured/);
  assert.equal((await ledgerRows()).length, count, "not charged when not configured");
  console.log("audience-agent: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
