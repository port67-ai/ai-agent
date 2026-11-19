// Shared fixtures for the studio piece C tests (CHG-0099). No test runs from this file.
import { createPreproductionPieces, preproductionContext, validateHookPack, validateScenePack } from "../src/lib/factory/studio-preproduction";
import { transition as move } from "../src/lib/factory/engine";
import type { Principal, Project, StudioAssetRef } from "../src/lib/factory/model";
import { hookDraft, op, preproductionProject, sceneDraft } from "./factory-studio-fixtures";
/** A file reference with a known size (no stored bytes). */
export function fakeRef(id: string, mime = "image/png", width = 1024, height = 1024, extra: Partial<StudioAssetRef> = {}): StudioAssetRef {
  const ext = ({ "image/png": "png", "image/jpeg": "jpg", "video/mp4": "mp4" } as Record<string, string>)[mime] || "png";
  return { id, name: `${id}.${ext}`, mime, bytes: 100, storageKey: `studio/w/x/${id}.${ext}`, uploadedAt: "2026-11-20T00:00:00.000Z", uploadedBy: "producer", width, height, ...extra };
}
/** Pre-production drafted, every image piece drawn (fake files), every piece approved and gate 3 approved: Production is open. */
export function productionProject(offer: "scene_pack" | "hook_pack", id: string, actor: Principal = op): Project {
  let p = preproductionProject(offer, id, actor);
  const ctx = preproductionContext(p);
  createPreproductionPieces(p.studio!, offer === "scene_pack" ? validateScenePack(sceneDraft(), ctx) : validateHookPack(hookDraft(), ctx), ctx, { by: "producer", runId: "run" });
  for (const piece of p.studio!.pieces.filter((x) => x.kind === "test_frame" || x.kind === "keyframe")) {
    piece.versions.push({ n: 1, image: fakeRef(`img-${piece.id.slice(0, 8)}`, "image/png", 1024, 1024, { aiDisclosure: "ai_generated", rights: { source: "AI generated", licence: "Generated for this project" } }), createdAt: "2026-11-20T00:00:00.000Z", createdBy: "producer", source: "ai" });
    piece.aiDisclosure = "ai_generated";
  }
  p.studio!.brief.assets.packshots.push(fakeRef("pack-sourdough", "image/png", 2000, 2000, { name: "sourdough-packshot.png", rights: { source: "Client upload", licence: "Confirmed by the uploader", confirmedBy: "ann" } }));
  for (const piece of p.studio!.pieces) p = move(p, { type: "setStudioPieceStatus", pieceId: piece.id, status: "approved" }, actor);
  return move(p, { type: "approveStudioGate", stage: "preproduction" }, actor);
}
