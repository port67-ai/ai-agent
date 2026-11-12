import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'port67-team-'));
  process.env.PORT67_DATA_DIR = dir;
  process.env.PORT67_SESSION_SECRET = 's'.repeat(48);
  process.env.PORT67_OPERATOR_PASSWORD = 'p'.repeat(24);
  process.env.PORT67_FIREBASE_PROJECT_ID = 'ai-agency-3671b';
  process.env.PORT67_ADMIN_UIDS = 'owner';
  process.env.PORT67_OPERATOR_UIDS = '';
  const { handleFactory } = await import('../src/lib/factory/service');
  const { normalizeEmail, MAX_TEAM_MEMBERS, listTeam } = await import('../src/lib/factory/team');
  const { LocalRepository } = await import('../src/lib/factory/repository');

  // Email normalisation.
  assert.equal(normalizeEmail('  Staff@Example.Test '), 'staff@example.test');
  for (const bad of ['', 'nope', 'a@b', 'a b@example.test', '@example.test', 'a@@example.test', 'x'.repeat(250) + '@example.test', 42, undefined])
    assert.throws(() => normalizeEmail(bad), /email/i, String(bad));

  // The fixture verifier gives uid U the email U@example.test, verified. Unverified users never get a session.
  const verifier = async (token: string) => ({ uid: token, aud: 'ai-agency-3671b', iss: 'https://securetoken.google.com/ai-agency-3671b', email_verified: true, auth_time: Math.floor(Date.now() / 1000), email: token + '@example.test' });
  let emailVerified = true;
  const lookup = async (uid: string) => ({ uid, email: uid + '@example.test', emailVerified, disabled: false, tokensValidAfterTime: new Date(0).toISOString() });
  let cookie = '';
  async function req(path: string, body?: unknown) {
    const r = await handleFactory(new Request('http://localhost:3000/api/factory/' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), path.split('/'), verifier, lookup);
    const set = r.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0], name = pair.split('=')[0]; cookie = cookie.split(';').filter(x => x.trim() && !x.trim().startsWith(name + '=')).concat(pair).join(';'); }
    return r;
  }
  async function login(uid: string) { cookie = ''; await req('session'); const r = await req('identity-login', { idToken: uid }); assert.equal(r.status, 200); return (await r.json()).principal; }
  const team = async () => (await (await req('admin/team')).json()).team as { email: string }[];

  // Before any team entry: staff is a client, and nobody but the admin can open the Team API.
  await login('staff');
  assert.equal((await req('accounts')).status, 403, 'a new sign-up is a client');
  assert.equal((await req('admin/team')).status, 403, 'client cannot read the team');
  assert.equal((await req('admin/team', { action: 'add', email: 'staff@example.test' })).status, 403, 'client cannot add themselves');
  await login('customer-a');
  const created = await req('projects', { business: 'Alpha', objective: 'Awareness', contact: 'a@example.test' });
  assert.equal(created.status, 201);
  const accountA = (await created.json()).project.accountId as string;

  // Admin adds a producer, case-insensitively and idempotently.
  await login('owner');
  assert.deepEqual(await team(), []);
  let add = await req('admin/team', { action: 'add', email: ' Staff@Example.Test ' });
  assert.equal(add.status, 200);
  assert.deepEqual((await add.json()).team.map((m: { email: string }) => m.email), ['staff@example.test']);
  add = await req('admin/team', { action: 'add', email: 'staff@example.test' });
  assert.equal((await add.json()).team.length, 1, 'adding twice does not duplicate');
  assert.equal((await req('admin/team', { action: 'add', email: 'not an email' })).status, 400);
  assert.equal((await req('admin/team', { action: 'promote', email: 'x@example.test' })).status, 400);

  // The producer now has producer powers on their next request, but never admin powers.
  const producer = await login('staff');
  assert.equal(producer.role, 'operator');
  assert.equal(producer.admin, false);
  assert.equal((await req('accounts', { accountId: accountA })).status, 200, 'producer can open a client account');
  assert.equal((await (await req('projects')).json()).projects.length, 1);
  assert.equal((await req('admin/costs')).status, 403, 'producer cannot see costs');
  assert.equal((await req('admin/team')).status, 403, 'producer cannot manage the team');
  assert.equal((await req('admin/team', { action: 'add', email: 'friend@example.test' })).status, 403, 'producer cannot add producers');

  // A client with a different email is unaffected, and clients still cannot reach each other.
  await login('customer-b');
  assert.equal((await req('accounts')).status, 403);
  assert.equal((await (await req('projects')).json()).projects.length, 0);

  // Admin removes the producer: access ends on the very next request, even mid-session on a client account.
  await login('staff');
  assert.equal((await req('accounts', { accountId: accountA })).status, 200);
  const staffCookie = cookie;
  await login('owner');
  const removed = await req('admin/team', { action: 'remove', email: 'STAFF@example.test' });
  assert.equal(removed.status, 200);
  assert.deepEqual(await team(), []);
  cookie = staffCookie;
  assert.equal((await req('projects')).status, 401, 'removed producer is signed out of the client account');
  await login('staff');
  assert.equal((await req('accounts')).status, 403, 'removed producer is a client again');
  assert.equal((await (await req('projects')).json()).projects.length, 0, 'and sees only their own (empty) account');

  // An unverified or disabled email is never promoted: no session at all.
  await login('owner');
  await req('admin/team', { action: 'add', email: 'staff@example.test' });
  await login('staff');
  emailVerified = false;
  assert.equal((await req('projects')).status, 401);
  emailVerified = true;

  // The registry cannot grant admin, and the audit trail records who changed what.
  await login('staff');
  assert.equal(((await (await req('session')).json()).principal).admin, false);
  const repo = new LocalRepository(dir);
  const db = await repo.read('factory-team');
  assert.deepEqual((db.teamAudit || []).map(e => [e.actor, e.action, e.email]), [['owner', 'add', 'staff@example.test'], ['owner', 'remove', 'staff@example.test'], ['owner', 'add', 'staff@example.test']]);

  // Registry unreadable means no promotion (fail closed on privilege), not an outage for everyone.
  const { withTeamRole } = await import('../src/lib/factory/team');
  const broken = { read: async () => { throw new Error('storage down'); }, mutate: async () => { throw new Error('storage down'); } };
  const base = { uid: 'staff', email: 'staff@example.test', accountId: 'acct_' + 'a'.repeat(32), role: 'customer' as const, admin: false };
  assert.deepEqual(await withTeamRole(broken, base), base);
  assert.equal((await withTeamRole(repo, { ...base, email: undefined })).role, 'customer', 'no email, no promotion');

  // Size limit.
  await login('owner');
  for (let i = (await listTeam(repo)).length; i < MAX_TEAM_MEMBERS; i++) assert.equal((await req('admin/team', { action: 'add', email: `p${i}@example.test` })).status, 200);
  assert.equal((await req('admin/team', { action: 'add', email: 'one-too-many@example.test' })).status, 400);
  assert.equal((await team()).length, MAX_TEAM_MEMBERS);

  await rm(dir, { recursive: true, force: true });
  console.log('Team access: owner-managed producers, immediate revocation, no admin escalation passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
