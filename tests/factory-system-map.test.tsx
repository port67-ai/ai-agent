import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import SystemMap from '../src/components/factory/SystemMap';
import FlowHealth from '../src/components/factory/FlowHealth';
import { pipelineStats, edgeStats, modelStats, findBlockers } from '../src/lib/factory/observability';

const stats = (calls: number, inFlight = 0, failed = 0) => ({ calls, completed: calls - failed - inFlight, failed, unknown: 0, inFlight, inputTokens: 10, outputTokens: 5, estimatedMicroUsd: calls * 1000, lastAt: undefined });
const ai = (id: string, group: string, name: string, model: string | undefined, provider = 'openai', st = stats(0)) => ({ id, group, name, purpose: '', kind: 'ai', model: model ? { provider, model, source: 'slot', priced: true } : undefined, stats: st });
const agents = [
  ai('research:brand', 'research', 'Business and brand researcher', 'gpt-a', 'openai', stats(2, 1)),
  ai('research:customer', 'research', 'Customer insight researcher', 'gem-b', 'gemini', stats(1, 0, 1)),
  ai('research:competitor', 'research', 'Competitor researcher', 'gpt-a'),
  ai('research:creative', 'research', 'Creative researcher', 'gpt-a'),
  ai('synthesis:insights', 'drafting', 'Insights agent', 'claude-c', 'anthropic'),
  ai('synthesis:strategy', 'drafting', 'Direction agent', undefined),
  ai('synthesis:content', 'drafting', 'Copy pack agent', 'gpt-a'),
] as unknown as React.ComponentProps<typeof SystemMap>['agents'];
const rows = [{ id: '1', accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', agent: 'research:brand', provider: 'openai', model: 'gpt-a', actor: 'x', createdAt: '2026-11-12T10:00:00Z', finishedAt: '2026-11-12T10:00:03Z', status: 'completed', estimatedMicroUsd: 2000 }] as never;
const pipeline = pipelineStats([]);
pipeline.waiting.sourceReview = 2; pipeline.sources.unreviewed = 3;
const edges = edgeStats(rows);
const flow = { pipeline, edges, models: modelStats(rows), blockers: findBlockers(pipeline, edges, agents.filter((a) => a.kind === 'ai').map((a) => ({ id: a.id, name: a.name, hasModel: !!a.model }))), projectsError: '' } as unknown as React.ComponentProps<typeof SystemMap>['flow'];

const html = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow, onSelectAgent: () => undefined }));
for (const t of ['Business brief', 'Launch channels', 'Request research', 'Producer start', 'Firestore · project record', 'Firestore · sources and findings', 'Review sources', 'Accept insights', 'Approve direction', 'Production agents', 'Firebase Storage', 'Publish yourself', 'Monitoring · API call ledger', 'Dashboards', 'Alerts', 'Troubleshooting']) assert.match(html, new RegExp(t), t);
for (const m of ['openai · gpt-a', 'gemini · gem-b', 'anthropic · claude-c']) assert.match(html, new RegExp(m), 'agent shows its model: ' + m);
assert.match(html, /No model chosen yet/);
for (const p of ['OpenAI', 'Google Gemini', 'Anthropic', 'DeepSeek']) assert.match(html, new RegExp(p));
assert.match(html, /RUNNING/);
assert.match(html, /FAILED/);
assert.match(html, /2 WAITING/, 'a blocked gate is flagged');
assert.match(html, /sm-link flow/, 'running call animates');
assert.match(html, /sm-link dim/, 'idle edges are faint');
assert.equal((html.match(/data-node="research:/g) || []).length, 4);
const health = renderToStaticMarkup(React.createElement(FlowHealth, { flow }));
assert.match(health, /Where data is blocked or not flowing/);
assert.match(health, /Gate 1/);
assert.match(health, /gpt-a/);
assert.match(health, /Cost by model/);
console.log('System map: forms, agents with models, stores, API links, gates, monitoring and blocked/idle states passed');
