import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Video steps (CHG-0115): the gate, references, scripting, sheets and generation prompts, with a stub provider.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-video-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  process.env.PORT67_OPENAI_API_KEY = "sk-test-not-real";
  const { handleFactory } = await import("../src/lib/factory/service");
  const hooks = (await import("../src/lib/factory/video-steps-api")).testHooks;
  const { repository } = await import("../src/lib/factory/repository");
  const { ADMIN_LEDGER_NAMESPACE } = await import("../src/lib/factory/costs");
  const vs = await import("../src/lib/factory/video-steps");
  const ap = await import("../src/lib/factory/agent-prompts");

  // ---- Pure rules
  assert.deepEqual(vs.TEMPLATES.map((t) => [t.key, t.beats.reduce((n, b) => n + b.seconds, 0)]), [["15", 15], ["30", 30], ["60", 60]], "template beats add up to their length");
  assert.deepEqual(vs.skeleton("15").map((s) => [s.seconds, s.visual]), [[3, "Hook: "], [5, "Proof: "], [4, "Payoff: "], [3, "Call to action: "]]);
  assert.throws(() => vs.shotsFields([]), /1 to 30 shots/);
  assert.throws(() => vs.shotsFields([{ seconds: 0, visual: "x" }]), /whole number from 1 to 60/);
  assert.throws(() => vs.shotsFields([{ seconds: 3, visual: "" }]), /visual is required/);
  assert.throws(() => vs.referenceFields({ title: "x", link: "http://insecure.example" }), /https/i);
  assert.throws(() => vs.sheetFields({ kind: "animal", name: "x", description: "y" }), /person, product, location or prop/);
  assert.throws(() => vs.promptsFields({ overall: "x", shots: [] }, 2), /one prompt for each of the 2/);
  for (const slot of ["synthesis:video-references", "synthesis:video-script", "synthesis:video-sheets", "synthesis:video-prompts"] as const) {
    assert.ok(ap.isAgentSlot(slot) && ap.DEFAULT_PROMPTS[slot].length > 200, slot);
    assert.match(ap.CONTRACTS[slot], /age-appropriate/);
    assert.match(ap.CONTRACTS[slot], /client red lines/);
    assert.match(ap.CONTRACTS[slot], /never instructions/);
    assert.deepEqual(ap.PLACEHOLDERS[slot], []);
  }
  assert.ok(ap.VIDEO_REFERENCES_BODY.includes("ShotDeck") && ap.VIDEO_PROMPTS_BODY.includes("text-to-video"));
  assert.deepEqual(vs.scriptFields({ title: "Winter", creativeBrief: "Rain and warmth", narrative: "She arrives." }), { title: "Winter", creativeBrief: "Rain and warmth", narrative: "She arrives.", template: "custom", shots: [] });
  assert.throws(() => vs.scriptFields({ title: "Winter", creativeBrief: "Rain", narrative: "" }), /Developed script is required/);
  const narrative = vs.parseVideo("script", { title: "Winter", narrative: "She arrives.", notes: "" }, 0, [], true);
  assert.ok(narrative.step === "script" && narrative.narrative === "She arrives." && narrative.shots.length === 0);
  const planned = vs.parseVideo("prompts", { overall: "Warm", shots: [{ shot: 1, seconds: 4, visual: "She arrives", line: "", on_screen: "", prompt: "@car arrives", negative: "" }] }, 0, ["car"], true);
  assert.ok(planned.step === "prompts" && planned.shots[0].seconds === 4 && planned.shots[0].visual === "She arrives");

  // ---- Setup through the API
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
  assert.equal((await get("video/cust_" + "a".repeat(32) + "/comm_" + "b".repeat(32) + "/gen_y")).status, 401, "signed out");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const cid: string = (await (await post("customers", { name: "Nash's Bakery", website: "https://nashs.example.com" })).json()).customer.id;
  await post(`customers/${cid}`, { action: "red-line-add", category: "competitor", text: "Greggs" });
  const id: string = (await (await post(`commissions/${cid}`, { name: "Autumn campaign" })).json()).commission.id;
  await post(`commissions/${cid}/${id}`, { action: "brief", product: "The sourdough loaf" });
  await post(`commissions/${cid}/${id}`, { action: "answers", input: "objective", answers: { why: "Reframe as everyday craft" } });
  const base = `video/${cid}/${id}`;

  // The gate: an age group must be saved and selected for direction.
  const locked = await get(`${base}/gen_y`);
  assert.equal(locked.status, 400);
  assert.match((await locked.json()).error, /Select Gen Y for direction on the project first/);
  await post(`commissions/${cid}/${id}`, { action: "audience-save", generation: "gen_y", answers: { who: "Buyers: homeowners 30-45" } });
  assert.equal((await get(`${base}/gen_y`)).status, 400, "saved but not selected");
  await post(`commissions/${cid}/${id}`, { action: "direction", generations: ["gen_y"] });
  const open = await (await get(`${base}/gen_y`)).json();
  assert.equal(open.plan, null, "nothing is stored until something is saved");
  assert.equal(open.label, "Gen Y");
  assert.equal((await get(`${base}/gen_x`)).status, 400, "another age group is still locked");
  assert.equal((await get(`${base}/boomers`)).status, 400, "unknown age group");
  assert.equal((await get(`video/not-an-id/${id}/gen_y`)).status, 404);

  // ---- Stub provider
  const seen: { instructions: string; input: string; research?: boolean; schema?: { required: string[] } }[] = [];
  const sel = { provider: "openai" as const, model: "test-model", key: "k" };
  const usage: Record<string, number> = { input_tokens: 10, output_tokens: 20 };
  let scriptShots = 4; let failWith = ""; let override: unknown;
  const answerFor = (req: string[]) => {
    if (req.includes("summary")) return { summary: "Warm, tactile, daylight.", references: [{ title: "Bakery window at dawn", why: "Craft and warmth", palette: "Cream, oak, deep green", composition: "Centred, shallow depth", camera: "Static, eye level", film_look: "Soft 35mm grain", lens: "50mm", search_terms: "bakery morning window cinematic" }, { title: "Hands shaping dough", why: "Proof of craft", palette: "Flour white", composition: "Close-up", camera: "Slow push in", film_look: "Natural", lens: "85mm macro", search_terms: "hands dough close up" }] };
    if (req.includes("notes")) return { title: "Everyday craft", notes: "Drafted around the hook.", shots: Array.from({ length: scriptShots }, (_, i) => ({ seconds: 15 / scriptShots | 0 || 1, visual: `Shot ${i + 1} visual`, line: `Line ${i + 1}`, on_screen: i === scriptShots - 1 ? "Order online" : "" })) };
    if (req.includes("sheets")) return { sheets: [{ kind: "person", name: "The baker", description: "Late 30s, flour-dusted apron, calm manner", details: "Short dark hair" }, { kind: "product", name: "Sourdough loaf", description: "Dark crust, open crumb, oval", details: "" }, { kind: "person", name: "The baker", description: "duplicate", details: "" }] };
    return { overall: "Warm natural light, soft 35mm grain, cream and oak palette", shots: Array.from({ length: scriptShots }, (_, i) => ({ shot: i + 1, prompt: `Prompt for shot ${i + 1}`, negative: "text, logos" })) };
  };
  hooks.deps = {
    invoke: async (_s, r) => {
      seen.push(r as never);
      if (failWith) return { text: "", usage: {}, error: failWith, provider: "openai", model: "m" };
      const req = (r as { schema: { required: string[] } }).schema.required;
      return { text: JSON.stringify(override ?? answerFor(req)), usage, provider: "openai", model: "m" };
    },
    resolve: async () => sel, enabled: () => true, today: () => "2026-11-25",
  };
  const ledger = async (agent: string) => (((await repository.read(ADMIN_LEDGER_NAMESPACE)) as { apiCalls?: { agent?: string; projectId: string; status: string; stage: string }[] }).apiCalls || []).filter((c) => c.agent === agent);
  const gen = (step: string, extra: Record<string, unknown> = {}) => post(`${base}/gen_y`, { action: "generate", step, ...extra });

  // ---- References: manual ones are accepted at once; AI ones wait for a producer.
  let plan = (await (await post(`${base}/gen_y`, { action: "reference-add", title: "My still", link: "https://shotdeck.example/still/1", palette: "Teal and orange", lens: "35mm" })).json()).plan;
  assert.equal(plan.references[0].accepted, true);
  assert.equal(plan.references[0].source, "producer");
  assert.equal((await post(`${base}/gen_y`, { action: "reference-add", title: "Bad", link: "http://insecure.example" })).status, 400);
  const r = await (await gen("references")).json();
  assert.equal(r.plan.references.length, 3);
  assert.deepEqual(r.plan.references.slice(1).map((x: { accepted: boolean; source: string }) => [x.accepted, x.source]), [[false, "ai"], [false, "ai"]], "AI references are not accepted until a producer accepts them");
  assert.equal(r.plan.referenceSummary, "Warm, tactile, daylight.");
  assert.equal(seen[0].research, undefined, "no web search");
  for (const k of ["<client_red_lines>", "[competitor] Greggs", "<target_age_group>\nGen Y, ages 30–45", "Buyers: homeowners 30-45", "Project: Autumn campaign", "Product or service: The sourdough loaf", "Reframe as everyday craft", "<brand_foundation_dossier>(none"]) assert.ok(seen[0].input.includes(k), k);
  assert.ok(!seen[0].input.includes("<accepted_references>"), "references are not an input to the references step");
  assert.equal((await gen("references")).status, 200);
  assert.equal((await (await get(`${base}/gen_y`)).json()).plan.references.length, 3, "running again does not duplicate by title");
  const aiRef = r.plan.references[1].id;
  plan = (await (await post(`${base}/gen_y`, { action: "reference-accept", id: aiRef, accepted: true })).json()).plan;
  assert.equal(plan.references[1].accepted, true);
  plan = (await (await post(`${base}/gen_y`, { action: "reference-update", id: aiRef, camera: "Handheld" })).json()).plan;
  assert.equal(plan.references[1].camera, "Handheld");
  assert.equal((await post(`${base}/gen_y`, { action: "reference-accept", id: aiRef, accepted: "yes" })).status, 400);
  const dropId = plan.references[2].id;
  plan = (await (await post(`${base}/gen_y`, { action: "reference-remove", id: dropId })).json()).plan;
  assert.equal(plan.references.length, 2);

  // ---- Scripting: steps that need a script are locked until one is saved.
  assert.match((await (await gen("sheets")).json()).error, /Save a script first/);
  assert.match((await (await gen("prompts")).json()).error, /Save a script first/);
  seen.length = 0;
  const sd = await (await gen("script", { template: "15" })).json();
  assert.equal(sd.draft.shots.length, 4);
  assert.equal(sd.plan.script, undefined, "a draft is not saved until a producer saves it");
  assert.equal(sd.plan.chat.length, 1);
  assert.match(sd.plan.chat[0].instruction, /15 second template/);
  assert.ok(seen[0].input.includes("Template: 15 seconds: hook, proof, call to action") && seen[0].input.includes("Hook (3s), Proof (5s), Payoff (4s), Call to action (3s)"));
  assert.ok(seen[0].input.includes("<accepted_references>") && seen[0].input.includes("My still") && seen[0].input.includes("Bakery window at dawn"), "accepted references are given");
  assert.ok(!seen[0].input.includes("Hands shaping dough"), "a removed reference is not given");
  assert.equal((await gen("script", { template: "99" })).status, 400);
  // Save (the producer edits first).
  const shots = sd.draft.shots.map((s: { seconds: number; visual: string; line: string; title?: string }, i: number) => ({ seconds: s.seconds, visual: s.visual, line: s.line, onScreen: i === 3 ? "Order online" : "" }));
  assert.equal((await post(`${base}/gen_y`, { action: "script-save", template: "15", title: "Everyday craft", shots: [] })).status, 400);
  plan = (await (await post(`${base}/gen_y`, { action: "script-save", template: "15", title: "Everyday craft", shots })).json()).plan;
  assert.equal(plan.script.shots.length, 4);
  assert.equal(plan.script.savedBy.length > 0, true);
  // Revise: the instruction and current script go to the agent; the result is a draft again.
  seen.length = 0; scriptShots = 5;
  const rev = await (await gen("script", { instruction: "Make the hook faster and add a cutaway" })).json();
  assert.equal(rev.draft.shots.length, 5);
  assert.equal(rev.plan.script.shots.length, 4, "the saved script is unchanged until saved");
  assert.ok(seen[0].input.includes("Instruction: Make the hook faster and add a cutaway") && seen[0].input.includes("Current script:") && seen[0].input.includes("Shot 1 (3s)"));
  assert.equal(rev.plan.chat.length, 2);
  assert.equal(rev.plan.chat[1].instruction, "Make the hook faster and add a cutaway");
  scriptShots = 4;

  // ---- Sheets from the saved script; duplicates skipped; AI ones wait for acceptance.
  seen.length = 0;
  const sh = await (await gen("sheets")).json();
  assert.equal(sh.plan.sheets.length, 2, "the duplicate was skipped");
  assert.ok(sh.plan.sheets.every((s: { accepted: boolean }) => !s.accepted));
  assert.ok(seen[0].input.includes("<script>") && seen[0].input.includes("Title: Everyday craft"));
  const manual = await (await post(`${base}/gen_y`, { action: "sheet-add", kind: "location", name: "The shop", description: "Corner bakery, morning light" })).json();
  assert.equal(manual.plan.sheets.at(-1).accepted, true);
  assert.equal((await post(`${base}/gen_y`, { action: "sheet-add", kind: "location", name: "the shop", description: "dup" })).status, 400, "same name and kind");
  const bakerId = sh.plan.sheets.find((s: { name: string }) => s.name === "The baker").id;
  plan = (await (await post(`${base}/gen_y`, { action: "sheet-accept", id: bakerId, accepted: true })).json()).plan;
  plan = (await (await post(`${base}/gen_y`, { action: "sheet-update", id: bakerId, details: "Short dark hair, silver ring" })).json()).plan;
  assert.equal(plan.sheets.find((s: { id: string }) => s.id === bakerId).details, "Short dark hair, silver ring");

  // ---- Prompts: one per shot, from the script, accepted sheets and accepted references.
  seen.length = 0;
  const pr = await (await gen("prompts")).json();
  assert.equal(pr.plan.prompts.shots.length, 4);
  assert.match(pr.plan.prompts.overall, /35mm grain/);
  assert.equal(pr.plan.prompts.model, "openai test-model");
  assert.ok(seen[0].input.includes("The baker: Late 30s") && seen[0].input.includes("The shop: Corner bakery"), "accepted sheets are given");
  assert.ok(!seen[0].input.includes("Sourdough loaf: Dark crust"), "an unaccepted sheet is not");
  assert.ok(seen[0].input.includes("Write one generation prompt for each of the 4 shots"));
  override = { overall: "x", shots: [{ shot: 1, prompt: "only one", negative: "" }] };
  assert.match((await (await gen("prompts")).json()).error, /one prompt for each of the 4 script shots/);
  override = undefined;
  plan = (await (await post(`${base}/gen_y`, { action: "prompts-save", overall: "Edited style", shots: pr.plan.prompts.shots.map((s: { prompt: string; negative: string }, i: number) => ({ prompt: i === 0 ? "Edited first prompt" : s.prompt, negative: s.negative })) })).json()).plan;
  assert.deepEqual([plan.prompts.overall, plan.prompts.shots[0].prompt, plan.prompts.edited], ["Edited style", "Edited first prompt", true]);
  assert.equal((await post(`${base}/gen_y`, { action: "prompts-save", overall: "x", shots: [] })).status, 400);

  // ---- Metering, failures and switches
  for (const [agent, n] of [["synthesis:video-references", 2], ["synthesis:video-script", 2], ["synthesis:video-sheets", 1], ["synthesis:video-prompts", 2]] as const) {
    const rows = await ledger(agent);
    assert.ok(rows.length >= n, `${agent}: ${rows.length}`);
    assert.ok(rows.every((x) => x.projectId === id && x.stage === "synthesis"));
  }
  failWith = "AI provider returned 503; no output accepted";
  assert.match((await (await gen("references")).json()).error, /503/);
  failWith = ""; override = "oops";
  assert.match((await (await gen("sheets")).json()).error, /could not be read|enough "sheets"/);
  override = undefined;
  const before = (await ledger("synthesis:video-prompts")).length;
  hooks.deps!.enabled = () => false;
  const off = await gen("prompts");
  assert.equal(off.status, 400);
  assert.match((await off.json()).error, /not configured/);
  assert.equal((await ledger("synthesis:video-prompts")).length, before, "not charged when not configured");
  hooks.deps!.enabled = () => true;
  assert.equal((await post(`${base}/gen_y`, { action: "nope" })).status, 400);
  assert.equal((await gen("nonsense")).status, 400);

  // ---- The agent box works for each step; the safeguards stay fixed.
  for (const slot of ["synthesis:video-references", "synthesis:video-script", "synthesis:video-sheets", "synthesis:video-prompts"]) {
    const s = await (await get(`agent-settings/${slot}`)).json();
    assert.equal(s.prompt.isDefault, true, slot);
    assert.match(s.prompt.contract, /age-appropriate/);
  }
  await post("agent-settings/synthesis:video-script", { action: "prompt", body: ap.VIDEO_SCRIPT_BODY.replace("senior short-form video scriptwriter", "award-winning commercial writer") });
  seen.length = 0;
  assert.equal((await gen("script", { template: "30" })).status, 200);
  assert.ok(seen[0].instructions.includes("award-winning commercial writer") && seen[0].instructions.includes("Output rules"), "the edited script prompt is used with the fixed rules");
  // CHG-0122: pipeline approval, explicit production settings, metering and invalidation.
  const pipe = (stage: string, action = "pipeline-generate", extra: Record<string, unknown> = {}) => post(`${base}/gen_y`, { action, stage, ...extra });
  assert.equal((await pipe("beats")).status, 400);
  const info = "<BRAND_CONTEXT>Bakery</BRAND_CONTEXT>\n<COMMISSION_BRIEF>15 seconds, 9:16</COMMISSION_BRIEF>\n<AUDIENCE_PSYCHOLOGY>Everyday craft</AUDIENCE_PSYCHOLOGY>\n<CREATIVE_SEED_AND_ASSETS>Bread</CREATIVE_SEED_AND_ASSETS>";
  override = { text: info };
  let pipeline = (await (await pipe("info", "pipeline-generate", { duration: 15, aspectRatio: "9:16" })).json()).plan.pipeline;
  assert.equal(pipeline.info.accepted, false);
  assert.equal((await pipe("beats")).status, 400);
  pipeline = (await (await pipe("info", "pipeline-accept", { revision: pipeline.info.revision, text: info })).json()).plan.pipeline;
  assert.equal(pipeline.info.accepted, true);
  override = { text: "0:00–0:15 | Bakery | Bread" };
  pipeline = (await (await pipe("beats")).json()).plan.pipeline;
  assert.equal(pipeline.beats.accepted, false);
  assert.equal((await pipe("technical")).status, 400);
  pipeline = (await (await pipe("beats", "pipeline-accept", { revision: pipeline.beats.revision, text: pipeline.beats.text })).json()).plan.pipeline;
  assert.equal((await pipe("technical", "pipeline-generate", { assetIds: ["unknown"] })).status, 400);
  override = { text: "Use @unknown" };
  assert.equal((await pipe("technical")).status, 400);
  override = { text: "Warm light. Bread on table." };
  pipeline = (await (await pipe("technical")).json()).plan.pipeline;
  pipeline = (await (await pipe("technical", "pipeline-accept", { revision: pipeline.technical.revision, text: pipeline.technical.text })).json()).plan.pipeline;
  assert.equal(pipeline.technical.accepted, true);
  pipeline = (await (await pipe("info", "pipeline-accept", { revision: pipeline.info.revision, text: info + "\nEdited" })).json()).plan.pipeline;
  assert.equal(pipeline.beats, undefined); assert.equal(pipeline.technical, undefined);
  assert.ok((await ledger("synthesis:video-project-info")).length > 0);
  override = undefined;
  console.log("video-steps: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
