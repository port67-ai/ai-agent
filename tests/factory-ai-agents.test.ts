import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'port67-agents-'));
  process.env.PORT67_DATA_DIR = dir;
  process.env.PORT67_SESSION_SECRET = 's'.repeat(48);
  process.env.PORT67_OPERATOR_PASSWORD = 'p'.repeat(24);
  process.env.PORT67_FIREBASE_PROJECT_ID = 'ai-agency-3671b';
  process.env.PORT67_ADMIN_UIDS = 'owner';
  process.env.PORT67_OPERATOR_UIDS = '';
  process.env.PORT67_MONTHLY_BUDGET_USD = '1000';
  const env = { PORT67_RESEARCH_ENABLED: 'true', PORT67_SYNTHESIS_ENABLED: 'true', PORT67_GEMINI_API_KEY: 'k', PORT67_OPENAI_API_KEY: 'k', PORT67_RESEARCH_PROVIDER: 'gemini', PORT67_RESEARCH_MODEL: 'g-flash', PORT67_SYNTHESIS_PROVIDER: 'openai', PORT67_SYNTHESIS_MODEL: 'o-mini' };
  const { LocalRepository } = await import('../src/lib/factory/repository');
  const { reserveApiCall, finishApiCall } = await import('../src/lib/factory/costs');
  const { agentOf } = await import('../src/lib/factory/metering');
  const { agentsOverview, agentStats } = await import('../src/lib/factory/ai-agents');
  const { saveRouting } = await import('../src/lib/factory/ai-routing');
  const { handleFactory } = await import('../src/lib/factory/service');
  const repo = new LocalRepository(dir);

  // Calls are attributed to the agent that made them.
  assert.equal(agentOf({ stage: 'research', segment: 'competitor' } as never), 'research:competitor');
  assert.equal(agentOf({ stage: 'insights' } as never), 'synthesis:insights');
  assert.equal(agentOf({ stage: 'strategy' } as never), 'synthesis:strategy');
  assert.equal(agentOf({ stage: 'content' } as never), 'synthesis:content');
  const base = { accountId: 'a', workspaceId: 'w', projectId: 'p', actor: 'producer' };
  const done = await reserveApiCall(repo, { ...base, runId: 'r1', stage: 'research', agent: 'research:brand', provider: 'gemini', model: 'g-flash' });
  await finishApiCall(repo, done, { status: 'completed', usage: { inputTokens: 1000, outputTokens: 500 } });
  const bad = await reserveApiCall(repo, { ...base, runId: 'r2', stage: 'research', agent: 'research:brand', provider: 'gemini', model: 'g-flash' });
  await finishApiCall(repo, bad, { status: 'failed' });
  await reserveApiCall(repo, { ...base, runId: 'r3', stage: 'content', agent: 'synthesis:content', provider: 'openai', model: 'o-mini' }); // left in flight
  await reserveApiCall(repo, { ...base, runId: 'r4', stage: 'research', provider: 'gemini', model: 'g-flash' }); // pre-agent record

  const overview = await agentsOverview(repo, env);
  const byId = Object.fromEntries(overview.agents.map((a) => [a.id, a]));
  assert.equal(overview.agents.filter((a) => a.group === 'research').length, 4);
  assert.equal(overview.agents.filter((a) => a.group === 'drafting').length, 3);
  assert.ok(overview.agents.some((a) => a.id === 'production.video' && a.kind === 'template'));
  const brand = byId['research:brand'];
  assert.deepEqual([brand.stats!.calls, brand.stats!.completed, brand.stats!.failed], [2, 1, 1]);
  assert.equal(brand.stats!.inputTokens, 1000);
  assert.equal(brand.model!.provider, 'gemini');
  assert.equal(byId['synthesis:content'].stats!.inFlight, 1, 'a fresh reservation shows as running now');
  assert.equal(byId['research:customer'].stats!.calls, 0);
  assert.equal(overview.totals.inFlight, 1);
  assert.equal(overview.totals.unattributed, 1);
  assert.equal(overview.recent.length, 4);
  assert.ok(!JSON.stringify(overview).includes('"k"'), 'no API key values');
  // A stale reservation is no longer running.
  const stale = agentStats([{ agent: 'x', status: 'reserved', createdAt: new Date(Date.now() - 600000).toISOString() } as never], 'x');
  assert.deepEqual([stale.inFlight, stale.unknown], [0, 1]);
  // The overview follows the admin's model choices.
  await saveRouting(repo, { slots: { 'research:brand': { provider: 'openai', model: 'o-research' } } }, 'owner', env);
  const changed = await agentsOverview(repo, env);
  assert.deepEqual(changed.agents.find((a) => a.id === 'research:brand')!.model!.model, 'o-research');
  assert.equal(changed.agents.find((a) => a.id === 'research:customer')!.model!.model, 'g-flash');

  // Admin only.
  const verifier = async (t: string) => ({ uid: t, aud: 'ai-agency-3671b', iss: 'https://securetoken.google.com/ai-agency-3671b', email_verified: true, auth_time: Math.floor(Date.now() / 1000), email: t + '@example.test' });
  const lookup = async (uid: string) => ({ uid, email: uid + '@example.test', emailVerified: true, disabled: false, tokensValidAfterTime: new Date(0).toISOString() });
  let cookie = '';
  async function req(path: string, body?: unknown) {
    const r = await handleFactory(new Request('http://localhost:3000/api/factory/' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), path.split('/'), verifier, lookup);
    const set = r.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0], name = pair.split('=')[0]; cookie = cookie.split(';').filter(x => x.trim() && !x.trim().startsWith(name + '=')).concat(pair).join(';'); }
    return r;
  }
  for (const [uid, status] of [['client', 403], ['owner', 200]] as const) {
    cookie = ''; await req('session'); assert.equal((await req('identity-login', { idToken: uid })).status, 200);
    assert.equal((await req('admin/ai-agents')).status, status, uid);
  }
  await rm(dir, { recursive: true, force: true });
  console.log('AI agents: per-agent ledger attribution, running-now, models, stats and admin-only access passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
