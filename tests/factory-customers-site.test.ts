import assert from "node:assert/strict";
import { fetchPublicPage, findSocialsOnWebsite, isPublicAddress, type Lookup, type Reply, type Transport } from "../src/lib/factory/site-links";

// "Find from website" safety (CHG-0103, FAC-VWS-005): the server fetches a producer-supplied address, so it must never reach private
// networks, follow redirects off the site, or read unbounded or non-page content. Lookup and transport are injected: no network is used.
async function main() {
  // ---- Which addresses count as public
  for (const ok of ["8.8.8.8", "93.184.216.34", "1.1.1.1", "172.15.0.1", "172.32.0.1", "100.63.0.1", "2606:4700:4700::1111", "2a00:1450:4009:81f::200e"]) assert.equal(isPublicAddress(ok), true, ok);
  for (const bad of ["127.0.0.1", "127.9.9.9", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.1", "203.0.113.5", "198.51.100.7",
    "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "2002:7f00:1::", "64:ff9b::7f00:1", "not-an-ip", "", "999.1.1.1", "1.2.3", "1:2:3:4:5:6:7:8:9"])
    assert.equal(isPublicAddress(bad), false, bad);
  assert.equal(isPublicAddress("::ffff:8.8.8.8"), true, "mapped public IPv4 is public");

  const pub: Lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  const html = (body: string): Reply => ({ status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: Buffer.from(body) });
  const never: Transport = async () => { throw new Error("the network must not be touched"); };
  const seen: { url: string; address: string }[] = [];
  const serving = (pages: Record<string, Reply>): Transport => async ({ url, address }) => { seen.push({ url: url.href, address }); const r = pages[url.href]; if (!r) throw new Error("unreachable"); return r; };

  // ---- Refused before any connection
  await assert.rejects(fetchPublicPage("http://example.com", { lookup: pub, transport: never }), /Website/, "http refused");
  await assert.rejects(fetchPublicPage("https://127.0.0.1", { lookup: pub, transport: never }), /Website/, "IP address refused");
  await assert.rejects(fetchPublicPage("https://localhost", { lookup: pub, transport: never }), /Website/);
  await assert.rejects(fetchPublicPage("https://example.com:8443", { lookup: pub, transport: never }), /Website/, "port refused");
  await assert.rejects(fetchPublicPage("https://internal.example.com", { lookup: async () => [{ address: "10.0.0.5", family: 4 }], transport: never }), /not a public website/, "name resolving to a private address");
  await assert.rejects(fetchPublicPage("https://metadata.example.com", { lookup: async () => [{ address: "169.254.169.254", family: 4 }], transport: never }), /not a public website/, "cloud metadata address");
  await assert.rejects(fetchPublicPage("https://mixed.example.com", { lookup: async () => [{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }], transport: never }), /not a public website/, "one private answer is enough to refuse");
  await assert.rejects(fetchPublicPage("https://v6.example.com", { lookup: async () => [{ address: "::1", family: 6 }], transport: never }), /not a public website/, "IPv6 loopback");
  await assert.rejects(fetchPublicPage("https://gone.example.com", { lookup: async () => { throw new Error("ENOTFOUND"); }, transport: never }), /could not be found/, "no such name");
  await assert.rejects(fetchPublicPage("https://empty.example.com", { lookup: async () => [], transport: never }), /not a public website/, "no addresses");

  // ---- Connects only to the address that was checked
  seen.length = 0;
  const ok = await fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": html("<p>hi</p>") }) });
  assert.equal(ok.html, "<p>hi</p>");
  assert.deepEqual(seen, [{ url: "https://example.com/", address: "93.184.216.34" }]);

  // ---- Redirects: same site only, public https only, bounded
  const www = await fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 301, headers: { location: "https://www.example.com/" }, body: Buffer.alloc(0) }, "https://www.example.com/": html("<p>www</p>") }) });
  assert.equal(www.finalUrl, "https://www.example.com/");
  const relative = await fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 302, headers: { location: "/home" }, body: Buffer.alloc(0) }, "https://example.com/home": html("<p>home</p>") }) });
  assert.equal(relative.finalUrl, "https://example.com/home");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 302, headers: { location: "https://other.example.net/" }, body: Buffer.alloc(0) } }) }), /different site/, "off-site redirect");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 302, headers: { location: "http://example.com/" }, body: Buffer.alloc(0) } }) }), /not a public https page/, "downgrade to http");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 302, headers: { location: "https://127.0.0.1/" }, body: Buffer.alloc(0) } }) }), /not a public https page|different site/, "redirect to an IP");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 302, headers: { location: "/loop" }, body: Buffer.alloc(0) }, "https://example.com/loop": { status: 302, headers: { location: "/loop" }, body: Buffer.alloc(0) } }) }), /too many times/, "redirect loop");
  // A redirect target is checked like the first address: a same-name host that now resolves privately is refused.
  let calls = 0;
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: async () => (++calls === 1 ? [{ address: "93.184.216.34", family: 4 }] : [{ address: "192.168.0.9", family: 4 }]), transport: serving({ "https://example.com/": { status: 302, headers: { location: "https://www.example.com/" }, body: Buffer.alloc(0) } }) }), /not a public website/, "each hop is re-checked");

  // ---- Responses that are not a readable page
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 404, headers: { "content-type": "text/html" }, body: Buffer.from("no") } }) }), /status 404/);
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 200, headers: { "content-type": "application/pdf" }, body: Buffer.from("%PDF") } }) }), /did not return a web page/);
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": { status: 200, headers: {}, body: Buffer.from("x") } }) }), /did not return a web page/, "no content type");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: async () => { throw new Error("ECONNRESET to 10.0.0.1:443"); } }), (e: Error) => e.message === "The website could not be reached", "internal error text is not leaked");
  await assert.rejects(fetchPublicPage("https://example.com/", { lookup: pub, transport: async () => { throw new Error("timeout"); } }), /took too long/);

  // ---- Finding the links reads the page and saves nothing
  const result = await findSocialsOnWebsite("https://example.com/", { lookup: pub, transport: serving({ "https://example.com/": html('<a href="https://instagram.com/example">i</a><a href="https://www.tiktok.com/@example">t</a>') }) });
  assert.deepEqual(result, { pageUrl: "https://example.com/", found: { instagram: "https://instagram.com/example", tiktok: "https://www.tiktok.com/@example" } });
  console.log("customers-site: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
