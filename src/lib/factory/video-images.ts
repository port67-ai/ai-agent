import { randomUUID } from "node:crypto";
import type { Database, VideoImage, VideoImageKind } from "./model";

// Project image library for Video steps (CHG-0116). Pure rules over a Database; the caller persists it and stores the bytes.
// Every image has a name, and the name is how prompts refer to it: @name. Names are unique within a project.
const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 8 * MB;
export const MAX_IMAGES = 60;
export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export const IMAGE_LABEL = "PNG, JPEG or WebP, up to 8 MB each, 60 images per project";
export const IMAGE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const NAME_RULE = "Letters, numbers, dash and underscore only, up to 40 characters";
export const IMAGE_CATEGORIES = ["Person", "Product", "Location", "Prop", "Scene"] as const;
function categoryOf(v: unknown): VideoImageKind | undefined { if (v === undefined || v === null || v === "") return undefined; if (!IMAGE_CATEGORIES.includes(v as VideoImageKind)) throw new Error("Choose a valid image category"); return v as VideoImageKind; }
function titleOf(v: unknown): string { const t = typeof v === "string" ? v.trim() : ""; if (!t || t.length > 120 || !slugName(t)) throw new Error("Enter an image title (1–120 characters)"); return t; }
const now = () => new Date().toISOString();

/** The real file type, from the first bytes. The browser's claim is ignored. */
export function sniffImage(b: Uint8Array): (typeof IMAGE_MIMES)[number] | undefined {
  const at = (i: number, ...x: number[]) => x.every((v, n) => b[i + n] === v);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return undefined;
}
/** A usable @name from free text, such as a file name: extension dropped, anything else odd turned into a dash. */
export function slugName(raw: unknown): string {
  const base = String(raw ?? "").replace(/\.[A-Za-z0-9]{2,5}$/, "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return base.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
export const imagesOf = (db: Database, commissionId: string): VideoImage[] => (db.videoImages || []).filter((i) => i.commissionId === commissionId);
const taken = (db: Database, commissionId: string, name: string, exceptId?: string) => imagesOf(db, commissionId).some((i) => i.id !== exceptId && i.name.toLowerCase() === name.toLowerCase());
/** A free name close to the wanted one: name, name-2, name-3 ... */
export function freeName(db: Database, commissionId: string, wanted: string): string {
  const base = slugName(wanted) || "image";
  if (!taken(db, commissionId, base)) return base;
  for (let n = 2; n < 1000; n++) { const c = `${base.slice(0, 40 - String(n).length - 1)}-${n}`; if (!taken(db, commissionId, c)) return c; }
  throw new Error("Choose a different name");
}
const description = (v: unknown) => { const t = String(v ?? "").trim(); if (t.length > 500) throw new Error("The description can be up to 500 characters"); return t; };
export function newImageId() { return randomUUID(); }
export function attachImage(db: Database, img: VideoImage) {
  if (imagesOf(db, img.commissionId).length >= MAX_IMAGES) throw new Error(`At most ${MAX_IMAGES} images per project. Delete one first.`);
  (db.videoImages ||= []).push(img);
}
export function buildImage(db: Database, p: { id: string; commissionId: string; name: unknown; title?: unknown; category?: unknown; description: unknown; mime: VideoImage["mime"]; bytes: number; storageKey: string; actor: string }): VideoImage {
  const title = p.title === undefined || p.title === null ? undefined : titleOf(p.title);
  const category = categoryOf(p.category);
  if (title !== undefined && !category) throw new Error("Choose an image category");
  return { id: p.id, commissionId: p.commissionId, ...(title ? { title } : {}), ...(category ? { category } : {}), name: freeName(db, p.commissionId, title ?? String(p.name ?? "")), description: description(p.description), mime: p.mime, bytes: p.bytes, storageKey: p.storageKey, uploadedAt: now(), uploadedBy: p.actor };
}
export function findImage(db: Database, commissionId: string, id: unknown): VideoImage {
  const i = typeof id === "string" ? imagesOf(db, commissionId).find((x) => x.id === id) : undefined;
  if (!i) throw new Error("Image not found");
  return i;
}
/** Rename and/or change the description. A renamed image must keep a unique valid name. */
export function updateImage(db: Database, commissionId: string, id: unknown, d: Record<string, unknown>): VideoImage {
  const i = findImage(db, commissionId, id);
  if (d.category !== undefined) { const category = categoryOf(d.category); if (!category) throw new Error("Choose an image category"); i.category = category; }
  if (d.title !== undefined) { const title = titleOf(d.title); if (title !== (i.title || i.name)) { const name = slugName(title); if (taken(db, commissionId, name, i.id)) throw new Error(`Another image in this project is already called @${name}`); i.name = name; } i.title = title; }
  if (d.name !== undefined) {
    const raw = String(d.name).trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(raw)) throw new Error("Name: " + NAME_RULE);
    if (taken(db, commissionId, raw, i.id)) throw new Error(`Another image in this project is already called @${raw}`);
    i.name = raw;
  }
  if (d.description !== undefined) i.description = description(d.description);
  return i;
}
export function removeImage(db: Database, commissionId: string, id: unknown): VideoImage {
  const i = findImage(db, commissionId, id);
  db.videoImages = (db.videoImages || []).filter((x) => x.id !== i.id);
  return i;
}
/** The @names used in some text. */
export const mentions = (text: string): string[] => [...text.matchAll(/(^|[\s(,;:"'])@([A-Za-z0-9_-]{1,40})/g)].map((m) => m[2]);
/** Remove the @ from any @name that is not in the library, so a prompt never points at an image that does not exist. */
export function dropUnknownMentions(text: string, names: string[]): string {
  const ok = new Set(names.map((n) => n.toLowerCase()));
  return text.replace(/(^|[\s(,;:"'])@([A-Za-z0-9_-]{1,40})/g, (m, pre: string, n: string) => (ok.has(n.toLowerCase()) ? m : `${pre}${n}`));
}
