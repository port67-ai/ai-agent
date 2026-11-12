import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRepository } from '../src/lib/factory/repository';
import { adminCostReport, archiveApiCalls, finishApiCall, reserveApiCall } from '../src/lib/factory/costs';
import { assertWithinBudget, budgetConfig, budgetStatus, monthWindow } from '../src/lib/factory/budget';

const input = { accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', provider: 'test', model: 'model', actor: 'owner' };
const reset = () => { for (const k of ['PORT67_MONTHLY_BUDGET_USD', 'PORT67_PROJECT_BUDGET_USD', 'PORT67_CALL_HOLD_USD', 'PORT67_MODEL_PRICING_JSON']) delete process.env[k]; };

async function main() {
  // Configuration: default $25 per month, $1 hold, no project cap; invalid values throw instead of lifting the cap.
  assert.deepEqual(budgetConfig({}), { monthlyMicroUsd: 25_000_000, holdMicroUsd: 1_000_000 });
  assert.deepEqual(budgetConfig({ PORT67_MONTHLY_BUDGET_USD: '  ', PORT67_PROJECT_BUDGET_USD: '2.5', PORT67_CALL_HOLD_USD: '0.25' }), { monthlyMicroUsd: 25_000_000, projectMicroUsd: 2_500_000, holdMicroUsd: 250_000 });
  assert.equal(budgetConfig({ PORT67_MONTHLY_BUDGET_USD: '0' }).monthlyMicroUsd, 0);
  for (const bad of ['-5', 'abc', '1e3', '$25', '25.1234567', 'Infinity', '10000000000']) assert.throws(() => budgetConfig({ PORT67_MONTHLY_BUDGET_USD: bad }), /PORT67_MONTHLY_BUDGET_USD/, bad);
  assert.throws(() => budgetConfig({ PORT67_CALL_HOLD_USD: '0' }), /greater than zero/);
  assert.throws(() => budgetConfig({ PORT67_PROJECT_BUDGET_USD: 'x' }), /PORT67_PROJECT_BUDGET_USD/);

  // Pure accounting: reconciled actual beats estimate; unknown, unpriced and in-flight rows are held, never free.
  const now = new Date('2026-11-12T10:00:00Z');
  const at = (iso: string) => ({ createdAt: iso, projectId: 'p' });
  const rows = [
    { ...at('2026-11-02T00:00:00Z'), estimatedMicroUsd: 4_000_000, reconciliation: { actualMicroUsd: 3_000_000 } },
    { ...at('2026-11-03T00:00:00Z'), estimatedMicroUsd: 2_000_000 },
    { ...at('2026-11-04T00:00:00Z') },
    { ...at('2026-10-31T23:59:59Z'), estimatedMicroUsd: 99_000_000 },
    { ...at('2026-12-01T00:00:00Z'), estimatedMicroUsd: 99_000_000 },
    { createdAt: 'not-a-date', projectId: 'p' },
  ];
  const config = budgetConfig({});
  const status = budgetStatus(rows, config, now);
  assert.equal(status.committedMicroUsd, 5_000_000);
  assert.equal(status.heldMicroUsd, 2_000_000);
  assert.equal(status.remainingMicroUsd, 18_000_000);
  assert.equal(status.monthStart, '2026-11-01');
  assert.equal(monthWindow(new Date('2026-12-31T23:59:59Z')).label, '2026-12-01');
  assert.doesNotThrow(() => assertWithinBudget(rows, config, 'p', now));
  // 25 used + 1 hold would exceed 25: refuse. Exactly reaching the cap is allowed.
  assert.throws(() => assertWithinBudget([{ ...at('2026-11-05T00:00:00Z'), estimatedMicroUsd: 24_500_000 }], config, 'p', now), /Monthly AI spend cap reached/);
  assert.doesNotThrow(() => assertWithinBudget([{ ...at('2026-11-05T00:00:00Z'), estimatedMicroUsd: 24_000_000 }], config, 'p', now));
  // Per-project cap is separate from the workspace cap.
  const projectCap = budgetConfig({ PORT67_PROJECT_BUDGET_USD: '3' });
  const projectRows = [{ ...at('2026-11-05T00:00:00Z'), estimatedMicroUsd: 2_500_000 }, { createdAt: '2026-11-05T00:00:00Z', projectId: 'other', estimatedMicroUsd: 5_000_000 }];
  assert.throws(() => assertWithinBudget(projectRows, projectCap, 'p', now), /Project AI spend cap reached/);
  assert.throws(() => assertWithinBudget(projectRows, projectCap, 'other', now), /Project AI spend cap reached/, 'each project is judged on its own spend');
  assert.doesNotThrow(() => assertWithinBudget(projectRows, projectCap, 'fresh', now), 'a project with no spend is not blocked by the others');
  assert.equal(budgetStatus([], budgetConfig({ PORT67_MONTHLY_BUDGET_USD: '0' }), now).remainingMicroUsd, 0);

  // Enforcement at reservation, with a real ledger. In-flight calls are held at $1 each against a $2.01 cap.
  reset();
  process.env.PORT67_MONTHLY_BUDGET_USD = '2.01';
  process.env.PORT67_MODEL_PRICING_JSON = JSON.stringify({ 'test:model': { updatedAt: '2026-11-12', inputPerMillion: 2, outputPerMillion: 4 } });
  const repo = new LocalRepository(await mkdtemp(join(tmpdir(), 'budget-')));
  const first = await reserveApiCall(repo, input);
  await reserveApiCall(repo, input);
  await assert.rejects(reserveApiCall(repo, input), /Monthly AI spend cap reached.*PORT67_MONTHLY_BUDGET_USD/, 'two held calls leave no room for a third');
  assert.equal((await adminCostReport(repo)).summary.callCount, 2, 'a refused call is not recorded or dispatched');
  // A priced, finished call counts its small real estimate instead of the hold, freeing headroom.
  await finishApiCall(repo, first, { status: 'completed', usage: { inputTokens: 1000, outputTokens: 100 } });
  assert.ok(await reserveApiCall(repo, input), 'finishing a priced call releases its hold');
  const report = await adminCostReport(repo);
  assert.ok(!('error' in report.budget));
  if (!('error' in report.budget)) {
    assert.equal(report.budget.monthlyCapMicroUsd, 2_010_000);
    assert.equal(report.budget.committedMicroUsd, 2400);
    assert.equal(report.budget.heldMicroUsd, 2_000_000);
  }

  // Archiving a batch must not hide its spend from the cap.
  reset();
  process.env.PORT67_MONTHLY_BUDGET_USD = '2';
  const archRepo = new LocalRepository(await mkdtemp(join(tmpdir(), 'budget-archive-')));
  const a1 = await reserveApiCall(archRepo, input);
  await finishApiCall(archRepo, a1, { status: 'failed' });
  const a2 = await reserveApiCall(archRepo, input);
  await finishApiCall(archRepo, a2, { status: 'failed' });
  await archiveApiCalls(archRepo, 'owner');
  await assert.rejects(reserveApiCall(archRepo, input), /Monthly AI spend cap reached/, 'archived spend still counts');

  // Invalid cap settings block paid calls and show in the admin report instead of lifting the cap.
  reset();
  process.env.PORT67_MONTHLY_BUDGET_USD = 'lots';
  const badRepo = new LocalRepository(await mkdtemp(join(tmpdir(), 'budget-bad-')));
  await assert.rejects(reserveApiCall(badRepo, input), /PORT67_MONTHLY_BUDGET_USD/);
  const badReport = await adminCostReport(badRepo);
  assert.ok('error' in badReport.budget);
  assert.equal(badReport.summary.callCount, 0);

  // Default applies when nothing is set: $25 allows 25 unpriced calls, refuses the 26th.
  reset();
  const defRepo = new LocalRepository(await mkdtemp(join(tmpdir(), 'budget-default-')));
  for (let i = 0; i < 25; i++) await reserveApiCall(defRepo, { ...input, runId: 'r' + i });
  await assert.rejects(reserveApiCall(defRepo, input), /Monthly AI spend cap reached.*\$25\.00 used or held of \$25\.00/);
  reset();
  console.log('Factory spend caps passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
