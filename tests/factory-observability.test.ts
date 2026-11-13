import assert from 'node:assert/strict';
import { edgeStats, modelStats, pipelineStats, findBlockers } from '../src/lib/factory/observability';
import { createProject } from '../src/lib/factory/engine';
import type { ApiCall } from '../src/lib/factory/costs';

const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const now = Date.parse('2026-11-12T12:00:00Z');
const row = (o: Partial<ApiCall>): ApiCall => ({ id: Math.random().toString(36), accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', provider: 'openai', model: 'm1', actor: 'x', createdAt: '2026-11-12T11:00:00Z', status: 'completed', finishedAt: '2026-11-12T11:00:02Z', usage: { inputTokens: 100, outputTokens: 50 } as ApiCall['usage'], estimatedMicroUsd: 1000, ...o });
const rows = [
  row({ agent: 'research:brand' }),
  row({ agent: 'research:brand', finishedAt: '2026-11-12T11:00:04Z', estimatedMicroUsd: 3000 }),
  row({ agent: 'research:customer', provider: 'gemini', model: 'g1', status: 'failed', finishedAt: undefined, usage: undefined, estimatedMicroUsd: undefined }),
  row({ agent: 'synthesis:insights', provider: 'gemini', model: 'g1', status: 'reserved', createdAt: '2026-11-12T11:59:30Z', finishedAt: undefined, usage: undefined, estimatedMicroUsd: 500 }),
];
const edges = edgeStats(rows, now);
const brand = edges.find((e) => e.agent === 'research:brand')!;
assert.deepEqual([brand.calls, brand.microUsd, brand.avgLatencyMs, brand.inputTokens], [2, 4000, 3000, 200], 'edge folds calls, cost and average latency');
const cust = edges.find((e) => e.agent === 'research:customer')!;
assert.deepEqual([cust.failed, cust.unpriced], [1, 1], 'failed and unpriced calls are counted, never treated as free');
assert.equal(edges.find((e) => e.agent === 'synthesis:insights')!.inFlight, 1, 'recent reservation is in flight');
const models = modelStats(rows, now);
assert.equal(models[0].model, 'm1', 'most expensive model first');
assert.equal(Math.round(models.reduce((n, m) => n + m.sharePct, 0)), 100);

// Pipeline counts and blockers come from project state.
const p = createProject({ business: 'Brand', objective: 'Grow', contact: 'a@example.com' }, op, 'p1');
p.channels = ['instagram'];
p.researchRequest = { at: '2026-11-12T10:00:00Z', by: 'c', channels: ['instagram'] };
let s = pipelineStats([p]);
assert.deepEqual([s.projects, s.channelsChosen, s.waiting.producerStart], [1, 1, 1]);
p.runs.push({ id: 'r1', at: '2026-11-12T10:01:00Z', status: 'completed', stage: 'research', segment: 'brand', provider: 'openai', model: 'm1', gaps: ['No pricing'] });
p.sources.push({ id: 's1', segment: 'brand', title: 't', url: 'https://example.com', excerpt: 'e', kind: 'public_source', status: 'unreviewed', collectedAt: '2026-11-12T10:02:00Z', method: 'm', findings: [{ claim: 'c' }] });
s = pipelineStats([p]);
assert.deepEqual([s.waiting.producerStart, s.waiting.sourceReview, s.sources.unreviewed, s.sources.findings, s.gaps], [0, 1, 1, 1, 1]);
const agents = [{ id: 'research:brand', name: 'Brand', hasModel: true }, { id: 'research:customer', name: 'Customer', hasModel: true }, { id: 'synthesis:strategy', name: 'Direction', hasModel: false }, { id: 'research:creative', name: 'Creative', hasModel: true }];
const blockers = findBlockers(s, edges, agents);
const text = blockers.map((b) => b.level + ':' + b.where + ':' + b.text).join('\n');
assert.match(text, /blocked:Gate 1/);
assert.match(text, /failed:Customer/);
assert.match(text, /idle:Direction:No model chosen/);
assert.match(text, /idle:Creative:Has not made an API call/);
assert.doesNotMatch(text, /Brand:Has not made/, 'an agent that has called is not idle');
console.log('Observability: edges, cost by model, pipeline counts and blockers passed');
