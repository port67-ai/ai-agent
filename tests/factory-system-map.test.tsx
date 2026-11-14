import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import SystemMap from '../src/components/factory/SystemMap';
import FlowHealth from '../src/components/factory/FlowHealth';
import { ScopePanel } from '../src/components/factory/ScopePanel';
import { DiagnosticsPanel } from '../src/components/factory/DiagnosticsPanel';
import { ResearchPrep } from '../src/components/factory/ResearchPrep';
import { pipelineStats, edgeStats, modelStats, findBlockers } from '../src/lib/factory/observability';

const stats = (calls: number, inFlight = 0, failed = 0) => ({ calls, completed: calls - failed - inFlight, failed, unknown: 0, inFlight, inputTokens: 10, outputTokens: 5, estimatedMicroUsd: calls * 1000, lastAt: undefined });
const ai = (id: string, group: string, name: string, model: string | undefined, provider = 'openai', st = stats(0)) => ({ id, group, name, purpose: '', kind: 'ai', model: model ? { provider, model, source: 'slot', priced: true } : undefined, stats: st });
const agents = [
  ai('scope:business', 'scoping', 'Scoping agent', 'gpt-s', 'openai', stats(1)),
  ai('research:brand', 'research', 'Business and brand researcher', 'gpt-a', 'openai', stats(2, 1)),
  ai('research:customer', 'research', 'Customer insight researcher', 'gem-b', 'gemini', stats(1, 0, 1)),
  ai('research:competitor', 'research', 'Competitor researcher', 'gpt-a'),
  ai('research:creative', 'research', 'Creative researcher', 'gpt-a', 'openai', { ...stats(3, 0, 1), lastStatus: 'completed' } as never),
  ai('synthesis:insights', 'drafting', 'Insights agent', 'claude-c', 'anthropic'),
  ai('synthesis:strategy', 'drafting', 'Direction agent', undefined),
  ai('synthesis:content', 'drafting', 'Copy pack agent', 'gpt-a'),
  ai('review:scope', 'review', 'Scope producer', 'gpt-r', 'openai', stats(1)),
  ai('review:sources', 'review', 'Source producer', undefined),
  ai('review:insights', 'review', 'Insight producer', 'gpt-r'),
  ai('review:direction', 'review', 'Direction producer', 'gpt-r'),
] as unknown as React.ComponentProps<typeof SystemMap>['agents'];
const rows = [{ id: '1', accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', agent: 'research:brand', provider: 'openai', model: 'gpt-a', actor: 'x', createdAt: '2026-11-12T10:00:00Z', finishedAt: '2026-11-12T10:00:03Z', status: 'completed', estimatedMicroUsd: 2000 }] as never;
const pipeline = pipelineStats([]);
pipeline.waiting.sourceReview = 2; pipeline.sources.unreviewed = 3;
pipeline.scopes = { classified: 2, ai: 1, template: 1, manual: 0, stale: 1, byCategory: { local_shop: 1, telecom: 1 } };
const edges = edgeStats(rows);
const scopes = [{ accountId: 'a', projectId: 'p1', business: 'Rosie Blooms', category: 'local_shop', businessType: 'Independent florist', size: 'small', reach: 'local', audienceModel: 'b2c', regulated: false, source: 'ai', version: 2, at: '2026-11-13T10:00:00Z', model: 'gpt-s', current: true }];
const flow = { pipeline, edges, scopes, models: modelStats(rows), blockers: findBlockers(pipeline, edges, agents.filter((a) => a.kind === 'ai').map((a) => ({ id: a.id, name: a.name, hasModel: !!a.model }))), projectsError: '' } as unknown as React.ComponentProps<typeof SystemMap>['flow'];

const html = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow, onSelectAgent: () => undefined }));
for (const t of ['Business brief', 'Launch channels', 'Request research', 'Producer start', 'Firestore · project record', 'Firestore · sources and findings', 'Source review', 'Insight review', 'Approve direction', 'Production agents', 'Firebase Storage', 'Publish yourself', 'Monitoring · API call ledger', 'Dashboards', 'Alerts', 'Troubleshooting']) assert.match(html, new RegExp(t), t);
for (const m of ['openai · gpt-a', 'gemini · gem-b', 'anthropic · claude-c']) assert.match(html, new RegExp(m), 'agent shows its model: ' + m);
assert.match(html, /No model chosen yet/);
for (const p of ['OpenAI', 'Google Gemini', 'Anthropic', 'DeepSeek']) assert.match(html, new RegExp(p));
assert.match(html, /RUNNING/);
assert.match(html, /FAILED/);
assert.match(html, /2 WAITING/, 'a blocked gate is flagged');
assert.match(html, /sm-link flow/, 'running call animates');
assert.match(html, /sm-link dim/, 'idle edges are faint');
assert.equal((html.match(/data-node="research:/g) || []).length, 4);
for (const t of ['2 · SCOPING', '3 · RESEARCH', '7 · MONITORING', 'Scoping agent', 'Firestore · classification and scope', 'Scope review', 'Orchestrator', 'Source review', 'Insight review', 'Direction review', 'data-node="review:scope"', '2 classified · 1 AI · 1 template · 0 edited · 1 stale', 'local shop 1', 'Read by: research agents', 'openai · gpt-s']) assert.match(html, new RegExp(t), t);
assert.match(html, /data-node="scope:business"/);
assert.match(html, /data-node="store-scope"/);
assert.match(html, /data-edge="scope:business"/, 'the scoping agent has its own hoverable API line');
// Panels never render blank while loading: each shows a visible placeholder until its data arrives.
const proj = { id: 'p1', revision: 1 };
assert.match(renderToStaticMarkup(React.createElement(ScopePanel, { p: proj, operator: true })), /Loading business scope/);
assert.match(renderToStaticMarkup(React.createElement(DiagnosticsPanel, { p: proj })), /Loading diagnostics/);
assert.match(renderToStaticMarkup(React.createElement(ResearchPrep, { p: proj, operator: true })), /Loading research preparation/);
assert.match(html, /Healthy now · 1 earlier failed/, 'an old failure does not keep an agent red once the latest call succeeded');
const okEdge = { agent: 'research:creative', provider: 'openai', model: 'gpt-a', calls: 3, completed: 2, failed: 1, unknown: 0, inFlight: 0, inputTokens: 1, outputTokens: 1, microUsd: 1, unpriced: 0, lastStatus: 'completed' as const };
assert.equal(findBlockers(pipelineStats([]), [okEdge, { ...okEdge, agent: 'research:brand', lastStatus: 'failed' as const }], [{ id: 'research:creative', name: 'Creative', hasModel: true }, { id: 'research:brand', name: 'Brand', hasModel: true }]).filter((b) => b.level === 'failed').length, 1, 'only an agent whose latest call failed is listed as failing');
const health = renderToStaticMarkup(React.createElement(FlowHealth, { flow }));
assert.match(health, /Business classifications/);
assert.match(health, /Rosie Blooms/);
assert.match(health, /Independent florist/);
assert.match(health, /AI · gpt-s/);
assert.match(health, /Where data is blocked or not flowing/);
assert.match(health, /Gate 1/);
assert.match(health, /gpt-a/);
assert.match(health, /Cost by model/);
console.log('System map: forms, agents with models, stores, API links, gates, monitoring and blocked/idle states passed');
assert.doesNotMatch(html, /Producer scope edit/, 'the orange producer scope edit node was replaced by the purple scope producer');
assert.match(html, /data-node="producer-orchestrator"/, 'the orchestrator sits in the LLM column');
assert.match(html, /Free checks only/, 'a reviewer with no model says it uses the free checks');
assert.equal((html.match(/data-node="review:/g) || []).length, 4, 'four reviewers: scope in the scoping band, three in the producer column');
assert.match(html, /openai · gpt-r/, 'a reviewer shows its model');
