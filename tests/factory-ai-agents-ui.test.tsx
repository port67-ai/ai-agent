import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import AgentDataFlow from '../src/components/factory/AgentDataFlow';

const stats = (inFlight: number) => ({ calls: 1, completed: 1, failed: 0, unknown: 0, inFlight, inputTokens: 1, outputTokens: 1, estimatedMicroUsd: 1, lastAt: undefined });
const agents = [
  { id: 'research:brand', group: 'research', name: 'Brand', purpose: '', kind: 'ai', model: { provider: 'openai', model: 'gpt-x-mini', source: 'slot', priced: true }, stats: stats(1) },
  { id: 'synthesis:strategy', group: 'drafting', name: 'Direction', purpose: '', kind: 'ai', model: undefined, stats: stats(0) },
] as unknown as React.ComponentProps<typeof AgentDataFlow>['agents'];
const html = renderToStaticMarkup(React.createElement(AgentDataFlow, { agents }));
assert.match(html, /Firestore/);
assert.match(html, /OpenAI/);
assert.match(html, /gpt-x-mini/);
assert.match(html, /no model/);
assert.match(html, /df-link df-ai flow/);
assert.match(html, /Not stored anywhere: prompts and raw model responses/);
console.log('Agent data-flow diagram: providers, models, storage and running state passed');
