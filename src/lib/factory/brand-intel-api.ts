import type { Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE } from "./customers";
import { CUSTOMER_ID, findCustomer } from "./customers-commands";
import { effectiveStatus } from "./brand-intel";
import { brandIntelWorkspace, executeBrandIntel, realDeps, startBrandIntel, versionsOf, type Deps } from "./brand-intel-run";

// Video workspace Brand Intelligence routes (CHG-0108). Producers and admins only.
//   GET  brand-intel/:customerId   the saved versions (newest last) and which one is current
//   POST brand-intel/:customerId   {action: "submit"} starts a run in the background and returns 202 with the version id
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const isBrandIntelRoute = (path: string[]) => path[0] === "brand-intel";
/** Test seam only: lets tests replace the model calls and wait for the background run. Never set in production code. */
export const testHooks: { deps?: Deps; onRun?: (p: Promise<void>) => void } = {};

export async function handleBrandIntel(request: Request, path: string[], a: Principal, data: Record<string, unknown>): Promise<Response> {
  if (a.role !== "operator") return json({ error: "Forbidden: producer or admin access required" }, 403);
  if (a.demo) return json({ error: "Brand Intelligence is not available in the synthetic demo" }, 403);
  const cid = path[1] || "";
  if (!CUSTOMER_ID.test(cid) || path.length !== 2) return json({ error: "Customer account not found" }, 404);
  const customer = findCustomer(await repository.read(CUSTOMERS_WORKSPACE), cid);
  if (request.method === "GET") {
    const versions = versionsOf(await repository.read(brandIntelWorkspace(cid))).map((v) => ({ ...v, status: effectiveStatus(v), ...(effectiveStatus(v) === "failed" && v.status === "running" ? { error: "The run was interrupted; run it again" } : {}) })).sort((x, y) => x.version - y.version);
    const current = [...versions].reverse().find((v) => v.status === "completed");
    return json({ customer: { id: customer.id, name: customer.name }, versions, currentId: current?.id || null });
  }
  if (data.action !== "submit") return json({ error: "Unknown action" }, 400);
  const deps = testHooks.deps || realDeps(repository);
  const ctx = await startBrandIntel(repository, cid, a.subject, deps);
  const run = executeBrandIntel(repository, ctx, a.subject, deps);
  testHooks.onRun?.(run);
  void run.catch(() => undefined);
  return json({ versionId: ctx.versionId }, 202);
}
