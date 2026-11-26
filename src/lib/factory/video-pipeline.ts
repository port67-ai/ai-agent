import { createHash, randomUUID } from "node:crypto";
import type { BrandIntelVersion, Commission, CustomerAccount, Generation, PipelineStage, VideoImage, VideoPipeline, VideoPlan } from "./model";
import type { Repository } from "./repository";
import type { Deps } from "./brand-intel-run";
import { effectivePrompt } from "./agent-settings";
import { CONTRACTS } from "./agent-prompts";
import { meteredInvoke } from "./metered";
import { cutShort, jsonOf } from "./audience-agent";
import { videoContext } from "./video-steps";
import { findPlan, planFor } from "./video-steps-commands";
import { VIDEO_SKILLS, videoTargetOf } from "./video-prompt-skills";
import { imagesOf, mentions } from "./video-images";

export const PIPELINE_SLOTS = { info: "synthesis:video-project-info", beats: "synthesis:video-director-beats", technical: "synthesis:video-technical" } as const;
export const RATIOS = ["16:9", "9:16", "1:1", "4:5", "2.35:1"];
type Context = { customer: CustomerAccount; commission: Commission; generation: Generation; dossier?: BrandIntelVersion; actor: string; ws: string; deps: Deps };
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const textOf = (value: unknown) => { if (typeof value !== "string" || !value.trim() || value.length > 24000) throw new Error("Enter non-empty output of up to 24,000 characters"); return value.trim(); };
function stageOf(v: unknown): PipelineStage { if (v !== "info" && v !== "beats" && v !== "technical") throw new Error("Unknown pipeline stage"); return v; }
function settings(d: Record<string, unknown>) {
  const duration = Number(d.duration), aspectRatio = String(d.aspectRatio || "");
  if (!Number.isInteger(duration) || duration < 3 || duration > 120) throw new Error("Choose a whole-number duration from 3 to 120 seconds");
  if (!RATIOS.includes(aspectRatio)) throw new Error("Choose an aspect ratio");
  return { duration, aspectRatio };
}
function selected(images: VideoImage[], value: unknown) {
  if (!Array.isArray(value) || value.some(x => typeof x !== "string") || new Set(value).size !== value.length) throw new Error("Choose valid project assets");
  return value.map(id => { const asset = images.find(i => i.id === id); if (!asset) throw new Error("A selected asset is no longer available in this project"); return asset; });
}
const metadata = (images: VideoImage[]) => images.map(i => ({ id: i.id, name: i.name, title: i.title || i.name, category: i.category || "Uncategorised", description: i.description }));
function checkText(stage: PipelineStage, text: string, assets: VideoImage[], target: ReturnType<typeof videoTargetOf>) {
  if (stage === "info") for (const tag of ["BRAND_CONTEXT", "COMMISSION_BRIEF", "AUDIENCE_PSYCHOLOGY", "CREATIVE_SEED_AND_ASSETS"]) {
    if (!text.includes("<" + tag + ">") || !text.includes("</" + tag + ">")) throw new Error("Project information must include all four labelled blocks");
  }
  if (stage === "technical") {
    const names = new Set(target === "seedance-2.5" ? assets.map((_, i) => "Image" + (i+1)) : assets.map(i => i.name));
    const unknown = mentions(text).filter(n => !names.has(n));
    if (unknown.length) throw new Error("Technical prompt uses an unselected or unknown asset: @" + unknown[0]);
  }
}
function source(c: Context, plan: VideoPlan, images: VideoImage[]) {
  const data = videoContext("prompts", { ...c, plan, images: metadata(images) });
  return data + "\n<asset_catalogue>" + JSON.stringify(metadata(images)) + "</asset_catalogue>";
}
function clearAfter(p: VideoPipeline, stage: PipelineStage) {
  if (stage === "info") { delete p.beats; delete p.technical; }
  if (stage === "beats") delete p.technical;
}
function gate(p: VideoPipeline | undefined, stage: PipelineStage, key: string) {
  if (stage === "info") return;
  if (!p || p.sourceKey !== key || !p.info?.accepted) throw new Error("Generate and accept current project information first");
  if (stage === "technical" && !p.beats?.accepted) throw new Error("Accept the director's beat script first");
}
export async function handlePipeline(repo: Repository, c: Context, d: Record<string, unknown>): Promise<VideoPlan> {
  const stage = stageOf(d.stage);
  const db = await repo.read(c.ws), plan = findPlan(db, c.commission.id, c.generation);
  if (!plan?.script) throw new Error("Save a script first");
  const images = imagesOf(db, c.commission.id), data = source(c, plan, images), key = hash(data);
  const p = plan.pipeline;
  gate(p, stage, key);
  const spec = stage === "info" && d.action === "pipeline-generate" ? settings(d) : p ? { duration: p.duration, aspectRatio: p.aspectRatio } : (() => { throw new Error("Generate project information first"); })();
  const assets = stage === "technical" ? selected(images, d.assetIds ?? p?.technical?.assetIds ?? []) : [];
  const target = videoTargetOf(d.videoTarget ?? p?.technical?.videoTarget);
  const skill = VIDEO_SKILLS[target];
  if (stage === "technical" && d.action === "pipeline-generate" && (spec.duration < 4 || assets.length > (target === "seedance-2.5" ? 9 : 10) || (target === "magi-3" && (spec.duration > 30 || !["16:9","9:16"].includes(spec.aspectRatio))))) throw new Error("Selected skill requires at least 4 seconds, supported aspect ratio and reference count; MAGI-2 compatibility is limited to 4–30 seconds and 16:9 or 9:16.");
  const snapshot = JSON.stringify(p || null);
  let output: string, model: string;
  if (d.action === "pipeline-generate") {
    if (!c.deps.enabled()) throw new Error("AI drafting is not configured");
    const slot = PIPELINE_SLOTS[stage], sel = await c.deps.resolve(slot);
    const body = (await effectivePrompt(repo, slot)).body;
    const input = stage === "info" ? data : stage === "beats" ? JSON.stringify({ approvedProjectInformation: p!.info!.text }) : JSON.stringify({ approvedProjectInformation: p!.info!.text, approvedDirectorScript: p!.beats!.text, selectedAssets: metadata(assets).map((a,i)=>({...a, attachment: target === "seedance-2.5" ? "@Image"+(i+1) : "@"+a.name})), videoTarget: target });
    const result = await meteredInvoke(repo, { accountId: c.customer.id, workspaceId: c.ws, projectId: c.commission.id, runId: randomUUID() }, slot, "synthesis", sel, c.actor, c.deps, {
      instructions: body + (stage === "technical" ? "\n\nSelected skill takes precedence over conflicting editable style instructions: "+skill.instructions : "") + "\n\n" + CONTRACTS[slot],
      input: input + "\n<production_settings>" + JSON.stringify(spec) + "</production_settings>\n<client_red_lines>" + JSON.stringify(c.customer.redLines) + "</client_red_lines>\n<target_age_group>" + c.generation + "</target_age_group>",
      schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } }, name: "port67_pipeline_" + stage, maxOutputTokens: 12000, reasoningEffort: "low", timeoutMs: 150000
    });
    if (result.error) throw new Error(result.error);
    if (cutShort(result.data)) throw new Error("AI output was truncated; try again");
    const parsed = jsonOf(result.text) as { text?: unknown };
    output = textOf(parsed?.text); model = sel.provider + " " + sel.model;
  } else {
    const entry = p?.[stage];
    if (!entry || d.revision !== entry.revision || p!.sourceKey !== key) throw new Error("Generate the current stage first or reload before accepting");
    if (stage === "technical" && JSON.stringify(entry.assetIds || []) !== JSON.stringify(assets.map(i => i.id))) throw new Error("Regenerate the technical prompt after changing asset selection");
    if (stage === "technical" && (entry.videoTarget !== target || entry.skillVersion !== skill.version)) throw new Error("Regenerate after changing video model or skill");
    output = textOf(d.text); model = entry.model;
  }
  checkText(stage, output, assets, target);
  return repo.mutate(c.ws, current => {
    const latest = findPlan(current, c.commission.id, c.generation);
    if (!latest || hash(source(c, latest, imagesOf(current, c.commission.id))) !== key || JSON.stringify(latest.pipeline || null) !== snapshot) throw new Error("Project or pipeline changed; reload and try again");
    const next = stage === "info" && d.action === "pipeline-generate" ? { ...spec, sourceKey: key } as VideoPipeline : latest.pipeline!;
    clearAfter(next, stage);
    next[stage] = { text: output, accepted: d.action === "pipeline-accept", revision: randomUUID(), generatedAt: new Date().toISOString(), by: c.actor, model, ...(stage === "technical" ? { videoTarget: target, skillVersion: skill.version, assetIds: assets.map(i => i.id), assetNames: assets.map(i => i.name) } : {}) };
    const saved = planFor(current, c.commission.id, c.generation, c.actor);
    saved.pipeline = next; saved.updatedAt = new Date().toISOString(); saved.updatedBy = c.actor;
    return saved;
  });
}
