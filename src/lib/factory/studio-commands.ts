// Studio commands applied inside engine.transition (CHG-0097). Every gate and piece action writes its own audit entry here; the
// transition adds the usual revision entry and the request-id replay protection.
import { randomUUID } from "node:crypto";
import { humanProducerApprovals, producerApprovalsOn } from "./approval-mode";
import { planProject } from "./task-plan";
import type { Principal, Project, StudioAssetRef, StudioStage, StudioState } from "./model";
import {
  STUDIO_GATE_APPROVER,
  STUDIO_STAGE_LABELS,
  addPieceVersion,
  addStudioPiece,
  approveStudioGate,
  bridgeStudioBrief,
  commentPiece,
  findPiece,
  isStudioStage,
  removeStudioPiece,
  studioAssetRefs,
  currentStudioStage,
  normaliseStudioBrief,
  offerInfo,
  pieceImpact,
  removeBriefAsset,
  reopenStudioGate,
  requireIntakeEditable,
  requirePieceEditable,
  rerunBrief,
  resolveComment,
  selectableOffer,
  setPieceStatus,
  studioStageVisibleToClient,
} from "./studio";
// Registers the Stage 2 and Stage 3 gate checks (piece B) before any gate is approved on the server.
import { gateBlockers } from "./studio-gates";
// Registers the gate 4 check (piece C).
import { claimFlags, deliverables, disclosureFingerprint, ensureGtm, needsSafeZone, pieceFingerprint, scopeFingerprint, specCheck } from "./studio-gtm";
import { MAX_LOOPS, applyProductionPlan, fileOf, planLoops, planProduction, requireProductionOpen } from "./studio-production";

export const STUDIO_COMMANDS = new Set([
  "updateStudioBrief",
  "setStudioOffer",
  "removeStudioAsset",
  "approveStudioGate",
  "approveStudioGateWithNote",
  "reopenStudioGate",
  "addStudioPiece",
  "editStudioPiece",
  "commentStudioPiece",
  "resolveStudioComment",
  "setStudioPieceStatus",
  "requestStudioRerun",
  "setStudioReadyForClient",
  // Piece C (Stage 4 and go-to-market records).
  "prepareStudioProduction",
  "setStudioLoops",
  "removeStudioPiece",
  "confirmStudioGtm",
  "confirmStudioPieceCheck",
  "addStudioRights",
  "removeStudioRights",
  "setStudioAssetRights",
  "clearStudioClaimFlag",
  "setStudioWinner",
]);
const now = () => new Date().toISOString();
const requireOperator = (a: Principal) => {
  if (a.role !== "operator") throw new Error("Requires operator role");
};
export function requireStudio(p: Project): StudioState {
  if (!p.studio) throw new Error("This is not a studio project");
  return p.studio;
}
/** True when a producer may act for the client on a client gate (the existing PORT67_ACCOUNT_APPROVALS behaviour). */
export const producerMayActForClient = () => producerApprovalsOn() || humanProducerApprovals();
/** Who may act on a stage's gate or its pieces' approval. Returns whether the action is on the client's behalf. */
function clientGateActor(stage: StudioStage, a: Principal): { onBehalf: boolean } {
  if (STUDIO_GATE_APPROVER[stage] === "producer") {
    requireOperator(a);
    return { onBehalf: false };
  }
  if (a.role === "customer") return { onBehalf: false };
  if (!producerMayActForClient()) throw new Error("Customer approval identity required");
  return { onBehalf: true };
}
function audit(p: Project, a: Principal, action: string, detail: string) {
  p.audit.push({ id: randomUUID(), at: now(), actor: a.subject, role: a.role, action, detail: detail.slice(0, 600) });
}
const stageOf = (value: unknown): StudioStage => {
  if (!isStudioStage(value)) throw new Error("Unknown studio stage");
  return value;
};
const textOf = (value: unknown, name: string, max: number) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) throw new Error(`${name} must be text up to ${max} characters`);
  return value.trim();
};
/**
 * Gate 1 bridge: map the studio brief onto the existing brief, launch channels and requested formats, then build the studio task
 * plan (brand, customer, competitor, creative, channel). A changed brief revokes the AI authorisation, as a brief edit does today.
 * Nothing paid starts here.
 */
export function bridgeAtGate1(p: Project, actor: string) {
  const s = requireStudio(p);
  const { brief, channels } = bridgeStudioBrief(s);
  if (JSON.stringify(brief) !== JSON.stringify(p.brief)) {
    p.brief = brief;
    delete p.aiConsent;
  }
  p.channels = channels;
  delete p.researchPlanning;
  // The offer fixes the format (piece B): the classic format choice is recorded as decided by the offer, so the direction is written
  // for it and no format step waits for a person.
  const selected = [...(brief.requestedFormats || [])];
  if (JSON.stringify(p.formats?.selected || []) !== JSON.stringify(selected) || !p.formats?.decidedAt) {
    const at = now();
    p.formats = { suggested: [], suggestedAt: at, suggestedBy: "rules", selected, decidedBy: `Fixed by the ${offerInfo(s.offer)?.label || "studio"} offer`, decidedAt: at };
  }
  planProject(p, actor, "Studio intake approved (gate 1)");
}
/** Apply one studio command to a cloned project. Returns true when a producer acted on the client's behalf. */
export function applyStudioCommand(p: Project, c: Record<string, unknown>, a: Principal, type: string): boolean {
  const s = requireStudio(p);
  const ctx = { by: a.subject };
  if (type === "updateStudioBrief") {
    requireIntakeEditable(s);
    const next = normaliseStudioBrief(c.brief, s.brief);
    if (JSON.stringify(next) === JSON.stringify(s.brief)) throw new Error("Nothing changed in the intake");
    s.brief = next;
    s.briefVersion++;
    audit(p, a, "studio_brief_updated", `Intake v${s.briefVersion} saved`);
    return false;
  }
  if (type === "setStudioOffer") {
    requireIntakeEditable(s);
    const offer = selectableOffer(c.offer);
    if (offer === s.offer) throw new Error("That offer is already chosen");
    const before = s.offer;
    s.offer = offer;
    s.briefVersion++;
    audit(p, a, "studio_offer_changed", `Offer changed from ${before} to ${offer}`);
    return false;
  }
  if (type === "removeStudioAsset") {
    const removed = removeBriefAsset(s, textOf(c.assetId, "File", 100));
    audit(p, a, "studio_asset_removed", `${removed.name} (${removed.mime}) removed from the intake; the stored file is kept`);
    return false;
  }
  if (type === "approveStudioGate" || type === "approveStudioGateWithNote") {
    const stage = stageOf(c.stage);
    const { onBehalf } = clientGateActor(stage, a);
    requireClientCanSee(s, stage, a);
    const withNote = type === "approveStudioGateWithNote";
    const note = textOf(c.note, "Note", 2000);
    const gaps = withNote ? gateBlockers(s, stage, p) : [];
    approveStudioGate(s, stage, { by: onBehalf ? `${a.subject} (on behalf of the client)` : a.subject, withNote, note, onBehalfOfClient: onBehalf, project: p });
    audit(p, a, "studio_gate_approved", `${STUDIO_STAGE_LABELS[stage]} approved${withNote ? ` with a note: ${note}` : ""}${gaps.length ? `. Outstanding at approval: ${gaps.join("; ")}` : ""}${onBehalf ? " (on behalf of the client)" : ""}`);
    if (stage === "production") audit(p, a, "studio_delivered", `Final work approved${onBehalf ? " on behalf of the client" : ""}; the project is delivered with ${deliverables(s).filter((x) => x.status === "approved" && fileOf(x)).length} approved files in the delivery pack`);
    if (stage === "intake") {
      bridgeAtGate1(p, a.subject);
      audit(p, a, "studio_bridge", `Studio brief mapped to the research engine: channels ${(p.channels || []).join(", ")}; formats ${(p.brief.requestedFormats || []).join(", ")}; research ${(p.taskPlan?.research || []).join(", ")}`);
    }
    return onBehalf;
  }
  if (type === "reopenStudioGate") {
    requireOperator(a);
    const stage = stageOf(c.stage);
    const note = textOf(c.note, "Reason", 2000);
    const before = new Set(Object.values(s.gates).filter((g) => g.status === "stale").map((g) => g.stage));
    reopenStudioGate(s, stage, { by: a.subject, note });
    const stale = Object.values(s.gates).filter((g) => g.status === "stale" && !before.has(g.stage)).map((g) => STUDIO_STAGE_LABELS[g.stage]);
    audit(p, a, "studio_gate_reopened", `${STUDIO_STAGE_LABELS[stage]} reopened${note ? `: ${note}` : ""}${stale.length ? `. Now out of date: ${stale.join(", ")}` : ""}`);
    return false;
  }
  if (type === "addStudioPiece") {
    requireOperator(a);
    const dependsOn = Array.isArray(c.dependsOn) ? c.dependsOn.filter((x): x is string => typeof x === "string") : [];
    const piece = addStudioPiece(s, { stage: stageOf(c.stage), kind: textOf(c.kind, "Piece kind", 40), title: textOf(c.title, "Piece title", 160), dependsOn }, ctx);
    const text = textOf(c.text, "Piece text", 20000);
    if (text) addPieceVersion(s, piece.id, { text, source: "human" }, ctx);
    audit(p, a, "studio_piece_added", `${piece.title} (${piece.kind}) added to ${STUDIO_STAGE_LABELS[piece.stage]}`);
    return false;
  }
  if (type === "editStudioPiece") {
    requireOperator(a);
    const piece = findPiece(s, c.pieceId);
    const { version, stale } = addPieceVersion(s, piece.id, { text: textOf(c.text, "Piece text", 20000), source: "human" }, ctx);
    audit(p, a, "studio_piece_edited", `${piece.title}: version ${version.n} written by hand${stale.length ? `; ${stale.length} dependent pieces now out of date` : ""}`);
    return false;
  }
  if (type === "commentStudioPiece") {
    const piece = findPiece(s, c.pieceId);
    requireClientCanSee(s, piece.stage, a);
    const comment = commentPiece(s, piece.id, { text: c.text, region: c.region }, ctx);
    audit(p, a, "studio_piece_commented", `${piece.title}: ${comment.region ? "marked-up " : ""}comment added`);
    return false;
  }
  if (type === "resolveStudioComment") {
    requireOperator(a);
    const piece = findPiece(s, c.pieceId);
    resolveComment(s, piece.id, c.commentId);
    audit(p, a, "studio_comment_resolved", `${piece.title}: comment resolved`);
    return false;
  }
  if (type === "setStudioPieceStatus") {
    const piece = findPiece(s, c.pieceId);
    requireClientCanSee(s, piece.stage, a);
    const onBehalf = a.role === "operator" ? false : clientGateActor(piece.stage, a).onBehalf;
    const note = textOf(c.note, "Note", 2000);
    if (c.status === "changes_requested" && note) commentPiece(s, piece.id, { text: note }, ctx);
    setPieceStatus(s, piece.id, c.status);
    audit(p, a, c.status === "approved" ? "studio_piece_approved" : "studio_piece_changes_requested", `${piece.title}, version ${piece.versions.length}${note ? `: ${note}` : ""}`);
    return onBehalf;
  }
  if (type === "requestStudioRerun") {
    requireOperator(a);
    if (c.confirm !== true) throw new Error("Confirm the rerun after checking which pieces it affects");
    const piece = findPiece(s, c.pieceId);
    requirePieceEditable(s, piece);
    const instruction = textOf(c.instruction, "Instruction", 2000);
    s.rerunRequests ||= [];
    if (s.rerunRequests.some((r) => r.pieceId === piece.id && (r.status === "pending" || r.status === "running")) && c.replace !== true)
      throw new Error("A rerun of this piece is already waiting");
    for (const r of s.rerunRequests) if (r.pieceId === piece.id && r.status === "pending") { r.status = "failed"; r.error = "Replaced by a newer request"; r.finishedAt = now(); }
    const impact = pieceImpact(s, piece.id);
    s.rerunRequests.push({ id: randomUUID(), pieceId: piece.id, at: now(), by: a.subject, brief: rerunBrief(piece, instruction), ...(instruction ? { instruction } : {}), impact, status: "pending" });
    if (s.rerunRequests.length > 100) s.rerunRequests.splice(0, s.rerunRequests.length - 100);
    audit(p, a, "studio_rerun_requested", `${piece.title}: rerun requested; ${impact.length} dependent pieces will be marked out of date`);
    return false;
  }
  if (type === "setStudioReadyForClient") {
    requireOperator(a);
    const stage = stageOf(c.stage);
    if (STUDIO_GATE_APPROVER[stage] !== "client") throw new Error("Only client stages (pre-production and production) are shared for client review");
    const g = s.gates[stage].status;
    if (g !== "active" && g !== "stale") throw new Error("Only an open stage can be shared for client review");
    if (c.ready === false) {
      if (!s.readyForClient?.[stage]) throw new Error("This stage is not shared with the client");
      delete s.readyForClient[stage];
      audit(p, a, "studio_client_review_withdrawn", `${STUDIO_STAGE_LABELS[stage]} withdrawn from client review`);
      return false;
    }
    if (!s.pieces.some((x) => x.stage === stage && x.versions.length)) throw new Error("Nothing to show the client yet: draft the pieces first");
    if (s.readyForClient?.[stage]) throw new Error("This stage is already shared for client review");
    (s.readyForClient ||= {})[stage] = { at: now(), by: a.subject };
    audit(p, a, "studio_client_review_ready", `${STUDIO_STAGE_LABELS[stage]} marked ready for client review`);
    return false;
  }
  if (applyProductionCommand(p, s, c, a, type)) return false;
  throw new Error("Unsupported command");
}
const RIGHTS_KINDS = ["music", "voice", "font", "footage", "image", "other"] as const;
/** Stage 4 commands (piece C): preparing production pieces and the go-to-market records a producer decides. Producers only. */
function applyProductionCommand(p: Project, s: StudioState, c: Record<string, unknown>, a: Principal, type: string): boolean {
  const known = ["prepareStudioProduction", "setStudioLoops", "removeStudioPiece", "confirmStudioGtm", "confirmStudioPieceCheck", "addStudioRights", "removeStudioRights", "setStudioAssetRights", "clearStudioClaimFlag", "setStudioWinner"];
  if (!known.includes(type)) return false;
  requireOperator(a);
  const at = now();
  if (type === "setStudioWinner") {
    // Winners are marked once results come in, so this works after delivery too.
    const stage = currentStudioStage(s);
    if (stage !== "production" && stage !== "delivered") throw new Error("Winners are marked in Production or after delivery");
    const piece = findPiece(s, c.pieceId);
    if (piece.stage !== "production" || piece.status !== "approved" || !fileOf(piece)) throw new Error("Only approved production pieces with a file can be winners");
    const g = ensureGtm(s);
    const on = c.winner !== false;
    g.winners = g.winners.filter((x) => x !== piece.id);
    if (on) g.winners.push(piece.id);
    audit(p, a, "studio_winner_marked", `${piece.title} ${on ? "marked as a winner" : "no longer a winner"}`);
    return true;
  }
  requireProductionOpen(s);
  const g = ensureGtm(s);
  if (type === "prepareStudioProduction") {
    const plan = planProduction(s);
    if (!plan.create.length) throw new Error(plan.existing ? "Production is already prepared; nothing new to add" : `Nothing to prepare${plan.skipped.length ? `: ${plan.skipped.slice(0, 3).join("; ")}` : ": approve scenes or hooks in pre-production first"}`);
    const made = applyProductionPlan(s, plan, { by: a.subject });
    audit(p, a, "studio_production_prepared", `${made.length} production pieces prepared (${plan.existing} already there)${plan.skipped.length ? `. Skipped: ${plan.skipped.join("; ")}` : ""}`);
    return true;
  }
  if (type === "setStudioLoops") {
    const count = typeof c.count === "number" ? c.count : Number(c.count);
    const plan = planLoops(s, count);
    const made = applyProductionPlan(s, plan, { by: a.subject });
    g.loops = Math.max(g.loops || 0, Math.min(MAX_LOOPS, count));
    audit(p, a, "studio_loops_added", `${made.length} motion loop pieces added (${plan.existing} already there)`);
    return true;
  }
  if (type === "removeStudioPiece") {
    const piece = removeStudioPiece(s, c.pieceId);
    g.winners = g.winners.filter((x) => x !== piece.id);
    audit(p, a, "studio_piece_removed", `${piece.title} removed from the pack${piece.versions.length ? `; its ${piece.versions.length} stored version file(s) are kept in private storage` : ""}`);
    return true;
  }
  if (type === "confirmStudioGtm") {
    const note = textOf(c.note, "Note", 600);
    if (c.check === "scope") {
      if (!deliverables(s).length) throw new Error("Prepare production first");
      if (!note) throw new Error("Record the revision rounds agreed with the client in the note");
      g.scope = { by: a.subject, at, fingerprint: scopeFingerprint(s), note };
    } else if (c.check === "disclosure") {
      if (!deliverables(s).some((x) => fileOf(x))) throw new Error("Draw or upload the pieces first");
      g.disclosure = { by: a.subject, at, fingerprint: disclosureFingerprint(s), ...(note ? { note } : {}) };
    } else throw new Error("Unknown go-to-market confirmation");
    audit(p, a, "studio_gtm_confirmed", `${c.check === "scope" ? "Scope" : "AI disclosure"} confirmed${note ? `: ${note}` : ""}`);
    return true;
  }
  if (type === "confirmStudioPieceCheck") {
    const check = c.check;
    if (check !== "specs" && check !== "safeZones" && check !== "productAccuracy") throw new Error("Unknown piece check");
    const ids = Array.isArray(c.pieceIds) ? [...new Set(c.pieceIds.filter((x): x is string => typeof x === "string"))].slice(0, 100) : [];
    if (!ids.length) throw new Error("Choose the pieces you checked");
    const note = textOf(c.note, "Note", 600);
    const titles: string[] = [];
    for (const pieceId of ids) {
      const piece = findPiece(s, pieceId);
      if (piece.stage !== "production") throw new Error("Only production pieces are checked here");
      if (!fileOf(piece)) throw new Error(`${piece.title} has no file yet`);
      if (check === "safeZones" && !needsSafeZone(piece)) throw new Error(`${piece.title} is a still; safe zones are checked on video`);
      if (check === "specs" && !specCheck(piece).ok && !note) throw new Error(`${piece.title} is outside its spec: record why it is acceptable in the note, or upload a new file`);
      g[check][piece.id] = { by: a.subject, at, fingerprint: pieceFingerprint(piece), ...(note ? { note } : {}) };
      titles.push(`${piece.title} v${piece.versions.length}`);
    }
    const label = check === "specs" ? "Spec exception" : check === "safeZones" ? "Safe-zone check" : "Product accuracy spot check";
    audit(p, a, "studio_piece_checked", `${label} confirmed for ${titles.join(", ")}${note ? `: ${note}` : ""}`);
    return true;
  }
  if (type === "addStudioRights") {
    const kind = RIGHTS_KINDS.find((k) => k === c.kind);
    if (!kind) throw new Error("Choose what the rights record is for (music, voice, font, footage, image or other)");
    const name = textOf(c.name, "Name", 160), source = textOf(c.source, "Source", 300), licence = textOf(c.licence, "Licence", 300), usedIn = textOf(c.usedIn, "Used in", 300);
    if (!name || !source || !licence) throw new Error("A rights record needs a name, a source and a licence");
    if (g.rights.length >= 100) throw new Error("Rights record limit reached");
    g.rights.push({ id: randomUUID(), kind, name, source, licence, ...(usedIn ? { usedIn } : {}), addedBy: a.subject, addedAt: at });
    audit(p, a, "studio_rights_added", `${kind} ${name}: ${source}; ${licence}`);
    return true;
  }
  if (type === "removeStudioRights") {
    const i = g.rights.findIndex((r) => r.id === c.id);
    if (i < 0) throw new Error("Rights record not found");
    const [r] = g.rights.splice(i, 1);
    audit(p, a, "studio_rights_removed", `${r.kind} ${r.name} removed`);
    return true;
  }
  if (type === "setStudioAssetRights") {
    const ref = studioAssetRefs(s).find((x) => x.id === c.assetId);
    if (!ref) throw new Error("File not found in this project");
    const source = textOf(c.source, "Source", 300), licence = textOf(c.licence, "Licence", 300);
    if (!source || !licence) throw new Error("Rights need a source and a licence");
    g.assetRights[ref.id] = { source, licence, by: a.subject, at };
    audit(p, a, "studio_asset_rights_set", `${ref.name}: ${source}; ${licence}`);
    return true;
  }
  // clearStudioClaimFlag
  const reason = textOf(c.reason, "Reason", 600);
  if (!reason) throw new Error("Give the reason the claim is acceptable");
  const flag = claimFlags(s, p).find((f) => f.id === c.flagId);
  if (!flag) throw new Error("That claim flag no longer applies; refresh the checks");
  g.claimClearances[flag.id] = { reason, by: a.subject, at, text: flag.text, pieceId: flag.pieceId };
  audit(p, a, "studio_claim_cleared", `${flag.pieceTitle}: "${flag.text.slice(0, 120)}" cleared: ${reason}`);
  return true;
}
/** Customers act only on client stages a producer has shared for review (they cannot see the pieces before that). */
function requireClientCanSee(s: StudioState, stage: StudioStage, a: Principal) {
  if (a.role === "customer" && !studioStageVisibleToClient(s, stage)) throw new Error("Port67 has not shared this stage for your review yet");
}
/** Store a generator's output for a rerun request: a new AI version, request done, dependants stale. Server use only. */
export function applyStudioRerunResult(p: Project, requestId: string, result: { text?: string; image?: StudioAssetRef; runId?: string } | { error: string }, a: Principal) {
  const s = requireStudio(p);
  const request = s.rerunRequests?.find((r) => r.id === requestId);
  if (!request || (request.status !== "pending" && request.status !== "running")) throw new Error("Rerun request is no longer waiting");
  const piece = findPiece(s, request.pieceId);
  request.finishedAt = now();
  if ("error" in result) {
    request.status = "failed";
    request.error = result.error.slice(0, 600);
    audit(p, a, "studio_rerun_failed", `${piece.title}: ${request.error}`);
    return;
  }
  const { version, stale } = addPieceVersion(s, piece.id, { text: result.text, image: result.image, source: "ai", runId: result.runId, brief: request.brief }, { by: a.subject });
  request.status = "done";
  if (result.runId) request.runId = result.runId;
  audit(p, a, "studio_rerun_done", `${piece.title}: AI version ${version.n}${stale.length ? `; ${stale.length} dependent pieces now out of date` : ""}`);
}
/** Add an uploaded file as a new version of a piece (source upload). */
export function applyPieceUpload(p: Project, pieceId: string, ref: StudioAssetRef, a: Principal) {
  const s = requireStudio(p);
  requireOperator(a);
  const piece = findPiece(s, pieceId);
  const { version, stale } = addPieceVersion(s, piece.id, { image: ref, source: "upload" }, { by: a.subject });
  audit(p, a, "studio_piece_uploaded", `${piece.title}: uploaded ${ref.name} as version ${version.n}${stale.length ? `; ${stale.length} dependent pieces now out of date` : ""}`);
}
