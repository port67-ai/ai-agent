import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import JourneyFlow, { JOURNEY } from '../src/components/factory/JourneyFlow';

const st = (inFlight: number) => ({ calls: 1, completed: 1, failed: 0, unknown: 0, inFlight, inputTokens: 1, outputTokens: 1, estimatedMicroUsd: 1, lastAt: undefined });
const ai = (id: string, group: string, model: string | undefined, inFlight = 0) => ({ id, group, name: id, purpose: '', kind: 'ai', model: model ? { provider: 'openai', model, source: 'slot', priced: true } : undefined, stats: st(inFlight) });
const agents = [
  ai('research:brand', 'research', 'gpt-a', 1), ai('research:customer', 'research', 'gpt-a'), ai('research:competitor', 'research', 'gpt-a'), ai('research:creative', 'research', 'gpt-a'),
  ai('synthesis:insights', 'drafting', 'gpt-b'), ai('synthesis:strategy', 'drafting', undefined), ai('synthesis:content', 'drafting', 'gpt-b'),
  { id: 'production.visual', group: 'production', name: 'Visual', purpose: '', kind: 'template', stats: undefined },
] as unknown as React.ComponentProps<typeof JourneyFlow>['agents'];
const html = renderToStaticMarkup(React.createElement(JourneyFlow, { agents }));
assert.equal(JOURNEY.filter((s) => s.kind === 'G').length, 5, 'five human gates');
assert.ok(JOURNEY.findIndex((s) => s.title === 'Approve copy set') < JOURNEY.findIndex((s) => s.title === 'Video render'), 'video after approval');
for (const t of ['Gate 1', 'Gate 5', 'Research agents \\(4\\)', 'Production agents', 'Publish yourself', 'Outside Port67']) assert.match(html, new RegExp(t));
assert.match(html, /Running now/);
assert.match(html, /No model chosen yet/);
assert.match(html, /gpt-b/);
assert.match(html, /df-hand flow/);
console.log('Journey flow: gates, agents, models, running and unset states passed');
