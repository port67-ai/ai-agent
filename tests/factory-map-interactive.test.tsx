import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import SystemMap from '../src/components/factory/SystemMap';
import ModelDialog from '../src/components/factory/ModelDialog';
import { edgeTip } from '../src/components/factory/edge-tip';
import { fromPrice, toPrice } from '../src/components/factory/agent-client';
import { pipelineStats, edgeStats, modelStats, findBlockers } from '../src/lib/factory/observability';

// Hover content for a connector: calls, outcome, tokens, cost, time, and earlier models.
const e = (o: object) => ({ agent: 'research:brand', provider: 'openai', model: 'm1', calls: 3, completed: 2, failed: 1, unknown: 0, inFlight: 0, inputTokens: 3000, outputTokens: 900, microUsd: 123000, unpriced: 0, avgLatencyMs: 2500, lastAt: '2026-11-13T09:30:00Z', ...o });
const tip = edgeTip('Brand', { provider: 'openai', model: 'm1' }, [e({}), e({ model: 'old', calls: 1, microUsd: 5000 })] as never);
const val = (l: string) => tip.rows.find((r) => r.label === l)?.value;
assert.equal(tip.title, 'Brand to openai m1');
assert.equal(val('API calls'), '3');
assert.equal(val('Outcome'), '2 completed, 1 failed, 0 unknown');
assert.equal(val('Estimated cost'), '$0.1230');
assert.equal(val('Tokens in / out'), '3,000 / 900');
assert.equal(val('Average time'), '2.5 s');
assert.match(val('Earlier models')!, /old: 1 calls, \$0\.0050/);
assert.equal(tip.rows.find((r) => r.label === 'Outcome')!.warn, true, 'failures are flagged');
assert.match(tip.summary, /3 calls, \$0\.1230, 1 failed or unknown/);
assert.match(edgeTip('Brand', { provider: 'openai', model: 'm1' }, []).summary, /no API calls yet/);
assert.equal(edgeTip('Brand', { provider: 'openai', model: 'm1' }, [e({ unpriced: 2 })] as never).rows.find((r) => r.label === 'Estimated cost')!.value, '$0.1230 + 2 unpriced');

// Map: agents are buttons, connectors carry hover targets with cost in their accessible name.
const stats = (calls: number) => ({ calls, completed: calls, failed: 0, unknown: 0, inFlight: 0, inputTokens: 10, outputTokens: 5, estimatedMicroUsd: calls * 1000 });
const ai = (id: string, group: string, name: string, model?: string) => ({ id, group, name, kind: 'ai', model: model ? { provider: 'openai', model, source: 'slot', priced: true } : undefined, stats: stats(model ? 2 : 0) });
const agents = [ai('research:brand', 'research', 'Business and brand researcher', 'gpt-a'), ai('research:customer', 'research', 'Customer insight researcher')] as never;
const rows = [{ id: '1', accountId: 'a', workspaceId: 'w', projectId: 'p', runId: 'r', stage: 'research', agent: 'research:brand', provider: 'openai', model: 'gpt-a', actor: 'x', createdAt: '2026-11-13T10:00:00Z', finishedAt: '2026-11-13T10:00:03Z', status: 'completed', estimatedMicroUsd: 2000 }] as never;
const pipeline = pipelineStats([]);
const edges = edgeStats(rows);
const flow = { pipeline, edges, models: modelStats(rows), blockers: findBlockers(pipeline, edges, []), projectsError: '' } as never;
const html = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow, onSelectAgent: () => undefined }));
assert.match(html, /role="button"[^>]*aria-label="Business and brand: change model"/);
assert.match(html, /aria-label="Customer insight: choose a model"/);
assert.match(html, /Click to choose a model/);
assert.match(html, /class="sm-hit"[^>]*aria-label="Business and brand researcher to openai gpt-a: 1 call, \$0\.0020"/);
const plain = renderToStaticMarkup(React.createElement(SystemMap, { agents, flow }));
assert.doesNotMatch(plain, /role="button"/, 'no click targets without a handler');

// Model picker overlay.
const routing = { config: { pricing: { 'openai:gpt-9': { updatedAt: '2026-11-13', inputPerMillion: 0.25, outputPerMillion: 2 } } }, providers: [{ id: 'openai', label: 'OpenAI', research: true, keyConfigured: true, keyName: 'K1' }, { id: 'gemini', label: 'Google Gemini', research: true, keyConfigured: false, keyName: 'K2' }, { id: 'anthropic', label: 'Anthropic', research: false, keyConfigured: true, keyName: 'K3' }] };
const suggest = { models: { openai: ['gpt-9', 'gpt-8'] }, best: { openai: 'gpt-9' }, suggested: { research: { provider: 'openai', model: 'gpt-9' }, synthesis: { provider: 'anthropic', model: 'sonnet-x' } }, notes: [] };
const dlg = renderToStaticMarkup(React.createElement(ModelDialog, { agent: { id: 'research:customer', name: 'Customer insight researcher', group: 'research' }, routing: routing as never, suggest: suggest as never, onClose: () => undefined, onSaved: () => undefined }));
assert.match(dlg, /role="dialog"[^>]*aria-modal="true"/);
assert.match(dlg, /Choose the model for Customer insight researcher/);
assert.match(dlg, /OpenAI/);
assert.match(dlg, /Google Gemini \(key not set in Render\)/);
assert.doesNotMatch(dlg, /Anthropic/, 'research agents are only offered the providers with live web search');
assert.match(dlg, /value="gpt-9"/, 'prefilled with the suggested model');
assert.match(dlg, /value="0\.25"/, 'prefilled with the saved price');
assert.match(dlg, /<option value="gpt-8">/);
assert.match(dlg, /Accept/);
const dlg2 = renderToStaticMarkup(React.createElement(ModelDialog, { agent: { id: 'synthesis:insights', name: 'Insights agent', group: 'drafting' }, routing: routing as never, suggest: suggest as never, onClose: () => undefined, onSaved: () => undefined }));
assert.match(dlg2, /Anthropic/, 'drafting agents can use any provider');
assert.equal(toPrice(undefined).input, '');
assert.equal(fromPrice({ input: '1', output: '2', cached: '', tool: '0.01' }).toolPerCall, 0.01);
console.log('Interactive map: hover cost tooltips, click-to-choose model overlay, provider limits and prefill passed');
