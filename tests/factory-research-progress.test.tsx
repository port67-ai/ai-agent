import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createProject, projectView, researchProgress } from '../src/lib/factory/engine';
import ResearchProgress from '../src/components/factory/ResearchProgress';

const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const cust = { role: 'customer' as const, workspaceId: 'w', subject: 'client', projectId: 'p1' };
let p = createProject({ business: 'Brand', objective: 'Grow', contact: 'a@example.com' }, op, 'p1');
assert.ok(researchProgress(p).every(r => r.status === 'idle' && r.sources === 0), 'nothing started');

const at = new Date().toISOString();
p.runs.push(
  { id: 'r1', at, status: 'completed', stage: 'research', segment: 'brand', provider: 'x', model: 'm', gaps: ['No pricing found'] },
  { id: 'r2', at, status: 'failed', stage: 'research', segment: 'customer', provider: 'x', model: 'm', error: 'SECRET provider detail' },
  { id: 'r3', at, status: 'running', stage: 'research', segment: 'competitor', provider: 'x', model: 'm' },
);
p.sources.push({ id: 's1', segment: 'brand', title: 't', url: 'https://example.com', excerpt: 'e', kind: 'public_source', status: 'unreviewed', collectedAt: at, method: 'm' });
const prog = researchProgress(p);
assert.deepEqual(prog.map(r => r.status), ['completed', 'failed', 'running', 'idle']);
assert.equal(prog[0].sources, 1);

// Customers follow progress but never see run internals.
const view = projectView(p, cust);
assert.deepEqual(view.runs, [], 'run internals stay hidden from customers');
assert.deepEqual(view.researchProgress?.map(r => r.status), ['completed', 'failed', 'running', 'idle']);
assert.ok(!JSON.stringify(view).includes('SECRET provider detail'));

const base = { onRefresh: () => undefined };
const customerHtml = renderToStaticMarkup(<ResearchProgress p={{ ...view, researchRequest: { at, by: 'c', channels: ['linkedin'] }, channels: ['linkedin'] }} operator={false} {...base} />);
assert.equal((customerHtml.match(/class="f-agent /g) || []).length, 4, 'four researchers');
assert.ok(customerHtml.includes('Done: 1 source found'));
assert.ok(customerHtml.includes('Researching now'));
assert.ok(customerHtml.includes('Queued'), 'requested but not started shows as queued');
assert.ok(customerHtml.includes('Needs attention. Port67 is looking into it.') && !customerHtml.includes('Run history'));
assert.ok(customerHtml.includes('They focus on LinkedIn'));
assert.ok(customerHtml.includes('Business and brand researcher') && customerHtml.includes('Competitor researcher'));

const producerHtml = renderToStaticMarkup(<ResearchProgress p={{ ...p, researchProgress: prog }} operator={true} {...base} />);
assert.ok(producerHtml.includes('1 gap noted') && producerHtml.includes('see Run history'));

// A producer's own in-flight segment shows as running before the server has a record.
const fresh = createProject({ business: 'B', objective: 'O', contact: 'a@example.com' }, op, 'p2');
fresh.researchProgress = researchProgress(fresh);
const live = renderToStaticMarkup(<ResearchProgress p={{ ...fresh, researchRequest: { at, by: 'c', channels: ['youtube'] } }} operator={true} runningSegment="brand" {...base} />);
assert.ok(live.includes('Researching now') && live.includes('Queued'));
const waiting = renderToStaticMarkup(<ResearchProgress p={{ ...fresh, researchRequest: { at, by: 'c', channels: ['youtube'] } }} operator={false} {...base} />);
assert.ok(waiting.includes('Waiting for Port67 to start'));
assert.ok(waiting.includes('Research requested') && waiting.includes('Waiting for a producer'), 'the wait is a visible step, not an empty page');
const producerWaiting = renderToStaticMarkup(<ResearchProgress p={{ ...fresh, researchRequest: { at, by: 'c', channels: ['youtube'] } }} operator={true} {...base} />);
assert.ok(producerWaiting.includes('Click Start research above'));
const none = renderToStaticMarkup(<ResearchProgress p={fresh} operator={false} {...base} />);
assert.ok(none.includes('Not started') && none.includes('Choose your launch channels'));
const done = renderToStaticMarkup(<ResearchProgress p={{ ...fresh, researchProgress: researchProgress(fresh).map(r => ({ ...r, status: 'completed' as const, sources: 2 })) }} operator={false} {...base} />);
assert.ok(done.includes('Research is complete'));
// Animated flow: customers and producers both get it; only producers get the live activity feed.
assert.ok(customerHtml.includes('f-flow') && customerHtml.includes('Source review') && customerHtml.includes('Insights and direction'));
assert.ok(customerHtml.includes('f-flow-link flow'), 'data is flowing while a researcher is running');
assert.ok(!customerHtml.includes('Live activity'), 'customers get no run feed');
assert.ok(!customerHtml.includes('x m') && !/gemini|openai/i.test(customerHtml), 'no provider or model for customers');
const feed = renderToStaticMarkup(<ResearchProgress p={{ ...p, researchProgress: prog }} operator={true} {...base} />);
assert.ok(feed.includes('Live activity') && feed.includes('searching the web with x m'));
assert.ok(feed.includes('failed: SECRET provider detail') && feed.includes('found 1 source') === false, 'completed run with no linked sources reports found 0');
assert.ok(feed.includes('found 0 sources'));
const idle = renderToStaticMarkup(<ResearchProgress p={fresh} operator={false} {...base} />);
assert.ok(!idle.includes('f-flow-link flow'), 'nothing flows before work starts');
console.log('Research progress: per-researcher status for customers and producers without run internals passed');
