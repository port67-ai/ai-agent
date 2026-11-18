import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalRepository } from "../src/lib/factory/repository";
import { reserveApiCall, finishApiCall, adminCostReport, MAX_LEDGER_CALLS } from "../src/lib/factory/costs";

// A full ledger batch is archived automatically, so paid work is never blocked by housekeeping, and spend totals keep counting every call.
process.env.PORT67_MONTHLY_BUDGET_USD = "100000";
delete process.env.PORT67_LEDGER_AUTO_ARCHIVE;
async function main() {
const dir = await mkdtemp(join(tmpdir(), "port67-auto-archive-"));
try {
  const repo = new LocalRepository(dir);
  const input = { accountId: "acct_a", workspaceId: "acct_a", projectId: "p", runId: "run", stage: "planning", provider: "openai", model: "gpt-5.4-mini", actor: "producer" };
  for (let i = 0; i < MAX_LEDGER_CALLS; i++) {
    const id = await reserveApiCall(repo, { ...input, runId: "run" + i });
    await finishApiCall(repo, id, { status: "completed", usage: { inputTokens: 1, outputTokens: 1 } });
  }
  const next = await reserveApiCall(repo, { ...input, runId: "after" });
  assert.ok(next, "the call after a full batch is reserved");
  assert.equal((await adminCostReport(repo)).summary.callCount, MAX_LEDGER_CALLS + 1, "archived calls still count");
  console.log("Ledger auto-archive passed");
} finally {
  await rm(dir, { recursive: true, force: true });
}
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
