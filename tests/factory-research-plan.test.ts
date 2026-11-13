import assert from 'node:assert/strict';
import { prepareResearchPlan, researchDossier, renderDossierMarkdown } from '../src/lib/factory/research-plan';
import { createProject } from '../src/lib/factory/engine';

const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const thin = createProject({ business: 'Brand', objective: 'Grow', contact: 'a@example.com' }, op, 'p1');
let plan = prepareResearchPlan(thin);
assert.equal(plan.ready, false, 'thin brief is not ready');
assert.ok(plan.checks.filter((c) => !c.ok && c.level === 'required').map((c) => c.id).includes('channels'));
assert.ok(plan.score < 60);
assert.match(plan.segments.find((s) => s.segment === 'competitor')!.questions[0], /three to five/, 'no competitors: agent told to identify them');
assert.ok(plan.assumptions.some((a) => /competitor researcher will choose/.test(a)), 'assumptions are stated, not hidden');

const full = createProject({ business: 'Trailside Outfitters', objective: 'Grow online orders for new boots', description: 'Independent outdoor retailer selling hiking boots and waterproof jackets to weekend walkers.', website: 'https://www.trailside.example', audience: 'Weekend hikers aged 30 to 55', competitors: 'Alpha Gear, Peak Co', inspiration: 'Patagonia Worn Wear', contact: 'a@example.com' }, op, 'p2');
full.channels = ['instagram', 'reddit'];
plan = prepareResearchPlan(full);
assert.equal(plan.ready, true);
assert.equal(plan.score, 100);
assert.deepEqual(plan.assumptions, []);
const comp = plan.segments.find((s) => s.segment === 'competitor')!;
assert.ok(comp.questions.some((q) => /Alpha Gear/.test(q)) && comp.questions.some((q) => /Peak Co/.test(q)));
assert.ok(plan.segments.find((s) => s.segment === 'brand')!.startFrom[0].includes('trailside.example'));
assert.ok(plan.segments.every((s) => s.questions.length >= 2 && s.delivers));
assert.ok(plan.segments.find((s) => s.segment === 'creative')!.questions[0].includes('Instagram'));
assert.equal(plan.estimate.runs, 4);
assert.ok(plan.estimate.inputTokensPerRun > 500);

// Dossier: findings by agent; customers only see accepted sources.
const at = '2026-11-12T10:00:00Z';
const src = (id: string, segment: 'brand' | 'customer', status: 'unreviewed' | 'supported' | 'rejected') => ({ id, segment, title: 'T' + id, url: 'https://example.com/' + id, excerpt: 'e', kind: 'public_source' as const, status, collectedAt: at, method: 'm', confidence: 'moderate' as const, findings: [{ claim: 'Claim ' + id, quote: 'Quote ' + id }] });
full.sources.push(src('a', 'brand', 'supported'), src('b', 'brand', 'unreviewed'), src('c', 'customer', 'rejected'));
full.runs.push({ id: 'r', at, status: 'completed', stage: 'research', segment: 'brand', provider: 'x', model: 'm', gaps: ['Pricing not published'] });
const ops = researchDossier(full, 'operator', at);
assert.deepEqual([ops.totals.sources, ops.totals.supported, ops.totals.unreviewed, ops.totals.rejected, ops.totals.findings, ops.totals.gaps], [3, 1, 1, 1, 3, 1]);
assert.equal(ops.readyForInsights, true);
assert.match(ops.nextStep, /Review the unreviewed/);
const cust = researchDossier(full, 'customer', at);
assert.deepEqual([cust.totals.sources, cust.totals.unreviewed, cust.totals.rejected], [1, 0, 0], 'customers see accepted sources only');
const md = renderDossierMarkdown(ops);
for (const t of ['# Research dossier: Trailside Outfitters', '## Business and brand', 'Claim a', 'Evidence: "Quote a"', 'Pricing not published', 'No sources yet']) assert.ok(md.includes(t), t);
assert.ok(!md.includes('—'), 'no em dashes');
const empty = researchDossier(createProject({ business: 'B', objective: 'Objective here', contact: 'a@example.com' }, op, 'p3'), 'operator');
assert.equal(empty.readyForInsights, false);
assert.match(empty.nextStep, /No research yet/);
console.log('Research preparation: readiness, per-agent question plan, assumptions, dossier and customer filtering passed');
