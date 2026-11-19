// Stage 4 Production on the server (piece C, CHG-0099): Scene Pack stills drawn by the image adapter with the approved test frame and
// the client's packshots as references (one metered call each, 4:5 cropped from 2:3), the still rerun generator, and "Start next cycle".
// Hook pack variants and motion loops are uploaded (no video provider is wired; see video-provider.ts).
import { randomUUID } from "node:crypto";
import { createStudioProject, digest, id, operator, requireProviderConsent } from "./engine";
import { IMAGE_SLOT, resolveSelection } from "./ai-routing";
import { imageProviderFor, meteredImage, storeGeneratedImage, type ImageReference, type ImageResult } from "./image-provider";
import type { Principal, Project, ResearchRun, StudioAssetRef, StudioPiece, StudioState } from "./model";
import type { Repository } from "./repository";
import { addPieceVersion, currentStudioStage, findPiece, requirePieceEditable } from "./studio";
import { emptyGtm, fileName, gtmOf } from "./studio-gtm";
import { cropPngToRatio } from "./studio-media";
import { closeRun, findProject, finishedRun, newRun, reserve, rerunRepo, switchOn } from "./studio-preproduction";
import { buildStillPrompt, fileOf, requireProductionOpen, stillRatio, stillReferences } from "./studio-production";
import { StudioRerunError, registerStudioRerun, type StudioRerunContext } from "./studio-rerun";
import { getStudioFile, studioKeyAccount } from "./studio-store";

const MAX_PROJECTS = 20;
/** Read the reference files for a still: the test frame first, then the packshots. Only files of this project's own account are read. */
async function referenceFiles(p: Project, refs: ReturnType<typeof stillReferences>): Promise<ImageReference[]> {
  const account = p.accountId || p.workspaceId;
  const list = [...(refs.frame ? [refs.frame] : []), ...refs.packshots].filter((x) => studioKeyAccount(x.storageKey) === account);
  const out: ImageReference[] = [];
  for (const ref of list) out.push({ bytes: await getStudioFile(ref.storageKey), mime: ref.mime, name: ref.name });
  return out;
}
/** 4:5 stills are drawn at 2:3 (1024x1536) and cropped to 4:5 here; a JPEG or WebP reply, or an unreadable PNG, is kept as drawn. */
function fitRatio(image: ImageResult, piece: StudioPiece): { bytes: Buffer; mime: string; note: string } {
  const ratio = stillRatio(piece);
  if (ratio.id !== "4:5") return { bytes: image.bytes, mime: image.mime, note: "" };
  if (image.mime !== "image/png") return { bytes: image.bytes, mime: image.mime, note: ` (not cropped: the provider returned ${image.mime}; the spec check will flag it)` };
  try {
    const out = cropPngToRatio(image.bytes, ratio.ratio);
    return { bytes: out.bytes, mime: "image/png", note: out.cropped ? ` (cropped to 4:5, ${out.width} x ${out.height})` : "" };
  } catch (e) {
    return { bytes: image.bytes, mime: image.mime, note: ` (not cropped: ${e instanceof Error ? e.message : "unreadable PNG"}; the spec check will flag it)` };
  }
}
function requireStill(s: StudioState, pieceId: string): StudioPiece {
  const piece = findPiece(s, pieceId);
  if (piece.kind !== "still" || piece.stage !== "production") throw new Error("Choose a Scene Pack still");
  requirePieceEditable(s, piece);
  return piece;
}

/**
 * Draw one Scene Pack still: one metered image call (edits endpoint, with the approved test frame and up to four packshots as
 * references), cropped to 4:5 when needed, stored privately and tagged AI generated, a new AI version of the still.
 */
export async function generateStudioStill(repo: Repository, a: Principal, projectId: string, pieceId: string, fetcher?: typeof fetch): Promise<Project> {
  operator(a);
  if (a.demo) throw new Error("Paid image generation is disabled in the synthetic demo");
  switchOn();
  const selection = await resolveSelection(repo, IMAGE_SLOT);
  const provider = imageProviderFor(selection, fetcher);
  const reservation = await repo.mutate(a.workspaceId, (state) => {
    const p = findProject(state.projects, projectId, a);
    const s = p.studio;
    if (!s) throw new Error("This is not a studio project");
    requireProductionOpen(s);
    requireProviderConsent(p);
    const piece = requireStill(s, pieceId);
    const prompt = buildStillPrompt(s, piece);
    const refs = stillReferences(s, piece);
    const run = newRun("studio.image", selection, digest(prompt + [refs.frame?.id, ...refs.packshots.map((x) => x.id)].join(",")), { pieceId: piece.id });
    reserve(p, run);
    return { project: structuredClone(p), run, prompt, refs, piece: structuredClone(piece) };
  });
  const { run, piece } = reservation;
  let ref: StudioAssetRef, note = "", usage: Record<string, number> = {}, providerRequestId: string | undefined;
  try {
    const references = await referenceFiles(reservation.project, reservation.refs);
    const image = await meteredImage(repo, a, reservation.project, run.id, provider, { prompt: reservation.prompt, size: stillRatio(piece).size, ...(references.length ? { references } : {}) });
    usage = image.usage;
    providerRequestId = image.providerRequestId;
    const fitted = fitRatio(image, piece);
    note = fitted.note;
    ref = await storeGeneratedImage(reservation.project, { bytes: fitted.bytes, mime: fitted.mime }, a.subject, `${piece.title}.png`, provider.model);
  } catch (e) {
    const why = e instanceof Error ? e.message : "Image generation failed";
    await repo.mutate(a.workspaceId, (state) => closeRun(findProject(state.projects, projectId, a), run.id, { error: why }));
    throw new Error(why);
  }
  const error = await repo.mutate(a.workspaceId, (state) => {
    const p = findProject(state.projects, projectId, a);
    try {
      if (p.runs.find((r) => r.id === run.id)?.status !== "running") throw new Error("The image task was recovered or cancelled; no late output accepted");
      requireProductionOpen(p.studio!);
      const { version } = addPieceVersion(p.studio!, pieceId, { image: ref, source: "ai", runId: run.id, brief: reservation.prompt }, { by: a.subject });
      closeRun(p, run.id, { usage, providerRequestId });
      p.audit.push({ id: id(), at: new Date().toISOString(), actor: a.subject, role: a.role, action: "studio_still_generated", detail: `${piece.title}: AI still version ${version.n} (${provider.model}, ${reservation.refs.frame ? "test frame" : "no test frame"} and ${reservation.refs.packshots.length} packshot reference${reservation.refs.packshots.length === 1 ? "" : "s"})${note}` });
      return "";
    } catch (e) {
      const why = e instanceof Error ? e.message : "Image could not be stored";
      closeRun(p, run.id, { error: why });
      return why;
    }
  });
  if (error) throw new Error(error);
  return findProject((await repo.read(a.workspaceId)).projects, projectId, a);
}

/** Still rerun: the same references and prompt, plus the open comments (areas in words) and the instruction. */
async function rerunStill(ctx: StudioRerunContext) {
  switchOn();
  const repo = rerunRepo(ctx);
  const { project: p, piece, request } = ctx;
  const s = p.studio!;
  requireProductionOpen(s);
  const selection = await resolveSelection(repo, IMAGE_SLOT);
  const provider = imageProviderFor(selection);
  const prompt = buildStillPrompt(s, piece, { comments: piece.comments, instruction: request.instruction });
  const run: ResearchRun = { ...newRun("studio.image", selection, digest(prompt), { pieceId: piece.id, rerunRequestId: request.id }), id: randomUUID() };
  try {
    const references = await referenceFiles(p, stillReferences(s, piece));
    const image = await meteredImage(repo, ctx.principal, p, run.id, provider, { prompt, size: stillRatio(piece).size, ...(references.length ? { references } : {}) });
    const fitted = fitRatio(image, piece);
    const ref = await storeGeneratedImage(p, { bytes: fitted.bytes, mime: fitted.mime }, ctx.principal.subject, `${piece.title}.png`, provider.model);
    return { image: ref, runId: run.id, run: finishedRun(run, { usage: image.usage, providerRequestId: image.providerRequestId }) };
  } catch (e) {
    const why = e instanceof Error ? e.message : "Image generation failed";
    throw new StudioRerunError(why, finishedRun(run, { error: why }));
  }
}
registerStudioRerun("still", rerunStill);

/**
 * "Start next cycle": a new studio project for the same account and offer, with the Brand Kit and brief copied (file references
 * included; the files stay where they are), the producer-marked winners attached as liked references (and image winners as mood
 * images), and the intake stage active. Nothing paid runs; the new intake must be approved at gate 1 as usual.
 */
export async function startNextCycle(repo: Repository, a: Principal, projectId: string): Promise<{ previous: Project; next: Project }> {
  operator(a);
  return repo.mutate(a.workspaceId, (state) => {
    const old = findProject(state.projects, projectId, a);
    const s = old.studio;
    if (!s) throw new Error("This is not a studio project");
    if (currentStudioStage(s) !== "delivered") throw new Error("Start the next cycle once this project is delivered (gate 4 approved)");
    const g = gtmOf(s);
    if (g.nextCycle) throw new Error(`The next cycle is already started (project ${g.nextCycle.projectId})`);
    if (state.projects.length >= MAX_PROJECTS) throw new Error("Workspace project limit reached");
    const b = s.brief;
    const winners = g.winners.map((w) => s.pieces.find((x) => x.id === w)).filter((x): x is StudioPiece => !!x && !!fileOf(x));
    const name = (b.project.name || b.client.businessName).replace(/\s*\(cycle \d+\)$/, "");
    const cycle = (Number(/\(cycle (\d+)\)$/.exec(b.project.name || "")?.[1]) || 1) + 1;
    const liked = [...winners.map((x) => `Winner from ${name}: ${fileName(s, x)} (${x.title})`.slice(0, 300)), ...b.references.liked].slice(0, 10);
    const next = createStudioProject({
      offer: s.offer,
      brief: {
        client: { ...b.client },
        project: { name: `${name} (cycle ${cycle})`.slice(0, 120), ...(b.project.quantity ? { quantity: b.project.quantity } : {}) },
        brandKit: { colours: b.brandKit.colours, fonts: b.brandKit.fonts, tone: b.brandKit.tone, avoid: b.brandKit.avoid },
        references: { liked, disliked: b.references.disliked },
        product: { ...b.product },
        socials: { ...b.socials },
        themes: b.themes,
      },
    }, a);
    if (next.accountId !== old.accountId) throw new Error("The next cycle must stay in the same account");
    const nb = next.studio!.brief;
    // File references are copied, not the files: they stay in this account's private store and are served through the new project.
    if (b.brandKit.logo) nb.brandKit.logo = structuredClone(b.brandKit.logo);
    nb.assets = structuredClone(b.assets);
    nb.references.mood = [...winners.map((x) => fileOf(x)!).filter((x) => x.mime.startsWith("image/")), ...b.references.mood].slice(0, 12).map((x) => structuredClone(x));
    next.studio!.gtm = { ...emptyGtm(), previousCycle: { projectId: old.id, name: b.project.name || b.client.businessName } };
    const at = new Date().toISOString();
    next.audit.push({ id: id(), at, actor: a.subject, role: a.role, action: "studio_next_cycle_created", detail: `Started from delivered project ${old.id}: Brand Kit and brief copied, ${winners.length} winner${winners.length === 1 ? "" : "s"} attached as liked references` });
    old.studio!.gtm = { ...gtmOf(old.studio!), nextCycle: { projectId: next.id, at, by: a.subject } };
    old.audit.push({ id: id(), at, actor: a.subject, role: a.role, action: "studio_next_cycle_started", detail: `Next cycle started as project ${next.id}` });
    old.revision++;
    old.updatedAt = at;
    state.projects.push(next);
    return { previous: structuredClone(old), next: structuredClone(next) };
  });
}
