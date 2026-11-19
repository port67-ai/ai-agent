import type { Principal, Project, ResearchRun, StudioAssetRef, StudioPiece, StudioRerunRequest } from "./model";
import type { Repository } from "./repository";

/**
 * Rerun hook point (CHG-0097). Piece A records rerun requests (command requestStudioRerun) with a brief built from the piece's open
 * comments and an optional instruction. A generator for a piece kind is registered here by piece B; the service then calls it after
 * recording the request and stores its output as a new AI version (old versions kept, dependants marked stale).
 *
 * A handler must meter every paid call through the existing ledger (reserveApiCall / finishApiCall), must not write to the project
 * itself, and should put any image or clip bytes in the private file store (studio-store.ts) and return only a StudioAssetRef.
 */
export type StudioRerunContext = { project: Project; piece: StudioPiece; request: StudioRerunRequest; principal: Principal; /** The repository the service used (piece B); handlers meter their calls through it. */ repo?: Repository };
/** `run` (piece C): the finished project run record for the call, which the service stores so reruns appear in project diagnostics. */
export type StudioRerunOutput = { text?: string; image?: StudioAssetRef; runId?: string; run?: ResearchRun };
/** A failed rerun; carries the failed run record when a paid call was attempted, so it is still stored on the project. */
export class StudioRerunError extends Error {
  constructor(message: string, readonly run?: ResearchRun) {
    super(message);
  }
}
export type StudioRerunHandler = (ctx: StudioRerunContext) => Promise<StudioRerunOutput>;
const handlers = new Map<string, StudioRerunHandler>();
/** Register the generator for one piece kind (for example "mood_board", "scene", "script", "hook", "keyframe"). */
export function registerStudioRerun(kind: string, handler: StudioRerunHandler) {
  handlers.set(kind, handler);
}
export function studioRerunHandler(kind: string): StudioRerunHandler | undefined {
  return handlers.get(kind);
}
/** Test and reset aid. */
export function clearStudioRerunHandlers() {
  handlers.clear();
}
