import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'port67-routing-'));
  process.env.PORT67_DATA_DIR = dir;
  process.env.PORT67_SESSION_SECRET = 's'.repeat(48);
  process.env.PORT67_OPERATOR_PASSWORD = 'p'.repeat(24);
  process.env.PORT67_FIREBASE_PROJECT_ID = 'ai-agency-3671b';
  process.env.PORT67_ADMIN_UIDS = 'owner';
  process.env.PORT67_OPERATOR_UIDS = '';
  const env = { PORT67_RESEARCH_ENABLED: 'true', PORT67_SYNTHESIS_ENABLED: 'true', PORT67_OPENAI_API_KEY: 'k1', PORT67_GEMINI_API_KEY: 'k2', PORT67_RESEARCH_PROVIDER: 'openai', PORT67_RESEARCH_MODEL: 'env-model', PORT67_SYNTHESIS_PROVIDER: 'openai', PORT67_SYNTHESIS_MODEL: 'env-synth' };
  const R = await import('../src/lib/factory/ai-routing');
  const { LocalRepository } = await import('../src/lib/factory/repository');
  const { pricingFor } = await import('../src/lib/factory/costs');
  const { handleFactory } = await import('../src/lib/factory/service');
  const repo = new LocalRepository(dir);
  const price = { updatedAt: '2026-11-12', inputPerMillion: 0.3, outputPerMillion: 2.5 };

  // With nothing saved, jobs fall back to the environment settings.
  let s = await R.resolveSelection(repo, 'research:brand', env);
  assert.deepEqual([s.provider, s.model, s.source], ['openai', 'env-model', 'env']);

  // Stage default, then a per-job override that wins for only that job.
  await R.saveRouting(repo, { defaults: { research: { provider: 'gemini', model: 'g-default' } }, slots: { 'research:competitor': { provider: 'openai', model: 'o-comp' } }, pricing: { 'gemini:g-default': price } }, 'owner', env);
  s = await R.resolveSelection(repo, 'research:brand', env);
  assert.deepEqual([s.provider, s.model, s.source], ['gemini', 'g-default', 'default']);
  s = await R.resolveSelection(repo, 'research:competitor', env);
  assert.deepEqual([s.provider, s.model, s.source], ['openai', 'o-comp', 'slot']);
  s = await R.resolveSelection(repo, 'synthesis:strategy', env);
  assert.equal(s.source, 'env', 'drafting untouched');
  assert.equal(R.synthesisSlot('insights'), 'synthesis:insights');

  // Admin price is used by the ledger.
  const saved = (await repo.read('factory-ai-routing')).aiRouting!;
  assert.equal(pricingFor('gemini', 'g-default', saved.pricing)?.outputPerMillion, 2.5);

  // Validation: no web search provider, missing key, bad model, unknown job, bad price.
  const bad = (x: unknown, re: RegExp) => assert.rejects(() => R.saveRouting(repo, x, 'owner', env), re);
  await bad({ slots: { 'research:brand': { provider: 'anthropic', model: 'm' } } }, /web-grounded/);
  await bad({ defaults: { synthesis: { provider: 'deepseek', model: 'm' } } }, /not set in Render/);
  await bad({ defaults: { research: { provider: 'openai', model: 'bad model!' } } }, /exact model/);
  await bad({ slots: { 'research:nope': { provider: 'openai', model: 'm' } } }, /Unknown job/);
  await bad({ pricing: { 'openai:m': { updatedAt: 'x', inputPerMillion: 1, outputPerMillion: 1 } } }, /version date/);
  await bad({ pricing: { 'nonsense': price } }, /provider and model/);

  // Key removed after saving: fails loudly, never silently switches provider.
  await assert.rejects(() => R.resolveSelection(repo, 'research:brand', { ...env, PORT67_GEMINI_API_KEY: '' }), /PORT67_GEMINI_API_KEY/);

  // Overview never leaks keys; clearing a route returns to default.
  const overview = await R.routingOverview(repo, env);
  assert.ok(!JSON.stringify(overview).includes('k1') && !JSON.stringify(overview).includes('k2'));
  assert.equal(overview.effective.find(e => e.slot === 'research:brand')?.priced, true);
  await R.saveRouting(repo, { defaults: {}, slots: {}, pricing: {} }, 'owner', env);
  s = await R.resolveSelection(repo, 'research:competitor', env);
  assert.equal(s.source, 'env');
  assert.ok(((await R.loadRouting(repo)).history || []).length >= 2);

  // Public price lookup: parsed, converted per million, unknown models reported, fixed source only.
  let requested = '';
  const fake = (async (url: string) => { requested = url; return new Response(JSON.stringify({ 'gemini/g-pub': { input_cost_per_token: 3e-7, output_cost_per_token: 2.5e-6, cache_read_input_token_cost: 3e-8 }, 'gpt-x': { input_cost_per_token: 1.25e-6, output_cost_per_token: 1e-5 } })); }) as unknown as typeof fetch;
  const found = await R.suggestPublicPrices([{ provider: 'gemini', model: 'g-pub' }, { provider: 'openai', model: 'gpt-x' }, { provider: 'openai', model: 'missing' }], fake);
  assert.equal(requested, R.PUBLIC_PRICE_SOURCE);
  const g = found.prices[0] as { found: true; pricing: { inputPerMillion: number; outputPerMillion: number; cachedInputPerMillion?: number } };
  assert.deepEqual([g.pricing.inputPerMillion, g.pricing.outputPerMillion, g.pricing.cachedInputPerMillion], [0.3, 2.5, 0.03]);
  assert.equal((found.prices[1] as { pricing: { inputPerMillion: number } }).pricing.inputPerMillion, 1.25);
  assert.equal(found.prices[2].found, false);
  await assert.rejects(() => R.suggestPublicPrices([{ provider: 'openai', model: 'm' }], (async () => { throw new Error('net'); }) as unknown as typeof fetch), /public price list/);

  // Suggested setup: only provider-listed IDs, newest mid-tier model, Gemini preferred for research.
  const listing = (async (url: string) => new Response(JSON.stringify(
    url.includes('generativelanguage') ? { models: [{ name: 'models/gemini-3.5-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.0-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding', supportedGenerationMethods: ['embedContent'] }] }
      : { data: [{ id: 'gpt-5.4-mini' }, { id: 'gpt-5.4' }, { id: 'gpt-image-1' }] }))) as unknown as typeof fetch;
  const sug = await R.suggestSetup(env, listing);
  assert.deepEqual(sug.suggested.research, { provider: 'gemini', model: 'gemini-3.5-flash' });
  assert.deepEqual(sug.suggested.synthesis, { provider: 'gemini', model: 'gemini-3.5-flash' });
  assert.ok(!sug.models.gemini.includes('gemini-3.5-flash-image') && !sug.models.gemini.includes('text-embedding'));
  const noKeys = await R.suggestSetup({}, listing);
  assert.equal(noKeys.suggested.research, null);
  const oai = await R.suggestSetup({ PORT67_OPENAI_API_KEY: 'k1' }, listing);
  assert.deepEqual(oai.suggested.research, { provider: 'openai', model: 'gpt-5.4-mini' });

  // Route is admin only.
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
    assert.equal((await req('admin/ai-routing')).status, status, uid);
    assert.equal((await req('admin/ai-routing', { action: 'save', settings: {} })).status, status, uid + ' save');
  }

  await rm(dir, { recursive: true, force: true });
  console.log('AI routing: per-job models, admin prices, public price lookup, validation and admin-only access passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
