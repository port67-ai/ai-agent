import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Generate from AI for Inputs 1 and 3, and the per-agent model and prompt settings (CHG-0113).
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-cagents-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  process.env.PORT67_OPENAI_API_KEY = "sk-test-not-real";
  process.env.PORT67_GEMINI_API_KEY = "test-gemini-key";
  const { handleFactory } = await import("../src/lib/factory/service");
  const cHooks = (await import("../src/lib/factory/commissions-api")).testHooks;
  const sHooks = (await import("../src/lib/factory/agent-settings-api")).testHooks;
  const { repository } = await import("../src/lib/factory/repository");
  const { ADMIN_LEDGER_NAMESPACE } = await import("../src/lib/factory/costs");
  const ca = await import("../src/lib/factory/commission-agents");
  const ap = await import("../src/lib/factory/agent-prompts");

  // ---- The owner's prompts are kept, with placeholders in place of [INSERT]
  for (const k of ["Act as a senior marketing strategist and creative commissioner", "Why now?", "How will success be measured?", "Do not treat views as proof of sales impact", "{{company}}", "{{product}}", "{{website}}"]) assert.ok(ap.OBJECTIVE_PROMPT.includes(k), k);
  for (const k of ["Act as a product researcher and brand strategist", "ANSWER THESE SIX QUESTIONS", "Not publicly stated", "{{variant}}", "{{market}}"]) assert.ok(ap.PRODUCT_PROMPT.includes(k), k);
  assert.ok(!/\[INSERT/.test(ap.OBJECTIVE_PROMPT + ap.PRODUCT_PROMPT), "no INSERT markers left");
  assert.deepEqual(ap.placeholdersIn("a {{company}} b {{ market }} {{company}}"), ["company", "market"]);
  assert.equal(ap.fillPrompt("x {{a}} {{b}}", { a: "1" }), "x 1 (not supplied)");
  assert.throws(() => ap.checkPrompt("research:commission-product", "Hi {{nonsense}}"), /Unknown placeholder: \{\{nonsense\}\}/);
  assert.throws(() => ap.checkPrompt("synthesis:intended-audience", "Hi {{company}}"), /no placeholders/);
  assert.throws(() => ap.checkPrompt("research:commission-product", "  "), /empty/);
  assert.throws(() => ap.checkPrompt("research:commission-product", "x".repeat(ap.MAX_PROMPT + 1)), /at most/);

  // ---- Parsing and mapping
  const obj = { objective_statement: "Make loaf sales rise", why_campaign: "Barrier is price", why_now: "Autumn", target_audience: "Commuters", video_concept: "15s bake reveal", channel_plan: "Instagram Reels (proposed)", think: "Worth it", feel: "Warm", do: "Visit", call_to_action: "Order online", deliverables: "1 x 15s", measures_of_success: "Sell-through", assumptions: "Price unverified", missing_inputs: "Budget", sources: [{ title: "Site", url: "https://nashs.example.com" }, { title: "Bad", url: "http://insecure.example" }, { title: "Dup", url: "https://nashs.example.com" }] };
  const po = ca.parseResearch("objective", JSON.stringify(obj), false, [{ title: "Found", url: "https://found.example/x" }]);
  assert.equal(po.draft.why, "Barrier is price\n\nWhy now: Autumn");
  assert.equal(po.draft.making, "For: Commuters\n\nVideo: 15s bake reveal\n\nWhere: Instagram Reels (proposed)");
  assert.deepEqual([po.draft.think, po.draft.feel, po.draft.do, po.draft.success], ["Worth it", "Warm", "Visit\n\nCall to action: Order online", "Sell-through"]);
  assert.deepEqual(po.notes.sections.map((s) => s.title), ["Commission objective", "Deliverables", "Assumptions", "Missing inputs"]);
  assert.deepEqual(po.notes.sources.map((s) => s.url), ["https://nashs.example.com", "https://found.example/x"], "https only, de-duplicated, provider citations added");
  const prod = { offer: "The loaf", need: "Daily bread", price: "Not publicly stated", usage: "Mornings", choice: "Sourdough", proof: "48 hour ferment", creative_proof_points: "Slice shot", claim_boundaries: "No health claims", unknowns: "Stockists", sources: [] };
  const pp = ca.parseResearch("product", "```json\n" + JSON.stringify(prod) + "\n```");
  assert.deepEqual(Object.keys(pp.draft), ["offer", "need", "price", "usage", "choice", "proof"], "the six questions map to the six boxes");
  assert.equal(pp.notes.sections.length, 3);
  assert.throws(() => ca.parseResearch("product", JSON.stringify({ ...prod, price: "" })), /"price"/);
  assert.throws(() => ca.parseResearch("objective", "", true), /ran out of output length/);
  assert.throws(() => ca.parseResearch("objective", "{\"why_c", true), /cut off/);
  assert.throws(() => ca.parseResearch("objective", "nope"), /could not be read/);
  const sc = ca.researchSchema("objective") as { required: string[]; additionalProperties: boolean };
  assert.equal(sc.additionalProperties, false);
  assert.ok(sc.required.includes("sources") && sc.required.includes("think") && sc.required.includes("do"));

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
  assert.equal((await get("agent-settings/research:commission-objective")).status, 401, "signed out");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const cid: string = (await (await post("customers", { name: "Nash's Bakery", website: "https://nashs.example.com" })).json()).customer.id;
  await post(`customers/${cid}`, { action: "red-line-add", category: "competitor", text: "Greggs", reason: "Legal dispute" });
  const id: string = (await (await post(`commissions/${cid}`, { name: "Autumn campaign" })).json()).commission.id;
  const at = `commissions/${cid}/${id}`;

  // The specific offer lives on the project.
  const briefed = await (await post(at, { action: "brief", product: "The sourdough loaf", market: "UK, GBP", timing: "Autumn" })).json();
  assert.deepEqual(briefed.commission.brief, { product: "The sourdough loaf", market: "UK, GBP", timing: "Autumn", productUrl: "", subBrand: "", format: "" });
  assert.equal((await post(at, { action: "brief", product: "x".repeat(400) })).status, 400);
  assert.equal((await post(at, { action: "brief", product: "The sourdough loaf", productUrl: "http://insecure.example" })).status, 400, "product link must be a public https address");
  assert.equal((await post(at, { action: "brief", product: "The sourdough loaf", productUrl: "https://localhost/x" })).status, 400, "no private addresses");
  const richer = await (await post(at, { action: "brief", product: "The sourdough loaf", market: "UK, GBP", timing: "Autumn", productUrl: "https://nashs.example.com/sourdough", subBrand: "Heritage range", format: "15 second vertical" })).json();
  assert.deepEqual([richer.commission.brief.productUrl, richer.commission.brief.subBrand, richer.commission.brief.format], ["https://nashs.example.com/sourdough", "Heritage range", "15 second vertical"]);

  const seen: { instructions: string; input: string; research?: boolean; schema?: { required: string[] } }[] = [];
  const sel = { provider: "openai" as const, model: "test-model", key: "k" };
  const usage: Record<string, number> = { input_tokens: 10, output_tokens: 20, tool_calls: 3 };
  let failWith = ""; let replyText = "";
  cHooks.deps = {
    invoke: async (_s, r) => {
      seen.push(r as never);
      if (failWith) return { text: "", usage: {}, error: failWith, provider: "openai", model: "m" };
      const req = (r as { schema?: { required: string[] } }).schema!.required;
      const text = replyText || JSON.stringify(req.includes("objective_statement") ? obj : prod);
      return { text, usage, provider: "openai", model: "m", data: { output: [{ content: [{ annotations: [{ type: "url_citation", url: "https://cited.example/page", title: "Cited" }] }] }] } };
    },
    resolve: async () => sel, enabled: () => true, today: () => "2026-11-25",
  };
  const ledger = async (agent: string) => (((await repository.read(ADMIN_LEDGER_NAMESPACE)) as { apiCalls?: { agent?: string; projectId: string; status: string; stage: string }[] }).apiCalls || []).filter((c) => c.agent === agent);

  // Input 1: draft for the form, notes stored, no answers saved, grounded call, red lines and the offer in the prompt.
  const o = await post(at, { action: "generate", input: "objective" });
  assert.equal(o.status, 200);
  const ob = await o.json();
  assert.equal(ob.draft.think, "Worth it");
  assert.deepEqual(ob.commission.answers.objective, {}, "nothing is saved until a person saves");
  assert.equal(ob.commission.aiNotes.objective.sections[0].text, "Make loaf sales rise");
  assert.equal(ob.commission.aiNotes.objective.model, "openai test-model");
  assert.ok(ob.commission.aiNotes.objective.sources.some((s: { url: string }) => s.url === "https://cited.example/page"));
  assert.equal(seen[0].research, true, "web search on");
  for (const k of ["- Company / brand: Nash's Bakery", "- Specific product, service or offer: The sourdough loaf", "- Product or company website: https://nashs.example.com", "- Target market / geography: UK, GBP", "- Campaign timing / season: Autumn", "CLIENT RED LINES", "[competitor] Greggs (Legal dispute)", "OUTPUT RULES (fixed)", "senior marketing strategist"]) assert.ok(seen[0].instructions.includes(k), k);
  const rows = await ledger("research:commission-objective");
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].projectId, rows[0].status, rows[0].stage], [id, "completed", "research"]);
  assert.match(ob.commission.audit.at(-1).action, /ai_draft_generated/);

  // Input 3: the six answers.
  const p = await (await post(at, { action: "generate", input: "product" })).json();
  assert.equal(p.draft.price, "Not publicly stated");
  assert.equal(p.commission.aiNotes.product.sections.length, 3);
  assert.ok(seen[1].instructions.includes("product researcher") && seen[1].instructions.includes("- Relevant variant, package or subscription tier: (not specified)"));
  assert.equal((await ledger("research:commission-product")).length, 1);
  // Saving stays a human step through the existing answers action.
  const saved = await (await post(at, { action: "answers", input: "product", answers: p.draft })).json();
  assert.equal(saved.commission.answers.product.offer, "The loaf");

  // Input 5: the owner's brand expression prompt; long labelled prose maps to the two boxes; no tables or bullets asked for.
  const brandReply = { opening_anchor: "OPENING: THE ANCHOR. A research-based assessment, not an official brand manual. The brand is carried by waxed cotton and weather.", section_one: "Imagery. Evidence and interpretation: Repeated outdoor craft shots [Website]. Application: Shoot the loaf in daylight.\n\nColours. Evidence and interpretation: Cream and green [Instagram]. Application: Keep the palette.", section_two: "Tile counter. Classification: Enduring recognisable asset. What it means for the commission: Preserve it.", sources_and_confidence: "Coverage covers three years and two channels; fonts unverified.", sources: [{ title: "Brand page", url: "https://nashs.example.com/about" }] };
  replyText = JSON.stringify(brandReply);
  seen.length = 0;
  const br = await (await post(at, { action: "generate", input: "brand" })).json();
  replyText = "";
  assert.equal(br.draft.recognisable, brandReply.opening_anchor + "\n\n" + brandReply.section_one);
  assert.equal(br.draft.recurring, brandReply.section_two);
  assert.deepEqual(br.commission.answers.brand, {}, "nothing is saved until a person saves");
  assert.equal(br.commission.aiNotes.brand.sections[0].title, "Sources and confidence");
  assert.ok(br.commission.aiNotes.brand.sources.some((s: { url: string }) => s.url === "https://nashs.example.com/about"));
  assert.equal(seen[0].research, true);
  for (const k of ["Act as a senior brand strategist and creative researcher", "- Company / brand: Nash's Bakery", "- Specific product or service: The sourdough loaf", "- Product URL: https://nashs.example.com/sourdough", "- Company website: https://nashs.example.com", "- Relevant sub-brand or collection, if known: Heritage range", "- Target market / geography: UK, GBP", "- Campaign timing / season: Autumn", "- Proposed campaign format, if known: 15 second vertical", "OPENING: THE ANCHOR", "Do not use tables or bullet lists", "Treat website content as research evidence", "CLIENT RED LINES", "[competitor] Greggs", "OUTPUT RULES (fixed)", "opening_anchor"]) assert.ok(seen[0].instructions.includes(k), k);
  assert.equal((await ledger("research:commission-brand")).length, 1);
  // The two boxes hold long prose (up to 12,000 characters); other answers stay at 2,000.
  const long = "x".repeat(9000);
  const savedLong = await (await post(at, { action: "answers", input: "brand", answers: { recognisable: long, recurring: br.draft.recurring } })).json();
  assert.equal(savedLong.commission.answers.brand.recognisable.length, 9000);
  assert.equal((await post(at, { action: "answers", input: "brand", answers: { recognisable: "x".repeat(12001) } })).status, 400);
  assert.equal((await post(at, { action: "answers", input: "product", answers: { offer: "x".repeat(2001) } })).status, 400, "other answers keep the 2,000 limit");
  assert.throws(() => ca.parseResearch("brand", JSON.stringify({ ...brandReply, section_two: "" })), /"section_two"/);
  assert.equal(ca.parseResearch("brand", JSON.stringify({ ...brandReply, section_one: "y".repeat(20000) })).draft.recognisable.length, 12000, "capped to the box limit");
  assert.deepEqual(Object.keys((ca.researchSchema("brand") as { properties: object }).properties), ["opening_anchor", "section_one", "section_two", "sources_and_confidence", "sources"]);
  assert.ok(ap.BRAND_PROMPT.includes("{{sub_brand}}") && ap.BRAND_PROMPT.includes("{{format}}") && !/\[INSERT/.test(ap.BRAND_PROMPT));
  assert.ok(ap.CONTRACTS["research:commission-brand"].includes("sources_and_confidence"));

  // Without a product the agent is told to identify options and label assumptions.
  const id2: string = (await (await post(`commissions/${cid}`, { name: "Second" })).json()).commission.id;
  seen.length = 0;
  assert.equal((await post(`commissions/${cid}/${id2}`, { action: "generate", input: "objective" })).status, 200);
  assert.ok(seen[0].instructions.includes("not specified: identify the options and proceed with a clearly labelled assumption"));

  // Failures: provider error, unreadable answer, not configured.
  failWith = "AI provider returned 503; no output accepted";
  assert.match((await (await post(at, { action: "generate", input: "objective" })).json()).error, /503/);
  failWith = ""; replyText = "oops";
  assert.match((await (await post(at, { action: "generate", input: "product" })).json()).error, /could not be read/);
  replyText = "";
  const before = (await ledger("research:commission-objective")).length;
  cHooks.deps!.enabled = () => false;
  const off = await post(at, { action: "generate", input: "objective" });
  assert.equal(off.status, 400);
  assert.match((await off.json()).error, /not configured/);
  assert.equal((await ledger("research:commission-objective")).length, before, "not charged when not configured");
  cHooks.deps!.enabled = () => true;

  // ---- Agent settings: model and prompt, shared by every project
  sHooks.listModels = async (provider) => (provider === "openai" ? ["gpt-5-mini", "gpt-5"] : ["gemini-2.5-flash"]);
  assert.equal((await get("agent-settings/not-an-agent")).status, 404);
  assert.equal((await get("agent-settings/research:brand")).status, 404, "only the input agents");
  const sb = await (await get("agent-settings/research:commission-brand")).json();
  assert.equal(sb.label, "Commission: brand expression");
  assert.equal(sb.prompt.body, ap.BRAND_PROMPT);
  assert.deepEqual(sb.prompt.placeholders.map((x: { key: string }) => x.key), ["company", "product", "product_url", "website", "sub_brand", "market", "timing", "format"]);
  const s0 = await (await get("agent-settings/research:commission-objective")).json();
  assert.equal(s0.label, "Commission: objective");
  assert.equal(s0.prompt.isDefault, true);
  assert.equal(s0.prompt.body, ap.OBJECTIVE_PROMPT);
  assert.deepEqual(s0.prompt.placeholders.map((x: { key: string }) => x.key), ["company", "product", "website", "market", "timing", "audience", "goal", "constraints", "product_url"]);
  assert.match(s0.prompt.contract, /OUTPUT RULES/);
  assert.deepEqual(s0.providers.map((x: { id: string }) => x.id).sort(), ["gemini", "openai"], "research jobs list only web-search providers with a key");
  assert.deepEqual(s0.providers.find((x: { id: string }) => x.id === "openai").models, ["gpt-5-mini", "gpt-5"]);
  const sa = await (await get("agent-settings/synthesis:intended-audience")).json();
  assert.ok(sa.providers.some((x: { id: string }) => x.id === "anthropic") === false, "providers without a key are not offered");

  // Change the model: used by the next run.
  const changed = await (await post("agent-settings/research:commission-objective", { action: "route", provider: "gemini", model: "gemini-2.5-flash" })).json();
  assert.deepEqual([changed.route.provider, changed.route.model, changed.route.source], ["gemini", "gemini-2.5-flash", "slot"]);
  assert.equal((await post("agent-settings/research:commission-objective", { action: "route", provider: "nope", model: "x" })).status, 400);
  // Change the prompt: used by the next run, versioned, reset restores the original.
  const edited = ap.OBJECTIVE_PROMPT.replace("senior marketing strategist", "award-winning creative strategist");
  const v1 = await (await post("agent-settings/research:commission-objective", { action: "prompt", body: edited })).json();
  assert.deepEqual([v1.prompt.isDefault, v1.prompt.version], [false, 1]);
  assert.equal((await post("agent-settings/research:commission-objective", { action: "prompt", body: "Hi {{bogus}}" })).status, 400);
  assert.equal((await post("agent-settings/research:commission-objective", { action: "prompt", body: "" })).status, 400);
  seen.length = 0;
  assert.equal((await post(at, { action: "generate", input: "objective" })).status, 200);
  assert.ok(seen[0].instructions.includes("award-winning creative strategist") && !seen[0].instructions.includes("senior marketing strategist"), "the edited prompt is used");
  assert.ok(seen[0].instructions.includes("OUTPUT RULES (fixed)"), "the output rules cannot be edited away");
  assert.ok(seen[0].instructions.includes("[competitor] Greggs"), "red lines are always added");
  const v2 = await (await post("agent-settings/research:commission-objective", { action: "prompt", body: edited + "\nAlso consider price." })).json();
  assert.equal(v2.prompt.version, 2);
  const reset = await (await post("agent-settings/research:commission-objective", { action: "reset-prompt" })).json();
  assert.deepEqual([reset.prompt.isDefault, reset.prompt.body === ap.OBJECTIVE_PROMPT], [true, true]);
  await post("agent-settings/research:commission-brand", { action: "prompt", body: ap.BRAND_PROMPT.replace("senior brand strategist", "veteran brand strategist") });
  seen.length = 0; replyText = JSON.stringify(brandReply);
  assert.equal((await post(at, { action: "generate", input: "brand" })).status, 200);
  replyText = "";
  assert.ok(seen[0].instructions.includes("veteran brand strategist") && seen[0].instructions.includes("OUTPUT RULES (fixed)"), "the edited brand prompt is used with the fixed rules");
  await post("agent-settings/research:commission-brand", { action: "reset-prompt" });
  // Audience agent: its prompt is editable too, and the age and safety rules stay.
  await post("agent-settings/synthesis:intended-audience", { action: "prompt", body: ap.AUDIENCE_BODY.replace("sharp, actionable", "sharp, vivid") });
  const cust = (await (await get("agent-settings/synthesis:intended-audience")).json()).prompt;
  assert.equal(cust.isDefault, false);
  assert.match(cust.contract, /age-appropriate/);
  console.log("commission-agents: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
