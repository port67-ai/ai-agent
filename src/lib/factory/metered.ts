import type { Repository } from "./repository";
import { finishApiCall, reserveApiCall } from "./costs";
import type { ProviderResult, ProviderSelection } from "./providers";
import type { Deps } from "./brand-intel-run";

/** One paid model call, reserved and finished on the admin cost ledger. A thrown call is recorded as unknown. */
export async function meteredInvoke(repo: Repository, ids: { accountId: string; workspaceId: string; projectId: string; runId: string }, slot: string, stage: "research" | "synthesis", sel: ProviderSelection, actor: string, deps: Deps, request: Parameters<Deps["invoke"]>[1]): Promise<ProviderResult> {
  const callId = await reserveApiCall(repo, { ...ids, stage, agent: slot, provider: sel.provider, model: sel.model, actor });
  let result: ProviderResult;
  try { result = await deps.invoke(sel, request); } catch (e) { await finishApiCall(repo, callId, { status: "unknown" }); throw e; }
  await finishApiCall(repo, callId, { status: result.error ? "failed" : "completed", usage: result.usage as never, rawUsage: result.rawUsage && typeof result.rawUsage === "object" && !Array.isArray(result.rawUsage) ? (result.rawUsage as Record<string, unknown>) : undefined, providerRequestId: result.providerRequestId });
  return result;
}
