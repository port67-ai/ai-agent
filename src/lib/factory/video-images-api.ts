import type { Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE } from "./customers";
import { CUSTOMER_ID, findCustomer } from "./customers-commands";
import { findCommission } from "./commissions-commands";
import { COMMISSION_ID } from "./commissions-commands";
import { IMAGE_LABEL, IMAGE_MAX_BYTES, attachImage, buildImage, findImage, imagesOf, newImageId, removeImage, sniffImage, updateImage } from "./video-images";
import { deleteImage, getImage, imageKey, putImage } from "./video-image-store";
import { videoWorkspace } from "./video-steps-run";

// Project image library routes (CHG-0116). Producers and admins only. The library belongs to one project, not to an age group.
//   GET  video-images/:customerId/:commissionId                       list
//   POST video-images/:customerId/:commissionId                       {action: update {id, name?, description?} | remove {id}}
//   POST video-images/:customerId/:commissionId/upload?name&description   raw image body
//   GET  video-images/:customerId/:commissionId/file/:imageId         the image, through this authorised route only
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const isVideoImageRoute = (path: string[]) => path[0] === "video-images";
export const isVideoImageUpload = (request: Request, path: string[]) => request.method === "POST" && path[0] === "video-images" && path.length === 4 && path[3] === "upload";

async function rawBody(request: Request, max: number): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) throw new Error("Image too large. " + IMAGE_LABEL);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) { await reader.cancel(); throw new Error("Image too large. " + IMAGE_LABEL); }
    parts.push(value);
  }
  if (declared && bytes !== declared) throw new Error("The upload was cut short; try again");
  return Buffer.concat(parts);
}
const bare = <T extends { storageKey: string }>(i: T): Omit<T, "storageKey"> => { const o = { ...i } as Partial<T>; delete o.storageKey; return o as Omit<T, "storageKey">; };
const view = (images: ReturnType<typeof imagesOf>) => images.map(bare);

export async function handleVideoImages(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "Video steps are not available in the synthetic demo" }, 403);
  const [, cid, commissionId, sub, fileId] = path;
  if (!CUSTOMER_ID.test(cid || "") || !COMMISSION_ID.test(commissionId || "")) return json({ error: "Not found" }, 404);
  findCustomer(await repository.read(CUSTOMERS_WORKSPACE), cid);
  findCommission(await repository.read(`factory-commissions-${cid}`), commissionId);
  const ws = videoWorkspace(cid);
  const get = request.method === "GET";

  if (path.length === 3) {
    if (get) return json({ images: view(imagesOf(await repository.read(ws), commissionId)) });
    const action = typeof data.action === "string" ? data.action : "";
    let removed: string | undefined;
    const db = await repository.mutate(ws, (d) => {
      if (action === "update") updateImage(d, commissionId, data.id, data);
      else if (action === "remove") removed = removeImage(d, commissionId, data.id).storageKey;
      else throw new Error("Unknown action");
      return d;
    });
    if (removed) await deleteImage(removed);
    return json({ images: view(imagesOf(db, commissionId)) });
  }

  if (path.length === 4 && sub === "upload" && request.method === "POST") {
    const url = new URL(request.url);
    const bytes = await rawBody(request, IMAGE_MAX_BYTES);
    if (!bytes.length) throw new Error("The file is empty");
    const mime = sniffImage(bytes);
    if (!mime) throw new Error("That file is not an accepted image. " + IMAGE_LABEL);
    const id = newImageId();
    const key = imageKey(cid, commissionId, id, mime);
    // Check room and the name first, then store the bytes, then record the reference (a failed store leaves no record).
    const probe = await repository.read(ws);
    if (imagesOf(probe, commissionId).length >= 60) throw new Error("At most 60 images per project. Delete one first.");
    await putImage(key, bytes, mime);
    let made;
    try {
      made = await repository.mutate(ws, (db) => { const img = buildImage(db, { id, commissionId, name: url.searchParams.get("name") || "image", title: url.searchParams.get("title") ?? undefined, category: url.searchParams.get("category") ?? undefined, description: url.searchParams.get("description") || "", mime, bytes: bytes.length, storageKey: key, actor: a.subject }); attachImage(db, img); return img; });
    } catch (e) { await deleteImage(key); throw e; }
    return json({ image: bare(made) }, 201);
  }

  if (path.length === 5 && sub === "file" && get) {
    const img = findImage(await repository.read(ws), commissionId, fileId);
    if (!img.storageKey.startsWith(`video-images/${cid}/${commissionId}/`)) throw new Error("Forbidden: file access");
    const bytes = await getImage(img.storageKey);
    return new Response(new Uint8Array(bytes), { headers: { "content-type": img.mime, "content-length": String(bytes.length), "content-disposition": `inline; filename="${img.name}.${img.mime.split("/")[1].replace("jpeg", "jpg")}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox; default-src 'none'" } });
  }
  return json({ error: "Not found" }, 404);
}
