import { randomUUID } from "node:crypto";
import type { BrandPurposeFile, Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE, PURPOSE_LABEL, PURPOSE_MAX_BYTES, PURPOSE_MIMES, sniffPurpose } from "./customers";
import { CUSTOMER_ID, addRedLine, attachPurpose, createCustomer, customersOf, findCustomer, purposeFile, removePurpose, removeRedLine, saveBrandText, saveSocials, setPurposeAuthorisation, setTextAuthorisation, updateCustomer, updateRedLine } from "./customers-commands";
import { getPurposeFile, purposeKey, putPurposeFile } from "./customer-store";
import { findSocialsOnWebsite } from "./site-links";

// Video workspace customer account routes (CHG-0103). Producers and admins only; customers and the demo are refused.
//   GET  customers                          list
//   POST customers                          create {name, website?}
//   GET  customers/:id                      one record
//   POST customers/:id                      {action: update | socials | find-socials | brand-text | brand-text-authorise | red-line-add | red-line-update | red-line-remove | purpose-authorise | purpose-remove, ...}
//   POST customers/:id/purpose?name&rights  raw file body (brand purpose upload)
//   GET  customers/:id/purpose/:fileId      the file, through this authorised route only

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

/** True for the raw-body upload route, so the service does not try to read the body as JSON. */
export const isCustomerUpload = (request: Request, path: string[]) => request.method === "POST" && path.length === 3 && path[0] === "customers" && path[2] === "purpose";
export const isCustomerRoute = (path: string[]) => path[0] === "customers";
/** Test seam only: lets tests answer "Find from website" without network access. Never set in production code. */
export const testHooks: { siteDeps?: Parameters<typeof findSocialsOnWebsite>[1] } = {};

async function rawBody(request: Request, max: number): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) throw new Error("File too large. " + PURPOSE_LABEL);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) { await reader.cancel(); throw new Error("File too large. " + PURPOSE_LABEL); }
    parts.push(value);
  }
  if (declared && bytes !== declared) throw new Error("The upload was cut short; try again");
  return Buffer.concat(parts);
}

export async function handleCustomers(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "Customer accounts are not available in the synthetic demo" }, 403);
  const actor = a.subject;
  const get = request.method === "GET";
  const [, id, sub, fileId] = path;

  if (path.length === 1) {
    if (get) return json({ customers: customersOf(await repository.read(CUSTOMERS_WORKSPACE)) });
    const customer = await repository.mutate(CUSTOMERS_WORKSPACE, (db) => createCustomer(db, data, actor));
    return json({ customer }, 201);
  }
  if (!CUSTOMER_ID.test(id || "")) return json({ error: "Customer account not found" }, 404);

  if (path.length === 2) {
    if (get) return json({ customer: findCustomer(await repository.read(CUSTOMERS_WORKSPACE), id) });
    const action = typeof data.action === "string" ? data.action : "";
    if (action === "find-socials") {
      // Read-only and free: fetches the saved website only, saves nothing. A producer confirms what to keep.
      const customer = findCustomer(await repository.read(CUSTOMERS_WORKSPACE), id);
      if (!customer.website) throw new Error("Save the website first, then look for its social links");
      return json({ ...(await findSocialsOnWebsite(customer.website, testHooks.siteDeps)), existing: customer.socials });
    }
    const customer = await repository.mutate(CUSTOMERS_WORKSPACE, (db) => {
      if (action === "update") return updateCustomer(db, id, data, actor);
      if (action === "socials") return saveSocials(db, id, data.socials, actor);
      if (action === "brand-text") return saveBrandText(db, id, data, actor);
      if (action === "brand-text-authorise") { setTextAuthorisation(db, id, data.authorise, actor); return findCustomer(db, id); }
      if (action === "red-line-add") { addRedLine(db, id, data, actor); return findCustomer(db, id); }
      if (action === "red-line-update") { updateRedLine(db, id, data.lineId, data, actor); return findCustomer(db, id); }
      if (action === "red-line-remove") { removeRedLine(db, id, data.lineId, actor); return findCustomer(db, id); }
      if (action === "purpose-authorise") { setPurposeAuthorisation(db, id, data.fileId, data.authorise, actor); return findCustomer(db, id); }
      if (action === "purpose-remove") { removePurpose(db, id, data.fileId, actor); return findCustomer(db, id); }
      throw new Error("Unknown action");
    });
    return json({ customer });
  }

  if (sub !== "purpose") return json({ error: "Not found" }, 404);

  if (path.length === 3 && request.method === "POST") {
    const url = new URL(request.url);
    if (url.searchParams.get("rights") !== "confirmed") throw new Error("Confirm that you have the right to use this file");
    findCustomer(await repository.read(CUSTOMERS_WORKSPACE), id);
    const bytes = await rawBody(request, PURPOSE_MAX_BYTES);
    if (!bytes.length) throw new Error("The file is empty");
    const mime = sniffPurpose(bytes);
    if (!mime || !(PURPOSE_MIMES as readonly string[]).includes(mime)) throw new Error("That file type is not accepted here. " + PURPOSE_LABEL);
    const at = new Date().toISOString();
    const name = ((url.searchParams.get("name") || "").slice(0, 200).replace(/[^\w .()-]/g, "_").trim() || "upload").slice(0, 120);
    const file: BrandPurposeFile = { id: randomUUID(), name, mime, bytes: bytes.length, storageKey: "", uploadedAt: at, uploadedBy: actor, rights: { confirmedBy: actor, at } };
    file.storageKey = purposeKey(id, file.id, mime);
    // Bytes go to the private store first; only the reference is written to the record.
    await putPurposeFile(file.storageKey, bytes, mime);
    const customer = await repository.mutate(CUSTOMERS_WORKSPACE, (db) => { attachPurpose(db, id, file, actor); return findCustomer(db, id); });
    return json({ customer, file }, 201);
  }

  if (path.length === 4 && get) {
    const file = purposeFile(await repository.read(CUSTOMERS_WORKSPACE), id, fileId);
    if (!file.storageKey.startsWith(`customers/${id}/`)) throw new Error("Forbidden: file access");
    const bytes = await getPurposeFile(file.storageKey);
    const image = file.mime.startsWith("image/");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": file.mime,
        "content-length": String(bytes.length),
        "content-disposition": `${image ? "inline" : "attachment"}; filename="${file.name.replace(/[^\w .()-]/g, "_")}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'",
      },
    });
  }
  return json({ error: "Not found" }, 404);
}
