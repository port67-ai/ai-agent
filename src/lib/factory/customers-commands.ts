import { randomUUID } from "node:crypto";
import type { BrandPurposeFile, CustomerAccount, Database, RedLine } from "./model";
import { MAX_AUDIT, MAX_CUSTOMERS, MAX_PURPOSE_FILES, MAX_RED_LINES, applySocials, brandTextFields, customerFields, redLineFields } from "./customers";

// State changes for video workspace customer accounts (FAC-VWS-004 to FAC-VWS-007). Pure over a Database; the caller persists it.
// Every change is attributed and audited. No command deletes a customer account: the reset is a separate, confirmed step (FAC-VWS-009).

const now = () => new Date().toISOString();
export const newCustomerId = () => "cust_" + randomUUID().replace(/-/g, "");
export const CUSTOMER_ID = /^cust_[a-f0-9]{32}$/;
const FILE_ID = /^[a-f0-9-]{36}$/;

export const customersOf = (db: Database): CustomerAccount[] => (db.customers ||= []);
export function findCustomer(db: Database, id: string): CustomerAccount {
  const c = CUSTOMER_ID.test(id) ? customersOf(db).find((x) => x.id === id) : undefined;
  if (!c) throw new Error("Customer account not found");
  return c;
}
function record(c: CustomerAccount, actor: string, action: string, detail: string) {
  const at = now();
  c.audit.push({ id: randomUUID(), at, actor, action, detail: detail.slice(0, 300) });
  if (c.audit.length > MAX_AUDIT) c.audit.splice(0, c.audit.length - MAX_AUDIT);
  c.updatedAt = at;
  c.updatedBy = actor;
}
function uniqueName(db: Database, name: string, except?: string) {
  if (customersOf(db).some((c) => c.id !== except && c.name.toLowerCase() === name.toLowerCase())) throw new Error("A customer account with that name already exists");
}

export function createCustomer(db: Database, input: Record<string, unknown>, actor: string): CustomerAccount {
  const f = customerFields(input, true);
  if (customersOf(db).length >= MAX_CUSTOMERS) throw new Error(`The workspace holds at most ${MAX_CUSTOMERS} customer accounts`);
  uniqueName(db, f.name!);
  const at = now();
  const c: CustomerAccount = { id: newCustomerId(), name: f.name!, website: f.website!, socials: {}, redLines: [], brandPurpose: [], createdAt: at, createdBy: actor, updatedAt: at, updatedBy: actor, audit: [] };
  record(c, actor, "customer_created", c.name);
  customersOf(db).push(c);
  return c;
}

export function updateCustomer(db: Database, id: string, input: Record<string, unknown>, actor: string): CustomerAccount {
  const c = findCustomer(db, id);
  const f = customerFields(input, false);
  if (f.name !== undefined && f.name !== c.name) { uniqueName(db, f.name, c.id); record(c, actor, "name_changed", `${c.name} to ${f.name}`); c.name = f.name; }
  if (f.website !== undefined && f.website !== c.website) { record(c, actor, "website_changed", f.website || "removed"); c.website = f.website; }
  return c;
}

export function saveSocials(db: Database, id: string, input: unknown, actor: string): CustomerAccount {
  const c = findCustomer(db, id);
  const next = applySocials(c.socials, input);
  const changed = [...new Set([...Object.keys(c.socials), ...Object.keys(next)])].filter((k) => (c.socials as Record<string, string>)[k] !== (next as Record<string, string>)[k]);
  if (!changed.length) return c;
  c.socials = next;
  record(c, actor, "social_links_saved", changed.join(", "));
  return c;
}

/** Save the typed brand purpose and what the brand is known for. Changed text needs authorising again before a model may read it. */
export function saveBrandText(db: Database, id: string, input: Record<string, unknown>, actor: string): CustomerAccount {
  const c = findCustomer(db, id);
  const f = brandTextFields(input);
  const changed = (["purposeText", "knownFor"] as const).filter((k) => f[k] !== undefined && f[k] !== (c[k] || ""));
  if (!changed.length) return c;
  for (const k of changed) c[k] = f[k];
  record(c, actor, "brand_text_saved", changed.map((k) => (k === "purposeText" ? "brand purpose" : "known for")).join(", "));
  if (c.textAuthorisation) { delete c.textAuthorisation; record(c, actor, "brand_text_authorisation_withdrawn", "the text changed"); }
  return c;
}
export function setTextAuthorisation(db: Database, id: string, authorise: unknown, actor: string) {
  if (typeof authorise !== "boolean") throw new Error("authorise must be true or false");
  const c = findCustomer(db, id);
  if (authorise) c.textAuthorisation = { authorisedBy: actor, at: now() };
  else delete c.textAuthorisation;
  record(c, actor, authorise ? "brand_text_authorised" : "brand_text_authorisation_withdrawn", "brand purpose and known for");
}

export function addRedLine(db: Database, id: string, input: Record<string, unknown>, actor: string): RedLine {
  const c = findCustomer(db, id);
  if (c.redLines.length >= MAX_RED_LINES) throw new Error(`At most ${MAX_RED_LINES} red lines per customer account`);
  const f = redLineFields(input);
  const line: RedLine = { id: randomUUID(), category: f.category!, text: f.text!, ...(f.reason ? { reason: f.reason } : {}), addedBy: actor, addedAt: now() };
  c.redLines.push(line);
  record(c, actor, "red_line_added", `${line.category}: ${line.text}`);
  return line;
}
function lineOf(c: CustomerAccount, lineId: unknown): RedLine {
  const line = typeof lineId === "string" ? c.redLines.find((l) => l.id === lineId) : undefined;
  if (!line) throw new Error("Red line not found");
  return line;
}
export function updateRedLine(db: Database, id: string, lineId: unknown, input: Record<string, unknown>, actor: string): RedLine {
  const c = findCustomer(db, id);
  const line = lineOf(c, lineId);
  const f = redLineFields(input, true);
  const before = `${line.category}: ${line.text}`;
  if (f.category !== undefined) line.category = f.category;
  if (f.text !== undefined) line.text = f.text;
  if (f.reason !== undefined) { if (f.reason) line.reason = f.reason; else delete line.reason; }
  line.updatedAt = now();
  record(c, actor, "red_line_changed", `${before} to ${line.category}: ${line.text}`);
  return line;
}
export function removeRedLine(db: Database, id: string, lineId: unknown, actor: string) {
  const c = findCustomer(db, id);
  const line = lineOf(c, lineId);
  c.redLines = c.redLines.filter((l) => l.id !== line.id);
  record(c, actor, "red_line_removed", `${line.category}: ${line.text}`);
}

export function attachPurpose(db: Database, id: string, file: BrandPurposeFile, actor: string) {
  const c = findCustomer(db, id);
  if (c.brandPurpose.length >= MAX_PURPOSE_FILES) throw new Error(`At most ${MAX_PURPOSE_FILES} brand purpose files per customer account; remove one first`);
  c.brandPurpose.push(file);
  record(c, actor, "purpose_uploaded", `${file.name} (${file.mime}, ${file.bytes} bytes)`);
}
function fileOf(c: CustomerAccount, fileId: unknown): BrandPurposeFile {
  const f = typeof fileId === "string" && FILE_ID.test(fileId) ? c.brandPurpose.find((x) => x.id === fileId) : undefined;
  if (!f) throw new Error("File not found");
  return f;
}
export const purposeFile = (db: Database, id: string, fileId: unknown) => fileOf(findCustomer(db, id), fileId);
/** Record or withdraw a producer's authorisation for models to read one file's content. Nothing reads a file without it. */
export function setPurposeAuthorisation(db: Database, id: string, fileId: unknown, authorise: unknown, actor: string) {
  if (typeof authorise !== "boolean") throw new Error("authorise must be true or false");
  const c = findCustomer(db, id);
  const f = fileOf(c, fileId);
  if (authorise) f.modelAuthorisation = { authorisedBy: actor, at: now() };
  else delete f.modelAuthorisation;
  record(c, actor, authorise ? "purpose_model_authorised" : "purpose_model_authorisation_withdrawn", f.name);
}
/** Remove the reference. The stored file stays in private storage, as with studio uploads. */
export function removePurpose(db: Database, id: string, fileId: unknown, actor: string) {
  const c = findCustomer(db, id);
  const f = fileOf(c, fileId);
  c.brandPurpose = c.brandPurpose.filter((x) => x.id !== f.id);
  record(c, actor, "purpose_removed", f.name);
}
