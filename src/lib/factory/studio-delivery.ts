// Delivery documents for Stage 4 (piece C, CHG-0099), built from the caller's own project view so role filtering already applies:
// the manifest (JSON and Markdown), the test matrix CSV, the launch handoff, the results template and per-piece prompt packs.
import type { Project } from "./model";
import { currentStudioStage } from "./studio";
import { deliveryManifest, fileBase, handoffMarkdown, manifestMarkdown, readbackTemplateCsv, testMatrixCsv } from "./studio-gtm";
import { loopPrompt, promptPackMarkdown, variantPromptPack } from "./studio-production";

export type DeliveryDocument = { name: string; type: string; body: string };
export const DELIVERY_FILES = ["manifest.json", "manifest.md", "test-plan.csv", "handoff.md", "results-template.csv"] as const;
const MD = "text/markdown; charset=utf-8", CSV = "text/csv; charset=utf-8";
/** Producers get every document at any time; the client gets the manifest, test plan and handoff once the project is delivered. */
export function studioDeliveryDocument(view: Project, file: string, producer: boolean): DeliveryDocument {
  const s = view.studio;
  if (!s) throw new Error("This is not a studio project");
  if (!producer && currentStudioStage(s) !== "delivered") throw new Error("Forbidden: the delivery pack is shared once the project is delivered");
  const base = `${s.brief.client.businessName || "studio"}-${s.offer}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "studio";
  if (file === "manifest.json") return { name: `${base}-manifest.json`, type: "application/json; charset=utf-8", body: JSON.stringify(deliveryManifest(s, view), null, 2) };
  if (file === "manifest.md") return { name: `${base}-manifest.md`, type: MD, body: manifestMarkdown(deliveryManifest(s, view)) };
  if (file === "test-plan.csv") return { name: `${base}-test-plan.csv`, type: CSV, body: testMatrixCsv(s) };
  if (file === "handoff.md") return { name: `${base}-launch-handoff.md`, type: MD, body: handoffMarkdown(s, view) };
  if (!producer) throw new Error("Forbidden: producer document");
  if (file === "results-template.csv") return { name: `${base}-results-template.csv`, type: CSV, body: readbackTemplateCsv(s) };
  const m = /^(prompt-pack|loop-prompt)-([A-Za-z0-9_-]{1,100})\.(md|txt)$/.exec(file);
  const piece = m && s.pieces.find((x) => x.id === m[2]);
  if (m && piece && m[1] === "prompt-pack" && piece.kind === "variant") return { name: `${fileBase(s, piece)}-prompt-pack.md`, type: MD, body: promptPackMarkdown({ ...variantPromptPack(s, piece), fileBase: fileBase(s, piece) }) };
  if (m && piece && m[1] === "loop-prompt" && piece.kind === "loop") return { name: `${fileBase(s, piece)}-prompt.txt`, type: "text/plain; charset=utf-8", body: loopPrompt(s, piece) + "\n" };
  throw new Error("Unknown delivery document");
}
/** The authorised route for a delivery document. */
export const deliveryPath = (projectId: string, file: string) => `/api/factory/projects/${encodeURIComponent(projectId)}/studio/delivery/${encodeURIComponent(file)}`;
