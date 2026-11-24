import assert from "node:assert/strict";
import type { BrandPurposeFile, Database } from "../src/lib/factory/model";
import { MAX_BRAND_TEXT, MAX_AUDIT, MAX_CUSTOMERS, MAX_PURPOSE_FILES, MAX_RED_LINES, PURPOSE_MAX_BYTES, applySocials, authorisedBrandText, authorisedPurposeFiles, findSocialLinks, redLineFields, sniffPurpose, socialUrl, webUrl } from "../src/lib/factory/customers";
import { addRedLine, attachPurpose, createCustomer, customersOf, findCustomer, removePurpose, removeRedLine, saveBrandText, saveSocials, setPurposeAuthorisation, setTextAuthorisation, updateCustomer, updateRedLine } from "../src/lib/factory/customers-commands";

// Customer account logic (CHG-0103, FAC-VWS-004 to FAC-VWS-007): validation, commands, file sniffing, website link reading.
const throws = (fn: () => unknown, pattern: RegExp, why: string) => assert.throws(fn, pattern, why);
const empty = (): Database => ({ schemaVersion: 1, projects: [], invitations: [] });
const bytes = (s: string) => new TextEncoder().encode(s);
const file = (n: number): BrandPurposeFile => ({ id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`, name: `f${n}.pdf`, mime: "application/pdf", bytes: 10, storageKey: "k", uploadedAt: "t", uploadedBy: "u", rights: { confirmedBy: "u", at: "t" } });

// ---- Web addresses
assert.equal(webUrl("example.com", "Website"), "https://example.com/");
assert.equal(webUrl("https://example.com/about#team", "Website"), "https://example.com/about");
assert.equal(webUrl("", "Website"), "");
assert.equal(webUrl(undefined, "Website"), "");
for (const bad of ["http://example.com", "https://127.0.0.1", "https://10.0.0.1/", "https://example.com:8443", "https://localhost", "https://user:pw@example.com", "https://intranet", "https://db.internal", "https://printer.local", "ftp://example.com", "javascript:alert(1)", "https://[::1]/"])
  throws(() => webUrl(bad, "Website"), /Website/, bad);
throws(() => webUrl("x".repeat(2001), "Website"), /up to 2000/, "length");
throws(() => webUrl(42, "Website"), /text/, "type");

// ---- Social links stay on the platform's own domain
assert.equal(socialUrl("instagram", "instagram.com/nashsbakery"), "https://instagram.com/nashsbakery");
assert.equal(socialUrl("x", "https://twitter.com/nashs"), "https://twitter.com/nashs");
assert.equal(socialUrl("x", "https://x.com/nashs"), "https://x.com/nashs");
assert.equal(socialUrl("linkedin", "https://uk.linkedin.com/company/nashs"), "https://uk.linkedin.com/company/nashs");
assert.equal(socialUrl("tiktok", ""), "");
throws(() => socialUrl("instagram", "https://facebook.com/nashs"), /Instagram link must be on instagram\.com/, "wrong platform");
throws(() => socialUrl("instagram", "https://notinstagram.com/x"), /must be on/, "lookalike domain");
throws(() => socialUrl("instagram", "https://instagram.com.evil.com/x"), /must be on/, "suffix trick");
throws(() => socialUrl("myspace", "https://myspace.com/x"), /Unknown social platform/, "unknown platform");
{
  const current = { instagram: "https://instagram.com/a", x: "https://x.com/a" };
  assert.deepEqual(applySocials(current, { tiktok: "https://tiktok.com/@a" }), { ...current, tiktok: "https://tiktok.com/@a" });
  assert.deepEqual(applySocials(current, { instagram: "" }), { x: "https://x.com/a" }, "empty clears");
  assert.deepEqual(current, { instagram: "https://instagram.com/a", x: "https://x.com/a" }, "input is not mutated");
  throws(() => applySocials(current, { instagram: "https://x.com/a" }), /must be on/, "validated");
  throws(() => applySocials(current, { nope: "https://x.com/a" }), /Unknown social platform/, "unknown key");
  throws(() => applySocials(current, "x" as never), /object/, "shape");
  throws(() => applySocials(current, [] as never), /object/, "array");
}

// ---- Red line fields
assert.deepEqual(redLineFields({ category: "competitor", text: " Acme ", reason: " legal dispute " }), { category: "competitor", text: "Acme", reason: "legal dispute" });
throws(() => redLineFields({ category: "other", text: "x" }), /category/, "category");
throws(() => redLineFields({ category: "topic", text: "  " }), /required/, "text required");
throws(() => redLineFields({ category: "topic", text: "x".repeat(301) }), /up to 300/, "text length");
throws(() => redLineFields({ category: "topic", text: "x", reason: "r".repeat(501) }), /up to 500/, "reason length");
assert.deepEqual(redLineFields({ text: "New" }, true), { text: "New" }, "partial update only touches given fields");

// ---- Customer commands
{
  const db = empty();
  throws(() => createCustomer(db, { website: "example.com" }, "p1"), /Business name is required/, "name required");
  throws(() => createCustomer(db, { name: "Nash's Bakery", website: "http://nope.com" }, "p1"), /Website/, "website validated");
  const c = createCustomer(db, { name: "Nash's Bakery", website: "nashs.example.com" }, "producer-1");
  assert.match(c.id, /^cust_[a-f0-9]{32}$/);
  assert.equal(c.website, "https://nashs.example.com/");
  assert.equal(c.audit.length, 1);
  assert.equal(c.audit[0].actor, "producer-1");
  assert.equal(customersOf(db).length, 1);
  throws(() => createCustomer(db, { name: "  nash's bakery " }, "p1"), /already exists/, "duplicate name, any case");
  const other = createCustomer(db, { name: "Other Co" }, "p1");
  assert.equal(other.website, "", "website optional");
  throws(() => updateCustomer(db, other.id, { name: "NASH'S BAKERY" }, "p1"), /already exists/, "rename onto another");
  throws(() => findCustomer(db, "cust_" + "0".repeat(32)), /not found/, "missing");
  throws(() => findCustomer(db, "../etc/passwd"), /not found/, "bad id");
  const renamed = updateCustomer(db, c.id, { name: "Nash's Bakery Ltd" }, "p2");
  assert.equal(renamed.name, "Nash's Bakery Ltd");
  assert.equal(renamed.updatedBy, "p2");
  assert.equal(renamed.website, "https://nashs.example.com/", "untouched fields stay");
  const auditBefore = renamed.audit.length;
  updateCustomer(db, c.id, { name: "Nash's Bakery Ltd" }, "p2");
  assert.equal(c.audit.length, auditBefore, "no change, no audit entry");

  // Social links: only changed platforms are audited.
  saveSocials(db, c.id, { instagram: "https://instagram.com/nashs", x: "https://x.com/nashs" }, "p1");
  assert.equal(c.socials.instagram, "https://instagram.com/nashs");
  assert.match(c.audit.at(-1)!.detail, /instagram/);
  const n = c.audit.length;
  saveSocials(db, c.id, { instagram: "https://instagram.com/nashs" }, "p1");
  assert.equal(c.audit.length, n, "saving the same links adds nothing");
  saveSocials(db, c.id, { x: "" }, "p1");
  assert.equal(c.socials.x, undefined);

  // Red lines: add, change, remove, each audited; separate entries.
  const line = addRedLine(db, c.id, { category: "competitor", text: "Greggs", reason: "client request" }, "p1");
  addRedLine(db, c.id, { category: "phrase", text: "cheap" }, "p1");
  assert.equal(c.redLines.length, 2);
  updateRedLine(db, c.id, line.id, { text: "Greggs plc", reason: "" }, "p1");
  assert.equal(c.redLines[0].text, "Greggs plc");
  assert.equal(c.redLines[0].reason, undefined, "an empty reason clears it");
  assert.equal(c.redLines[0].category, "competitor", "other fields stay");
  throws(() => updateRedLine(db, c.id, "nope", { text: "x" }, "p1"), /not found/, "unknown line");
  removeRedLine(db, c.id, line.id, "p1");
  assert.deepEqual(c.redLines.map((l) => l.text), ["cheap"]);
  assert.deepEqual(c.audit.slice(-3).map((a) => a.action), ["red_line_added", "red_line_changed", "red_line_removed"]);
  for (let i = 0; i < MAX_RED_LINES - 1; i++) addRedLine(db, c.id, { category: "topic", text: "t" + i }, "p1");
  throws(() => addRedLine(db, c.id, { category: "topic", text: "one too many" }, "p1"), /At most 100/, "red line cap");

  // The audit trail is bounded.
  assert.equal(c.audit.length <= MAX_AUDIT, true);
  assert.equal(c.audit.length, MAX_AUDIT);

  // Brand purpose: limited count, authorisation is explicit and reversible, removal keeps the others.
  for (let i = 1; i <= MAX_PURPOSE_FILES; i++) attachPurpose(db, other.id, file(i), "p1");
  throws(() => attachPurpose(db, other.id, file(99), "p1"), /At most 5/, "file cap");
  assert.deepEqual(authorisedPurposeFiles(other), [], "nothing is authorised by default");
  setPurposeAuthorisation(db, other.id, file(2).id, true, "p1");
  assert.deepEqual(authorisedPurposeFiles(other).map((f) => f.id), [file(2).id]);
  assert.equal(other.brandPurpose[1].modelAuthorisation?.authorisedBy, "p1");
  throws(() => setPurposeAuthorisation(db, other.id, file(2).id, "yes", "p1"), /true or false/, "strict boolean");
  throws(() => setPurposeAuthorisation(db, other.id, "nope", true, "p1"), /File not found/, "unknown file");
  setPurposeAuthorisation(db, other.id, file(2).id, false, "p1");
  assert.deepEqual(authorisedPurposeFiles(other), [], "withdrawn");
  removePurpose(db, other.id, file(3).id, "p1");
  assert.deepEqual(other.brandPurpose.map((f) => f.id), [1, 2, 4, 5].map((n) => file(n).id));
  assert.deepEqual(other.audit.slice(-1)[0].action, "purpose_removed");

  // The workspace holds a bounded number of accounts; accounts cannot be deleted by any command.
  const full = empty();
  for (let i = 0; i < MAX_CUSTOMERS; i++) full.customers = [...(full.customers || []), { ...createCustomer(empty(), { name: "C" + i }, "p"), }];
  throws(() => createCustomer(full, { name: "One more" }, "p"), /at most 200/, "customer cap");
}

// ---- File type detection: the declared type and the name are never trusted
assert.equal(PURPOSE_MAX_BYTES, 25 * 1024 * 1024);
assert.equal(sniffPurpose(bytes("%PDF-1.7\n...")), "application/pdf");
assert.equal(sniffPurpose(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), "image/png");
assert.equal(sniffPurpose(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image/jpeg");
const zip = (name: string) => Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...bytes("....." + name + ".....")]);
assert.equal(sniffPurpose(zip("word/document.xml")), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
assert.equal(sniffPurpose(zip("xl/workbook.xml")), undefined, "another zip is not Word");
assert.equal(sniffPurpose(zip("macros/vbaProject.bin")), undefined);
assert.equal(sniffPurpose(bytes("Our purpose is to make baking joyful.\nSecond line\ttabbed.")), "text/plain");
assert.equal(sniffPurpose(bytes("Zażółć gęślą jaźń: 日本語 テキスト")), "text/plain", "UTF-8 text");
assert.equal(sniffPurpose(bytes("<svg onload=alert(1)></svg>")), undefined, "markup disguised as text");
assert.equal(sniffPurpose(bytes("  <!doctype html><script>x</script>")), undefined);
assert.equal(sniffPurpose(bytes("   \n  ")), undefined, "blank");
assert.equal(sniffPurpose(new Uint8Array(0)), undefined, "empty");
assert.equal(sniffPurpose(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03])), undefined, "an executable");
assert.equal(sniffPurpose(bytes("text with a \u0000 null byte")), undefined);
assert.equal(sniffPurpose(Uint8Array.from([0xff, 0xfe, 0xfd, 0x80])), undefined, "invalid UTF-8");

// ---- Social links a website publishes about itself
{
  const base = "https://nashs.example.com/";
  const page = `<html><head>
    <script type="application/ld+json">{"@type":"Organization","sameAs":["https://www.facebook.com/nashsbakery","https://www.linkedin.com/company/nashs-bakery/"]}</script>
    <link rel="me" href="https://mastodon.example/@nash">
  </head><body>
    <a href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fnashs.example.com">Tweet this</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
    <a href='https://www.instagram.com/p/Cabc123/'>A post</a>
    <a class="icon" href="https://www.instagram.com/nashsbakery/?hl=en&amp;x=1">Instagram</a>
    <a href="https://www.instagram.com/other_account/">Second Instagram</a>
    <a href="//www.tiktok.com/@nashsbakery">TikTok</a>
    <a href="https://www.tiktok.com/@nashsbakery/video/1234">A video</a>
    <a href="https://www.youtube.com/watch?v=abc">A video</a>
    <a href="https://www.youtube.com/@NashsBakery">YouTube</a>
    <a href="https://x.com/nashsbakery">X</a>
    <a href="https://pinterest.com/pin/12345/">Pin</a>
    <a href="https://www.pinterest.com/nashsbakery/">Pinterest</a>
    <a href="/contact">Contact</a>
    <a href="https://evil.example/https://instagram.com/phish">Evil</a>
    <a href="https://instagram.com.evil.example/nashs">Lookalike</a>
    <a href="mailto:hi@nashs.example.com">Mail</a>
    <a href="javascript:void(0)">js</a>
  </body></html>`;
  const found = findSocialLinks(page, base);
  assert.deepEqual(found, {
    x: "https://x.com/nashsbakery",
    instagram: "https://www.instagram.com/nashsbakery",
    facebook: "https://www.facebook.com/nashsbakery",
    tiktok: "https://www.tiktok.com/@nashsbakery",
    youtube: "https://www.youtube.com/@NashsBakery",
    linkedin: "https://www.linkedin.com/company/nashs-bakery",
    pinterest: "https://www.pinterest.com/nashsbakery",
  });
  assert.deepEqual(findSocialLinks("<p>No links here</p>", base), {});
  assert.deepEqual(findSocialLinks('<a href="https://www.youtube.com/channel/UC123">c</a><a href="https://www.youtube.com/c/Name">c</a>', base), { youtube: "https://www.youtube.com/channel/UC123" });
  assert.deepEqual(findSocialLinks('<a href="https://www.linkedin.com/in/jane-doe">p</a>', base), { linkedin: "https://www.linkedin.com/in/jane-doe" });
  assert.deepEqual(findSocialLinks('<a href="https://www.linkedin.com/feed/">p</a>', base), {}, "not a profile");
  // JSON-LD is the site's own statement, so it wins over an ordinary link.
  assert.equal(findSocialLinks('<a href="https://facebook.com/ads">x</a><script>{"sameAs":"https://facebook.com/real"}</script>', base).facebook, "https://facebook.com/real");
  // Every result passes the same validation as a hand-typed link.
  for (const [k, v] of Object.entries(found)) assert.equal(socialUrl(k, v), v);
}
// ---- Typed brand purpose and "known for" (CHG-0105, FAC-VWS-010)
{
  const db = empty();
  const c = createCustomer(db, { name: "Text Co" }, "p");
  assert.equal(authorisedBrandText(c), undefined, "nothing for models by default");
  saveBrandText(db, c.id, { purposeText: "  To make baking joyful  ", knownFor: "Sourdough" }, "p");
  assert.deepEqual([c.purposeText, c.knownFor], ["To make baking joyful", "Sourdough"], "trimmed");
  saveBrandText(db, c.id, { knownFor: "Sourdough and pies" }, "p");
  assert.equal(c.purposeText, "To make baking joyful", "only the fields sent change");
  assert.equal(authorisedBrandText(c), undefined, "saving does not authorise");
  setTextAuthorisation(db, c.id, true, "p");
  assert.deepEqual(authorisedBrandText(c), { purposeText: "To make baking joyful", knownFor: "Sourdough and pies" });
  const n = c.audit.length;
  saveBrandText(db, c.id, { purposeText: "To make baking joyful" }, "p");
  assert.equal(c.audit.length, n, "no change, no entry");
  assert.ok(authorisedBrandText(c), "unchanged text keeps its authorisation");
  saveBrandText(db, c.id, { purposeText: "A new purpose" }, "p");
  assert.equal(authorisedBrandText(c), undefined, "changed text must be authorised again");
  assert.equal(c.audit.at(-1)!.action, "brand_text_authorisation_withdrawn");
  setTextAuthorisation(db, c.id, true, "p");
  setTextAuthorisation(db, c.id, false, "p");
  assert.equal(c.textAuthorisation, undefined, "withdrawn");
  throws(() => setTextAuthorisation(db, c.id, "yes", "p"), /true or false/, "strict boolean");
  throws(() => saveBrandText(db, c.id, { purposeText: "x".repeat(MAX_BRAND_TEXT + 1) }, "p"), /up to 4000/, "length");
  throws(() => saveBrandText(db, c.id, { knownFor: 5 }, "p"), /text/, "type");
  saveBrandText(db, c.id, { knownFor: "" }, "p");
  assert.equal(c.knownFor, "", "can be cleared");
}
console.log("customers: all assertions passed");
