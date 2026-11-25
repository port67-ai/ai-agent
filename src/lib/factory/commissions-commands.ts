import { randomUUID } from "node:crypto";
import type { BrandListEntry, Commission, CommissionInput, Database, EvidenceItem, Generation } from "./model";
import { GENERATIONS, generationDef, generationKey, MAX_COMMISSIONS, MAX_EVIDENCE, MAX_LIST, answerFields, commissionName, emptyAnswers, evidenceFields, inputDef, listEntryFields, listName, type ListName } from "./commissions";
import { MAX_AUDIT } from "./customers";

// State changes for commissions (FAC-VWS-011 to FAC-VWS-014). Pure over a Database; the caller persists it. Every change is audited.
const now = () => new Date().toISOString();
export const COMMISSION_ID = /^comm_[a-f0-9]{32}$/;
export const commissionsOf = (db: Database): Commission[] => (db.commissions ||= []);
export function findCommission(db: Database, id: string): Commission {
  const c = COMMISSION_ID.test(id) ? commissionsOf(db).find((x) => x.id === id) : undefined;
  if (!c) throw new Error("Project not found");
  return c;
}
function record(c: Commission, actor: string, action: string, detail: string) {
  const at = now();
  c.audit.push({ id: randomUUID(), at, actor, action, detail: detail.slice(0, 300) });
  if (c.audit.length > MAX_AUDIT) c.audit.splice(0, c.audit.length - MAX_AUDIT);
  c.updatedAt = at;
  c.updatedBy = actor;
}

export function createCommission(db: Database, customerId: string, data: Record<string, unknown>, actor: string): Commission {
  const name = commissionName(data.name);
  if (commissionsOf(db).length >= MAX_COMMISSIONS) throw new Error(`At most ${MAX_COMMISSIONS} projects per customer account`);
  if (commissionsOf(db).some((x) => x.name.toLowerCase() === name.toLowerCase())) throw new Error("This customer account already has a project with that name");
  const at = now();
  const c: Commission = {
    id: "comm_" + randomUUID().replace(/-/g, ""), customerId, name, answers: emptyAnswers(), preserve: [], change: [], wentTooFar: "", evidence: [], confirmed: {},
    createdAt: at, createdBy: actor, updatedAt: at, updatedBy: actor, audit: [],
  };
  record(c, actor, "project_created", name);
  commissionsOf(db).push(c);
  return c;
}

export function renameCommission(db: Database, id: string, nameValue: unknown, actor: string): Commission {
  const c = findCommission(db, id);
  const name = commissionName(nameValue);
  if (name === c.name) return c;
  if (commissionsOf(db).some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase())) throw new Error("This customer account already has a project with that name");
  record(c, actor, "project_renamed", `${c.name} to ${name}`);
  c.name = name;
  return c;
}

/** Save the prompts sent for one input. Only changed prompts are recorded. */
export function saveAnswers(db: Database, id: string, input: unknown, answers: unknown, actor: string): Commission {
  const c = findCommission(db, id);
  if (input === "audience") throw new Error("Save the audience answers for an age group");
  const f = answerFields(input, answers);
  const changed = Object.entries(f.answers).filter(([k, v]) => (c.answers[f.input][k] || "") !== v);
  if (!changed.length) return c;
  for (const [k, v] of changed) { if (v) c.answers[f.input][k] = v; else delete c.answers[f.input][k]; }
  record(c, actor, "answers_saved", `${inputDef(f.input)!.title}: ${changed.length} answer${changed.length === 1 ? "" : "s"}`);
  return c;
}

const listOf = (c: Commission, list: ListName) => c[list];
function entryOf(c: Commission, list: ListName, entryId: unknown): BrandListEntry {
  const e = typeof entryId === "string" ? listOf(c, list).find((x) => x.id === entryId) : undefined;
  if (!e) throw new Error("Entry not found");
  return e;
}
export function addListEntry(db: Database, id: string, listValue: unknown, data: Record<string, unknown>, actor: string): BrandListEntry {
  const c = findCommission(db, id);
  const list = listName(listValue);
  if (listOf(c, list).length >= MAX_LIST) throw new Error(`At most ${MAX_LIST} entries in this list`);
  const f = listEntryFields(list, data);
  const entry: BrandListEntry = { id: randomUUID(), text: f.text!, scope: f.scope!, ...(f.kind ? { kind: f.kind } : {}), addedBy: actor, addedAt: now() };
  listOf(c, list).push(entry);
  record(c, actor, `${list}_added`, entry.text);
  return entry;
}
export function updateListEntry(db: Database, id: string, listValue: unknown, entryId: unknown, data: Record<string, unknown>, actor: string): BrandListEntry {
  const c = findCommission(db, id);
  const list = listName(listValue);
  const e = entryOf(c, list, entryId);
  const f = listEntryFields(list, data, true);
  if (f.text !== undefined) e.text = f.text;
  if (f.scope !== undefined) e.scope = f.scope;
  if (f.kind !== undefined) e.kind = f.kind;
  record(c, actor, `${list}_changed`, e.text);
  return e;
}
export function removeListEntry(db: Database, id: string, listValue: unknown, entryId: unknown, actor: string) {
  const c = findCommission(db, id);
  const list = listName(listValue);
  const e = entryOf(c, list, entryId);
  c[list] = listOf(c, list).filter((x) => x.id !== e.id);
  record(c, actor, `${list}_removed`, e.text);
}

export function saveWentTooFar(db: Database, id: string, value: unknown, actor: string): Commission {
  const c = findCommission(db, id);
  if (value !== undefined && value !== null && typeof value !== "string") throw new Error("The example must be text");
  const text = String(value || "").trim();
  if (text.length > 2000) throw new Error("The example must be text up to 2000 characters");
  if (text === c.wentTooFar) return c;
  c.wentTooFar = text;
  record(c, actor, "went_too_far_saved", text.slice(0, 120) || "cleared");
  return c;
}

function evidenceOf(c: Commission, evidenceId: unknown): EvidenceItem {
  const e = typeof evidenceId === "string" ? c.evidence.find((x) => x.id === evidenceId) : undefined;
  if (!e) throw new Error("Evidence not found");
  return e;
}
export function addEvidence(db: Database, id: string, input: unknown, data: Record<string, unknown>, actor: string): EvidenceItem {
  const c = findCommission(db, id);
  const def = inputDef(String(input));
  if (!def) throw new Error("Unknown input");
  if (c.evidence.filter((e) => e.input === def.key).length >= MAX_EVIDENCE) throw new Error(`At most ${MAX_EVIDENCE} evidence items per input`);
  const f = evidenceFields(data);
  const item: EvidenceItem = { id: randomUUID(), input: def.key as CommissionInput, source: f.source!, where: f.where!, note: f.note!, basis: f.basis!, addedBy: actor, addedAt: now() };
  c.evidence.push(item);
  record(c, actor, "evidence_added", `${def.title}: ${item.source}`);
  return item;
}
export function updateEvidence(db: Database, id: string, evidenceId: unknown, data: Record<string, unknown>, actor: string): EvidenceItem {
  const c = findCommission(db, id);
  const e = evidenceOf(c, evidenceId);
  const f = evidenceFields(data, true);
  Object.assign(e, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)));
  record(c, actor, "evidence_changed", e.source);
  return e;
}
export function removeEvidence(db: Database, id: string, evidenceId: unknown, actor: string) {
  const c = findCommission(db, id);
  const e = evidenceOf(c, evidenceId);
  c.evidence = c.evidence.filter((x) => x.id !== e.id);
  record(c, actor, "evidence_removed", e.source);
}

/** Objective and audience should be confirmed directly with the client; the producer ticks when they have. */
export function setConfirmed(db: Database, id: string, input: unknown, confirmed: unknown, actor: string) {
  if (input !== "objective" && input !== "audience") throw new Error("Only the objective and the audience are confirmed with the client");
  if (typeof confirmed !== "boolean") throw new Error("confirmed must be true or false");
  const c = findCommission(db, id);
  if (confirmed) c.confirmed[input] = { by: actor, at: now() };
  else delete c.confirmed[input];
  record(c, actor, confirmed ? "confirmed_with_client" : "confirmation_withdrawn", input);
}

/** Record that an AI draft was produced for an input. The draft itself is not stored; only a person's Save answers is. */
export function recordDraft(db: Database, id: string, input: string, dossierVersion: number, actor: string, generation?: string): Commission {
  const c = findCommission(db, id);
  record(c, actor, "ai_draft_generated", `${inputDef(input)?.title || input}${generation ? `, ${generationDef(generation)?.label || generation}` : ""} from Brand Intelligence version ${dossierVersion}`);
  return c;
}

/** Save Input 4 answers for one age group. Empty answers remove the group (and its selection). `ai` marks answers that began as an AI draft. */
export function saveAudience(db: Database, id: string, generation: unknown, answers: unknown, actor: string, ai = false): Commission {
  const c = findCommission(db, id);
  const g = generationKey(generation);
  const f = answerFields("audience", answers);
  const label = generationDef(g)!.label;
  const merged = { ...(c.audience?.[g]?.answers || {}), ...f.answers };
  for (const k of Object.keys(merged)) if (!merged[k]) delete merged[k];
  c.audience ||= {};
  if (!Object.keys(merged).length) {
    delete c.audience[g];
    c.directionGenerations = (c.directionGenerations || []).filter((x) => x !== g);
    record(c, actor, "audience_cleared", label);
    return c;
  }
  c.audience[g] = { answers: merged, savedAt: now(), savedBy: actor, ...(ai ? { ai: true } : {}) };
  record(c, actor, "audience_saved", `${label}: ${Object.keys(merged).length} answers`);
  return c;
}

/** Choose the age groups to take forward to direction. Only saved groups can be chosen; none is allowed, but direction needs at least one. */
export function setDirection(db: Database, id: string, generations: unknown, actor: string): Commission {
  const c = findCommission(db, id);
  if (!Array.isArray(generations)) throw new Error("generations must be a list");
  const keys = [...new Set(generations.map(generationKey))] as Generation[];
  for (const g of keys) if (!c.audience?.[g]) throw new Error(`Save the answers for ${generationDef(g)!.label} first`);
  const ordered = GENERATIONS.map((g) => g.key).filter((k) => keys.includes(k));
  c.directionGenerations = ordered;
  record(c, actor, "direction_selection", ordered.length ? ordered.map((k) => generationDef(k)!.label).join(", ") : "none selected");
  return c;
}
