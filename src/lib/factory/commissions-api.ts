import type { Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE } from "./customers";
import { CUSTOMER_ID, findCustomer } from "./customers-commands";
import { realDeps, versionsOf as dossiersOf, brandIntelWorkspace, type Deps } from "./brand-intel-run";
import { currentVersion } from "./brand-intel";
import { generateAudience } from "./audience-agent";
import { addEvidence, addListEntry, createCommission, commissionsOf, findCommission, removeEvidence, removeListEntry, renameCommission, saveAnswers, recordDraft, saveWentTooFar, setConfirmed, updateEvidence, updateListEntry } from "./commissions-commands";

// Video workspace commission routes (CHG-0107). Producers and admins only; customers and the demo are refused.
//   GET  commissions/:customerId                list the account's commissions
//   POST commissions/:customerId                create {name}
//   GET  commissions/:customerId/:id            one commission, with the account's red lines for reference
//   POST commissions/:customerId/:id            {action: generate (input: "audience") | rename | answers | list-add | list-update | list-remove | went-too-far | evidence-add | evidence-update | evidence-remove | confirm, ...}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
/** Test seam only: replaces the model call for Generate from AI. Never set in production code. */
export const testHooks: { deps?: Deps } = {};
export const isCommissionRoute = (path: string[]) => path[0] === "commissions";
const workspace = (customerId: string) => `factory-commissions-${customerId}`;

export async function handleCommissions(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "Projects are not available in the synthetic demo" }, 403);
  const actor = a.subject;
  const get = request.method === "GET";
  const [, cid, id] = path;
  if (!CUSTOMER_ID.test(cid || "") || path.length < 2 || path.length > 3) return json({ error: "Customer account not found" }, 404);
  // The commission always belongs to an account that exists.
  const customer = findCustomer(await repository.read(CUSTOMERS_WORKSPACE), cid);
  const ws = workspace(cid);

  if (path.length === 2) {
    if (get) return json({ customer: { id: customer.id, name: customer.name }, commissions: commissionsOf(await repository.read(ws)) });
    const commission = await repository.mutate(ws, (db) => createCommission(db, cid, data, actor));
    return json({ commission }, 201);
  }
  if (get) return json({ commission: findCommission(await repository.read(ws), id), customer: { id: customer.id, name: customer.name, redLines: customer.redLines } });
  const action = typeof data.action === "string" ? data.action : "";
  if (action === "generate") {
    // Generate from AI (CHG-0110): needs the customer's Brand Intelligence dossier; returns a draft and saves nothing but an audit line.
    if (data.input !== "audience") throw new Error("Generate from AI is only available for the audience input");
    const dossier = currentVersion(dossiersOf(await repository.read(brandIntelWorkspace(cid))));
    if (!dossier) throw new Error("Run Brand Intelligence on the customer account first. The audience draft is built from it.");
    const existing = findCommission(await repository.read(ws), id);
    const base = testHooks.deps || realDeps(repository);
    const deps: Deps = testHooks.deps ? base : { ...base, enabled: () => process.env.PORT67_SYNTHESIS_ENABLED === "true" };
    const draft = await generateAudience(repository, customer, existing, dossier, actor, deps);
    const updated = await repository.mutate(ws, (db) => recordDraft(db, id, "audience", dossier.version, actor));
    return json({ draft, commission: updated, basedOnVersion: dossier.version });
  }
  const commission = await repository.mutate(ws, (db) => {
    if (action === "rename") return renameCommission(db, id, data.name, actor);
    if (action === "answers") return saveAnswers(db, id, data.input, data.answers, actor);
    if (action === "list-add") { addListEntry(db, id, data.list, data, actor); return findCommission(db, id); }
    if (action === "list-update") { updateListEntry(db, id, data.list, data.entryId, data, actor); return findCommission(db, id); }
    if (action === "list-remove") { removeListEntry(db, id, data.list, data.entryId, actor); return findCommission(db, id); }
    if (action === "went-too-far") return saveWentTooFar(db, id, data.text, actor);
    if (action === "evidence-add") { addEvidence(db, id, data.input, data, actor); return findCommission(db, id); }
    if (action === "evidence-update") { updateEvidence(db, id, data.evidenceId, data, actor); return findCommission(db, id); }
    if (action === "evidence-remove") { removeEvidence(db, id, data.evidenceId, actor); return findCommission(db, id); }
    if (action === "confirm") { setConfirmed(db, id, data.input, data.confirmed, actor); return findCommission(db, id); }
    throw new Error("Unknown action");
  });
  return json({ commission });
}
