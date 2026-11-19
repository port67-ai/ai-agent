import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodePng, mediaInfo, minimalMp4 } from "../src/lib/factory/studio-media";
import { hookDraft, sceneDraft } from "./factory-studio-fixtures";

// Piece C (CHG-0099) through the API with a stubbed provider fetch (no paid calls): prepare production, stills drawn through the edits
// endpoint with the test frame and packshot as references and cropped to 4:5, reruns leaving project runs, loop and variant uploads with
// their real sizes, delivery documents and who may read them, gate 4 and delivery, and Start next cycle.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-production-"));
  Object.assign(process.env, {
    PORT67_DATA_DIR: join(directory, "live"),
    PORT67_DEMO_DATA_DIR: join(directory, "demo"),
    PORT67_OPERATOR_PASSWORD: "test-only-operator-password",
    PORT67_SESSION_SECRET: "test-only-session-secret-with-at-least-32-characters",
    PORT67_SYNTHESIS_ENABLED: "true",
    PORT67_SYNTHESIS_PROVIDER: "openai",
    PORT67_SYNTHESIS_MODEL: "gpt-test-mini",
    PORT67_OPENAI_API_KEY: "sk-test-only-key-0000",
    PORT67_PROVIDER_RETRY_MS: "0,0",
  });
  const rows = (w: number, h: number) => Array.from({ length: h }, (_, y) => Uint8Array.from({ length: w * 3 }, (_, x) => (x * 3 + y) & 0xff));
  const tall = encodePng(20, 30, 2, rows(20, 30)); // what the stub "draws" at 2:3
  const square = encodePng(16, 16, 2, rows(16, 16));
  const modelReplies: unknown[] = [];
  const imageReplies: { status: number; body: unknown }[] = [];
  const edits: { size: string; images: number; prompt: string }[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u === "https://api.openai.com/v1/responses") return json(200, { id: "resp", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(modelReplies.shift()) }] }], usage: { input_tokens: 10, output_tokens: 20 } });
    if (u === "https://api.openai.com/v1/images/generations") return json(200, { data: [{ b64_json: square.toString("base64") }], usage: { input_tokens: 5, output_tokens: 100 } });
    if (u === "https://api.openai.com/v1/images/edits") {
      const form = init?.body as FormData;
      edits.push({ size: String(form.get("size")), images: form.getAll("image[]").length, prompt: String(form.get("prompt")) });
      const next = imageReplies.shift() || { status: 200, body: { data: [{ b64_json: (form.get("size") === "1024x1536" ? tall : square).toString("base64") }], usage: { input_tokens: 70, output_tokens: 4160 } } };
      return json(next.status, next.body);
    }
    throw new Error("Unexpected fetch in test: " + u);
  }) as typeof fetch;
  const { handleFactory } = await import("../src/lib/factory/service");
  const { repository } = await import("../src/lib/factory/repository");
  const { exportApiCalls } = await import("../src/lib/factory/costs");
  let cookie = "";
  async function call(path: string, body?: unknown, raw?: { bytes: Buffer; query: string }) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie };
    if (body !== undefined) headers["content-type"] = "application/json";
    // Like the Next.js route, the path segments never include the query string.
    const [route, query] = path.split("?");
    const response = await handleFactory(new Request("http://localhost:3000/api/factory/" + route + (raw ? "?" + raw.query : query ? "?" + query : ""), { method: body !== undefined || raw ? "POST" : "GET", headers, body: raw ? new Uint8Array(raw.bytes) : body === undefined ? undefined : JSON.stringify(body) }), route.split("/"));
    const set = response.headers.get("set-cookie");
    if (set) {
      const pair = set.split(";")[0];
      const name = pair.split("=")[0];
      cookie = [...cookie.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith(name + "=")), pair].join("; ");
    }
    return response;
  }
  const ok = async (path: string, body: unknown, status = 200) => {
    const r = await call(path, body);
    const out = await r.json();
    assert.equal(r.status, status, `${path} ${JSON.stringify(body)}: ${out.error}`);
    return out;
  };
  const refused = async (path: string, body: unknown, re: RegExp) => {
    const r = await call(path, body);
    const out = await r.json();
    assert.ok(r.status >= 400, `${JSON.stringify(body)} should be refused`);
    assert.match(out.error, re, JSON.stringify(body));
  };
  const view = async (at: string) => (await (await call(at)).json()).project;
  const upload = async (at: string, query: string, bytes: Buffer) => {
    const r = await call(`${at}/studio/upload`, undefined, { bytes, query });
    const out = await r.json();
    assert.equal(r.status, 201, out.error);
    return out;
  };

  await call("session");
  assert.equal((await call("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const operatorCookie = cookie;
  /** A studio project taken through gate 2 and the pre-production draft. */
  async function toPreproduction(offer: "scene_pack" | "hook_pack") {
    const created = await ok("projects", { studio: { offer, brief: { client: { businessName: "Nash's Bakery", website: "https://nashs.example.com", approverName: "Ann", approverEmail: "ann@example.com" }, project: { name: "Spring" }, product: { names: "Sourdough, Rye", benefits: "Fermented for 48 hours", offer: "10% off the first order", cta: "Order today" }, brandKit: { colours: ["#aa3300"] } } } }, 201);
    const at = `projects/${created.project.id}`;
    if (offer === "scene_pack") await upload(at, "slot=packshots&rights=confirmed&name=sourdough.png", square);
    await ok(at, { type: "approveStudioGateWithNote", stage: "intake", note: "Logo later" });
    await ok(at, { type: "authoriseAI", confirm: true });
    let p = (await ok(at, { type: "addSource", segment: "brand", title: "About", url: "https://nashs.example.com/about", excerpt: "Nash's bakes every morning and ferments sourdough for 48 hours." })).project;
    const src = p.sources[0].id;
    await ok(at, { type: "reviewSource", id: src, status: "supported" });
    await ok(at, { type: "addInsight", title: "Freshness", interpretation: "Customers choose bread baked that morning.", sourceIds: [src] });
    await ok(at, { type: "draftStrategy", message: "Bread worth waking up for", keyMessages: [{ message: "Baked every morning", proof: "Nash's bakes every morning", sourceIds: [src] }, { message: "Fermented for 48 hours", proof: "Ferments sourdough for 48 hours", sourceIds: [src] }] });
    p = (await ok(at, { type: "shareStrategy" })).project;
    await ok(at, { type: "approveStrategy", hash: p.strategies.at(-1).hash });
    await ok(at, { type: "approveStudioGate", stage: "strategy" });
    modelReplies.push(offer === "scene_pack" ? sceneDraft() : hookDraft());
    return { at, p: (await ok(`${at}/studio/preproduction`, { action: "draft" })).project };
  }
  type Piece = { id: string; kind: string; title: string; status: string; dependsOn: string[]; versions: { image?: { id: string; width?: number; height?: number; seconds?: number; mime: string; aiDisclosure?: string; rights?: { source: string } } }[] };

  // ---------- Scene Pack ----------
  const { at } = await toPreproduction("scene_pack");
  let p = await view(at);
  let pieces: Piece[] = p.studio.pieces;
  const scenes = pieces.filter((x) => x.kind === "scene");
  const frames = pieces.filter((x) => x.kind === "test_frame");
  await refused(`${at}/studio/production`, { action: "prepare" }, /Production is not the open stage/);
  await ok(`${at}/studio/preproduction`, { action: "image", pieceId: frames[0].id });
  for (const x of [...scenes.slice(0, 2), frames[0]]) await ok(at, { type: "setStudioPieceStatus", pieceId: x.id, status: "approved" });
  p = (await ok(at, { type: "approveStudioGateWithNote", stage: "preproduction", note: "Client approved scenes 1 and 2 on a call" })).project;
  assert.equal(p.studio.stage, "production");
  assert.ok(p.studio.gates.preproduction.gaps.length > 0);

  p = (await ok(`${at}/studio/production`, { action: "prepare" })).project;
  const stills: Piece[] = p.studio.pieces.filter((x: Piece) => x.kind === "still");
  assert.equal(stills.length, 4, "two approved scenes at two ratios");
  assert.deepEqual(stills[0].dependsOn, [scenes[0].id, frames[0].id]);
  await refused(`${at}/studio/production`, { action: "prepare" }, /already prepared/);
  await refused(`${at}/studio/production`, { action: "image", pieceId: scenes[0].id }, /Choose a Scene Pack still/);

  // Draw a 4:5 still: the edits endpoint with the test frame and the packshot, drawn at 2:3, stored cropped to 4:5.
  const runsBefore = p.runs.length;
  p = (await ok(`${at}/studio/production`, { action: "image", pieceId: stills[0].id })).project;
  assert.deepEqual(edits.map((x) => [x.size, x.images]), [["1024x1536", 2]], "test frame and packshot sent as references");
  assert.match(edits[0].prompt, /cropped to 4:5/);
  let still = p.studio.pieces.find((x: Piece) => x.id === stills[0].id);
  const image = still.versions[0].image;
  assert.deepEqual([image.width, image.height, image.aiDisclosure], [20, 25, "ai_generated"]);
  assert.match(image.rights.source, /AI generated with OpenAI/);
  const file = await call(`${at}/studio/asset/${image.id}`);
  assert.deepEqual(mediaInfo(Buffer.from(await file.arrayBuffer()), "image/png"), { width: 20, height: 25 });
  assert.equal(p.runs.length, runsBefore + 1);
  assert.equal(p.runs.at(-1).status, "completed");
  assert.equal(p.runs.at(-1).capabilityId, "studio.image");
  assert.ok(p.audit.some((x: { action: string; detail: string }) => x.action === "studio_still_generated" && /cropped to 4:5, 20 x 25/.test(x.detail)));
  // The 1:1 still: square, no crop.
  p = (await ok(`${at}/studio/production`, { action: "image", pieceId: stills[1].id })).project;
  assert.equal(edits.at(-1)!.size, "1024x1024");
  assert.equal(p.studio.pieces.find((x: Piece) => x.id === stills[1].id).versions[0].image.width, 16);

  // Rerun a still: a new AI version and a project run (piece B gap fixed: reruns now appear in diagnostics).
  const before = p.runs.length;
  p = (await ok(at, { type: "requestStudioRerun", pieceId: stills[0].id, instruction: "More steam", confirm: true })).project;
  still = p.studio.pieces.find((x: Piece) => x.id === stills[0].id);
  assert.equal(still.versions.length, 2);
  const winnerImage = still.versions[1].image.id;
  assert.equal(p.runs.length, before + 1, "the rerun left a project run");
  assert.equal(p.runs.at(-1).status, "completed");
  assert.equal(p.runs.at(-1).id, p.studio.rerunRequests.at(-1).runId);
  assert.match(edits.at(-1)!.prompt, /Changes requested for this version:\n- More steam/);
  imageReplies.push({ status: 400, body: { error: { message: "Your request was rejected by the safety system" } } });
  p = (await ok(at, { type: "requestStudioRerun", pieceId: stills[0].id, confirm: true })).project;
  assert.equal(p.studio.rerunRequests.at(-1).status, "failed");
  assert.equal(p.runs.at(-1).status, "failed", "a failed rerun is recorded as a failed run");
  assert.match(p.runs.at(-1).error, /safety system/);
  const ledger = await exportApiCalls(repository);
  assert.equal(ledger.filter((r) => r.agent === "studio:image").length, 1 + 2 + 2, "every image call is metered");

  // Motion loop: uploaded MP4 with its real size, disclosure and rights.
  p = (await ok(`${at}/studio/production`, { action: "loops", count: 1 })).project;
  const loop = p.studio.pieces.find((x: Piece) => x.kind === "loop");
  const up = await upload(at, `slot=piece&pieceId=${loop.id}&aiDisclosure=ai_generated&rightsSource=Made+in+a+video+tool&rightsLicence=Owned+by+the+client&name=loop.mp4`, minimalMp4(1080, 1350, 5));
  assert.deepEqual([up.asset.width, up.asset.height, up.asset.seconds, up.asset.aiDisclosure, up.asset.rights.source], [1080, 1350, 5, "ai_generated", "Made in a video tool"]);
  const promptDoc = await call(`${at}/studio/delivery/loop-prompt-${loop.id}.txt`);
  assert.equal(promptDoc.status, 200);
  assert.match(await promptDoc.text(), /Length: 5 seconds, seamless loop/);

  // Delivery documents: nothing approved yet; then approved versions only.
  assert.match((await (await call(`${at}/studio/delivery/manifest.json`)).json()).error, /No approved final pieces/);
  for (const x of stills.slice(0, 2)) await ok(at, { type: "setStudioPieceStatus", pieceId: x.id, status: "approved" });
  const manifestResponse = await call(`${at}/studio/delivery/manifest.json`);
  assert.equal(manifestResponse.status, 200);
  assert.match(manifestResponse.headers.get("content-disposition")!, /attachment; filename="nash-s-bakery-scene-pack-manifest.json"/);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.files[0].fileName, "nash-s-bakery_scene-pack_scene01_4x5_v2.png");
  const download = await call(manifest.files[0].download.replace(/^\/api\/factory\//, ""));
  assert.equal(download.status, 200, "download links use the authorised asset route");
  assert.match(download.headers.get("content-disposition")!, /^attachment/);
  assert.ok(manifest.notIncluded.length >= 3);
  const csv = await call(`${at}/studio/delivery/test-plan.csv`);
  assert.equal(csv.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(await csv.text(), /^file_name,variant/);
  assert.match(await (await call(`${at}/studio/delivery/handoff.md`)).text(), /# Launch handoff: Nash's Bakery/);
  assert.equal((await call(`${at}/studio/delivery/unknown.txt`)).status, 400);

  // The client: nothing before delivery.
  const invitation = await (await call(`${at}/invite`, {})).json();
  const token = new URLSearchParams(new URL(invitation.invitation).hash.slice(1)).get("invite");
  await call("logout", {});
  assert.equal((await call("client-login", { token })).status, 200);
  const clientCookie = cookie;
  assert.equal((await call(`${at}/studio/delivery/manifest.md`)).status, 403);
  await refused(`${at}/studio/production`, { action: "prepare" }, /operator/);
  await refused(at, { type: "confirmStudioGtm", check: "disclosure" }, /operator/);
  let client = await view(at);
  assert.equal(client.studio.gtm, undefined, "go-to-market records stay with the producer until Production is shared");

  // Gate 4: a plain approval is blocked; approve with a note (on the client's behalf) records the gaps; then delivered.
  cookie = operatorCookie;
  await refused(at, { type: "approveStudioGate", stage: "production" }, /Not ready to approve: .*no file yet.*Go-to-market/);
  p = (await ok(at, { type: "setStudioReadyForClient", stage: "production" })).project;
  p = (await ok(at, { type: "approveStudioGateWithNote", stage: "production", note: "Client approved the first two stills; the rest follow in cycle 2" })).project;
  assert.equal(p.studio.stage, "delivered");
  assert.ok(p.studio.gates.production.gaps.some((g: string) => /Go-to-market, rights and consent|no file yet/.test(g)));
  assert.ok(p.audit.some((x: { action: string }) => x.action === "studio_delivered"));
  await refused(`${at}/studio/production`, { action: "image", pieceId: stills[2].id }, /Production is not the open stage/);
  await ok(at, { type: "setStudioWinner", pieceId: stills[0].id, winner: true });
  cookie = clientCookie;
  const md = await call(`${at}/studio/delivery/manifest.md`);
  assert.equal(md.status, 200, "the client downloads the pack once delivered");
  const text = await md.text();
  assert.match(text, /Status: delivered/);
  assert.match(text, /Production: approved.*Client approved the first two stills.*Outstanding at approval/);
  assert.equal((await call(`${at}/studio/delivery/results-template.csv`)).status, 403, "the results template is a producer document");
  client = await view(at);
  assert.equal(client.studio.stage, "delivered");
  assert.ok(client.studio.gtm, "after delivery the client sees the go-to-market records");

  // Next cycle: same account and offer, Brand Kit and brief copied, winners as liked references, intake open.
  cookie = operatorCookie;
  const cycle = await ok(`${at}/studio/production`, { action: "nextCycle" }, 201);
  const next = cycle.next;
  assert.equal(next.studio.offer, "scene_pack");
  assert.equal(next.studio.stage, "intake");
  assert.equal(next.accountId, p.accountId);
  assert.equal(next.studio.brief.project.name, "Spring (cycle 2)");
  assert.equal(next.studio.brief.product.offer, "10% off the first order");
  assert.deepEqual(next.studio.brief.brandKit.colours, ["#aa3300"]);
  assert.equal(next.studio.brief.assets.packshots.length, 1, "packshot references copied");
  assert.match(next.studio.brief.references.liked[0], /^Winner from Spring: nash-s-bakery_scene-pack_scene01_4x5_v2\.png/);
  assert.equal(next.studio.brief.references.mood[0].id, winnerImage, "the winner image is attached as a mood reference");
  assert.equal(next.studio.gtm.previousCycle.projectId, p.id);
  assert.equal(cycle.project.studio.gtm.nextCycle.projectId, next.id);
  assert.equal((await call(`projects/${next.id}/studio/asset/${next.studio.brief.references.mood[0].id}`)).status, 200, "the winner image is served through the new project");
  await refused(`${at}/studio/production`, { action: "nextCycle" }, /already started/);
  await refused(`projects/${next.id}/research`, { segment: "brand" }, /Approve the studio intake/);

  // ---------- Hook pack: twelve variants, prompt pack, uploads with real sizes ----------
  const hook = await toPreproduction("hook_pack");
  pieces = hook.p.studio.pieces;
  for (const x of pieces.filter((y) => y.kind === "hook")) await ok(hook.at, { type: "setStudioPieceStatus", pieceId: x.id, status: "approved" });
  // A keyframe rerun (piece B's image rerun handler) now leaves a project run too.
  const keyframe = pieces.find((y) => y.kind === "keyframe")!;
  const runCount = (await view(hook.at)).runs.length;
  p = (await ok(hook.at, { type: "requestStudioRerun", pieceId: keyframe.id, confirm: true })).project;
  assert.equal(p.studio.rerunRequests.at(-1).status, "done");
  assert.equal(p.runs.length, runCount + 1);
  assert.deepEqual([p.runs.at(-1).stage, p.runs.at(-1).capabilityId, p.runs.at(-1).status], ["studio", "studio.image", "completed"]);
  modelReplies.push({ text: "Angle: Two days of patience\nCarries key message 2: Fermented for 48 hours\nProof: Ferments sourdough for 48 hours" });
  p = (await ok(hook.at, { type: "requestStudioRerun", pieceId: pieces.find((y) => y.kind === "narrative")!.id, confirm: true })).project;
  assert.deepEqual([p.runs.length, p.runs.at(-1).capabilityId, p.runs.at(-1).status], [runCount + 2, "studio.preproduction", "completed"], "and so does a text rerun");
  for (const x of p.studio.pieces.filter((y: Piece) => y.kind === "hook")) await ok(hook.at, { type: "setStudioPieceStatus", pieceId: x.id, status: "approved" });
  await ok(hook.at, { type: "approveStudioGateWithNote", stage: "preproduction", note: "Keyframes drawn later" });
  p = (await ok(`${hook.at}/studio/production`, { action: "prepare" })).project;
  const variants: Piece[] = p.studio.pieces.filter((x: Piece) => x.kind === "variant");
  assert.equal(variants.length, 12);
  await refused(`${hook.at}/studio/production`, { action: "image", pieceId: variants[0].id }, /Choose a Scene Pack still/);
  const pack = await call(`${hook.at}/studio/delivery/prompt-pack-${variants[0].id}.md`);
  assert.equal(pack.status, 200);
  assert.match(pack.headers.get("content-disposition")!, /nash-s-bakery_hook-pack_narrative1_hook1-visual-metaphor_v1-prompt-pack\.md/);
  assert.match(await pack.text(), /## Shots \(prompts for any video tool\)[\s\S]*### Shot 1, 0-3s \(hook\)[\s\S]*- Music cue: Soft acoustic/);
  const v1 = await upload(hook.at, `slot=piece&pieceId=${variants[0].id}&aiDisclosure=ai_edited&name=v1.mp4`, minimalMp4(1080, 1920, 23));
  assert.deepEqual([v1.asset.width, v1.asset.height, v1.asset.seconds], [1080, 1920, 23]);
  const v2 = await upload(hook.at, `slot=piece&pieceId=${variants[1].id}&aiDisclosure=none&name=v2.mp4`, minimalMp4(1920, 1080, 23, true));
  assert.deepEqual([v2.asset.width, v2.asset.height], [1080, 1920], "a rotated phone clip is read as portrait");
  const v3 = await upload(hook.at, `slot=piece&pieceId=${variants[2].id}&aiDisclosure=none&name=v3.mp4`, minimalMp4(720, 1280, 23));
  assert.equal(v3.asset.width, 720);
  await refused(hook.at, { type: "confirmStudioPieceCheck", check: "specs", pieceIds: [variants[2].id] }, /outside its spec/);
  p = (await ok(hook.at, { type: "confirmStudioPieceCheck", check: "specs", pieceIds: [variants[2].id], note: "720p accepted for the test only" })).project;
  assert.equal(p.studio.gtm.specs[variants[2].id].note, "720p accepted for the test only");
  await ok(hook.at, { type: "addStudioRights", kind: "music", name: "Soft acoustic bed", source: "Epidemic Sound", licence: "Commercial subscription" });
  await refused(hook.at, { type: "resetProject", confirm: true }, /admin|Studio projects cannot be restarted/);

  await rm(directory, { recursive: true, force: true });
  console.log("Studio production API: prepare, stills with references and crop, rerun runs, uploads with real sizes, delivery documents, gate 4, delivery and next cycle passed");
}
void main().catch((error) => { console.error(error); process.exit(1); });
