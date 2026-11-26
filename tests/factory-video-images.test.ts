import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Project image library (CHG-0116): upload, @names, rename, delete, privacy, project scoping and prompt use.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-vimg-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  const vi = await import("../src/lib/factory/video-images");
  const vs = await import("../src/lib/factory/video-steps");

  // ---- Pure rules
  assert.equal(vi.slugName("My Baker (final).PNG"), "My-Baker-final");
  assert.equal(vi.slugName("   "), "");
  assert.equal(vi.slugName("x".repeat(80)).length, 40);
  assert.deepEqual(vi.mentions("Close on @baker, then (@loaf-1) and mail a@b.com"), ["baker", "loaf-1"]);
  assert.equal(vi.dropUnknownMentions("Show @baker and @ghost", ["Baker"]), "Show @baker and ghost");
  assert.equal(vi.sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
  assert.equal(vi.sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(vi.sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(vi.sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")), undefined, "SVG is refused");
  assert.equal(vi.sniffImage(Buffer.from("%PDF-1.7")), undefined);
  const ctx = (images?: { name: string; description: string }[]) => ({ customer: { name: "N", redLines: [] } as never, commission: { name: "P", answers: {}, preserve: [], wentTooFar: "" } as never, generation: "gen_y" as const, images });
  assert.match(vs.videoContext("prompts", ctx([{ name: "baker", description: "Maya, 30s" }, { name: "loaf", description: "" }])), /<images>\n- @baker: Maya, 30s\n- @loaf\n<\/images>/);
  assert.match(vs.videoContext("prompts", ctx()), /\(none uploaded\)/);
  assert.ok(!vs.videoContext("script", ctx([{ name: "baker", description: "" }])).includes("<images>"));
  const parsed = vs.parseVideo("prompts", { overall: "Look of @baker and @ghost", shots: [{ prompt: "@baker kneads; @ghost watches", negative: "" }] }, 1, ["baker"]);
  assert.ok(parsed.step === "prompts" && parsed.overall === "Look of @baker and ghost" && parsed.shots[0].prompt === "@baker kneads; ghost watches");

  // ---- API
  let cookie = "";
  async function call(path: string[], init: { body?: BodyInit; type?: string; query?: string } = {}) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie };
    if (init.body !== undefined) headers["content-type"] = init.type || "application/json";
    const response = await handleFactory(new Request("http://localhost:3000/api/factory/" + path.join("/") + (init.query ? "?" + init.query : ""), { method: init.body !== undefined ? "POST" : "GET", headers, body: init.body }), path);
    const set = response.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0]; const name = pair.split("=")[0]; cookie = [...cookie.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith(name + "=")), pair].join("; "); }
    return response;
  }
  const post = (p: string, b: unknown) => call(p.split("/"), { body: JSON.stringify(b) });
  const get = (p: string) => call(p.split("/"));
  const png = (size: number, fill = 7) => { const b = Buffer.alloc(size, fill); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); return b; };
  const up = (base: string, query: string, bytes: Uint8Array) => call([...base.split("/"), "upload"], { body: new Uint8Array(bytes), type: "application/octet-stream", query });

  await get("session");
  const none = "video-images/cust_" + "a".repeat(32) + "/comm_" + "b".repeat(32);
  assert.equal((await get(none)).status, 401, "signed out");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const cid: string = (await (await post("customers", { name: "Nash's Bakery", website: "https://nashs.example.com" })).json()).customer.id;
  const p1: string = (await (await post(`commissions/${cid}`, { name: "Autumn" })).json()).commission.id;
  const p2: string = (await (await post(`commissions/${cid}`, { name: "Spring" })).json()).commission.id;
  const b1 = `video-images/${cid}/${p1}`, b2 = `video-images/${cid}/${p2}`;
  assert.deepEqual((await (await get(b1)).json()).images, []);
  assert.equal((await get(`video-images/not-an-id/${p1}`)).status, 404);
  assert.equal((await get(`video-images/${cid}/comm_${"c".repeat(32)}`)).status, 400, "unknown project");

  // Upload: name comes from the file name, description is optional, bytes stay out of the record.
  const a = await up(b1, "name=Maya the Baker.png&description=" + encodeURIComponent("Maya, 30s, flour on apron"), png(2000));
  assert.equal(a.status, 201);
  const maya = (await a.json()).image;
  assert.deepEqual([maya.name, maya.description, maya.mime, maya.bytes, maya.commissionId], ["Maya-the-Baker", "Maya, 30s, flour on apron", "image/png", 2000, p1]);
  assert.equal(maya.storageKey, undefined, "storage key is never sent to the browser");
  const second = (await (await up(b1, "name=Maya-the-Baker.png", png(500, 9))).json()).image;
  assert.equal(second.name, "Maya-the-Baker-2", "a clashing name gets a number");
  assert.equal(second.description, "", "description is optional");
  const listed = (await (await get(b1)).json()).images;
  assert.equal(listed.length, 2);
  assert.ok(listed.every((i: Record<string, unknown>) => !("storageKey" in i)));

  const tagged = await up(b2, "title=Hero%20Product&category=Product", png(100));
  assert.equal(tagged.status, 201);
  const taggedImage = (await tagged.json()).image;
  assert.deepEqual([taggedImage.title, taggedImage.name, taggedImage.category], ["Hero Product", "Hero-Product", "Product"]);
  assert.equal((await up(b2, "title=Invalid&category=Wrong", png(100))).status, 400);
  assert.equal((await up(b2, "title=Missing", png(100))).status, 400);
  assert.equal((await post(b2, { action: "remove", id: taggedImage.id })).status, 200);
  // Checks: real type, size, empty.
  assert.equal((await up(b1, "name=x.png", Buffer.from("<svg><script>alert(1)</script></svg>"))).status, 400, "SVG refused");
  assert.equal((await up(b1, "name=x.png", Buffer.from("%PDF-1.7 not an image"))).status, 400);
  assert.equal((await up(b1, "name=x.png", Buffer.alloc(0))).status, 400, "empty");
  assert.equal((await up(b1, "name=x.png", Buffer.from("MZ\x90\x00 exe"))).status, 400, "an executable renamed .png");
  const big = await up(b1, "name=big.png", png(8 * 1024 * 1024 + 1));
  assert.equal(big.status, 400);
  assert.match((await big.json()).error, /too large/i);
  assert.equal((await (await get(b1)).json()).images.length, 2, "refused uploads leave nothing behind");

  // Served only through the authorised route, inline, private.
  const file = await get(`${b1}/file/${maya.id}`);
  assert.equal(file.status, 200);
  assert.deepEqual([file.headers.get("content-type"), file.headers.get("cache-control"), file.headers.get("x-content-type-options")], ["image/png", "private, no-store", "nosniff"]);
  assert.match(file.headers.get("content-disposition") || "", /^inline; filename="Maya-the-Baker\.png"$/);
  assert.equal((await file.arrayBuffer()).byteLength, 2000);
  assert.equal((await get(`${b2}/file/${maya.id}`)).status, 400, "an image is not readable through another project");

  // Scoped to the project.
  assert.deepEqual((await (await get(b2)).json()).images, []);
  const other = (await (await up(b2, "name=Maya-the-Baker.png", png(300, 5))).json()).image;
  assert.equal(other.name, "Maya-the-Baker", "the same name is fine in a different project");

  // Rename and describe.
  let r = await post(b1, { action: "update", id: second.id, name: "@loaf", description: "The sourdough loaf" });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).images.map((i: { name: string; description: string }) => [i.name, i.description]), [["Maya-the-Baker", "Maya, 30s, flour on apron"], ["loaf", "The sourdough loaf"]]);
  assert.equal((await post(b1, { action: "update", id: second.id, name: "Maya-the-baker" })).status, 400, "names clash case-insensitively");
  assert.equal((await post(b1, { action: "update", id: second.id, name: "bad name!" })).status, 400);
  assert.equal((await post(b1, { action: "update", id: second.id, description: "x".repeat(501) })).status, 400);
  assert.equal((await post(b1, { action: "update", id: "nope", name: "z" })).status, 400);
  assert.equal((await post(b1, { action: "wipe" })).status, 400);
  r = await post(b1, { action: "update", id: second.id, description: "" });
  assert.equal((await r.json()).images[1].description, "", "a description can be cleared");

  // Delete removes the record and the stored bytes.
  const stored = async () => (await readdir(join(process.env.PORT67_DATA_DIR!, "video-images", cid, p1)).catch(() => [])).length;
  assert.equal(await stored(), 2);
  r = await post(b1, { action: "remove", id: second.id });
  assert.deepEqual((await r.json()).images.map((i: { name: string }) => i.name), ["Maya-the-Baker"]);
  assert.equal(await stored(), 1);
  assert.equal((await get(`${b1}/file/${second.id}`)).status, 400, "deleted image is gone");
  assert.equal((await post(b1, { action: "remove", id: second.id })).status, 400, "already deleted");
  assert.equal((await (await get(b2)).json()).images.length, 1, "the other project is untouched");

  // Limit: 60 per project.
  for (let n = 0; n < 59; n++) assert.equal((await up(b1, `name=i${n}.png`, png(100, n + 10))).status, 201);
  const full = await up(b1, "name=one-too-many.png", png(100));
  assert.equal(full.status, 400);
  assert.match((await full.json()).error, /At most 60 images/);
  assert.equal(await stored(), 60, "nothing stored for the refused upload");

  // Producers only.
  cookie = "";
  await get("session");
  assert.equal((await get(b1)).status, 401);
  console.log("video-images: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
