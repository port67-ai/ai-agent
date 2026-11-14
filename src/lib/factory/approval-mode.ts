import { AI_ROUTING_NAMESPACE } from "./costs";
import type { Repository } from "./repository";

/**
 * Who gives the customer's direction approval. "ai": the producer orchestrator approves on the customer's behalf (recorded as such).
 * "manual": only the account owner can. The Render master switch PORT67_PRODUCER_APPROVALS=true must also be on; without it the
 * mode is ignored and nobody but the customer approves. The final asset approval is always the account owner's.
 */
export type ApprovalMode = "ai" | "manual";
export const DEFAULT_APPROVAL_MODE: ApprovalMode = "ai";
let cached: ApprovalMode = DEFAULT_APPROVAL_MODE;
let loadedAt = 0;
export const approvalMasterSwitch = () => process.env.PORT67_PRODUCER_APPROVALS === "true";
export const approvalMode = (): ApprovalMode => cached;
/** True only when the Render switch is on and the admin switch is set to AI producer approval. */
export const producerApprovalsOn = () => approvalMasterSwitch() && cached === "ai";

export async function loadApprovalMode(repo: Repository, maxAgeMs = 5000): Promise<ApprovalMode> {
  if (Date.now() - loadedAt < maxAgeMs) return cached;
  try {
    const stored = (await repo.read(AI_ROUTING_NAMESPACE)).approvalMode;
    cached = stored?.mode === "manual" ? "manual" : DEFAULT_APPROVAL_MODE;
    loadedAt = Date.now();
  } catch { /* keep the last known mode */ }
  return cached;
}
export async function saveApprovalMode(repo: Repository, mode: unknown, actor: string): Promise<ApprovalMode> {
  if (mode !== "ai" && mode !== "manual") throw new Error("Approval mode must be ai or manual");
  await repo.mutate(AI_ROUTING_NAMESPACE, (db) => {
    db.approvalMode = { mode, updatedAt: new Date().toISOString(), updatedBy: actor };
  });
  cached = mode;
  loadedAt = Date.now();
  return mode;
}
export async function approvalOverview(repo: Repository) {
  await loadApprovalMode(repo, 0);
  const stored = (await repo.read(AI_ROUTING_NAMESPACE)).approvalMode;
  return { mode: cached, masterSwitch: approvalMasterSwitch(), effective: producerApprovalsOn(), updatedAt: stored?.updatedAt, updatedBy: stored?.updatedBy };
}
