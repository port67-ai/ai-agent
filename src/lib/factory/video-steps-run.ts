import { randomUUID } from "node:crypto";
import type { BrandIntelVersion, Commission, CustomerAccount, Generation, VideoPlan } from "./model";
import type { Repository } from "./repository";
import type { Deps } from "./brand-intel-run";
import { meteredInvoke } from "./metered";
import { CONTRACTS, DEFAULT_PROMPTS, type VideoSlot } from "./agent-prompts";
import { cutShort, jsonOf } from "./audience-agent";
import { STEP_SLOT, parseVideo, scriptText, skeleton, templateDef, videoContext, videoSchema, type ParsedVideo, type VideoStep } from "./video-steps";

// One agent call for a Video steps step (CHG-0115). Synthesis only, no web search; metered on the admin ledger against the project.
export const videoWorkspace = (customerId: string) => `factory-video-${customerId}`;
export type VideoRun = { customer: CustomerAccount; commission: Commission; generation: Generation; plan?: VideoPlan; dossier?: BrandIntelVersion; step: VideoStep; instruction?: string; template?: string };

function readJson(text: string, truncated: boolean): Record<string, unknown> {
  if (!text.trim()) throw new Error(truncated ? "The AI ran out of output length before it wrote anything. Try again, or choose a model with more output room in the AI agent box. Nothing was changed." : "The AI sent back an empty answer. Try again; nothing was changed.");
  try { const j = jsonOf(text); if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>; } catch { /* fall through */ }
  throw new Error(truncated ? "The AI ran out of output length and its answer was cut off. Try again, or choose a model with more output room in the AI agent box. Nothing was changed." : "The AI answer could not be read. Try again; nothing was changed.");
}
/** The task for this call, added after the data block. */
function task(r: VideoRun): string {
  if (r.step === "references") return "Write the reference brief for this commission and age group.";
  if (r.step === "sheets") return "Write the sheets for everything in the saved script.";
  if (r.step === "prompts") return `Write one generation prompt for each of the ${r.plan?.script?.shots.length} shots in the saved script, plus the overall style prompt.`;
  const t = templateDef(r.template || "");
  const current = r.plan?.script;
  if (r.instruction && current) return `Revise the current script as instructed. Instruction: ${r.instruction}\n\nCurrent script:\n${scriptText(current)}\n\nPrevious instructions:\n${(r.plan?.chat || []).slice(-6).map((c) => `- ${c.instruction}`).join("\n") || "(none)"}`;
  const shape = t ? `Template: ${t.label}. Use this shot structure, adjusting the number of shots only if needed and keeping the total near ${t.seconds} seconds: ${t.beats.map((b) => `${b.beat} (${b.seconds}s)`).join(", ")}.` : "Choose a sensible short-form structure.";
  return `Write a new script. ${shape}${r.instruction ? ` Extra direction: ${r.instruction}` : ""}`;
}

export async function runVideoStep(repo: Repository, r: VideoRun, actor: string, deps: Deps, body?: string): Promise<{ parsed: ParsedVideo; model: string }> {
  if (!deps.enabled()) throw new Error("AI drafting is not configured. Turn on PORT67_SYNTHESIS_ENABLED and set the AI keys in Render.");
  const slot: VideoSlot = STEP_SLOT[r.step];
  const sel = await deps.resolve(slot);
  const result = await meteredInvoke(repo, { accountId: r.customer.id, workspaceId: videoWorkspace(r.customer.id), projectId: r.commission.id, runId: randomUUID() }, slot, "synthesis", sel, actor, deps,
    { instructions: `${body ?? DEFAULT_PROMPTS[slot]}\n\n${CONTRACTS[slot]}`, input: `${videoContext(r.step, r)}\n\nTASK\n${task(r)}`, schema: videoSchema(r.step), name: `port67_video_${r.step}`, maxOutputTokens: r.step === "prompts" ? 12000 : 8000, reasoningEffort: "low", timeoutMs: 150_000 });
  if (result.error) throw new Error(result.error);
  const parsed = parseVideo(r.step, readJson(result.text, cutShort(result.data)), r.plan?.script?.shots.length || 0);
  return { parsed, model: `${sel.provider} ${sel.model}` };
}
export { skeleton };
