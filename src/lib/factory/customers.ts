import type { BrandPurposeFile, CustomerAccount, RedLineCategory, SocialPlatform } from "./model";

// Video workspace customer accounts (CHG-0103, FAC-VWS-004 to FAC-VWS-007). Pure and client-safe: no Node imports.

/** System workspace that holds every customer account record. */
export const CUSTOMERS_WORKSPACE = "factory-customers";
export const MAX_CUSTOMERS = 200;
export const MAX_RED_LINES = 100;
export const MAX_PURPOSE_FILES = 5;
export const MAX_AUDIT = 100;
export const MAX_BRAND_TEXT = 4000;
const MB = 1024 * 1024;
/** One setting for the brand purpose file limit (owner decision, 25 November 2026). */
export const PURPOSE_MAX_BYTES = 25 * MB;
export const PURPOSE_LABEL = "Brand purpose (PDF, Word .docx, text, PNG or JPEG; up to 25 MB per file, 5 files)";

export const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string; domains: string[] }[] = [
  { key: "x", label: "X", domains: ["x.com", "twitter.com"] },
  { key: "instagram", label: "Instagram", domains: ["instagram.com"] },
  { key: "facebook", label: "Facebook", domains: ["facebook.com"] },
  { key: "tiktok", label: "TikTok", domains: ["tiktok.com"] },
  { key: "youtube", label: "YouTube", domains: ["youtube.com"] },
  { key: "linkedin", label: "LinkedIn", domains: ["linkedin.com"] },
  { key: "pinterest", label: "Pinterest", domains: ["pinterest.com"] },
];
const platform = (key: string) => SOCIAL_PLATFORMS.find((p) => p.key === key);

export const RED_LINE_CATEGORIES: { key: RedLineCategory; label: string; hint: string }[] = [
  { key: "topic", label: "Topic", hint: "A subject the client does not want referenced" },
  { key: "competitor", label: "Competitor", hint: "A competitor not to mention or compare with" },
  { key: "person_or_brand", label: "Person or brand", hint: "A person or brand not to be associated with" },
  { key: "phrase", label: "Word or phrase", hint: "Language that must not be used" },
  { key: "visual", label: "Visual", hint: "An image, look or setting to avoid" },
];

function str(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${name} is required`);
    return "";
  }
  if (typeof value !== "string" || value.length > max) throw new Error(`${name} must be text up to ${max} characters`);
  const out = value.trim();
  if (required && !out) throw new Error(`${name} is required`);
  return out;
}

/** A public https address. A missing scheme is taken as https. Mirrors the platform's public URL rule; never accepts addresses or ports. */
export function webUrl(value: unknown, name: string): string {
  let s = str(value, name, 2000);
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  let u: URL;
  try { u = new URL(s); } catch { throw new Error(`${name} must be a web address, for example https://example.com`); }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || u.port || !h.includes(".") || h.includes(":") || /^\d/.test(h) || h.endsWith(".local") || h.endsWith(".internal") || h === "localhost")
    throw new Error(`${name} must be a public https web address`);
  u.hash = "";
  return u.href;
}

export const hostOn = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith("." + d));

/** One social link: a public https address on the platform's own domain. Empty means none. */
export function socialUrl(key: string, value: unknown): string {
  const p = platform(key);
  if (!p) throw new Error("Unknown social platform");
  const url = webUrl(value, `${p.label} link`);
  if (!url) return "";
  if (!hostOn(new URL(url).hostname.toLowerCase(), p.domains)) throw new Error(`${p.label} link must be on ${p.domains[0]}`);
  return url;
}

/** Apply a producer's social link changes to the current set. An empty string clears a platform; unknown platforms are refused. */
export function applySocials(current: CustomerAccount["socials"], input: unknown): CustomerAccount["socials"] {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Social links must be an object");
  const next = { ...current };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const url = socialUrl(key, value);
    if (url) next[key as SocialPlatform] = url;
    else delete next[key as SocialPlatform];
  }
  return next;
}

export function customerFields(input: Record<string, unknown>, required: boolean) {
  return {
    ...(required || "name" in input ? { name: str(input.name, "Business name", 120, true) } : {}),
    ...(required || "website" in input ? { website: webUrl(input.website, "Website") } : {}),
  };
}

/** The two typed boxes. Only the fields sent are changed; each may be up to 4000 characters. */
export function brandTextFields(input: Record<string, unknown>) {
  const out: { purposeText?: string; knownFor?: string } = {};
  if ("purposeText" in input) out.purposeText = str(input.purposeText, "Brand purpose", MAX_BRAND_TEXT);
  if ("knownFor" in input) out.knownFor = str(input.knownFor, "What the brand is known for", MAX_BRAND_TEXT);
  return out;
}
/** The only way later steps may obtain the typed texts for a model: nothing unless a producer has authorised them. */
export const authorisedBrandText = (c: CustomerAccount): { purposeText: string; knownFor: string } | undefined =>
  c.textAuthorisation ? { purposeText: c.purposeText || "", knownFor: c.knownFor || "" } : undefined;

export function redLineFields(input: Record<string, unknown>, partial = false) {
  const out: { category?: RedLineCategory; text?: string; reason?: string } = {};
  if (!partial || "category" in input) {
    const category = RED_LINE_CATEGORIES.find((c) => c.key === input.category)?.key;
    if (!category) throw new Error("Choose a red line category");
    out.category = category;
  }
  if (!partial || "text" in input) out.text = str(input.text, "Red line", 300, true);
  if (!partial || "reason" in input) out.reason = str(input.reason, "Reason", 500);
  return out;
}

// ---------- Brand purpose files ----------

export const PURPOSE_MIMES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"] as const;
const PURPOSE_EXT: Record<string, string> = { "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "text/plain": "txt", "image/png": "png", "image/jpeg": "jpg" };
export const purposeExtension = (mime: string) => PURPOSE_EXT[mime];

function includesAscii(bytes: Uint8Array, needle: string): boolean {
  const n = [...needle].map((c) => c.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - n.length; i++) {
    if (bytes[i] !== n[0]) continue;
    for (let j = 1; j < n.length; j++) if (bytes[i + j] !== n[j]) continue outer;
    return true;
  }
  return false;
}
/** Detect the real file type from the content; the declared type and the file name are never trusted. */
export function sniffPurpose(bytes: Uint8Array): (typeof PURPOSE_MIMES)[number] | undefined {
  const at = (i: number, ...b: number[]) => b.every((x, n) => bytes[i + n] === x);
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x50, 0x4b, 0x03, 0x04)) return includesAscii(bytes, "word/document.xml") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : undefined;
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return undefined; }
  if (!text.trim()) return undefined;
  // Plain text only: no control characters and nothing that looks like markup or script.
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); if (c < 32 && c !== 9 && c !== 10 && c !== 13) return undefined; }
  if (/^\s*</.test(text)) return undefined;
  return "text/plain";
}

/** The only way later steps may obtain brand purpose files for a model: those a producer has explicitly authorised (FAC-VWS-006). */
export const authorisedPurposeFiles = (c: CustomerAccount): BrandPurposeFile[] => c.brandPurpose.filter((f) => !!f.modelAuthorisation);

// ---------- Social links found on a company's own website ----------

const decode = (s: string) => s.replace(/&amp;/gi, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const RESERVED: Record<SocialPlatform, string[]> = {
  x: ["intent", "share", "home", "i", "search", "hashtag", "login", "signup", "explore", "settings", "privacy", "tos", "about"],
  instagram: ["p", "reel", "reels", "explore", "accounts", "stories", "tv", "direct", "about", "legal", "developer", "web"],
  facebook: ["sharer", "sharer.php", "share", "share.php", "dialog", "plugins", "tr", "login", "policies", "legal", "help", "privacy", "events", "watch", "marketplace", "gaming", "about"],
  tiktok: [], youtube: [], linkedin: [],
  pinterest: ["pin", "ideas", "search", "login", "business", "about", "pin-builder"],
};
/** Turn a link into a profile address for the platform, or undefined if it is a post, share button or other page. */
function profile(key: SocialPlatform, href: string, base: string): string | undefined {
  let u: URL;
  try { u = new URL(href, base); } catch { return undefined; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
  const p = platform(key)!;
  const host = u.hostname.toLowerCase();
  if (!hostOn(host, p.domains)) return undefined;
  const seg = u.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s.replace(/%(?![0-9a-f]{2})/gi, "%25")));
  const first = (seg[0] || "").toLowerCase();
  let ok = false;
  if (key === "tiktok") ok = seg.length === 1 && first.startsWith("@") && first.length > 1;
  else if (key === "youtube") ok = (seg.length === 1 && first.startsWith("@") && first.length > 1) || (["channel", "c", "user"].includes(first) && seg.length === 2);
  else if (key === "linkedin") ok = ["company", "in", "school", "showcase"].includes(first) && seg.length >= 2;
  else if (key === "x" || key === "instagram" || key === "pinterest") ok = seg.length === 1 && !RESERVED[key].includes(first);
  else ok = seg.length >= 1 && !RESERVED[key].includes(first);
  if (!ok) return undefined;
  return `https://${host}/${seg.map((s) => encodeURIComponent(s).replace(/%40/g, "@")).join("/")}`;
}
/**
 * Read a page's own links to known social platforms: JSON-LD sameAs first, then rel="me" links, then ordinary links.
 * The first profile found per platform wins. Nothing is fetched here; this reads text only.
 */
export function findSocialLinks(html: string, baseUrl: string): Partial<Record<SocialPlatform, string>> {
  const candidates: string[] = [];
  for (const m of html.matchAll(/"sameAs"\s*:\s*(\[[^\]]*\]|"[^"]*")/g)) for (const u of m[1].matchAll(/"((?:https?:)?\/\/[^"]+)"/g)) candidates.push(decode(u[1]));
  for (const m of html.matchAll(/<link\b[^>]*\brel\s*=\s*["']me["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) candidates.push(decode(m[1]));
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) candidates.push(decode(m[1] ?? m[2] ?? ""));
  const found: Partial<Record<SocialPlatform, string>> = {};
  for (const c of candidates) for (const p of SOCIAL_PLATFORMS) if (!found[p.key]) { const url = profile(p.key, c, baseUrl); if (url) found[p.key] = url; }
  return found;
}
