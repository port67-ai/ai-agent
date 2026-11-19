import { validatePerformance, parsePerformanceCsv } from "./performance";
import { planningInputKey, mediumCurrent, mediumEvidenceKey } from "./planning-context";
import { proposeIdeas, researchPack } from "./ideas";
import { planProject, syncTaskPlan, selectedResearch, requirePlannedTask, taskResearchCurrent } from "./task-plan";
import { STORAGE_LIMIT_BYTES, projectParts, trimRunSnapshots } from "./storage-gauge";
import { suggestFormats, validFormats, hasVideoFormat } from "./formats";
import { buildAdvert, advertIssues, planHash, validateContinuity, MAX_SHOT_SEC } from "./advert";
import { allSegmentEvidence, gradeContext, gradeSource } from "./evidence";
import { humanProducerApprovals, producerApprovalsOn } from "./approval-mode";
import { accountScope, canCreateProject, linkProjectOwnership } from "./accounts";
import { productionCapabilities } from "./registry";
import { validChannels } from "./channels";
import { createHash, randomUUID } from "node:crypto";
import {
  segments,
  type Asset,
  type Brief,
  type Principal,
  type Project,
  type Segment,
  type KeyMessage,
  type Strategy,
  type StudioBrief,
} from "./model";
import { autoApproveProducer } from "./auto-approve";
import { STUDIO_COMMANDS, applyStudioCommand } from "./studio-commands";
import { STUDIO_CLASSIC_PRODUCTION_REFUSED, applyAccountBrandKit, bridgeStudioBrief, initialStudio, normaliseStudioBrief, selectableOffer, studioCommandRefusal, studioStageVisibleToClient, studioStrategyClosed } from "./studio";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const now = () => new Date().toISOString();
export const id = () => randomUUID();
export function text(
  value: unknown,
  name: string,
  max = 6000,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${name} is required`);
    return "";
  }
  if (typeof value !== "string" || value.length > max)
    throw new Error(`${name} must be text up to ${max} characters`);
  const out = value.trim();
  if (required && !out) throw new Error(`${name} is required`);
  return out;
}
export function publicUrl(value: unknown): string {
  const s = text(value, "URL", 2000);
  if (!s) return "";
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error("Use a public HTTPS URL");
  }
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !h.includes(".") ||
    h.includes(":") ||
    /^\d/.test(h) ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "localhost"
  )
    throw new Error("Use a public HTTPS URL");
  return u.href;
}
export function access(p: Project, a: Principal) {
  accountScope(a);
  if (
    p.workspaceId !== a.workspaceId ||
    (p.accountId !== undefined && p.accountId !== (a.accountId || a.workspaceId)) ||
    (a.role === "customer" && a.identity !== "firebase" && a.projectId !== p.id)
  )
    throw new Error("Forbidden: project access");
}
export function operator(a: Principal) {
  if (a.role !== "operator") throw new Error("Requires operator role");
}
/** Key messages must each carry proof and cite only reviewed sources; anything else is rejected, not trimmed. */
export function keyMessagesInput(value: unknown, allowed: string[]): KeyMessage[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 6) throw new Error("Key messages must be a list of at most six");
  return value.map((v) => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const ids = o.sourceIds;
    if (!Array.isArray(ids) || !ids.length || ids.some((x) => typeof x !== "string" || !allowed.includes(x)))
      throw new Error("Each key message needs proof from reviewed sources");
    return { message: text(o.message, "key message", 300, true), proof: text(o.proof, "key message proof", 600, true), sourceIds: [...new Set(ids as string[])] };
  });
}
export function strategyHash(s: Strategy): string {
  return digest(
    JSON.stringify({
      version: s.version,
      audience: s.audience,
      message: s.message,
      rationale: s.rationale,
      design: s.design,
      channels: s.channels,
      format: s.format,
      cta: s.cta,
      evidenceIds: s.evidenceIds,
      insightIds: s.insightIds,
      hypothesis: s.hypothesis,
      uncertainties: s.uncertainties,
      positioning: s.positioning,
      audienceSegments: s.audienceSegments,
      keyMessages: s.keyMessages,
      tone: s.tone,
      doNotClaim: s.doNotClaim,
    }),
  );
}
export function createProject(
  input: Record<string, unknown>,
  a: Principal,
  projectId: string = id(),
): Project {
  if (!canCreateProject(a)) operator(a);
  const brief: Brief = {
    business: text(input.business, "business", 120, true),
    objective: text(input.objective, "objective", 1200, true),
    description: text(input.description, "description", 4000),
    website: publicUrl(input.website),
    contact: text(input.contact, "contact", 180, true),
    audience:
      text(input.audience, "audience", 600) ||
      "To be established through research",
    competitors: text(input.competitors, "competitors", 2000),
    inspiration: text(input.inspiration, "inspiration", 2000),
    brandColor: text(input.brandColor, "brandColor", 7) || "#ec663c",
  };
  if (input.workRequest !== undefined) {
    if (input.workRequest !== "campaign" && input.workRequest !== "research") throw new Error("Unknown requested work");
    brief.workRequest = input.workRequest;
  }
  if (input.requestedFormats !== undefined) {
    if (!Array.isArray(input.requestedFormats)) throw new Error("Requested formats must be a list");
    if (input.requestedFormats.length) brief.requestedFormats = validFormats(input.requestedFormats);
  }
  // Optional fields are stored only when filled in, so a brief without them keeps its fingerprint and existing AI authorisation.
  for (const [key, max] of [["market", 300], ["differentiators", 1000], ["proof", 1500]] as const) {
    const value = text(input[key], key, max);
    if (value) brief[key] = value;
  }
  if (input.logoData) {
    const logo = text(input.logoData, "logo", 45000);
    if (
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo) ||
      !Buffer.from(logo.split(",")[1], "base64")
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error("Logo must be a small PNG image");
    if (input.logoPermission !== "confirmed")
      throw new Error("Confirm permission to use this logo");
    brief.logoData = logo;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.contact))
    throw new Error("A valid approval contact email is required");
  if (!/^#[a-f\d]{6}$/i.test(brief.brandColor))
    throw new Error("Use a six-digit brand colour");
  const project: Project = {
    id: projectId,
    workspaceId: a.workspaceId,
    accountId: accountScope(a),
    createdBy: a.subject,
    createdAt: now(),
    updatedAt: now(),
    revision: 1,
    brief,
    sources: [],
    insights: [],
    strategies: [],
    tasks: [],
    assets: [],
    capabilities: [],
    audit: [
      {
        id: id(),
        at: now(),
        actor: a.subject,
        role: a.role,
        action: "brief_submitted",
        detail: "Customer brief recorded",
      },
    ],
    runs: [],
    processed: [],
  };
  if (!a.demo && brief.workRequest && input.useAIPlanner === true) project.researchPlanning = { enabled: true, status: "pending", version: 0, history: [] };
  if (!a.demo && brief.workRequest) planProject(project, a.subject, "Initial customer brief");
  return project;
}
/**
 * Create a studio project (CHG-0097). The producer (or the account owner) picks the offer and submits the intake; the project starts
 * in Stage 1 with the intake gate active. The legacy brief is a provisional mapping of the intake so existing views keep working;
 * it is mapped again, the channels set and the task plan built when gate 1 is approved. No task plan and no research before that.
 */
export function createStudioProject(input: Record<string, unknown>, a: Principal, projectId: string = id(), accountKit?: StudioBrief["brandKit"]): Project {
  if (!canCreateProject(a)) operator(a);
  const offer = selectableOffer(input.offer);
  const brief = normaliseStudioBrief(input.brief);
  if (!brief.client.businessName) throw new Error("Business name is required");
  const studio = initialStudio(offer, brief);
  // One Brand Kit per customer account: copied into the new intake where the intake left it empty. The copy is what the project uses.
  if (accountKit) applyAccountBrandKit(studio, accountKit, accountScope(a));
  const mapped = bridgeStudioBrief(studio);
  const at = now();
  return {
    id: projectId,
    workspaceId: a.workspaceId,
    accountId: accountScope(a),
    createdBy: a.subject,
    createdAt: at,
    updatedAt: at,
    revision: 1,
    studio,
    brief: mapped.brief,
    sources: [],
    insights: [],
    strategies: [],
    tasks: [],
    assets: [],
    capabilities: [],
    audit: [{ id: id(), at, actor: a.subject, role: a.role, action: "studio_intake_submitted", detail: `Studio intake recorded for ${offer}; Stage 1 is open` }],
    runs: [],
    processed: [],
  };
}
/** Studio projects run no paid research, planning or drafting until gate 1 (the intake) is approved. Legacy projects are unaffected. */
export function requireStudioIntakeApproved(p: Project) {
  if (p.studio && p.studio.gates.intake.status !== "approved") throw new Error("Approve the studio intake (Stage 1) before research or drafting starts");
}
/** Studio projects run research, reviews, insights, strapline and audiences, ideas and the direction only while Creative strategy is open. */
export function requireStudioStrategyOpen(p: Project) {
  const closed = p.studio && studioStrategyClosed(p.studio);
  if (closed) throw new Error(closed);
}
/** Studio projects never use the classic flow after direction approval (production drafts, copy pack, assets, video). */
export function refuseStudioClassicProduction(p: Project) {
  if (p.studio) throw new Error(STUDIO_CLASSIC_PRODUCTION_REFUSED);
}
function latest(p: Project) {
  const s = p.strategies.at(-1);
  if (!s) throw new Error("Create a direction first");
  return s;
}
function approved(p: Project) {
  const s = latest(p);
  if (s.status !== "approved" || s.hash !== strategyHash(s))
    throw new Error("Customer-approved current direction required");
  return s;
}
function requireHash(hash: unknown, actual: string) {
  if (hash !== actual)
    throw new Error("This version changed; reload before approving");
}
export const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function wrap(s: string, max = 36) {
  const words = s.split(/\s+/);
  const lines: string[] = [""];
  for (const word of words) {
    if ((lines.at(-1)! + " " + word).trim().length > max && lines.at(-1))
      lines.push(word);
    else lines[lines.length - 1] += (lines.at(-1) ? " " : "") + word;
  }
  return lines.slice(0, 5);
}
function svg(p: Project, s: Strategy) {
  const lines = wrap(s.message);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="${escapeXml(s.message)}"><rect width="1080" height="1080" fill="#161d27"/><circle cx="920" cy="120" r="260" fill="${p.brief.brandColor}" opacity=".22"/>${p.brief.logoData ? `<image href="${p.brief.logoData}" x="800" y="60" width="200" height="100" preserveAspectRatio="xMidYMid meet"/>` : ""}<rect x="80" y="180" width="80" height="8" fill="${p.brief.brandColor}"/><text x="80" y="125" font-family="Arial,sans-serif" font-size="26" fill="#c6cbd1">${escapeXml(p.brief.business.toUpperCase())}</text>${lines.map((l, i) => `<text x="80" y="${300 + i * 82}" font-family="Arial,sans-serif" font-weight="700" font-size="60" fill="#ffffff">${escapeXml(l)}</text>`).join("")}<rect x="80" y="820" width="920" height="100" rx="16" fill="${p.brief.brandColor}"/><text x="112" y="882" font-family="Arial,sans-serif" font-size="28" fill="#111827">${escapeXml(s.cta.slice(0, 55))}</text><text x="80" y="1010" font-family="Arial,sans-serif" font-size="20" fill="#929aa7">${escapeXml(s.format)} · Creative concept · v${s.version}</text></svg>`;
}
function motion(p: Project, s: Strategy) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(p.brief.business)} — motion concept</title><style>body{margin:0;background:#111827;color:white;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}.frame{width:min(90vw,700px);aspect-ratio:1;position:relative;overflow:hidden;background:#161d27;border-radius:24px}.scene{position:absolute;inset:10%;display:flex;flex-direction:column;justify-content:center;opacity:0;animation:scene 15s infinite}.scene:nth-child(2){animation-delay:5s}.scene:nth-child(3){animation-delay:10s}small{color:${p.brief.brandColor};font-size:20px}h1{font-size:clamp(28px,6vw,55px);line-height:1.12}p{font-size:22px}.note{position:absolute;bottom:22px;left:10%;font-size:12px;color:#b7bec8}@keyframes scene{0%,30%{opacity:1;transform:translateY(0)}33%,100%{opacity:0;transform:translateY(15px)}}@media(prefers-reduced-motion:reduce){.scene{animation:none;position:static;opacity:1;padding:10%}.frame{aspect-ratio:auto}.note{position:static;padding:10%}}</style><main class="frame"><section class="scene"><small>${escapeXml(p.brief.business)}</small><h1>${escapeXml(s.message)}</h1></section><section class="scene"><small>THE IDEA</small><h1>${escapeXml(p.brief.objective)}</h1></section><section class="scene"><small>YOUR NEXT STEP</small><h1>${escapeXml(s.cta)}</h1></section><div class="note">15-second looping motion storyboard · creative concept · not a rendered video</div></main></html>`;
}
/**
 * Static storyboard: every frame side by side in a grid, with its detailed description underneath. Built only from the approved
 * direction (hook, objective, key messages with their proof and sources, call to action); nothing is invented. Prints cleanly.
 */
export function storyboardGrid(p: Project, s: Strategy) {
  const e = escapeXml;
  const title = (id: string) => p.sources.find((x) => x.id === id)?.title || id;
  const messages = (s.keyMessages || []).slice(0, 4);
  type Frame = { name: string; text: string; voice: string; proof: string; sources: string[]; purpose: string };
  const frames: Frame[] = [
    { name: "Opening hook", text: s.message, voice: s.message, proof: "The approved campaign message.", sources: [], purpose: "Stop the scroll and state the single idea in the brand's voice." },
    { name: "The idea", text: p.brief.objective, voice: p.brief.objective, proof: "The objective from the customer's brief.", sources: [], purpose: "Connect the hook to what the business wants to achieve." },
    ...messages.map((k, i): Frame => ({ name: `Key message ${i + 1}`, text: k.message, voice: k.message, proof: k.proof, sources: k.sourceIds.map(title), purpose: "Make one claim and show the evidence that supports it." })),
    { name: "Call to action", text: s.cta, voice: s.cta, proof: "The approved call to action.", sources: [], purpose: "Give the viewer one clear next step." },
  ];
  const per = 15 / frames.length;
  const t = (n: number) => `${Math.round(n * per * 10) / 10}s`;
  const cards = frames.map((f, i) => `<article class="card"><div class="panel"><small>${e(f.name.toUpperCase())}</small><h2>${e(f.text)}</h2><span class="n">${i + 1}</span></div><div class="desc"><h3>Frame ${i + 1} of ${frames.length} · ${e(f.name)} · ${t(i)} to ${t(i + 1)}</h3><dl><dt>Purpose</dt><dd>${e(f.purpose)}</dd><dt>On-screen text</dt><dd>${e(f.text)}</dd><dt>Voice-over / caption</dt><dd>${e(f.voice)}</dd><dt>Visual direction</dt><dd>${e(s.design)} Brand colour ${e(p.brief.brandColor)}. Original artwork only; imagery to be confirmed with the customer.</dd><dt>Evidence</dt><dd>${e(f.proof)}${f.sources.length ? `<br>Sources: ${f.sources.map(e).join("; ")}` : ""}</dd></dl></div></article>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(p.brief.business)} — storyboard grid</title><style>body{margin:0;background:#f4f5f2;color:#1f2933;font-family:Arial,sans-serif;padding:24px}header{margin-bottom:18px}header h1{margin:0 0 4px;font-size:24px}header p{margin:0;color:#52606d;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}.card{background:#fff;border:1px solid #d9dde1;border-radius:10px;overflow:hidden;break-inside:avoid;display:flex;flex-direction:column}.panel{position:relative;aspect-ratio:1;background:#161d27;color:#fff;padding:9%;display:flex;flex-direction:column;justify-content:center;border-bottom:6px solid ${e(p.brief.brandColor)}}.panel small{color:${e(p.brief.brandColor)};font-size:12px;letter-spacing:.08em;margin-bottom:10px}.panel h2{margin:0;font-size:clamp(18px,2.4vw,26px);line-height:1.2}.n{position:absolute;top:10px;right:12px;font-size:12px;color:#b7bec8}.desc{padding:12px 14px}.desc h3{margin:0 0 8px;font-size:13px}dl{margin:0;font-size:12px;line-height:1.45}dt{font-weight:700;margin-top:7px;color:#323f4b}dd{margin:2px 0 0;color:#3e4c59}footer{margin-top:16px;font-size:11px;color:#52606d}@media print{body{background:#fff;padding:0}.grid{grid-template-columns:repeat(3,1fr)}}</style><header><h1>${e(p.brief.business)} — storyboard</h1><p>${frames.length} frames · 15-second concept · static grid, one frame per card with its description underneath</p></header><main class="grid">${cards}</main><footer>Built from the approved direction only. Frame timings are even splits of a 15-second concept. Creative concept, not a rendered video.</footer></html>`;
}
export function makeAsset(_p: Project, a: Asset) {
  return a.content;
}
/** Fingerprint of what a scope was made from: the brief and the launch channels. A change to either makes the stored scope stale. */
export const scopeHash = (p: Pick<Project, "brief" | "channels">) => digest(JSON.stringify({ brief: p.brief, channels: p.channels || [] }));
export const hasProviderConsent = (p: Project) =>
  p.aiConsent?.dataClass === "PUBLIC" &&
  p.aiConsent.briefHash === digest(JSON.stringify(p.brief));
export function requireProviderConsent(p: Project) {
  if (!hasProviderConsent(p))
    throw new Error(
      "Authorise this exact project brief for the configured AI provider before making paid calls",
    );
}
function invalidateDirection(p: Project) {
  if (!p.strategies.length) return;
  const previous = latest(p);
  const next = {
    ...previous,
    id: id(),
    version: p.strategies.length + 1,
    status: "draft" as const,
    createdAt: now(),
    approvedBy: undefined,
    approvedAt: undefined,
    feedback: undefined,
  };
  next.evidenceIds = next.evidenceIds.filter((e) =>
    p.sources.some(
      (source) => source.id === e && source.status === "supported",
    ),
  );
  next.insightIds = p.insights
    .filter(
      (insight) =>
        insight.status !== "draft" &&
        insight.status !== "rejected" &&
        insight.sourceIds.every((e) => next.evidenceIds.includes(e)),
    )
    .map((insight) => insight.id);
  next.hash = strategyHash(next);
  p.strategies.push(next);
}
export function transition(
  input: Project,
  c: Record<string, unknown>,
  a: Principal,
): Project {
  access(input, a);
  const p = structuredClone(input);
  const requestId = text(c.requestId, "requestId", 100);
  const type = text(c.type, "type", 60, true);
  const customerActions = [
    "approveStrategy",
    "requestStrategyChanges",
    "approveAsset",
    "requestAssetChanges",
    "approveAllAssets",
    "approveAdvert",
    "requestAdvertChanges",
  ];
  // Studio commands check their own roles (producer gates, client gates, piece actions) in studio-commands.ts.
  if (!customerActions.includes(type) && !STUDIO_COMMANDS.has(type) && !["updateBrief", "setChannels", "requestResearch", "setAudiences"].includes(type)) operator(a);
  if (p.studio) {
    if (type === "updateBrief") throw new Error("This is a studio project: edit the Stage 1 intake instead");
    if (type === "enableAIPlanning" || type === "useRulesResearchPlan") throw new Error("Studio projects use the studio research set; AI research planning is not used");
    if (type === "setChannels" || type === "requestResearch") requireStudioIntakeApproved(p);
    // Stage gating (piece B): strategy work only while Creative strategy is open; no classic production or format choice at all.
    const refused = studioCommandRefusal(p.studio, type);
    if (refused) throw new Error(refused);
  }
  // The account level is paused: a producer or admin presses the customer's approval buttons (PORT67_ACCOUNT_APPROVALS=required turns
  // this off). The AI producer approves only when the master switch and the admin mode allow it. Every such approval is recorded as
  // given on the customer's behalf.
  const onBehalf = customerActions.includes(type) && a.role === "operator" && (producerApprovalsOn() || (humanProducerApprovals() && a.subject !== "port67-producer-agent"));
  if (customerActions.includes(type) && a.role !== "customer" && !onBehalf)
    throw new Error("Customer approval identity required");
  const approver = onBehalf ? (a.subject === "port67-producer-agent" ? "AI producer (on behalf of the customer)" : `${a.subject} (on behalf of the customer)`) : a.subject;
  if (requestId && p.processed.includes(requestId)) return p;
  let studioOnBehalf = false;
  if (STUDIO_COMMANDS.has(type)) {
    studioOnBehalf = applyStudioCommand(p, c, a, type);
  } else if (type === "recordPerformance" || type === "importPerformance") {
    if ((p.performance?.length || 0) >= 100) throw new Error("Performance record limit reached");
    const rows = type === "importPerformance" ? parsePerformanceCsv(String(c.csv || "")) : [validatePerformance(c)];
    if ((p.performance?.length || 0) + rows.length > 100) throw new Error("Performance record limit reached");
    p.performance ||= [];
    for (const row of rows) p.performance.push({ ...row, publicAuthorised: c.publicAuthorised === true, id: id(), status: "pending", createdAt: now(), createdBy: a.subject });
  } else if (type === "reviewPerformance") {
    if (c.revision !== p.revision) throw new Error("Project revision changed; reload before reviewing results");
    if (c.status !== "accepted" && c.status !== "rejected") throw new Error("Unknown performance review status");
    const row = p.performance?.find(r => r.id === c.id);
    if (!row) throw new Error("Performance record not found");
    const reason = text(c.reason, "performance review reason", 600);
    if (!reason.trim()) throw new Error("Performance review reason is required");
    row.status = c.status; row.reviewedAt = now(); row.reviewedBy = a.subject; row.reviewReason = reason;
  } else if (type === "authoriseAI") {
    if (c.confirm !== true)
      throw new Error(
        "Confirm that the brief is authorised PUBLIC data before enabling AI",
      );
    p.aiConsent = {
      briefHash: digest(JSON.stringify(p.brief)),
      dataClass: "PUBLIC",
      by: a.subject,
      at: now(),
    };
  } else if (type === "enableAIPlanning" || type === "useRulesResearchPlan") {
    if (p.strategies.length || p.runs.some(r => r.status === "running")) throw new Error("Planning cannot change while a task runs or after direction work begins");
    if (type === "enableAIPlanning") p.researchPlanning = { enabled: true, status: "pending", version: p.researchPlanning?.version || 0, history: p.researchPlanning?.history || [] };
    else {
      if (!p.researchPlanning) throw new Error("No AI research plan to replace");
      const reason = text(c.reason, "rules-plan reason", 600, true);
      p.researchPlanning = { ...p.researchPlanning, status: "rules", inputKey: planningInputKey(p), version: p.researchPlanning.version + 1, error: reason };
      delete p.scope;
    }
    planProject(p, a.subject, type === "enableAIPlanning" ? "Producer enabled AI research planning" : "Producer explicitly selected the rules research plan");
    if (p.producerAgent) p.producerAgent.lastFingerprint = "";
  } else if (type === "completeManualTask") {
    if (!p.taskPlan || c.version !== p.taskPlan.version) throw new Error("Plan changed; refresh before completing work");
    syncTaskPlan(p);
    const task = p.taskPlan.tasks.find(t => t.id === c.id && t.id.startsWith("manual:"));
    if (!task || task.status !== "manual") throw new Error("Only a ready manual production task can be completed here");
    task.completion = { by: a.subject, at: now(), note: text(c.note, "completion note", 1000, true) };
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "manual_task_completed", detail: `${task.id}: ${task.completion.note}` });
  } else if (type === "reviseTaskPlan") {
    if (p.strategies.length) throw new Error("Plan is locked after direction work begins; request a scoped change");
    if (c.version !== (p.taskPlan?.version || 0)) throw new Error("Plan changed; refresh before revising it");
    if (p.runs.some(r => r.status === "running")) throw new Error("Wait for running tasks before revising the plan");
    const reason = text(c.reason, "plan revision reason", 600, true);
    if (!Array.isArray(c.research) || c.research.some(s => typeof s !== "string" || !segments.includes(s as Segment))) throw new Error("Invalid research selection");
    if (planProject(p, a.subject, reason, c.research as Segment[])) p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "task_plan_revised", detail: `Plan v${p.taskPlan!.version}: ${reason}` });
    if (p.producerAgent) p.producerAgent.lastFingerprint = "";
  } else if (type === "revokeAI") {
    delete p.aiConsent;
  } else if (type === "setChannels" || type === "requestResearch") {
    // Customers and producers may choose channels and ask for research until direction work begins.
    if (p.strategies.length)
      throw new Error("Channels are locked after direction work begins; request a scoped change from Port67");
    if (c.channels !== undefined || type === "setChannels") p.channels = validChannels(c.channels);
    if (type === "requestResearch") {
      if (!p.channels?.length) throw new Error("Choose at least one launch channel first");
      p.researchRequest = { at: now(), by: a.subject, channels: [...p.channels] };
    }
  } else if (type === "updateBrief") {
    if (p.strategies.length)
      throw new Error(
        "Brief is locked after direction work begins; request a scoped change from Port67",
      );
    const checked = createProject(
      {
        ...p.brief,
        ...c,
        logoPermission:
          c.logoData === undefined || c.logoData === p.brief.logoData
            ? p.brief.logoData
              ? "confirmed"
              : c.logoPermission
            : c.logoPermission,
      },
      { ...a, role: "operator" },
      p.id,
    );
    p.brief = checked.brief;
    delete p.aiConsent;
  } else if (type === "trimHistory") {
    const n = trimRunSnapshots(p);
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "history_trimmed", detail: `${n} old run copies of the brief removed; run records, usage and the audit trail kept` });
  } else if (type === "resetProject") {
    // Admin only. Keeps the brief (and logo), the account and the project id so nothing has to be typed again, and removes everything
    // produced after it so the whole journey can be run from the start. The audit trail is kept and records what was removed; the cost
    // ledger is separate and untouched, because that money was spent.
    if (!a.admin) throw new Error("Forbidden: only an admin can restart a project from its brief");
    // Studio projects (piece C decision): restarting would discard approved gates, pieces and their file references, so it is refused.
    // Reopen Stage 1 instead; every later stage is then marked out of date with its work kept.
    if (p.studio) throw new Error("Studio projects cannot be restarted from the brief: reopen Stage 1 (Client intake) instead; later stages are marked out of date and their work is kept");
    if (c.confirm !== true) throw new Error("Confirm that you want to remove everything except the brief");
    const removed = `${p.sources.length} sources, ${p.insights.length} insights, ${p.strategies.length} directions, ${p.assets.length} assets, ${p.runs.length} runs, ${(p.videos || []).length} videos`;
    p.sources = [];
    p.insights = [];
    p.strategies = [];
    p.tasks = [];
    p.assets = [];
    p.runs = [];
    p.videos = [];
    p.channels = [];
    p.capabilities = [];
    delete p.researchRequest;
    delete p.aiConsent;
    delete p.mediumSelection;
    delete p.mediumDecision;
    if (p.researchPlanning) p.researchPlanning = { enabled: true, status: "pending", version: p.researchPlanning.version, history: p.researchPlanning.history };
    delete p.scope;
    delete p.scopeHistory;
    delete p.reviews;
    delete p.ideas;
    delete p.audienceSuggestion;
    delete p.advert;
    delete p.formats;
    delete p.producerAgent;
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "project_reset", detail: `Restarted from the brief; removed ${removed}` });
  } else if (type === "addSource") {
    if (!segments.includes(c.segment as Segment))
      throw new Error("Invalid research segment");
    if (p.sources.length >= 150) throw new Error("Source limit reached");
    const kind =
      c.kind === "client_assertion"
        ? "client_assertion"
        : a.demo && c.kind === "synthetic"
          ? "synthetic"
          : "public_source";
    const url = publicUrl(c.url);
    if (kind === "public_source" && !url)
      throw new Error("Public source requires a URL");
    p.sources.push({
      id: id(),
      segment: c.segment as Segment,
      title: text(c.title, "title", 240, true),
      url,
      excerpt: text(c.excerpt, "excerpt", 6000, true),
      kind,
      status: "unreviewed",
      collectedAt: now(),
      method:
        kind === "client_assertion" ? "Customer supplied" : "Manual collection",
    });
  } else if (type === "reviewSource") {
    const source = p.sources.find((x) => x.id === c.id);
    if (!source) throw new Error("Source not found");
    if (c.status !== "supported" && c.status !== "rejected")
      throw new Error("Invalid review status");
    if (source.kind === "client_assertion" && c.status === "supported")
      throw new Error(
        "A client assertion cannot be marked independently supported",
      );
    source.status = c.status;
    invalidateDirection(p);
  } else if (type === "reviewAllSources") {
    // One deliberate, single-shot action: accept every unreviewed public source at once. It never runs by itself, never calls a model,
    // and does nothing when nothing is waiting, so repeating it (or a later automated reviewer) cannot loop.
    if (c.confirm !== true) throw new Error("Confirm that you accept every unreviewed public source");
    const waiting = p.sources.filter((s) => s.kind === "public_source" && s.status === "unreviewed");
    if (!waiting.length) throw new Error("No unreviewed public sources to accept");
    for (const s of waiting) s.status = "supported";
    invalidateDirection(p);
    const by = segments.map((k) => `${k} ${waiting.filter((s) => s.segment === k).length}`).join(", ");
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "sources_bulk_accepted", detail: `${waiting.length} sources accepted without individual review (${by})` });
  } else if (type === "reviewAllInsights") {
    // Single-shot like reviewAllSources: only draft insights whose sources are all accepted, nothing automatic, nothing when none wait.
    if (c.confirm !== true) throw new Error("Confirm that you accept every draft insight");
    const drafts = p.insights.filter((i) => (i.status || "reviewed") === "draft");
    const ready = drafts.filter((i) => i.sourceIds.every((e) => p.sources.some((s) => s.id === e && s.status === "supported")));
    if (!ready.length) throw new Error(drafts.length ? "Draft insights need accepted supporting sources first" : "No draft insights to accept");
    for (const i of ready) i.status = "reviewed";
    const latestDirection = p.strategies.at(-1);
    if (latestDirection && ready.some((i) => latestDirection.insightIds.includes(i.id))) invalidateDirection(p);
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "insights_bulk_accepted", detail: `${ready.length} of ${drafts.length} draft insights accepted together` });
  } else if (type === "reviewSourcesBatch" || type === "reviewInsightsBatch") {
    // Verdicts from the producer reviewers: each item decides one waiting source or draft insight. Anything already decided,
    // unknown, or not eligible is skipped, so replaying a batch changes nothing.
    const items = Array.isArray(c.items) ? (c.items as { id?: unknown; verdict?: unknown }[]) : [];
    let accepted = 0;
    let rejected = 0;
    for (const it of items.slice(0, 100)) {
      if (it.verdict !== "accept" && it.verdict !== "reject") continue;
      if (type === "reviewSourcesBatch") {
        const s = p.sources.find((x) => x.id === it.id);
        if (!s || s.kind !== "public_source" || s.status !== "unreviewed") continue;
        s.status = it.verdict === "accept" ? "supported" : "rejected";
      } else {
        const i = p.insights.find((x) => x.id === it.id);
        if (!i || (i.status || "reviewed") !== "draft") continue;
        if (it.verdict === "accept" && !i.sourceIds.every((e) => p.sources.some((s) => s.id === e && s.status === "supported"))) continue;
        i.status = it.verdict === "accept" ? "reviewed" : "rejected";
      }
      if (it.verdict === "accept") accepted++;
      else rejected++;
    }
    if (!accepted && !rejected) throw new Error("Nothing waiting to decide");
    invalidateDirection(p);
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: type === "reviewSourcesBatch" ? "sources_reviewed_by_producer" : "insights_reviewed_by_producer", detail: `${accepted} accepted, ${rejected} rejected by the ${type === "reviewSourcesBatch" ? "source" : "insight"} producer` });
  } else if (type === "approveAllAssets") {
    const s = approved(p);
    const shared = p.assets.filter((x) => x.status === "shared" && x.strategyHash === s.hash);
    if (!shared.length) throw new Error("No shared assets are waiting for approval");
    const feedback = text(c.feedback, "feedback", 2000);
    for (const x of shared) {
      x.status = "approved";
      x.approvedBy = approver;
      x.approvedAt = now();
      if (feedback) x.feedback = feedback;
    }
    p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "assets_bulk_approved", detail: `${shared.length} assets approved together${onBehalf ? " on behalf of the customer (test mode)" : ""}` });
  } else if (type === "reviewInsight") {
    const insight = p.insights.find((i) => i.id === c.id);
    if (!insight) throw new Error("Insight not found");
    if (c.status !== "reviewed" && c.status !== "rejected")
      throw new Error("Invalid insight review status");
    if (
      c.status === "reviewed" &&
      insight.sourceIds.some(
        (e) =>
          !p.sources.some(
            (source) => source.id === e && source.status === "supported",
          ),
      )
    )
      throw new Error("Insight needs reviewed supporting evidence");
    insight.status = c.status;
    if (p.strategies.at(-1)?.insightIds.includes(insight.id))
      invalidateDirection(p);
  } else if (type === "addInsight") {
    const sourceIds = Array.isArray(c.sourceIds)
      ? c.sourceIds.filter((x): x is string => typeof x === "string")
      : [];
    if (
      !sourceIds.length ||
      sourceIds.length > 20 ||
      sourceIds.some(
        (e) => !p.sources.some((s) => s.id === e && s.status === "supported"),
      )
    )
      throw new Error("Insights require reviewed sources from this project");
    if (p.insights.length >= 80) throw new Error("Insight limit reached");
    p.insights.push({
      id: id(),
      title: text(c.title, "title", 200, true),
      interpretation: text(c.interpretation, "interpretation", 3000, true),
      sourceIds,
      status: "reviewed",
      confidence:
        c.confidence === "strong"
          ? "strong"
          : c.confidence === "moderate"
            ? "moderate"
            : "limited",
      createdAt: now(),
    });
  } else if (type === "draftStrategy") {
    if (p.strategies.length >= 50)
      throw new Error("Direction version limit reached");
    const evidence = p.sources.filter((x) => x.status === "supported");
    const old = p.strategies.at(-1);
    const s: Strategy = {
      id: id(),
      version: p.strategies.length + 1,
      status: "draft",
      audience:
        text(c.audience, "audience", 1200) || old?.audience || p.brief.audience,
      message:
        p.audiences?.strapline || text(c.message, "message", 600) || old?.message || p.brief.objective,
      rationale:
        text(c.rationale, "rationale", 6000) ||
        old?.rationale ||
        (evidence.length
          ? `Working recommendation based on ${evidence.length} reviewed source(s). Explain the insight-to-message connection before sharing.`
          : "Brief-led proposal only. Research has not established customer motivations or market fit; validate before making factual claims."),
      design:
        text(c.design, "design", 3000) ||
        old?.design ||
        "Clear typography, generous space and restrained motion. Use the approved brand colour; validate imagery and accessibility with the customer.",
      channels:
        text(c.channels, "channels", 600) ||
        old?.channels ||
        "Propose after audience research",
      format:
        text(c.format, "format", 600) ||
        old?.format ||
        "Square social concept + 15-second motion storyboard",
      cta: text(c.cta, "cta", 100) || old?.cta || "Discover more",
      evidenceIds: evidence.map((x) => x.id),
      insightIds: p.insights
        .filter(
          (i) =>
            i.status !== "draft" &&
            i.status !== "rejected" &&
            i.sourceIds.every((e) => evidence.some((s) => s.id === e)),
        )
        .map((i) => i.id),
      hypothesis:
        text(c.hypothesis, "hypothesis", 2000) ||
        old?.hypothesis ||
        "Clearer communication may improve qualified interest; measure after publication.",
      uncertainties:
        text(c.uncertainties, "uncertainties", 3000) ||
        old?.uncertainties ||
        "Audience, channel fit and performance are unverified. No commercial outcome is guaranteed.",
      createdAt: now(),
      hash: "",
    };
    for (const [key, max] of [["positioning", 600], ["audienceSegments", 2500], ["tone", 600], ["doNotClaim", 1500]] as const) {
      const value = text(c[key], key, max) || old?.[key];
      if (value) s[key] = value;
    }
    const messages = keyMessagesInput(c.keyMessages, evidence.map((x) => x.id)) || old?.keyMessages;
    if (messages?.length) s.keyMessages = messages;
    s.hash = strategyHash(s);
    p.strategies.push(s);
  } else if (type === "shareStrategy") {
    const s = latest(p);
    if (s.status !== "draft")
      throw new Error("Only draft directions can be shared");
    if (
      !s.evidenceIds.length ||
      !s.insightIds.length ||
      !s.evidenceIds.every((e) =>
        p.sources.some(
          (source) => source.id === e && source.status === "supported",
        ),
      ) ||
      !s.insightIds.every((e) =>
        p.insights.some(
          (insight) =>
            insight.id === e &&
            insight.status !== "draft" &&
            insight.status !== "rejected" &&
            insight.sourceIds.every((source) => s.evidenceIds.includes(source)),
        ),
      )
    )
      throw new Error(
        "Share a direction only after linking reviewed evidence and an interpreted insight",
      );
    if (!s.rationale || !s.design)
      throw new Error("Reasoning and design are required");
    s.status = "shared";
  } else if (type === "approveStrategy" || type === "requestStrategyChanges") {
    const s = latest(p);
    requireHash(c.hash, s.hash);
    if (s.status !== "shared")
      throw new Error("Direction must be shared for review");
    s.status = type === "approveStrategy" ? "approved" : "changes_requested";
    s.feedback = text(c.feedback, "feedback", 2000, type !== "approveStrategy");
    if (s.status === "approved") {
      s.approvedBy = approver;
      s.approvedAt = now();
    }
  } else if (type === "produce") {
    requirePlannedTask(p, "produce");
    const s = approved(p);
    if (p.tasks.some((t) => t.strategyId === s.id))
      throw new Error(
        "Drafts already exist for this direction; create a new direction version for rework",
      );
    const selected = p.taskPlan ? p.formats?.selected : undefined;
    const kinds = (["svg", "motion", "copy"] as const).filter(kind => !selected ||
      (kind === "svg" ? selected.includes("static") : kind === "motion" ? selected.some(f => ["motion", "video_short", "video_long", "video_ugc"].includes(f)) : selected.some(f => ["written_ad", "written_long", "video_short", "video_long", "video_ugc"].includes(f))));
    let motionTaskId = "";
    kinds.forEach((kind) => {
      const i = ["svg", "motion", "copy"].indexOf(kind);
      const task = {
        id: id(),
        role: productionCapabilities[i].name,
        strategyId: s.id,
        strategyHash: s.hash,
        evidenceIds: [...s.evidenceIds],
        instructions: `${s.message}\nAudience: ${s.audience}\nDesign: ${s.design}\nFormat: ${s.format}\nCTA: ${s.cta}\nBrand: ${p.brief.brandColor}\nConstraints: no unsupported claims; licensed original assets only.`,
        acceptance: [
          "Matches approved direction hash",
          "No unsupported factual claims",
          "Customer approval before delivery",
        ],
        status: "draft_created" as const,
        agentVersion:
          productionCapabilities[i].id +
          "/" +
          productionCapabilities[i].version,
      };
      p.tasks.push(task);
      if (kind === "motion") motionTaskId = task.id;
      const content =
        kind === "svg"
          ? svg(p, s)
          : kind === "motion"
            ? motion(p, s)
            : `# ${p.brief.business} — creative copy\n\nHook: ${s.message}\n\nObjective: ${p.brief.objective}\n\nCTA: ${s.cta}\n\n## Motion beats (15-second concept)\n0–5s: Brand and hook\n5–10s: Campaign objective, illustrated with approved brand elements\n10–15s: Call to action\n\n## Production brief\n${task.instructions}\n\n## Evidence and limitations\n${s.rationale}\n${s.uncertainties}\n\nTemplate-generated creative draft; human production/claims review required.\n`;
      p.assets.push({
        id: id(),
        version: p.assets.filter((x) => x.kind === kind).length + 1,
        kind,
        title: ["Social artwork", "Motion storyboard", "Copy & script"][i],
        strategyId: s.id,
        strategyHash: s.hash,
        taskId: task.id,
        evidenceIds: [...s.evidenceIds],
        status: "draft",
        content,
        hash: digest(content),
        createdAt: now(),
      });
    });
    // The static, side-by-side storyboard grid sits beside the motion storyboard and is produced by the same task.
    if (motionTaskId) {
    const grid = storyboardGrid(p, s);
    p.assets.push({
      id: id(),
      version: p.assets.filter((x) => x.kind === "grid").length + 1,
      kind: "grid",
      title: "Storyboard grid (static)",
      strategyId: s.id,
      strategyHash: s.hash,
      taskId: motionTaskId,
      evidenceIds: [...s.evidenceIds],
      status: "draft",
      content: grid,
      hash: digest(grid),
      createdAt: now(),
    });
    }
  } else if (
    type === "shareAsset" ||
    type === "approveAsset" ||
    type === "requestAssetChanges"
  ) {
    const asset = p.assets.find((x) => x.id === c.id);
    if (!asset) throw new Error("Asset not found");
    const s = approved(p);
    if (asset.strategyHash !== s.hash)
      throw new Error("Asset depends on superseded direction");
    if (type === "shareAsset") {
      if (asset.status !== "draft")
        throw new Error("Only draft assets can be shared");
      asset.status = "shared";
    } else {
      requireHash(c.hash, asset.hash);
      if (asset.status !== "shared")
        throw new Error("Asset must be shared for review");
      asset.feedback = text(
        c.feedback,
        "feedback",
        2000,
        type === "requestAssetChanges",
      );
      asset.status = type === "approveAsset" ? "approved" : "changes_requested";
      if (asset.status === "approved") {
        asset.approvedBy = approver;
        asset.approvedAt = now();
      }
    }
  } else if (type === "generateIdeas") {
    const fresh = proposeIdeas(p, id, now());
    if (!fresh.length) throw new Error("No new ideas to propose; keep or drop the current ones, or change formats and audiences");
    p.ideas = [...(p.ideas || []).filter((i) => i.status !== "proposed"), ...fresh];
  } else if (type === "keepIdea" || type === "dropIdea" || type === "setIdeaPriority") {
    const idea = (p.ideas || []).find((i) => i.id === c.id);
    if (!idea) throw new Error("Idea not found");
    if (type === "setIdeaPriority") {
      if (!["high", "medium", "low"].includes(c.priority as string)) throw new Error("Priority must be high, medium or low");
      idea.priority = c.priority as "high";
    } else {
      idea.status = type === "keepIdea" ? "kept" : "dropped";
      idea.decidedBy = a.subject;
    }
  } else if (type === "suggestFormats") {
    p.formats = { ...(p.formats || { selected: [] }), suggested: suggestFormats(p.channels, p.brief.objective), suggestedAt: now() };
  } else if (type === "selectFormats") {
    if (p.researchPlanning?.enabled) {
      if (p.runs.some(r => r.status === "running")) throw new Error("Wait for running tasks before confirming media");
      if (c.expectedMediumVersion !== (p.mediumSelection?.version || 0) || c.expectedEvidenceHash !== digest(mediumEvidenceKey(p))) throw new Error("Medium recommendation or evidence changed; refresh before confirming formats");
      const rationale = text(c.rationale, "medium decision rationale", 1000, true);
      requirePlannedTask(p, "mediumSelection");
      if (!mediumCurrent(p)) p.mediumSelection = { status: "manual", evidenceKey: mediumEvidenceKey(p), version: (p.mediumSelection?.version || 0) + 1, history: p.mediumSelection?.history || [], error: "Producer deliberately proceeded without a current AI recommendation" };
      p.mediumDecision = { at: now(), by: a.subject, rationale, ...(mediumCurrent(p) ? { recommendationVersion: p.mediumSelection!.version } : {}), formats: validFormats(c.formats), requestedFormats: [...(p.brief.requestedFormats || [])] };
    }
    if (p.taskPlan && p.strategies.length) throw new Error("Formats are locked after direction work begins; request a scoped change");
    p.formats = { ...(p.formats || { suggested: suggestFormats(p.channels, p.brief.objective), suggestedAt: now() }), selected: validFormats(c.formats), decidedBy: a.subject, decidedAt: now() };
  } else if (type === "setAudiences") {
    const raw = Array.isArray(c.segments) ? c.segments : [];
    if (raw.length > 6) throw new Error("Use at most six audience segments");
    const segments = raw.map((v, i) => {
      const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      return { id: `a${i + 1}`, name: text(o.name, "segment name", 60, true), demographics: text(o.demographics, "segment demographics", 200), description: text(o.description, "segment description", 300), angle: text(o.angle, "segment angle", 300) };
    });
    if (new Set(segments.map((x) => x.name.toLowerCase())).size !== segments.length) throw new Error("Segment names must be different");
    p.audiences = { strapline: text(c.strapline, "strapline", 120), segments, updatedAt: now(), updatedBy: a.subject };
  } else if (type === "draftAdvert") {
    if (p.formats?.decidedAt && !hasVideoFormat(p.formats.selected)) throw new Error("No video format was chosen for this campaign; choose short-form, long-form or UGC video first");
    const s = approved(p);
    if (p.advert && p.advert.strategyHash === s.hash && (p.advert.status === "shared" || p.advert.status === "approved"))
      throw new Error("This advert plan is already with the customer or approved; ask for changes first");
    const built = buildAdvert(p, s, (p.advert?.version || 0) + 1);
    p.advert = { ...built, id: id(), createdAt: now() };
  } else if (type === "editAdvertShot" || type === "setContinuity" || type === "approveContinuity" || type === "shareAdvert") {
    const ad = p.advert;
    if (!ad) throw new Error("Plan the advert first");
    if (ad.status === "shared" || ad.status === "approved") throw new Error("Ask for changes before editing a shared or approved advert");
    if (type === "editAdvertShot") {
      const shot = ad.shots.find((x) => x.id === c.shotId);
      if (!shot) throw new Error("Shot not found");
      if (c.seconds !== undefined) {
        const n = Number(c.seconds);
        if (!Number.isFinite(n) || n < 1 || n > MAX_SHOT_SEC) throw new Error(`Shot length must be 1 to ${MAX_SHOT_SEC} seconds`);
        shot.seconds = Math.round(n * 10) / 10;
      }
      for (const [k, max] of [["scene", 400], ["action", 400], ["dialogue", 300], ["onScreen", 120]] as const)
        if (c[k] !== undefined) shot[k] = text(c[k], k, max, k === "scene" || k === "action");
      if (c.refs !== undefined) {
        if (!Array.isArray(c.refs) || c.refs.length > 9) throw new Error("References must be a list of at most nine");
        shot.refs = c.refs.map((r) => {
          const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
          if (!["character", "location", "prop"].includes(o.kind as string)) throw new Error("Reference kind must be character, location or prop");
          return { kind: o.kind as "character", label: text(o.label, "reference label", 80, true) };
        });
      }
      if (c.overrides !== undefined) {
        const o = (c.overrides && typeof c.overrides === "object" ? c.overrides : {}) as Record<string, unknown>;
        const lighting = text(o.lighting, "lighting", 300), lens = text(o.lens, "lens", 160);
        shot.overrides = lighting || lens ? { ...(lighting ? { lighting } : {}), ...(lens ? { lens } : {}) } : undefined;
      }
      ad.treatment.durationSec = ad.shots.reduce((n, x) => n + x.seconds, 0);
      ad.hash = planHash(ad);
      ad.status = "draft";
    } else if (type === "setContinuity") {
      ad.continuity = validateContinuity(c.continuity);
    } else if (type === "approveContinuity") {
      ad.continuity.approved = true;
      ad.continuity.confidence = "confirmed";
      ad.continuity.approvedBy = a.subject;
      ad.continuity.approvedAt = now();
    } else {
      const problems = advertIssues(p, ad);
      if (problems.length) throw new Error(problems.join(" "));
      if (!ad.continuity.approved) throw new Error("Approve the Continuity Profile before sharing the advert");
      ad.status = "shared";
    }
  } else if (type === "approveAdvert" || type === "requestAdvertChanges") {
    const ad = p.advert;
    if (!ad || ad.status !== "shared") throw new Error("The advert plan must be shared for review");
    requireHash(c.hash, ad.hash);
    ad.status = type === "approveAdvert" ? "approved" : "changes_requested";
    ad.feedback = text(c.feedback, "feedback", 2000, type !== "approveAdvert");
    if (ad.status === "approved") {
      ad.approvedBy = approver;
      ad.approvedAt = now();
    }
  } else if (type === "proposeCapability") {
    if (p.capabilities.length >= 30)
      throw new Error("Capability proposal limit reached");
    p.capabilities.push({
      id: id(),
      name: text(c.name, "name", 120, true),
      reason: text(c.reason, "reason", 2000, true),
      status: "proposed",
      evaluation:
        "Pending: input/output contracts, rights, permissions, data policy, cost ceiling, regression fixtures and operator promotion review.",
      createdAt: now(),
    });
  } else throw new Error("Unsupported command");
  if (requestId) p.processed.push(requestId);
  if (!p.strategies.length && p.researchPlanning && p.researchPlanning.inputKey && p.researchPlanning.inputKey !== planningInputKey(p)) {
    p.researchPlanning.status = "pending";
    delete p.researchPlanning.error;
  }
  if (p.taskPlan && ["updateBrief", "setChannels", "requestResearch", "selectFormats", "resetProject"].includes(type)) {
    if (planProject(p, a.subject, `Requirements updated: ${type}`)) p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "task_plan_revised", detail: `Plan v${p.taskPlan.version}: ${type}` });
  }
  syncTaskPlan(p);
  p.revision++;
  p.updatedAt = now();
  p.audit.push({
    id: id(),
    at: now(),
    actor: a.subject,
    role: a.role,
    action: type,
    detail: `Revision ${p.revision}`,
  });
  if (onBehalf || studioOnBehalf) p.audit.push({ id: id(), at: now(), actor: a.subject, role: a.role, action: "approved_on_behalf", detail: `${type} given by a producer on the customer's behalf` });
  return p;
}
export function researchProgress(p: Project): NonNullable<Project["researchProgress"]> {
  return selectedResearch(p).map((segment) => {
    const last = p.runs.filter((r) => r.stage === "research" && r.segment === segment && taskResearchCurrent(p, r)).at(-1);
    return {
      segment,
      status: last ? last.status : ("idle" as const),
      sources: p.sources.filter((s) => s.segment === segment && s.kind === "public_source").length,
      ...(last ? { at: last.at } : {}),
    };
  });
}
export function projectView(input: Project, a: Principal): Project {
  access(input, a);
  const p = linkProjectOwnership(input);
  syncTaskPlan(p);
  if (p.taskPlan) p.taskProgress = p.taskPlan.tasks.filter(t => t.status !== "skipped").map(t => ({ id: t.id, title: t.title, status: t.status }));
  p.researchProgress = researchProgress(p);
  if (p.researchRequest && !p.runs.some((r) => (r.stage || "research") === "research")) {
    const failure = [...p.audit].reverse().find((x) => x.action === "producer_step_auto_failed" || x.action === "producer_step_auto_approved");
    if (failure?.action === "producer_step_auto_failed") p.researchNote = a.role === "operator" ? "Automatic start could not run: " + failure.detail : "Port67 is setting up your research.";
    else if (autoApproveProducer()) p.researchNote = "Starting automatically.";
  }
  if (a.role === "operator") {
    if (p.researchPlanning) p.mediumContextHash = digest(mediumEvidenceKey(p));
    p.sources = p.sources.map((s) => (s.kind === "public_source" ? { ...s, grade: gradeSource(s, gradeContext(p, s.segment)) } : s));
    p.evidence = { segments: allSegmentEvidence(p) };
    p.researchPack = researchPack(p, p.evidence.segments);
    { const g = projectParts(p); p.storage = { bytes: g.bytes, limitBytes: STORAGE_LIMIT_BYTES, parts: g.parts }; }
    p.producerApprovals = producerApprovalsOn() || humanProducerApprovals();
    p.aiAuthorised = hasProviderConsent(p);
    return p;
  }
  delete p.aiConsent;
  delete p.taskPlan;
  delete p.performance;
  delete p.researchPlanning;
  delete p.mediumSelection;
  delete p.mediumDecision;
  delete p.mediumContextHash;
  delete p.aiAuthorised;
  delete p.scope;
  delete p.scopeHistory;
  delete p.producerAgent;
  delete p.reviews;
  delete p.ideas;
  delete p.audienceSuggestion;
  if (p.studio) {
    delete p.studio.rerunRequests;
    // Client stages stay with the producer until they are marked ready for client review (piece B).
    const studio = p.studio;
    studio.pieces = studio.pieces.filter((x) => studioStageVisibleToClient(studio, x.stage));
    // Go-to-market records (piece C) are shown to the client with the Production stage, once it is shared or approved.
    if (!studioStageVisibleToClient(studio, "production")) delete studio.gtm;
  }
  if (p.advert && p.advert.status !== "shared" && p.advert.status !== "approved") delete p.advert;
  p.deliveryPaused = p.strategies.at(-1)?.status !== "approved";
  p.strategies = p.strategies.filter((s) => s.status !== "draft");
  const visible = new Set(p.strategies.flatMap((s) => s.evidenceIds));
  p.sources = p.sources.filter(
    (s) => visible.has(s.id) && s.status === "supported",
  );
  p.assets = p.assets.filter(
    (x) =>
      x.status !== "draft" && p.strategies.some((s) => s.id === x.strategyId),
  );
  const shown = new Set(p.assets.filter((x) => x.status === "approved").map((x) => x.id));
  p.videos = (p.videos || []).filter((v) => shown.has(v.assetId));
  p.insights = p.insights.filter((i) =>
    p.strategies.some((s) => s.insightIds.includes(i.id)),
  );
  p.tasks = [];
  p.capabilities = [];
  p.audit = [];
  p.runs = [];
  p.processed = [];
  return p;
}
