import assert from 'node:assert/strict';
import { createProject, transition } from '../src/lib/factory/engine';

const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const cust = { role: 'customer' as const, workspaceId: 'w', subject: 'customer', identity: 'firebase' as const, accountId: 'w' };
let p = createProject({ business: 'Brand', objective: 'Grow the business', contact: 'a@example.com' }, op, 'p1');
const src = (id: string, segment: 'brand' | 'customer', kind: 'public_source' | 'client_assertion', status: 'unreviewed' | 'supported' | 'rejected') => ({ id, segment, title: id, url: 'https://example.com/' + id, excerpt: 'e', kind, status, collectedAt: '2026-11-13T10:00:00Z', method: 'm' });
p.sources.push(src('a', 'brand', 'public_source', 'unreviewed'), src('b', 'customer', 'public_source', 'unreviewed'), src('c', 'customer', 'public_source', 'rejected'), src('d', 'brand', 'client_assertion', 'unreviewed'), src('e', 'brand', 'public_source', 'supported'));
assert.throws(() => transition(p, { type: 'reviewAllSources' }, op), /Confirm/, 'needs an explicit confirmation');
assert.throws(() => transition(p, { type: 'reviewAllSources', confirm: true }, cust), /operator/i, 'producers only');
p = transition(p, { type: 'reviewAllSources', confirm: true }, op);
const status = (id: string) => p.sources.find((s) => s.id === id)!.status;
assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map(status), ['supported', 'supported', 'rejected', 'unreviewed', 'supported'], 'only unreviewed public sources change; rejected and client assertions are left alone');
const entry = p.audit.find((x) => x.action === 'sources_bulk_accepted')!;
assert.match(entry.detail, /2 sources accepted without individual review \(brand 1, customer 1/);
assert.equal(entry.actor, 'producer');
assert.equal(p.audit.filter((x) => x.action === 'sources_bulk_accepted').length, 1, 'one audit entry, not one per source');
// Idempotent: nothing waiting means nothing happens, so a repeated click or an automated caller cannot loop.
assert.throws(() => transition(p, { type: 'reviewAllSources', confirm: true }, op), /No unreviewed public sources/);
assert.equal(p.audit.filter((x) => x.action === 'sources_bulk_accepted').length, 1);
// Per-source review still works afterwards.
p = transition(p, { type: 'reviewSource', id: 'a', status: 'rejected' }, op);
assert.equal(status('a'), 'rejected');
console.log('Source review: bulk accept is confirmed, producer-only, audited once, single-shot and leaves client assertions and decided sources alone');

// Bulk insight acceptance and bulk asset approval, plus the optional producer test-mode approvals.
import { transition as tr, strategyHash } from '../src/lib/factory/engine';
let q = createProject({ business: 'Brand', objective: 'Grow the business', contact: 'a@example.com' }, op, 'p2');
q.sources.push(src('s1', 'brand', 'public_source', 'supported'), src('s2', 'brand', 'public_source', 'unreviewed'));
const ins = (id: string, sourceIds: string[], status: 'draft' | 'reviewed') => ({ id, title: id, interpretation: 'i', sourceIds, confidence: 'limited' as const, createdAt: '2026-11-13T10:00:00Z', status });
q.insights.push(ins('i1', ['s1'], 'draft'), ins('i2', ['s1'], 'draft'), ins('i3', ['s2'], 'draft'));
assert.throws(() => tr(q, { type: 'reviewAllInsights' }, op), /Confirm/);
q = tr(q, { type: 'reviewAllInsights', confirm: true }, op);
assert.deepEqual(q.insights.map((i) => i.status), ['reviewed', 'reviewed', 'draft'], 'an insight whose source is not accepted stays a draft');
assert.match(q.audit.find((x) => x.action === 'insights_bulk_accepted')!.detail, /2 of 3/);
q.sources.find((s) => s.id === 's2')!.status = 'supported';
q = tr(q, { type: 'reviewAllInsights', confirm: true }, op);
assert.equal(q.insights[2].status, 'reviewed');
assert.throws(() => tr(q, { type: 'reviewAllInsights', confirm: true }, op), /No draft insights/, 'nothing waiting: nothing happens');
// Customer approvals: producers are refused unless test mode is on, and then it is recorded as on the customer's behalf.
const r = createProject({ business: 'Brand', objective: 'Grow the business', contact: 'a@example.com' }, op, 'p3');
r.sources.push(src('s1', 'brand', 'public_source', 'supported'));
r.strategies.push({ id: 'st', version: 1, status: 'shared', audience: 'a', message: 'm', rationale: 'r', design: 'd', channels: 'c', format: 'f', cta: 'c', evidenceIds: ['s1'], insightIds: [], hypothesis: 'h', uncertainties: 'u', createdAt: '2026-11-13T10:00:00Z', hash: 'H' } as never);
r.strategies[0].hash = strategyHash(r.strategies[0]);
const H = r.strategies[0].hash;
assert.throws(() => tr(r, { type: 'approveStrategy', hash: H }, op), /Customer approval identity/, 'off by default');
process.env.PORT67_PRODUCER_APPROVALS = 'true';
try {
  const done = tr(r, { type: 'approveStrategy', hash: H }, op);
  assert.equal(done.strategies[0].status, 'approved');
  assert.match(done.strategies[0].approvedBy!, /producer \(on behalf of the customer, test mode\)/);
  assert.ok(done.audit.some((x) => x.action === 'approved_on_behalf'));
  const asset = (id: string, status: 'shared' | 'draft') => ({ id, version: 1, kind: 'copy' as const, title: id, strategyId: 'st', strategyHash: H, taskId: 't', evidenceIds: [], status, content: 'c', hash: 'h' + id, createdAt: '2026-11-13T10:00:00Z' });
  done.assets.push(asset('a1', 'shared'), asset('a2', 'shared'), asset('a3', 'draft'));
  const all = tr(done, { type: 'approveAllAssets' }, op);
  assert.deepEqual(all.assets.map((x) => x.status), ['approved', 'approved', 'draft'], 'only shared assets are approved');
  assert.ok(all.assets[0].approvedBy!.includes('on behalf'));
  assert.throws(() => tr(all, { type: 'approveAllAssets' }, op), /No shared assets/);
} finally {
  delete process.env.PORT67_PRODUCER_APPROVALS;
}
assert.throws(() => tr(r, { type: 'approveAllAssets' }, op), /Customer approval identity/, 'off again once the switch is removed');
console.log('Bulk insight acceptance, bulk asset approval and producer test-mode approvals passed');

// Restart from the brief: admin only, confirmed, keeps the brief and removes everything produced after it.
const admin = { ...op, admin: true };
let z = createProject({ business: 'Brand', objective: 'Grow the business', contact: 'a@example.com' }, op, 'p4');
z.sources.push(src('s1', 'brand', 'public_source', 'supported'));
z.channels = ['instagram'];
z.runs.push({ id: 'r', stage: 'research', segment: 'brand', at: '2026-11-13T10:00:00Z', status: 'completed' } as never);
assert.throws(() => transition(z, { type: 'resetProject', confirm: true }, op), /only an admin/, 'a producer cannot restart a project');
assert.throws(() => transition(z, { type: 'resetProject', confirm: true }, cust), /Customer|operator|admin/i, 'a customer cannot');
assert.throws(() => transition(z, { type: 'resetProject' }, admin), /Confirm/);
z = transition(z, { type: 'resetProject', confirm: true }, admin);
assert.equal(z.brief.business, 'Brand', 'the brief is kept');
assert.deepEqual([z.sources.length, z.runs.length, z.channels?.length, z.insights.length, z.strategies.length, z.assets.length], [0, 0, 0, 0, 0, 0]);
assert.ok(z.audit.some((x) => x.action === 'project_reset' && /1 sources/.test(x.detail)), 'the audit trail records what was removed');
z = transition(z, { type: 'setChannels', channels: ['instagram'] }, op);
assert.deepEqual(z.channels, ['instagram'], 'the journey can start again');
console.log('Restart from the brief: admin only, confirmed, keeps the brief, clears the journey, audited');
