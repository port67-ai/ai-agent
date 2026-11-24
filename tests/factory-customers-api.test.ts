import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Customer account API (CHG-0103, FAC-VWS-001, 004 to 007): producer and admin only, validation, private files, authorisation, audit.
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-customers-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  const { handleFactory } = await import("../src/lib/factory/service");
  const { testHooks } = await import("../src/lib/factory/customers-api");
  let cookie = "";
  async function call(path: string[], init: { body?: BodyInit; type?: string; query?: string } = {}) {
    const headers: Record<string, string> = { origin: "http://localhost:3000", cookie };
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
  const upload = (id: string, query: string, bytes: Uint8Array) => call(["customers", id, "purpose"], { body: new Uint8Array(bytes), type: "application/octet-stream", query });
  const pdf = (size: number) => { const b = Buffer.alloc(size, 0x20); Buffer.from("%PDF-1.7\n").copy(b); return b; };
  const png = (size: number) => { const b = Buffer.alloc(size, 7); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); return b; };
  const record = async (res: Response) => (await res.json()).customer;

  // Signed out: nothing is readable.
  await get("session");
  assert.equal((await get("customers")).status, 401);
  assert.equal((await post("customers", { name: "X" })).status, 401);

  // Producer signs in with the producer password.
  assert.equal((await post("login", { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const producerCookie = cookie;
  assert.deepEqual((await (await get("customers")).json()).customers, []);

  // Create: name required, website validated, duplicate names refused.
  assert.equal((await post("customers", { website: "example.com" })).status, 400);
  const badSite = await post("customers", { name: "Nash's Bakery", website: "http://nashs.example.com" });
  assert.equal(badSite.status, 400);
  assert.match((await badSite.json()).error, /Website/);
  const created = await post("customers", { name: "Nash's Bakery", website: "nashs.example.com" });
  assert.equal(created.status, 201);
  const customer = (await created.json()).customer;
  const id: string = customer.id;
  assert.match(id, /^cust_[a-f0-9]{32}$/);
  assert.equal(customer.website, "https://nashs.example.com/");
  assert.equal(customer.audit[0].action, "customer_created");
  assert.equal(customer.audit[0].actor, "port67-producer");
  assert.equal((await post("customers", { name: "NASH'S bakery" })).status, 400, "duplicate name");
  assert.equal((await get("customers/cust_" + "1".repeat(32))).status, 400, "unknown id is refused");
  assert.equal((await get("customers/not-an-id")).status, 404);
  assert.equal((await (await get("customers")).json()).customers.length, 1);
  assert.equal((await record(await get(`customers/${id}`))).name, "Nash's Bakery");

  // Update details.
  assert.equal((await record(await post(`customers/${id}`, { action: "update", name: "Nash's Bakery Ltd" }))).name, "Nash's Bakery Ltd");
  assert.equal((await post(`customers/${id}`, { action: "update", website: "ftp://x.com" })).status, 400);
  assert.equal((await post(`customers/${id}`, { action: "frobnicate" })).status, 400, "unknown action");

  // Social links: manual entry, on the platform's own domain.
  const wrong = await post(`customers/${id}`, { action: "socials", socials: { instagram: "https://facebook.com/nashs" } });
  assert.equal(wrong.status, 400);
  assert.match((await wrong.json()).error, /Instagram link must be on instagram\.com/);
  assert.equal((await post(`customers/${id}`, { action: "socials", socials: { myspace: "https://myspace.com/a" } })).status, 400);
  const socials = await record(await post(`customers/${id}`, { action: "socials", socials: { instagram: "https://instagram.com/nashs", tiktok: "tiktok.com/@nashs" } }));
  assert.deepEqual(socials.socials, { instagram: "https://instagram.com/nashs", tiktok: "https://tiktok.com/@nashs" });

  // Find from website reads the saved site, answers with what it found and saves nothing.
  const before = JSON.stringify(await record(await get(`customers/${id}`)));
  testHooks.siteDeps = {
    lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    transport: async () => ({ status: 200, headers: { "content-type": "text/html" }, body: Buffer.from('<a href="https://www.facebook.com/nashsbakery">f</a><a href="https://instagram.com/nashs_other">i</a>') }),
  };
  const found = await post(`customers/${id}`, { action: "find-socials" });
  assert.equal(found.status, 200);
  const foundBody = await found.json();
  assert.deepEqual(foundBody.found, { facebook: "https://www.facebook.com/nashsbakery", instagram: "https://instagram.com/nashs_other" });
  assert.equal(foundBody.pageUrl, "https://nashs.example.com/");
  assert.deepEqual(foundBody.existing, socials.socials, "existing links are shown so the producer can compare");
  assert.equal(JSON.stringify(await record(await get(`customers/${id}`))), before, "finding saves nothing");
  testHooks.siteDeps = { lookup: async () => [{ address: "10.0.0.5", family: 4 }], transport: async () => { throw new Error("must not connect"); } };
  const privateSite = await post(`customers/${id}`, { action: "find-socials" });
  assert.equal(privateSite.status, 400);
  assert.match((await privateSite.json()).error, /not a public website/);
  testHooks.siteDeps = undefined;
  const noSite = await record(await post("customers", { name: "No Website Co" }));
  const needSite = await post(`customers/${noSite.id}`, { action: "find-socials" });
  assert.equal(needSite.status, 400);
  assert.match((await needSite.json()).error, /Save the website first/);

  // Red lines: separate entries with a category, audited.
  assert.equal((await post(`customers/${id}`, { action: "red-line-add", category: "nonsense", text: "x" })).status, 400);
  assert.equal((await post(`customers/${id}`, { action: "red-line-add", category: "topic", text: "" })).status, 400);
  let withLines = await record(await post(`customers/${id}`, { action: "red-line-add", category: "competitor", text: "Greggs", reason: "Legal dispute" }));
  withLines = await record(await post(`customers/${id}`, { action: "red-line-add", category: "phrase", text: "cheap" }));
  assert.deepEqual(withLines.redLines.map((l: { category: string; text: string }) => [l.category, l.text]), [["competitor", "Greggs"], ["phrase", "cheap"]]);
  const lineId = withLines.redLines[0].id;
  withLines = await record(await post(`customers/${id}`, { action: "red-line-update", lineId, text: "Greggs plc" }));
  assert.equal(withLines.redLines[0].text, "Greggs plc");
  assert.equal(withLines.redLines[0].reason, "Legal dispute", "reason kept when not sent");
  assert.equal((await post(`customers/${id}`, { action: "red-line-update", lineId: "nope", text: "x" })).status, 400);
  withLines = await record(await post(`customers/${id}`, { action: "red-line-remove", lineId }));
  assert.deepEqual(withLines.redLines.map((l: { text: string }) => l.text), ["cheap"]);
  assert.deepEqual(withLines.audit.slice(-3).map((a: { action: string }) => a.action), ["red_line_added", "red_line_changed", "red_line_removed"]);

  // Typed brand purpose and what the brand is known for; models may read them only once authorised, and edits withdraw that.
  let text = await record(await post(`customers/${id}`, { action: "brand-text", purposeText: "To make baking joyful", knownFor: "Sourdough" }));
  assert.deepEqual([text.purposeText, text.knownFor, text.textAuthorisation], ["To make baking joyful", "Sourdough", undefined]);
  assert.equal((await post(`customers/${id}`, { action: "brand-text", purposeText: "x".repeat(4001) })).status, 400);
  text = await record(await post(`customers/${id}`, { action: "brand-text-authorise", authorise: true }));
  assert.equal(text.textAuthorisation.authorisedBy, "port67-producer");
  assert.equal((await post(`customers/${id}`, { action: "brand-text-authorise", authorise: "yes" })).status, 400);
  text = await record(await post(`customers/${id}`, { action: "brand-text", knownFor: "Sourdough and pies" }));
  assert.equal(text.textAuthorisation, undefined, "an edit withdraws the authorisation");
  assert.equal(text.purposeText, "To make baking joyful");

  // Brand purpose: rights confirmed, real type checked, 25 MB limit, bytes kept out of the record.
  assert.equal((await upload(id, "name=purpose.pdf", pdf(2000))).status, 400, "rights confirmation required");
  const html = await upload(id, "rights=confirmed&name=purpose.pdf", Buffer.from("<html><script>alert(1)</script></html>"));
  assert.equal(html.status, 400);
  assert.match((await html.json()).error, /not accepted/);
  assert.equal((await upload(id, "rights=confirmed&name=empty.pdf", Buffer.alloc(0))).status, 400, "empty");
  assert.equal((await upload(id, "rights=confirmed&name=x.pdf", Buffer.from("MZ\x90\x00 exe"))).status, 400, "an executable renamed .pdf");
  const tooBig = await upload(id, "rights=confirmed&name=big.pdf", pdf(25 * 1024 * 1024 + 1));
  assert.equal(tooBig.status, 400);
  assert.match((await tooBig.json()).error, /too large/);
  const stored = await upload(id, "rights=confirmed&name=purpose%3Cx%3E.pdf", pdf(300_000));
  assert.equal(stored.status, 201);
  const storedBody = await stored.json();
  const fileId: string = storedBody.file.id;
  assert.equal(storedBody.file.mime, "application/pdf");
  assert.equal(storedBody.file.name, "purpose_x_.pdf");
  assert.equal(storedBody.file.rights.confirmedBy, "port67-producer");
  assert.equal(storedBody.file.modelAuthorisation, undefined, "not authorised for models by default");
  assert.equal(storedBody.customer.brandPurpose.length, 1);
  const recordFile = await readFile(join(directory, "live", "factory-customers.json"), "utf8");
  assert.equal(recordFile.length < 20_000, true, "the record holds a reference, not the bytes");
  assert.equal((await readdir(join(directory, "live", "customers", id))).length, 1, "the bytes are in the private file store");
  // Served only through the authorised route. A PDF opens in the tab; it stays private, no-store and non-sniffable.
  const served = await get(`customers/${id}/purpose/${fileId}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "application/pdf");
  assert.match(served.headers.get("content-disposition") || "", /^inline/);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.equal(served.headers.get("cache-control"), "private, no-store");
  assert.match(served.headers.get("content-security-policy") || "", /default-src 'none'/);
  assert.equal(Buffer.from(await served.arrayBuffer()).length, 300_000);
  assert.equal((await get(`customers/${id}/purpose/00000000-0000-0000-0000-000000000000`)).status, 400);
  assert.equal((await get(`customers/${id}/purpose/..%2f..%2fetc`)).status, 400);
  const image = await record(await upload(id, "rights=confirmed&name=mark.png", png(5000)));
  const imageId = image.brandPurpose[1].id;
  assert.match((await get(`customers/${id}/purpose/${imageId}`)).headers.get("content-disposition") || "", /^inline/, "images show inline");
  // A file is never made readable by a model unless a producer says so.
  let auth = await record(await post(`customers/${id}`, { action: "purpose-authorise", fileId, authorise: true }));
  assert.equal(auth.brandPurpose[0].modelAuthorisation.authorisedBy, "port67-producer");
  assert.equal(auth.brandPurpose[1].modelAuthorisation, undefined, "authorising one file does not authorise the others");
  assert.equal((await post(`customers/${id}`, { action: "purpose-authorise", fileId, authorise: "yes" })).status, 400);
  auth = await record(await post(`customers/${id}`, { action: "purpose-authorise", fileId, authorise: false }));
  assert.equal(auth.brandPurpose[0].modelAuthorisation, undefined, "authorisation can be withdrawn");
  // Removing the reference keeps the others; at most five files.
  const removed = await record(await post(`customers/${id}`, { action: "purpose-remove", fileId: imageId }));
  assert.deepEqual(removed.brandPurpose.map((f: { id: string }) => f.id), [fileId]);
  for (let i = 0; i < 4; i++) assert.equal((await upload(id, `rights=confirmed&name=f${i}.pdf`, pdf(500))).status, 201);
  const sixth = await upload(id, "rights=confirmed&name=f5.pdf", pdf(500));
  assert.equal(sixth.status, 400);
  assert.match((await sixth.json()).error, /At most 5/);

  // Customers and the demo are refused: only producers and admins use the video workspace.
  const project = await (await post("projects", { studio: { offer: "scene_pack", brief: { client: { businessName: "Invited Co" } } } })).json();
  const invitation = await (await post(`projects/${project.project.id}/invite`, {})).json();
  const token = new URLSearchParams(new URL(invitation.invitation).hash.slice(1)).get("invite");
  await post("logout", {});
  assert.equal((await post("client-login", { token })).status, 200);
  assert.equal((await get("customers")).status, 403, "customer cannot list");
  assert.equal((await get(`customers/${id}`)).status, 403, "customer cannot read");
  assert.equal((await post("customers", { name: "Sneaky" })).status, 403, "customer cannot create");
  assert.equal((await post(`customers/${id}`, { action: "brand-text", purposeText: "Hacked" })).status, 403, "customer cannot write brand text");
  assert.equal((await post(`customers/${id}`, { action: "update", name: "Hacked" })).status, 403, "customer cannot edit");
  assert.equal((await upload(id, "rights=confirmed&name=a.pdf", pdf(500))).status, 403, "customer cannot upload");
  assert.equal((await get(`customers/${id}/purpose/${fileId}`)).status, 403, "customer cannot download");
  await post("logout", {});
  assert.equal((await post("demo", {})).status, 200);
  const demo = await get("customers");
  assert.equal(demo.status, 403);
  assert.match((await demo.json()).error, /demo/);

  // Back as the producer: nothing was changed by the refused requests.
  cookie = producerCookie;
  const final = await record(await get(`customers/${id}`));
  assert.equal(final.name, "Nash's Bakery Ltd");
  assert.equal(final.brandPurpose.length, 5);
  assert.equal((await (await get("customers")).json()).customers.length, 2);
  console.log("customers-api: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
