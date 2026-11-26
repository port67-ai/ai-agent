import { randomUUID } from "node:crypto";
import type { Database, Generation, VideoPlan, VideoPrompts, VideoReference, VideoSheet } from "./model";
import { MAX_CHAT, MAX_PLANS, MAX_REFERENCES, MAX_SHEETS, promptsFields, referenceFields, scriptFields, sheetFields, type ParsedVideo } from "./video-steps";

// State changes for Video steps plans (CHG-0115). Pure over a Database; the caller persists it.
const now = () => new Date().toISOString();
export const plansOf = (db: Database): VideoPlan[] => (db.videoPlans ||= []);
export const findPlan = (db: Database, commissionId: string, generation: Generation): VideoPlan | undefined => plansOf(db).find((p) => p.commissionId === commissionId && p.generation === generation);
/** The plan for a project and age group, created on first use. */
export function planFor(db: Database, commissionId: string, generation: Generation, actor: string): VideoPlan {
  let p = findPlan(db, commissionId, generation);
  if (p) return p;
  if (plansOf(db).length >= MAX_PLANS) throw new Error(`At most ${MAX_PLANS} video plans per customer account`);
  const at = now();
  p = { id: "vp_" + randomUUID().replace(/-/g, ""), commissionId, generation, references: [], chat: [], sheets: [], createdAt: at, updatedAt: at, updatedBy: actor };
  plansOf(db).push(p);
  return p;
}
const touch = (p: VideoPlan, actor: string) => { p.updatedAt = now(); p.updatedBy = actor; };

// ---- References
export function addReference(p: VideoPlan, d: Record<string, unknown>, actor: string, source: "producer" | "ai" = "producer"): VideoReference {
  if (p.references.length >= MAX_REFERENCES) throw new Error(`At most ${MAX_REFERENCES} references per plan`);
  const f = referenceFields(d);
  const r: VideoReference = { id: randomUUID(), title: f.title!, link: f.link!, why: f.why!, palette: f.palette!, composition: f.composition!, camera: f.camera!, film: f.film!, lens: f.lens!, searchTerms: f.searchTerms!, source, accepted: source === "producer", addedBy: actor, addedAt: now() };
  p.references.push(r); touch(p, actor);
  return r;
}
const refOf = (p: VideoPlan, id: unknown) => { const r = typeof id === "string" ? p.references.find((x) => x.id === id) : undefined; if (!r) throw new Error("Reference not found"); return r; };
export function updateReference(p: VideoPlan, id: unknown, d: Record<string, unknown>, actor: string) { Object.assign(refOf(p, id), Object.fromEntries(Object.entries(referenceFields(d, true)).filter(([, v]) => v !== undefined))); touch(p, actor); }
export function removeReference(p: VideoPlan, id: unknown, actor: string) { const r = refOf(p, id); p.references = p.references.filter((x) => x.id !== r.id); touch(p, actor); }
export function acceptReference(p: VideoPlan, id: unknown, accepted: unknown, actor: string) { if (typeof accepted !== "boolean") throw new Error("accepted must be true or false"); refOf(p, id).accepted = accepted; touch(p, actor); }

// ---- Script
export function saveScript(p: VideoPlan, d: Record<string, unknown>, actor: string) {
  p.script = { ...scriptFields(d), savedBy: actor, savedAt: now() };
  touch(p, actor);
}
export function addChat(p: VideoPlan, instruction: string, reply: string, actor: string) {
  p.chat.push({ id: randomUUID(), at: now(), by: actor, instruction: instruction.slice(0, 1000), reply: reply.slice(0, 600) });
  p.chat = p.chat.slice(-MAX_CHAT);
}

// ---- Sheets
export function addSheet(p: VideoPlan, d: Record<string, unknown>, actor: string, source: "producer" | "ai" = "producer"): VideoSheet {
  if (p.sheets.length >= MAX_SHEETS) throw new Error(`At most ${MAX_SHEETS} sheets per plan`);
  const f = sheetFields(d);
  if (p.sheets.some((s) => s.name.toLowerCase() === f.name!.toLowerCase() && s.kind === f.kind)) throw new Error("A sheet with that name already exists");
  const s: VideoSheet = { id: randomUUID(), kind: f.kind!, name: f.name!, description: f.description!, details: f.details!, source, accepted: source === "producer", addedBy: actor, addedAt: now() };
  p.sheets.push(s); touch(p, actor);
  return s;
}
const sheetOf = (p: VideoPlan, id: unknown) => { const s = typeof id === "string" ? p.sheets.find((x) => x.id === id) : undefined; if (!s) throw new Error("Sheet not found"); return s; };
export function updateSheet(p: VideoPlan, id: unknown, d: Record<string, unknown>, actor: string) { Object.assign(sheetOf(p, id), Object.fromEntries(Object.entries(sheetFields(d, true)).filter(([, v]) => v !== undefined))); touch(p, actor); }
export function removeSheet(p: VideoPlan, id: unknown, actor: string) { const s = sheetOf(p, id); p.sheets = p.sheets.filter((x) => x.id !== s.id); touch(p, actor); }
export function acceptSheet(p: VideoPlan, id: unknown, accepted: unknown, actor: string) { if (typeof accepted !== "boolean") throw new Error("accepted must be true or false"); sheetOf(p, id).accepted = accepted; touch(p, actor); }

// ---- Prompts
export function savePrompts(p: VideoPlan, d: Record<string, unknown>, actor: string) {
  if (!p.script || !p.prompts) throw new Error("Generate the prompts first");
  const f = promptsFields(d, p.script.narrative ? p.prompts.shots.length : p.script.shots.length);
  p.prompts = { ...p.prompts, overall: f.overall, shots: f.shots.map((s, i) => ({ ...p.prompts!.shots[i], ...s })), edited: true };
  touch(p, actor);
}

/** Store what an agent returned. References and sheets arrive unaccepted; a producer accepts them. Duplicates by name are skipped. */
export function storeParsed(p: VideoPlan, out: ParsedVideo, model: string, actor: string): number {
  if (out.step === "references") {
    p.referenceSummary = out.summary;
    let n = 0;
    for (const r of out.references) {
      if (p.references.length >= MAX_REFERENCES || p.references.some((x) => x.title.toLowerCase() === r.title.toLowerCase())) continue;
      addReference(p, r as unknown as Record<string, unknown>, actor, "ai"); n++;
    }
    return n;
  }
  if (out.step === "sheets") {
    let n = 0;
    for (const s of out.sheets) {
      if (p.sheets.length >= MAX_SHEETS || p.sheets.some((x) => x.name.toLowerCase() === s.name.toLowerCase() && x.kind === s.kind)) continue;
      addSheet(p, s, actor, "ai"); n++;
    }
    return n;
  }
  if (out.step === "prompts") {
    const v: VideoPrompts = { overall: out.overall, shots: out.shots, generatedAt: now(), by: actor, model };
    p.prompts = v; touch(p, actor);
    return out.shots.length;
  }
  return 0;
}
