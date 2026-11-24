import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { findSocialLinks, webUrl } from "./customers";
import type { SocialPlatform } from "./model";

// "Find from website" (FAC-VWS-005): read the social links a company's own website publishes. Free: no model or paid call.
// The server fetches a producer-supplied address, so it must never be a way into private networks. Every hop is checked:
// public https only, the name must resolve only to public addresses, the connection is pinned to the address that was checked
// (no second lookup that could change), redirects stay on the same site, and size and time are capped.

export type Resolved = { address: string; family: number };
export type Lookup = (host: string) => Promise<Resolved[]>;
export type Reply = { status: number; headers: Record<string, string | undefined>; body: Buffer };
export type Transport = (target: { url: URL; address: string; family: number }, limits: { timeoutMs: number; maxBytes: number }) => Promise<Reply>;

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

function v4(ip: string): number[] | undefined {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return undefined;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n <= 255) ? parts : undefined;
}
function publicV4([a, b, c]: number[]): boolean {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
function expandV6(ip: string): number[] | undefined {
  let s = ip.toLowerCase().split("%")[0];
  const tail = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (tail) {
    const p = v4(tail[1]);
    if (!p) return undefined;
    s = s.slice(0, -tail[1].length) + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return undefined;
  const groups = [...head, ...Array(fill).fill("0"), ...rest].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : undefined;
}
/** True only for an address on the public internet. Anything unparseable, private, loopback, link-local, reserved or mapped to such is false. */
export function isPublicAddress(ip: string): boolean {
  const four = v4(ip);
  if (four) return publicV4(four);
  const g = expandV6(ip);
  if (!g) return false;
  if (g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1)) return false; // :: and ::1
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return publicV4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]); // mapped or compatible IPv4
  if ((g[0] & 0xfe00) === 0xfc00) return false; // unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false; // link-local
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g[0] === 0x2002 || (g[0] === 0x64 && g[1] === 0xff9b)) return false; // 6to4 and NAT64 can reach private IPv4
  return true;
}

const defaultLookup: Lookup = async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((r) => ({ address: r.address, family: r.family }));

const defaultTransport: Transport = ({ url, address, family }, { timeoutMs, maxBytes }) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
    const req = httpsRequest(
      {
        protocol: "https:", hostname: url.hostname, path: url.pathname + url.search, method: "GET", servername: url.hostname,
        headers: { host: url.hostname, "user-agent": "Port67-LinkFinder/1.0", accept: "text/html,application/xhtml+xml", "accept-encoding": "identity" },
        // Connect only to the address that was checked.
        lookup: ((_host: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) => (options && options.all ? cb(null, [{ address, family }]) : cb(null, address, family))) as never,
      },
      (res) => {
        const parts: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) { parts.push(chunk.subarray(0, chunk.length - (size - maxBytes))); res.destroy(); return; }
          parts.push(chunk);
        });
        const done = () => { clearTimeout(timer); resolve({ status: res.statusCode || 0, headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])), body: Buffer.concat(parts) }); };
        res.on("end", done);
        res.on("close", done);
        res.on("error", () => undefined);
      },
    );
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.end();
  });

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** Fetch one public page. Throws a readable error for anything unsafe or unreadable. */
export async function fetchPublicPage(website: string, deps: { lookup?: Lookup; transport?: Transport } = {}): Promise<{ finalUrl: string; html: string }> {
  const lookup = deps.lookup || defaultLookup;
  const transport = deps.transport || defaultTransport;
  let current = new URL(webUrl(website, "Website"));
  const origin = current.hostname.toLowerCase();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let addresses: Resolved[];
    try { addresses = await lookup(current.hostname); } catch { throw new Error("The website address could not be found"); }
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) throw new Error("That address is not a public website, so it was not read");
    let reply: Reply;
    try { reply = await transport({ url: current, address: addresses[0].address, family: addresses[0].family }, { timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES }); }
    catch (e) { throw new Error((e as Error).message === "timeout" ? "The website took too long to answer" : "The website could not be reached"); }
    if (reply.status >= 300 && reply.status < 400 && reply.headers.location) {
      let next: URL;
      try { next = new URL(webUrl(new URL(reply.headers.location, current).href, "Redirect")); } catch { throw new Error("The website redirects to an address that is not a public https page"); }
      if (!sameSite(next.hostname.toLowerCase(), origin)) throw new Error("The website redirects to a different site, so it was not read");
      current = next;
      continue;
    }
    if (reply.status !== 200) throw new Error(`The website answered with status ${reply.status}`);
    if (!/^(text\/html|application\/xhtml\+xml)/i.test(reply.headers["content-type"] || "")) throw new Error("The website did not return a web page");
    return { finalUrl: current.href, html: reply.body.toString("utf8") };
  }
  throw new Error("The website redirects too many times");
}

/** The social profile links a website publishes about itself. Read-only: the caller shows them and saves nothing until a producer confirms. */
export async function findSocialsOnWebsite(website: string, deps?: { lookup?: Lookup; transport?: Transport }): Promise<{ pageUrl: string; found: Partial<Record<SocialPlatform, string>> }> {
  const page = await fetchPublicPage(website, deps);
  return { pageUrl: page.finalUrl, found: findSocialLinks(page.html, page.finalUrl) };
}
