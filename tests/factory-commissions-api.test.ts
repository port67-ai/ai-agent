import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Commission API (CHG-0107, FAC-VWS-011 to 014): producer and admin only, per-account storage, validation, evidence, audit.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-commissions-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  let cookie = "";
  async function call(path: string[], body?: unknown) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie };
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await handleFactory(new Request("http://localhost:3000/api/factory/" + path.join("/"), { method: body !== undefined ? "POST" : "GET", headers, body: body === undefined ? undefined : JSON.stringify(body) }), path);
    const set = response.headers.get("set-cookie");
    if (set) { const pair = set.split(";")[0]; const name = pair.split("=")[0]; cookie = [...cookie.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith(name + "=")), pair].join("; "); }
    return response;
  }
  const post = (path: string, body: unknown) => call(path.split("/"), body);
  const get = (path: string) => call(path.split("/"));
  const commissionOf = async (res: Response) => (await res.json()).commission;
  const ev = { source: "https://example.com/about", where: "product_page", note: "Waxed cotton", basis: "announced" };

  await get("session");
  assert.equal((await get("commissions/cust_" + "a".repeat(32))).status, 401, "signed out");
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);

  // Two customer accounts; one has a red line that the commission shows for reference.
  const customer = (await (await post("customers", { name: "Barbour Test Co" })).json()).customer;
  const other = (await (await post("customers", { name: "Other Co" })).json()).customer;
  await post(`customers/${customer.id}`, { action: "red-line-add", category: "competitor", text: "Greggs" });
  const cid: string = customer.id;

  // Create: a name is enough; the account must exist; names are unique within the account.
  assert.equal((await post(`commissions/cust_${"0".repeat(32)}`, { name: "X" })).status, 400, "unknown account");
  assert.equal((await get("commissions/not-an-id")).status, 404);
  assert.equal((await post(`commissions/${cid}`, {})).status, 400, "name required");
  const created = await post(`commissions/${cid}`, { name: "Autumn London" });
  assert.equal(created.status, 201);
  const commission = (await created.json()).commission;
  const id: string = commission.id;
  assert.match(id, /^comm_[a-f0-9]{32}$/);
  assert.equal(commission.customerId, cid);
  assert.equal(commission.audit[0].actor, "port67-producer");
  assert.equal((await post(`commissions/${cid}`, { name: "autumn london" })).status, 400, "duplicate name");
  const listed = await (await get(`commissions/${cid}`)).json();
  assert.deepEqual([listed.customer.name, listed.commissions.length], ["Barbour Test Co", 1]);
  // Commissions belong to their own account: the other account has none and cannot reach this one.
  assert.deepEqual((await (await get(`commissions/${other.id}`)).json()).commissions, []);
  assert.equal((await get(`commissions/${other.id}/${id}`)).status, 400, "another account cannot open it");
  assert.equal((await post(`commissions/${other.id}/${id}`, { action: "rename", name: "Hijack" })).status, 400);
  const files = await readdir(join(directory, "live"));
  assert.ok(files.includes(`factory-commissions-${cid}.json`), "stored per account");

  // Reading one shows the account's red lines for reference.
  const one = await (await get(`commissions/${cid}/${id}`)).json();
  assert.deepEqual(one.customer.redLines.map((l: { text: string }) => l.text), ["Greggs"]);
  assert.equal(one.commission.redLines, undefined, "red lines are not copied into the commission");

  // Rename, answers, validation.
  assert.equal((await commissionOf(await post(`commissions/${cid}/${id}`, { action: "rename", name: "Autumn London 2026" }))).name, "Autumn London 2026");
  let c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "answers", input: "objective", answers: { why: "Reframe as a rainy-day staple", success: "Sell-through" } }));
  assert.deepEqual(c.answers.objective, { why: "Reframe as a rainy-day staple", success: "Sell-through" });
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "answers", input: "company", answers: {} })).status, 400, "no secondary input");
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "answers", input: "objective", answers: { nope: "x" } })).status, 400);
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "answers", input: "objective", answers: { why: "x".repeat(2001) } })).status, 400);
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "frobnicate" })).status, 400, "unknown action");

  // Brand lists and the example that went too far.
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "list-add", list: "preserve", text: "Waxed cotton" })).status, 400, "scope required");
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "list-add", list: "preserve", text: "Waxed cotton", scope: "recurring" }));
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "list-add", list: "change", text: "Rural settings", scope: "single_campaign", kind: "can_change" }));
  assert.deepEqual([c.preserve.length, c.change.length], [1, 1]);
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "list-update", list: "preserve", entryId: c.preserve[0].id, text: "Oiled waxed cotton" }));
  assert.equal(c.preserve[0].text, "Oiled waxed cotton");
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "went-too-far", text: "The neon collaboration" }));
  assert.equal(c.wentTooFar, "The neon collaboration");
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "list-remove", list: "change", entryId: c.change[0].id }));
  assert.equal(c.change.length, 0);

  // Evidence: basis and where are required; a link must be public https; a note is fine.
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "evidence-add", input: "brand", ...ev, basis: undefined })).status, 400, "basis required");
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "evidence-add", input: "brand", ...ev, source: "http://example.com" })).status, 400, "http refused");
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "evidence-add", input: "brand", ...ev }));
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "evidence-add", input: "audience", source: "Client call, 12 November", where: "conversation", note: "Confirmed 20s London", basis: "client_confirmed" }));
  assert.deepEqual(c.evidence.map((e: { input: string; basis: string }) => [e.input, e.basis]), [["brand", "announced"], ["audience", "client_confirmed"]]);
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "evidence-update", evidenceId: c.evidence[0].id, basis: "inference" }));
  assert.equal(c.evidence[0].basis, "inference");
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "evidence-remove", evidenceId: c.evidence[1].id }));
  assert.equal(c.evidence.length, 1);

  // Confirmed with the client: objective and audience only.
  c = await commissionOf(await post(`commissions/${cid}/${id}`, { action: "confirm", input: "objective", confirmed: true }));
  assert.equal(c.confirmed.objective.by, "port67-producer");
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "confirm", input: "brand", confirmed: true })).status, 400);
  assert.ok(c.audit.length > 8 && c.audit.every((a: { actor: string }) => a.actor === "port67-producer"), "every change is audited");

  // Customers and the demo are refused.
  const project = await (await post("projects", { studio: { offer: "scene_pack", brief: { client: { businessName: "Invited Co" } } } })).json();
  const invitation = await (await post(`projects/${project.project.id}/invite`, {})).json();
  const token = new URLSearchParams(new URL(invitation.invitation).hash.slice(1)).get("invite");
  const producerCookie = cookie;
  await post("logout", {});
  assert.equal((await post("client-login", { token })).status, 200);
  assert.equal((await get(`commissions/${cid}`)).status, 403, "customer cannot list");
  assert.equal((await get(`commissions/${cid}/${id}`)).status, 403, "customer cannot read");
  assert.equal((await post(`commissions/${cid}`, { name: "Sneaky" })).status, 403, "customer cannot create");
  assert.equal((await post(`commissions/${cid}/${id}`, { action: "rename", name: "Hacked" })).status, 403, "customer cannot edit");
  await post("logout", {});
  assert.equal((await post("demo", {})).status, 200);
  const demo = await get(`commissions/${cid}`);
  assert.equal(demo.status, 403);
  assert.match((await demo.json()).error, /demo/);

  cookie = producerCookie;
  const final = (await (await get(`commissions/${cid}/${id}`)).json()).commission;
  assert.equal(final.name, "Autumn London 2026", "refused requests changed nothing");
  console.log("commissions-api: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
