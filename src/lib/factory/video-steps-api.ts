import type { Generation, Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE } from "./customers";
import { CUSTOMER_ID, findCustomer } from "./customers-commands";
import { findCommission } from "./commissions-commands";
import { generationDef, generationKey } from "./commissions";
import { brandIntelWorkspace, realDeps, versionsOf, type Deps } from "./brand-intel-run";
import { currentVersion } from "./brand-intel";
import { effectivePrompt } from "./agent-settings";
import { STEP_SLOT, instructionText, templateDef, type VideoStep } from "./video-steps";
import { addChat, addReference, acceptReference, acceptSheet, addSheet, findPlan, planFor, removeReference, removeSheet, savePrompts, saveScript, storeParsed, updateReference, updateSheet } from "./video-steps-commands";
import { runVideoStep, videoWorkspace } from "./video-steps-run";

// Video steps routes (CHG-0115). Producers and admins only. A plan belongs to one project and one age group, and the age group must have
// been saved and selected for direction on the project first.
//   GET  video/:customerId/:commissionId/:generation
//   POST video/:customerId/:commissionId/:generation  {action: reference-add | reference-update | reference-remove | reference-accept | script-save |
//        sheet-add | sheet-update | sheet-remove | sheet-accept | prompts-save | generate {step, instruction?, template?}}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const isVideoRoute = (path: string[]) => path[0] === "video";
/** Test seam only: replaces the model call. Never set in production code. */
export const testHooks: { deps?: Deps } = {};
const STEPS: VideoStep[] = ["references", "script", "sheets", "prompts"];

export async function handleVideo(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "Video steps are not available in the synthetic demo" }, 403);
  const [, cid, commissionId, gen] = path;
  if (path.length !== 4 || !CUSTOMER_ID.test(cid)) return json({ error: "Not found" }, 404);
  const actor = a.subject;
  const customer = findCustomer(await repository.read(CUSTOMERS_WORKSPACE), cid);
  const commission = findCommission(await repository.read(`factory-commissions-${cid}`), commissionId);
  const generation: Generation = generationKey(gen);
  const label = generationDef(generation)!.label;
  if (!commission.audience?.[generation] || !(commission.directionGenerations || []).includes(generation)) throw new Error(`Select ${label} for direction on the project first. Video steps start from a saved, selected age group.`);
  const ws = videoWorkspace(cid);
  const view = (p: ReturnType<typeof findPlan>) => json({ plan: p || null, commission: { id: commission.id, name: commission.name }, customer: { id: customer.id, name: customer.name }, generation, label });

  if (request.method === "GET") return view(findPlan(await repository.read(ws), commissionId, generation));
  const action = typeof data.action === "string" ? data.action : "";

  if (action === "generate") {
    const step = data.step as VideoStep;
    if (!STEPS.includes(step)) throw new Error("Unknown step");
    const existing = findPlan(await repository.read(ws), commissionId, generation);
    if ((step === "sheets" || step === "prompts") && !existing?.script) throw new Error("Save a script first. This step is written from it.");
    if (step === "script" && data.template !== undefined && data.template !== "custom" && !templateDef(String(data.template))) throw new Error("Choose a template");
    const instruction = instructionText(data.instruction);
    const dossier = currentVersion(versionsOf(await repository.read(brandIntelWorkspace(cid))));
    const base = testHooks.deps || realDeps(repository);
    const deps: Deps = testHooks.deps ? base : { ...base, enabled: () => process.env.PORT67_SYNTHESIS_ENABLED === "true" };
    const body = (await effectivePrompt(repository, STEP_SLOT[step])).body;
    const revising = step === "script" && !!instruction && !!existing?.script && data.template === undefined;
    const { parsed, model } = await runVideoStep(repository, { customer, commission, generation, plan: existing, dossier, step, instruction: instruction || undefined, template: data.template as string | undefined }, actor, deps, body);
    let draft: unknown = null;
    const plan = await repository.mutate(ws, (db) => {
      const p = planFor(db, commissionId, generation, actor);
      if (parsed.step === "script") {
        addChat(p, instruction || `New script from the ${data.template === "custom" || !data.template ? "custom" : data.template + " second"} template`, parsed.notes || (revising ? "Revised." : "Drafted."), actor);
        draft = { title: parsed.title, shots: parsed.shots, notes: parsed.notes };
      } else storeParsed(p, parsed, model, actor);
      return p;
    });
    return json({ plan, draft, model, label });
  }

  const plan = await repository.mutate(ws, (db) => {
    const p = planFor(db, commissionId, generation, actor);
    if (action === "reference-add") addReference(p, data, actor);
    else if (action === "reference-update") updateReference(p, data.id, data, actor);
    else if (action === "reference-remove") removeReference(p, data.id, actor);
    else if (action === "reference-accept") acceptReference(p, data.id, data.accepted, actor);
    else if (action === "script-save") saveScript(p, data, actor);
    else if (action === "sheet-add") addSheet(p, data, actor);
    else if (action === "sheet-update") updateSheet(p, data.id, data, actor);
    else if (action === "sheet-remove") removeSheet(p, data.id, actor);
    else if (action === "sheet-accept") acceptSheet(p, data.id, data.accepted, actor);
    else if (action === "prompts-save") savePrompts(p, data, actor);
    else throw new Error("Unknown action");
    return p;
  });
  return view(plan);
}
