import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addPieceVersion, approveStudioGate, pieceImpact } from "../src/lib/factory/studio";
import { preproductionGateBlockers } from "../src/lib/factory/studio-gates";
import { buildImagePrompt, createPreproductionPieces, imageSizeFor, preproductionContext, regionWords, validateHookPack, validateScenePack, type HookPackDraft, type ScenePackDraft } from "../src/lib/factory/studio-preproduction";
import { PNG, hookDraft, op, preproductionProject, sceneDraft } from "./factory-studio-fixtures";
import { ImageProviderError, meteredImage, openAiImageProvider } from "../src/lib/factory/image-provider";
import { LocalRepository } from "../src/lib/factory/repository";
import { exportApiCalls } from "../src/lib/factory/costs";
import { resolveSelection, saveRouting, stageReady, validateRoutingInput } from "../src/lib/factory/ai-routing";
import type { StudioAssetRef } from "../src/lib/factory/model";

// Piece B (CHG-0098): pre-production generator validation, the dependsOn graph and stale marking, gate 3, image prompts and the image
// adapter with a stubbed fetch (no paid calls).

async function main() {
  // ---- Scene Pack validation
  const p = preproductionProject("scene_pack", "pp1");
  assert.equal(p.studio!.stage, "preproduction");
  const ctx = preproductionContext(p);
  assert.deepEqual(ctx.products, ["Sourdough", "Rye"]);
  assert.equal(ctx.keyMessages.length, 2);
  assert.ok(!JSON.stringify(ctx.payload).includes("ann@example.com"), "no contact details go to the model");
  const ok = validateScenePack(sceneDraft(), ctx);
  assert.equal(ok.scenes.length, 6, "one scene per product and theme");
  assert.deepEqual(ok.moodboard.palette.map((x) => x.hex).slice(0, 2), ["#aa3300", "#f5f1ea"], "every brand colour is in the palette");
  const bad = (change: (d: ScenePackDraft) => void, re: RegExp) => { const d = sceneDraft(); change(d); assert.throws(() => validateScenePack(d, ctx), re); };
  bad((d) => d.scenes.pop(), /Scenes needs 6 items/);
  bad((d) => d.themes.splice(0, 1), /needs 3 to 5 items/);
  bad((d) => (d.scenes[1].keyMessage = 7), /unknown key message/);
  bad((d) => (d.themes[0].keyMessage = 0), /unknown key message/);
  bad((d) => (d.scenes[0].message = "Loved by 98% of customers"), /states 98%, which is not in the approved direction/);
  bad((d) => (d.scenes[0].description = "Voted best bakery by 1,200 locals"), /states 1200/);
  bad((d) => (d.scenes[0].product = "Baguette"), /not in the brief/);
  bad((d) => (d.scenes[1].theme = 1), /repeats a product and theme pair/);
  bad((d) => (d.moodboard.palette[0].hex = "red"), /hex colour/);
  bad((d) => ((d as unknown as Record<string, unknown>).extra = 1), /fields do not match/);
  // A figure that is in the approved material is fine (48 hours is in the key messages).
  assert.equal(validateScenePack(sceneDraft(), ctx).themes[0].message, "Fermented for 48 hours");

  // ---- Hook pack validation
  const hp = preproductionProject("hook_pack", "hp1");
  const hctx = preproductionContext(hp);
  assert.equal(validateHookPack(hookDraft(), hctx).narratives.length, 3);
  const hbad = (change: (d: HookPackDraft) => void, re: RegExp) => { const d = hookDraft(); change(d); assert.throws(() => validateHookPack(d, hctx), re); };
  hbad((d) => d.narratives.pop(), /Narratives needs 3 items/);
  hbad((d) => d.narratives[0].hooks.pop(), /hooks needs 4 items/);
  hbad((d) => (d.narratives[1].hooks[1].style = "visual_metaphor"), /repeats a hook style/);
  hbad((d) => (d.script.beats[2].end = 18), /must run exactly 20 seconds/);
  hbad((d) => (d.script.beats[1].start = 6), /must start at second 5/);
  hbad((d) => (d.script.claims[0].keyMessage = 3), /unknown key message/);
  hbad((d) => (d.narratives[2].hooks[0].onScreen = "Save 30% today"), /states 30%/);
  hbad((d) => (d.script.beats[0].voiceover = "Rated 4.9 by our customers"), /states 4\.9/);
  hbad((d) => ((d.shotlist[0] as { source: string }).source = "stock"), /unknown source/);

  // ---- Pieces and the dependsOn graph (Scene Pack)
  const s = structuredClone(p.studio!);
  const made = createPreproductionPieces(s, ok, ctx, { by: "producer", runId: "run-1" });
  const kinds = (k: string) => s.pieces.filter((x) => x.kind === k);
  assert.equal(made.length, 14);
  const [mood, cont] = [kinds("moodboard")[0], kinds("continuity")[0]];
  assert.ok(kinds("scene").every((x) => x.dependsOn.includes(mood.id) && x.dependsOn.includes(cont.id)));
  assert.ok(kinds("test_frame").every((f) => f.versions.length === 0 && kinds("scene").some((sc) => f.dependsOn[0] === sc.id)));
  assert.equal(pieceImpact(s, mood.id).length, 12, "the mood board affects every scene and test frame");
  assert.match(mood.versions[0].text!, /#aa3300: Brand colour/);
  assert.match(cont.versions[0].text!, /Aspect ratios: 4:5 and 1:1/);
  assert.match(kinds("scene")[0].versions[0].text!, /Carries key message 1: Baked every morning|Carries key message 2: Fermented for 48 hours/);
  assert.equal(kinds("scene")[0].aiDisclosure, "ai_generated");
  // Gate 3: blocked while frames are missing or pieces are not approved.
  assert.deepEqual(preproductionGateBlockers(s), ["6 test frames are missing", "8 pieces are still in draft"]);
  assert.throws(() => approveStudioGate(s, "preproduction", { by: "producer" }), /6 test frames are missing/);
  // Draw every frame and approve everything: gate 3 clears. A rerun of a scene then makes its frame stale.
  const image = (n: number): StudioAssetRef => ({ id: "img" + n, name: "f.png", mime: "image/png", bytes: 10, storageKey: `studio/w/pp1/img${n}.png`, uploadedAt: "2026-11-20T00:00:00.000Z", uploadedBy: "producer", aiDisclosure: "ai_generated" });
  kinds("test_frame").forEach((f, i) => addPieceVersion(s, f.id, { image: image(i), source: "ai" }, { by: "producer" }));
  for (const x of s.pieces) x.status = "approved";
  assert.deepEqual(preproductionGateBlockers(s), []);
  const scene0 = kinds("scene")[0];
  const frame0 = kinds("test_frame").find((f) => f.dependsOn[0] === scene0.id)!;
  const { stale } = addPieceVersion(s, scene0.id, { text: scene0.versions[0].text + "\nSetting: Garden table", source: "ai" }, { by: "producer" });
  assert.deepEqual(stale, [frame0.id], "a rerun marks only its dependants out of date");
  assert.equal(frame0.status, "stale");
  assert.deepEqual(preproductionGateBlockers(s), ["1 piece is still in draft", "1 piece is out of date"]);

  // ---- Hook pack graph
  const hs = structuredClone(hp.studio!);
  createPreproductionPieces(hs, validateHookPack(hookDraft(), hctx), hctx, { by: "producer", runId: "run-2" });
  const hk = (k: string) => hs.pieces.filter((x) => x.kind === k);
  assert.deepEqual([hk("script").length, hk("narrative").length, hk("hook").length, hk("keyframe").length, hk("shotlist").length, hk("voice_captions").length], [1, 3, 12, 12, 1, 1]);
  assert.ok(hk("hook").every((x) => hk("narrative").some((n) => x.dependsOn[0] === n.id)));
  assert.ok(hk("keyframe").every((x) => hk("hook").some((h) => x.dependsOn[0] === h.id)));
  assert.equal(pieceImpact(hs, hk("script")[0].id).length, 3 + 12 + 12 + 2, "the script affects narratives, hooks, keyframes, shot list and voice notes");
  assert.match(hk("script")[0].versions[0].text!, /0-5s \| Visual: Dough rising \| VO: This loaf took two days\./);
  assert.match(hk("script")[0].versions[0].text!, /Claims:\n- Fermented for 48 hours \(key message 2: Fermented for 48 hours\)/);
  assert.equal(imageSizeFor("keyframe"), "1024x1536");
  assert.equal(imageSizeFor("test_frame"), "1024x1024");

  // ---- Image prompts: built by code from the pieces; region comments in words; the client's raw text is not an instruction.
  const prompt = buildImagePrompt(s, frame0);
  assert.match(prompt, /^Photographic test frame/);
  assert.match(prompt, /Lighting: Soft window key from camera left/);
  assert.match(prompt, /Camera: Full-frame camera, 50mm prime at f\/2\.8/);
  assert.match(prompt, /Palette: #aa3300, #f5f1ea/);
  assert.match(prompt, /Render no text/);
  assert.ok(!prompt.includes("SENTINEL-AVOID"), "brief text is not passed into the image prompt");
  frame0.comments.push({ id: "c1", at: "2026-11-20T00:00:00.000Z", by: "client", text: "lighting too cold", region: { x: 0.02, y: 0.05, w: 0.2, h: 0.2 } });
  frame0.comments.push({ id: "c2", at: "2026-11-20T00:00:00.000Z", by: "client", text: "old note", resolved: true });
  const rerunPrompt = buildImagePrompt(s, frame0, { comments: frame0.comments, instruction: "Warmer" });
  assert.match(rerunPrompt, /Changes requested for this version:\n- top-left area: lighting too cold\n- Warmer/);
  assert.ok(!rerunPrompt.includes("old note"), "resolved comments are not used");
  assert.equal(regionWords({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }), "centre area");
  assert.equal(regionWords({ x: 0.9, y: 0.9, w: 0, h: 0 }), "bottom-right point");
  assert.equal(regionWords({ x: 0.0, y: 0.4, w: 0.1, h: 0.2 }), "left side area");
  assert.match(buildImagePrompt(hs, hk("keyframe")[0]), /Opening shot: Hook visual visual_metaphor[\s\S]*Story angle: Angle 1[\s\S]*vertical portrait/);
  assert.throws(() => buildImagePrompt(hs, hk("hook")[0]), /Only test frames and keyframes/);

  // ---- Image adapter (OpenAI Images) with a stubbed fetch: success, 429 retry, error message, references.
  process.env.PORT67_PROVIDER_RETRY_MS = "0,0";
  const calls: { url: string; body: unknown }[] = [];
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-request-id": "req_1" } });
  const okBody = { created: 1, data: [{ b64_json: PNG.toString("base64") }], usage: { input_tokens: 40, output_tokens: 4160, total_tokens: 4200 } };
  let queue: Response[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => { calls.push({ url, body: init?.body }); return queue.shift() || reply(500, { error: { message: "no stub" } }); }) as unknown as typeof fetch;
  const provider = openAiImageProvider({ model: "gpt-image-1", key: "sk-test-key-123456789" }, fetcher);
  queue = [reply(200, okBody)];
  const first = await provider.generateImage({ prompt: "A loaf", size: "1024x1024" });
  assert.equal(first.mime, "image/png");
  assert.equal(first.bytes.length, PNG.length);
  assert.deepEqual(first.usage, { input_tokens: 40, output_tokens: 4160, total_tokens: 4200 });
  assert.equal(calls[0].url, "https://api.openai.com/v1/images/generations");
  assert.deepEqual(JSON.parse(String(calls[0].body)), { model: "gpt-image-1", prompt: "A loaf", size: "1024x1024", n: 1 });
  calls.length = 0;
  queue = [reply(429, { error: { message: "Rate limit reached" } }), reply(200, okBody)];
  assert.equal((await provider.generateImage({ prompt: "A loaf", size: "1024x1536" })).mime, "image/png");
  assert.equal(calls.length, 2, "a 429 is retried");
  calls.length = 0;
  queue = [reply(400, { error: { message: "Your request was rejected by the safety system. Key sk-abcdefghijk1234" } })];
  await assert.rejects(provider.generateImage({ prompt: "A loaf", size: "1024x1024" }), (e: unknown) => e instanceof ImageProviderError && e.outcome === "failed" && /^Image provider returned 400: Your request was rejected by the safety system\. Key \[redacted\]; no image accepted$/.test(e.message));
  assert.equal(calls.length, 1, "a 400 is not retried");
  calls.length = 0;
  queue = [reply(503, { error: { message: "Overloaded" } }), reply(503, { error: { message: "Overloaded" } }), reply(503, { error: { message: "Still overloaded" } })];
  await assert.rejects(provider.generateImage({ prompt: "A loaf", size: "1024x1024" }), /returned 503: Still overloaded/);
  assert.equal(calls.length, 3, "two retries, then the provider's message");
  queue = [reply(200, { data: [{ b64_json: Buffer.from("<svg/>").toString("base64") }] })];
  await assert.rejects(provider.generateImage({ prompt: "A loaf", size: "1024x1024" }), /not a PNG, JPEG or WebP/);
  calls.length = 0;
  queue = [reply(200, okBody)];
  await provider.generateImage({ prompt: "A loaf", size: "1024x1024", references: [{ bytes: PNG, mime: "image/png", name: "pack.png" }] });
  assert.equal(calls[0].url, "https://api.openai.com/v1/images/edits", "reference images use the edits endpoint");
  assert.ok(calls[0].body instanceof FormData && (calls[0].body as FormData).getAll("image[]").length === 1);

  // ---- Metering: every image call is a ledger row under studio:image, with usage; a failure closes its row as failed.
  const dir = await mkdtemp(join(tmpdir(), "port67-image-"));
  try {
    const repo = new LocalRepository(dir);
    queue = [reply(200, okBody)];
    await meteredImage(repo, op, p, "run-img-1", provider, { prompt: "A loaf", size: "1024x1024" });
    queue = [reply(400, { error: { message: "Bad size" } })];
    await assert.rejects(meteredImage(repo, op, p, "run-img-2", provider, { prompt: "A loaf", size: "1024x1024" }), /Bad size/);
    const rows = (await exportApiCalls(repo)).filter((r) => r.agent === "studio:image");
    assert.deepEqual(rows.map((r) => [r.runId, r.status, r.stage, r.provider, r.model]), [["run-img-1", "completed", "studio", "openai", "gpt-image-1"], ["run-img-2", "failed", "studio", "openai", "gpt-image-1"]]);
    assert.equal(rows[0].usage?.outputTokens, 4160);
    await assert.rejects(meteredImage(repo, { ...op, demo: true }, p, "run-img-3", provider, { prompt: "A loaf", size: "1024x1024" }), /disabled in the synthetic demo/);
    // The image slot: OpenAI only, PORT67_IMAGE_MODEL or gpt-image-1, never the drafting default; it does not make drafting look ready.
    const env = { PORT67_OPENAI_API_KEY: "sk-test-1", PORT67_ANTHROPIC_API_KEY: "ak-test-1", PORT67_SYNTHESIS_ENABLED: "true" };
    assert.deepEqual(await resolveSelection(repo, "studio:image", env), { provider: "openai", model: "gpt-image-1", key: "sk-test-1", source: "env" });
    assert.equal((await resolveSelection(repo, "studio:image", { ...env, PORT67_IMAGE_MODEL: "gpt-image-1.5" })).model, "gpt-image-1.5");
    await assert.rejects(resolveSelection(repo, "studio:image", {}), /PORT67_OPENAI_API_KEY is not set/);
    assert.equal(await stageReady(repo, "synthesis", env), false, "a key alone (image default) does not make AI drafting ready");
    await saveRouting(repo, { defaults: { synthesis: { provider: "anthropic", model: "claude-test" } }, slots: { "studio:preproduction": { provider: "openai", model: "gpt-test-mini" } } }, "admin", env);
    assert.equal((await resolveSelection(repo, "studio:image", env)).provider, "openai", "the drafting default is not inherited by the image job");
    assert.deepEqual(await resolveSelection(repo, "studio:preproduction", env), { provider: "openai", model: "gpt-test-mini", key: "sk-test-1", source: "slot" });
    assert.throws(() => validateRoutingInput({ slots: { "studio:image": { provider: "anthropic", model: "claude-test" } } }, env), /only OpenAI image models/);
    assert.equal(validateRoutingInput({ slots: { "studio:image": { provider: "openai", model: "gpt-image-1" } } }, env).slots["studio:image"].model, "gpt-image-1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  console.log("Studio pre-production: validation, dependsOn graph, stale marking, gate 3, image prompts and image adapter passed");
}
void main().catch((error) => { console.error(error); process.exit(1); });
