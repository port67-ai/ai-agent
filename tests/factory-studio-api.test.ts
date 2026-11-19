import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Studio API: project creation, role checks, uploads kept out of the project document, authorised file serving, reruns.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-studio-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  const { registerStudioRerun, clearStudioRerunHandlers } = await import("../src/lib/factory/studio-rerun");
  let cookie = "";
  async function call(path: string[], init: { body?: BodyInit; type?: string; query?: string; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie, ...(init.headers || {}) };
    if (init.body !== undefined) headers["content-type"] = init.type || "application/json";
    const response = await handleFactory(new Request("http://localhost:3000/api/factory/" + path.join("/") + (init.query ? "?" + init.query : ""), { method: init.body !== undefined ? "POST" : "GET", headers, body: init.body }), path);
    const set = response.headers.get("set-cookie");
    if (set) {
      const pair = set.split(";")[0];
      const name = pair.split("=")[0];
      cookie = [...cookie.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith(name + "=")), pair].join("; ");
    }
    return response;
  }
  const post = (path: string, body: unknown) => call(path.split("/"), { body: JSON.stringify(body) });
  const get = (path: string) => call(path.split("/"));
  const upload = (projectId: string, query: string, bytes: Uint8Array) => call(["projects", projectId, "studio", "upload"], { body: new Uint8Array(bytes), type: "application/octet-stream", query });
  const png = (size: number) => { const b = Buffer.alloc(size, 7); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); return b; };
  const mp4 = (size: number) => { const b = Buffer.alloc(size, 1); Buffer.from("0000ftypisom").copy(b); return b; };

  await get("session");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const operatorCookie = cookie;
  // Parked offers cannot be chosen; a live offer creates a studio project with the intake active.
  assert.equal((await post("projects", { studio: { offer: "hero_spot", brief: { client: { businessName: "X" } } } })).status, 400);
  const created = await post("projects", { studio: { offer: "scene_pack", brief: { client: { businessName: "Nash's Bakery", website: "https://nashs.example.com", approverName: "Ann", approverEmail: "ann@example.com" }, project: { name: "Spring" }, product: { names: "Sourdough" }, brandKit: { colours: ["#aa3300"] } } } });
  assert.equal(created.status, 201);
  const project = (await created.json()).project;
  assert.equal(project.studio.stage, "intake");
  assert.equal(project.studio.gates.intake.status, "active");
  const id = project.id;
  const before = Buffer.byteLength(JSON.stringify(project));

  // Paid work is refused before gate 1.
  const research = await post(`projects/${id}/research`, { segment: "brand" });
  assert.equal(research.status, 400);
  assert.match((await research.json()).error, /Approve the studio intake/);
  assert.equal((await post(`projects/${id}/producer-agent`, {})).status, 400);

  // Uploads: rights must be confirmed, the real type is checked, limits are enforced, bytes stay out of the project document.
  assert.equal((await upload(id, "slot=logo&name=logo.png", png(2000))).status, 400, "rights confirmation required");
  const fake = await upload(id, "slot=logo&rights=confirmed&name=logo.png", Buffer.from("<svg onload=alert(1)></svg>"));
  assert.equal(fake.status, 400);
  assert.match((await fake.json()).error, /not accepted/);
  const tooBig = await upload(id, "slot=logo&rights=confirmed&name=big.png", png(2 * 1024 * 1024 + 1));
  assert.equal(tooBig.status, 400);
  assert.match((await tooBig.json()).error, /too large/);
  assert.equal((await upload(id, "slot=clips&rights=confirmed&name=x.png", png(500))).status, 400, "an image is not a clip");
  assert.equal((await upload(id, "slot=nonsense&rights=confirmed", png(500))).status, 400);
  const logo = await upload(id, "slot=logo&rights=confirmed&name=logo%3Cx%3E.png", png(5000));
  assert.equal(logo.status, 201);
  const logoBody = await logo.json();
  assert.equal(logoBody.asset.mime, "image/png");
  assert.equal(logoBody.asset.name, "logo_x_.png");
  assert.equal(logoBody.asset.rights.confirmedBy.length > 0, true);
  const big = await upload(id, "slot=packshots&rights=confirmed&name=pack.png", png(1_500_000));
  assert.equal(big.status, 201);
  const packshotId = (await big.json()).asset.id;
  assert.equal((await upload(id, "slot=mood&rights=confirmed&name=mood.png", png(3000))).status, 201);
  assert.equal((await upload(id, "slot=clips&rights=confirmed&name=clip.mp4", mp4(4000))).status, 201);
  const stored = (await (await get(`projects/${id}`)).json()).project;
  assert.equal(stored.studio.brief.assets.packshots.length, 1);
  const after = Buffer.byteLength(JSON.stringify(stored));
  assert.ok(after - before < 10_000, `the project document grew by ${after - before} bytes for 1.5 MB of uploads`);
  const raw = await readFile(join(directory, "live", "port67.json"), "utf8");
  assert.ok(raw.length < 60_000, "the stored workspace holds references, not file bytes");
  assert.ok(!raw.includes(png(1_500_000).subarray(0, 64).toString("base64")), "no base64 file bytes in the document");

  // Serving: producers read files back through the authorised route, with byte ranges for video previews.
  const file = await get(`projects/${id}/studio/asset/${packshotId}`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "image/png");
  assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  assert.match(file.headers.get("content-security-policy") || "", /sandbox/);
  assert.equal(Buffer.from(await file.arrayBuffer()).length, 1_500_000);
  const ranged = await call(["projects", id, "studio", "asset", packshotId], { headers: { range: "bytes=0-9" } });
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get("content-range"), "bytes 0-9/1500000");
  assert.equal(Buffer.from(await ranged.arrayBuffer()).length, 10);
  assert.equal((await get(`projects/${id}/studio/asset/00000000-0000-0000-0000-000000000000`)).status, 403);

  // A second project and its file, to check customers stay inside their own project.
  const other = (await (await post("projects", { studio: { offer: "hook_pack", brief: { client: { businessName: "Other" } } } })).json()).project;
  const otherFile = (await (await upload(other.id, "slot=mood&rights=confirmed&name=o.png", png(800))).json()).asset.id;
  assert.equal((await get(`projects/${other.id}/studio/asset/${otherFile}`)).status, 200);

  // Customer (invited to the first project): can read own files, edit the intake and comment; cannot approve producer gates.
  const invitation = await (await post(`projects/${id}/invite`, {})).json();
  const token = new URLSearchParams(new URL(invitation.invitation).hash.slice(1)).get("invite");
  await post("logout", {});
  assert.equal((await post("client-login", { token })).status, 200);
  const clientCookie = cookie;
  assert.equal((await get(`projects/${id}/studio/asset/${packshotId}`)).status, 200, "customers read their own project's files");
  assert.equal((await get(`projects/${other.id}/studio/asset/${otherFile}`)).status, 403, "customers cannot read another project's files");
  const clientView = (await (await get(`projects/${id}`)).json()).project;
  assert.equal(clientView.studio.rerunRequests, undefined);
  const edit = await post(`projects/${id}`, { type: "updateStudioBrief", brief: { references: { liked: ["Morning light"] } }, requestId: "c1" });
  assert.equal(edit.status, 200);
  const approve = await post(`projects/${id}`, { type: "approveStudioGateWithNote", stage: "intake", note: "ok" });
  assert.equal(approve.status, 403, "only producers approve gate 1");
  assert.equal((await post(`projects/${id}`, { type: "reopenStudioGate", stage: "intake" })).status, 403);

  // Producer approves gate 1 (complete intake): bridge, channels, formats and the five-role task plan.
  cookie = operatorCookie;
  const gate = await post(`projects/${id}`, { type: "approveStudioGate", stage: "intake" });
  assert.equal(gate.status, 200, await gate.clone().text());
  const bridged = (await gate.json()).project;
  assert.equal(bridged.studio.stage, "strategy");
  assert.deepEqual(bridged.channels, ["instagram", "pinterest", "facebook"]);
  assert.deepEqual(bridged.brief.requestedFormats, ["static"]);
  assert.deepEqual(bridged.taskPlan.research, ["brand", "customer", "competitor", "creative", "channel"]);
  assert.equal(bridged.aiAuthorised, false);
  assert.ok(bridged.audit.some((x: { action: string }) => x.action === "studio_gate_approved"));
  // Intake files are locked once gate 1 is approved.
  assert.equal((await upload(id, "slot=mood&rights=confirmed&name=late.png", png(500))).status, 400);
  // The account Brand Kit is saved at gate 1 and copied into the next studio project of the account.
  const next = (await (await post("projects", { studio: { offer: "hook_pack", brief: { client: { businessName: "Nash's Bakery" } } } })).json()).project;
  assert.equal(next.studio.brief.brandKit.logo.id, logoBody.asset.id);
  assert.deepEqual(next.studio.brief.brandKit.colours, ["#aa3300"]);
  assert.equal((await get(`projects/${next.id}/studio/asset/${logoBody.asset.id}`)).status, 200, "the shared logo is served in the account's other projects");

  // Pieces: producer adds and uploads; the customer cannot upload piece files.
  let view = (await (await post(`projects/${id}`, { type: "addStudioPiece", stage: "strategy", kind: "mood_board", title: "Mood board" })).json()).project;
  const pieceId = view.studio.pieces[0].id;
  view = (await (await post(`projects/${id}`, { type: "addStudioPiece", stage: "strategy", kind: "scene", title: "Scene 1", dependsOn: [pieceId], text: "Kitchen table" })).json()).project;
  const sceneId = view.studio.pieces[1].id;
  assert.equal((await upload(id, `slot=piece&pieceId=${pieceId}&name=board.png&aiDisclosure=maybe`, png(2000))).status, 400);
  const pieceUpload = await upload(id, `slot=piece&pieceId=${pieceId}&name=board.png&aiDisclosure=ai_generated`, png(2000));
  assert.equal(pieceUpload.status, 201);
  view = (await pieceUpload.json()).project;
  assert.equal(view.studio.pieces[0].versions[0].source, "upload");
  assert.equal(view.studio.pieces[0].aiDisclosure, "ai_generated", "an upload carries the declared AI disclosure");
  const boxed = await post(`projects/${id}`, { type: "commentStudioPiece", pieceId, text: "Warmer here", region: { x: 0.1, y: 0.1, w: 0.3, h: 0.2 } });
  assert.equal(boxed.status, 200);
  assert.equal((await post(`projects/${id}`, { type: "commentStudioPiece", pieceId, text: "Bad", region: { x: 0.9, y: 0.1, w: 0.3, h: 0.2 } })).status, 400);

  // Rerun without a generator: the request is recorded and waits for piece B.
  view = (await (await post(`projects/${id}`, { type: "requestStudioRerun", pieceId, confirm: true, instruction: "More steam" })).json()).project;
  assert.equal(view.studio.rerunRequests.at(-1).status, "pending");
  assert.deepEqual(view.studio.rerunRequests.at(-1).impact, [sceneId]);
  // With a generator registered and the brief authorised, the rerun adds an AI version and marks dependants stale.
  registerStudioRerun("mood_board", async ({ request }) => ({ text: "Redrawn from: " + request.brief.split("\n")[0], runId: "run-test" }));
  assert.equal((await post(`projects/${id}`, { type: "authoriseAI", confirm: true })).status, 200);
  view = (await (await post(`projects/${id}`, { type: "requestStudioRerun", pieceId, confirm: true, replace: true })).json()).project;
  const done = view.studio.rerunRequests.at(-1);
  assert.equal(done.status, "done", JSON.stringify(done));
  assert.equal(view.studio.pieces[0].versions.length, 2);
  assert.equal(view.studio.pieces[0].versions[1].source, "ai");
  assert.equal(view.studio.pieces[0].versions[1].runId, "run-test");
  assert.match(view.studio.pieces[0].versions[1].brief, /Warmer here/);
  assert.equal(view.studio.pieces[0].aiDisclosure, "ai_generated");
  assert.equal(view.studio.pieces[1].status, "stale");
  assert.ok(view.audit.some((x: { action: string }) => x.action === "studio_rerun_done"));
  registerStudioRerun("mood_board", async () => { throw new Error("provider down"); });
  view = (await (await post(`projects/${id}`, { type: "requestStudioRerun", pieceId, confirm: true })).json()).project;
  assert.equal(view.studio.rerunRequests.at(-1).status, "failed");
  assert.equal(view.studio.rerunRequests.at(-1).error, "provider down");
  clearStudioRerunHandlers();

  // Customer: client gates only for client stages; piece upload refused.
  cookie = clientCookie;
  assert.equal((await upload(id, `slot=piece&pieceId=${pieceId}&name=b.png`, png(500))).status, 403);
  assert.equal((await post(`projects/${id}`, { type: "setStudioPieceStatus", pieceId, status: "approved" })).status, 403, "strategy pieces are a producer decision");

  // Legacy projects keep working through the same API.
  cookie = operatorCookie;
  const legacy = await post("projects", { business: "Legacy", objective: "Sell more", contact: "owner@example.com" });
  assert.equal(legacy.status, 201);
  assert.equal((await legacy.json()).project.studio, undefined);

  await rm(directory, { recursive: true, force: true });
  console.log("Studio API: creation, roles, uploads outside the document, authorised serving, Brand Kit and reruns passed");
}
void main().catch((error) => { console.error(error); process.exit(1); });
