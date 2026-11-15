import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRepository } from '../src/lib/factory/repository';
import { reserveApiCall, saveBudgetSettings, adminCostReport, estimateMicroUsd, repriceUnknownCalls, setCostBaseline, finishApiCall } from '../src/lib/factory/costs';
import { assertWithinBudget, budgetConfig, validateBudgetSettings } from '../src/lib/factory/budget';
import { costSeries } from '../src/lib/factory/cost-series';
import type { ApiCall } from '../src/lib/factory/costs';
import { pricingFor } from '../src/lib/factory/costs';
import { standardPrice } from '../src/lib/factory/standard-prices';


const now = new Date('2026-11-14T12:30:00Z');
let n = 0;
const call = (iso: string, agent: string, model: string, micro: number | undefined, inTok = 1000, outTok = 100, extra: Partial<ApiCall> = {}) => ({
  id: 'c' + n++, createdAt: iso, status: 'completed', accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', provider: 'openai', model, actor: 'x', agent,
  usage: { inputTokens: inTok, outputTokens: outTok }, ...(micro === undefined ? {} : { estimatedMicroUsd: micro }), ...extra,
}) as ApiCall;
const rows = [
  call('2026-11-14T12:10:00Z', 'research:brand', 'gpt-a', 1_000_000),
  call('2026-11-14T12:20:00Z', 'research:brand', 'gpt-b', 500_000, 2000, 200),
  call('2026-11-14T10:05:00Z', 'review:scope', 'gpt-a', 250_000),
  call('2026-11-14T10:06:00Z', 'review:scope', 'gpt-a', undefined),
  call('2026-11-10T08:00:00Z', 'research:brand', 'gpt-a', 2_000_000, 1000, 100, { reconciliation: { actualMicroUsd: 1_500_000, reference: 'inv', at: 'x', by: 'y' } as never }),
  call('2026-08-20T08:00:00Z', 'synthesis:insights', 'gpt-c', 700_000),
  call('2025-01-01T00:00:00Z', 'research:brand', 'gpt-a', 9_000_000),
];

// Day view: 24 hourly points, cumulative, unknown cost counted as unknown and never as free.
const day = costSeries(rows, { range: 'day', now });
assert.equal(day.buckets.length, 24);
assert.equal(day.step, 'hour');
assert.equal(day.total.totalMicroUsd, 1_750_000);
assert.equal(day.total.cumulativeMicroUsd.at(-1), 1_750_000, 'the line ends at the period total');
assert.equal(day.total.unknownCalls, 1);
assert.equal(day.total.calls, 4);
assert.ok(day.total.cumulativeMicroUsd.every((v, i, a) => i === 0 || v >= a[i - 1]), 'cumulative never falls');
assert.equal(day.total.cumulativeMicroUsd[22], 250_000, 'the 10:00 call is in the 10:00 bucket and counted from there on');
assert.deepEqual(day.lines.map((l) => l.key).sort(), ['research:brand', 'review:scope']);
const brand = day.lines.find((l) => l.key === 'research:brand')!;
assert.equal(brand.inputTokens, 3000);
assert.equal(brand.outputTokens, 300);

// Month view: 30 daily points; reconciled actual beats the estimate; old rows are outside the period.
const month = costSeries(rows, { range: 'month', now });
assert.equal(month.buckets.length, 30);
assert.equal(month.step, 'day');
assert.equal(month.total.totalMicroUsd, 1_750_000 + 1_500_000);

// 3, 6 and 12 month views.
assert.equal(costSeries(rows, { range: '3m', now }).buckets.length, 91);
const six = costSeries(rows, { range: '6m', now });
assert.equal(six.step, 'week');
assert.equal(six.total.totalMicroUsd, 1_750_000 + 1_500_000 + 700_000);
const year = costSeries(rows, { range: '12m', now });
assert.equal(year.step, 'month');
assert.equal(year.buckets.length, 12);
assert.equal(year.buckets[0], '2025-12-01T00:00:00.000Z');
assert.equal(year.total.totalMicroUsd, 1_750_000 + 1_500_000 + 700_000, 'rows older than the window are excluded');

// Isolating a harness gives per-model lines and lists every model it used.
const one = costSeries(rows, { range: '6m', harness: 'research:brand', now });
assert.equal(one.total.key, 'research:brand');
assert.equal(one.total.totalMicroUsd, 1_000_000 + 500_000 + 1_500_000);
assert.deepEqual(one.lines.map((l) => l.key).sort(), ['openai:gpt-a', 'openai:gpt-b']);
assert.deepEqual(one.models.map((m) => m.model).sort(), ['gpt-a', 'gpt-b']);
assert.ok(one.harnesses.length === 3, 'the harness selector still lists every harness');
assert.equal(costSeries([], { range: 'month', now }).total.totalMicroUsd, 0);
assert.equal(costSeries(rows, { range: 'bogus' as never, now }).range, 'month');

// Limits typed in the portal: validated, override the environment, per-run and per-model caps.
assert.throws(() => validateBudgetSettings({ monthlyUsd: '-1' }), /plain USD amount/);
assert.throws(() => validateBudgetSettings({ runUsd: '0' }), /greater than zero/);
assert.throws(() => validateBudgetSettings({ models: { 'no-colon': '5' } }), /provider:model/);
assert.deepEqual(validateBudgetSettings({ monthlyUsd: '50', projectUsd: '', models: { 'openai:gpt-a': '2.5' } }), { monthlyUsd: 50, models: { 'openai:gpt-a': 2.5 } });
const cfg = budgetConfig({ PORT67_MONTHLY_BUDGET_USD: '10' }, { monthlyUsd: 40, runUsd: 1.5, callHoldUsd: 0.25, models: { 'openai:gpt-a': 1 } });
assert.equal(cfg.monthlyMicroUsd, 40_000_000, 'portal beats Render');
assert.equal(budgetConfig({ PORT67_MONTHLY_BUDGET_USD: '10' }, {}).monthlyMicroUsd, 10_000_000, 'blank falls back to Render');
const spend = (id: string, runId: string, model: string, micro: number) => ({ createdAt: '2026-11-13T00:00:00Z', projectId: 'p', runId, provider: 'openai', model, estimatedMicroUsd: micro });
assert.throws(() => assertWithinBudget([spend('1', 'r1', 'gpt-b', 1_400_000)], cfg, 'p', now, { runId: 'r1', provider: 'openai', model: 'gpt-b' }), /Per-run AI spend cap reached/);
assert.doesNotThrow(() => assertWithinBudget([spend('1', 'r1', 'gpt-b', 1_000_000)], cfg, 'p', now, { runId: 'r2', provider: 'openai', model: 'gpt-b' }), 'another run is judged on its own spend');
assert.throws(() => assertWithinBudget([spend('1', 'r1', 'gpt-a', 800_000)], cfg, 'p', now, { runId: 'r9', provider: 'openai', model: 'gpt-a' }), /Model AI spend cap reached for openai:gpt-a/);
assert.doesNotThrow(() => assertWithinBudget([spend('1', 'r1', 'gpt-a', 800_000)], cfg, 'p', now, { runId: 'r9', provider: 'openai', model: 'gpt-b' }), 'a model cap only limits that model');

// Built-in DeepSeek standard prices apply when a model is chosen and no admin price exists; an admin price wins.
delete process.env.PORT67_MODEL_PRICING_JSON;
assert.deepEqual(pricingFor('deepseek', 'deepseek-flash'), { updatedAt: '2026-11-14', inputPerMillion: 0.3, outputPerMillion: 1.2, cachedInputPerMillion: 0.006, toolPerCall: 0.00075 });
assert.equal(pricingFor('deepseek', 'deepseek-v4-pro')?.outputPerMillion, 3.96);
assert.equal(pricingFor('deepseek', 'deepseek-v4-pro')?.inputPerMillion, 1.32);
assert.equal(pricingFor('deepseek', 'deepseek-v4-flash-vision-exp')?.inputPerMillion, 0.3, 'retired names bill at the Flash price');
assert.equal(pricingFor('deepseek', 'unknown-model'), undefined, 'an unlisted model stays unpriced, never free');
assert.equal(pricingFor('deepseek', 'deepseek-flash', { 'deepseek:deepseek-flash': { updatedAt: '2026-12-01', inputPerMillion: 9, outputPerMillion: 9 } })?.inputPerMillion, 9, 'admin price wins');
assert.deepEqual(pricingFor('gemini', 'gemini-3.5-flash'), { updatedAt: '2026-11-14', inputPerMillion: 1.5, outputPerMillion: 9, cachedInputPerMillion: 0.15, toolPerCall: 0.014 });
assert.equal(pricingFor('gemini', 'gemini-3.1-pro-preview')?.inputPerMillion, 4, 'the higher over-200k rate is used so cost is never understated');
assert.equal(pricingFor('gemini', 'gemini-3.1-pro-preview')?.outputPerMillion, 18);
assert.equal(pricingFor('gemini', 'gemini-2.5-flash')?.toolPerCall, 0.035, 'older models bill grounded prompts at $35 per 1,000');
assert.equal(pricingFor('gemini', 'gemini-4-carbon'), undefined, 'models not on the official list stay unpriced');
assert.deepEqual(pricingFor('openai', 'gpt-5.4-mini'), { updatedAt: '2026-11-14', inputPerMillion: 0.75, outputPerMillion: 4.5, toolPerCall: 0.01, cachedInputPerMillion: 0.075 });
assert.deepEqual(pricingFor('openai', 'gpt-6-luna'), { updatedAt: '2026-11-14', inputPerMillion: 0.1, outputPerMillion: 0.5, toolPerCall: 0.01, cachedInputPerMillion: 0.01, cacheCreationPerMillion: 0.25 });
assert.equal(pricingFor('openai', 'gpt-5.5-pro')?.cachedInputPerMillion, undefined, 'pro models list no cached price');
assert.equal(pricingFor('openai', 'gpt-5.5-pro')?.outputPerMillion, 180);
assert.equal(pricingFor('openai', 'o3')?.outputPerMillion, 8);
assert.equal(pricingFor('openai', 'gpt-9-unknown'), undefined);
assert.deepEqual(pricingFor('anthropic', 'claude-sonnet-5-5'), { updatedAt: '2026-11-14', inputPerMillion: 2, outputPerMillion: 10, cachedInputPerMillion: 0.1, cacheCreationPerMillion: 4, toolPerCall: 0.01 });
assert.equal(pricingFor('anthropic', 'claude-opus-5-5')?.outputPerMillion, 20);
assert.equal(pricingFor('anthropic', 'claude-fable-5-2')?.inputPerMillion, 8);
assert.equal(pricingFor('anthropic', 'claude-haiku-5-5')?.cachedInputPerMillion, 0.01);
assert.equal(standardPrice('anthropic', 'claude-unknown'), undefined);

async function main() {
  const repo = new LocalRepository(join(await mkdtemp(join(tmpdir(), 'port67-series-')), 'db.json'));
  const input = { accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', provider: 'test', model: 'model', actor: 'owner' };
  delete process.env.PORT67_MONTHLY_BUDGET_USD;
  await saveBudgetSettings(repo, { monthlyUsd: 2.01, callHoldUsd: 1 }, 'owner');
  await reserveApiCall(repo, input);
  await reserveApiCall(repo, { ...input, runId: 'r2' });
  await assert.rejects(reserveApiCall(repo, { ...input, runId: 'r3' }), /Monthly AI spend cap reached/, 'the cap saved in the portal is enforced');
  const report = await adminCostReport(repo);
  assert.equal(report.limits.saved.monthlyUsd, 2.01);
  await saveBudgetSettings(repo, { monthlyUsd: 100, runUsd: 1, callHoldUsd: 1 }, 'owner');
  await assert.rejects(reserveApiCall(repo, input), /Per-run AI spend cap reached/, 'two held calls already use the run cap');
  await reserveApiCall(repo, { ...input, runId: 'fresh' });
  await assert.rejects(saveBudgetSettings(repo, { monthlyUsd: 'lots' }, 'owner'), /plain USD amount/);
  // ---- estimating cost: web searches are priced, missing numbers stay unknown, and old unknown calls can be recalculated
  const openaiMini = pricingFor('openai', 'gpt-5.4-mini')!;
  assert.equal(estimateMicroUsd({ inputTokens: 455_071, outputTokens: 43_300, toolCalls: 50 }, openaiMini), Math.ceil(455_071 * 0.75 + 43_300 * 4.5 + 50 * 0.01 * 1e6), "tokens plus web searches");
  assert.ok(Math.abs(estimateMicroUsd({ inputTokens: 455_071, outputTokens: 43_300, toolCalls: 50 }, openaiMini)! / 1e6 - 1.04) < 0.05, "about $1, in line with the provider's own usage page");
  assert.equal(estimateMicroUsd({ inputTokens: 10, outputTokens: 10, toolCalls: 2 }, { updatedAt: '2026-11-14', inputPerMillion: 1, outputPerMillion: 1 }), undefined, "searches with no search price stay unknown, never free");
  assert.equal(estimateMicroUsd({ inputTokens: 10, outputTokens: 10, toolUsageUnknown: true }, openaiMini), undefined);
  const repo2 = new LocalRepository(join(await mkdtemp(join(tmpdir(), 'port67-reprice-')), 'db.json'));
  const base = { accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', provider: 'openai', model: 'gpt-5.4-mini', actor: 'owner' };
  delete process.env.PORT67_MONTHLY_BUDGET_USD;
  const id1 = await reserveApiCall(repo2, base);
  // Simulate a call recorded before any price was known: no pricing on the row, usage counted.
  await repo2.mutate('factory-admin-ledger', (db) => { const row = db.apiCalls!.find((x) => x.id === id1)!; delete row.pricing; });
  await finishApiCall(repo2, id1, { status: 'completed', usage: { inputTokens: 100_000, outputTokens: 10_000, toolCalls: 5 } });
  const before = await adminCostReport(repo2);
  assert.equal(before.summary.unknownCount, 1);
  const fixed = await repriceUnknownCalls(repo2, 'owner');
  assert.deepEqual(fixed, { repriced: 1, stillUnknown: 0 });
  const after = await adminCostReport(repo2);
  assert.equal(after.summary.unknownCount, 0);
  assert.equal(after.summary.estimatedMicroUsd, Math.ceil(100_000 * 0.75 + 10_000 * 4.5 + 5 * 0.01 * 1e6));
  // ---- fresh measurement: earlier spend stays in the ledger but stops counting towards the caps
  await saveBudgetSettings(repo2, { monthlyUsd: 1.5, callHoldUsd: 1 }, 'owner');
  await reserveApiCall(repo2, { ...base, runId: 'r2' });
  await assert.rejects(reserveApiCall(repo2, { ...base, runId: 'r3' }), /Monthly AI spend cap reached/, 'the cap is reached before the reset');
  await new Promise((r) => setTimeout(r, 15));
  await setCostBaseline(repo2, true, 'owner');
  await reserveApiCall(repo2, { ...base, runId: 'r4' });
  const measured = await adminCostReport(repo2);
  assert.ok(measured.baseline && measured.baseline.by === 'owner');
  assert.equal(measured.baseline!.summary.callCount, 1, 'only calls since the reset are measured');
  assert.ok(measured.summary.callCount >= 3, 'earlier calls are still in the ledger');
  await setCostBaseline(repo2, false, 'owner');
  assert.equal((await adminCostReport(repo2)).baseline, null);
  console.log('Cost history and spend limits: cumulative series for day, month, 3, 6 and 12 months, harness isolation, model lists, portal limits per total, project, run and model');
}
void main().catch((e) => { console.error(e); process.exit(1); });
