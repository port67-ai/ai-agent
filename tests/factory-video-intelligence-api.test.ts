import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'port67-video-analysis-'));
  Object.assign(process.env, { PORT67_DATA_DIR: dir, PORT67_SESSION_SECRET: 's'.repeat(48), PORT67_OPERATOR_PASSWORD: 'p'.repeat(24), PORT67_FIREBASE_PROJECT_ID: 'ai-agency-3671b', PORT67_ADMIN_UIDS: 'owner', PORT67_OPERATOR_UIDS: 'producer', PORT67_RESEARCH_ENABLED: 'true', PORT67_SCOPING_ENABLED: 'false', PORT67_RESEARCH_PROVIDER: 'gemini', PORT67_RESEARCH_MODEL: 'fixture-video', PORT67_GEMINI_API_KEY: 'test-only-not-a-key', PORT67_AUTO_APPROVE_PRODUCER: 'false', PORT67_PRODUCER_AGENT: 'false' });
  const { handleFactory } = await import('../src/lib/factory/service');
  const { LocalRepository } = await import('../src/lib/factory/repository');
  const { exportApiCalls } = await import('../src/lib/factory/costs');
  const { prepareSynthesis } = await import('../src/lib/factory/synthesis');
  const { researchContextHash } = await import('../src/lib/factory/research-catalog');
  const repo = new LocalRepository(dir);
  let cookie = '';
  const verifier = async (uid: string) => ({ uid, aud: 'ai-agency-3671b', iss: 'https://securetoken.google.com/ai-agency-3671b', email_verified: true, auth_time: Math.floor(Date.now()/1000) });
  const lookup = async (uid: string) => ({ uid, emailVerified: true, disabled: false });
  async function raw(path: string, data?: unknown) {
    const res = await handleFactory(new Request('http://localhost:3000/api/factory/' + path, { method: data ? 'POST' : 'GET', headers: { cookie, origin: 'http://localhost:3000', ...(data ? {'content-type':'application/json'} : {}) }, body: data ? JSON.stringify(data) : undefined }), path.split('/'), verifier, lookup);
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0], name = pair.split('=')[0]; cookie = cookie.split(';').filter(x=>x.trim() && !x.trim().startsWith(name+'=')).concat(pair).join(';'); }
    return res;
  }
  async function req(path: string, data?: unknown) { const r = await raw(path,data); const json = await r.json(); assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(json)}`); return json; }
  async function login(uid: string) { cookie=''; await req('session'); return (await req('identity-login',{idToken:uid})).principal; }
  const original = globalThis.fetch;
  try {
    const owner = await login('customer');
    const project = (await req('projects',{business:'Synthetic lodge',objective:'More bookings',description:'A small coastal hotel',website:'https://lodge.example',contact:'fake@example.test'})).project;
    const route = 'projects/' + project.id;
    await login('producer'); await req('accounts',{accountId:owner.accountId});
    await req(route,{type:'setChannels',channels:['youtube']});
    await req(route,{type:'authoriseAI',confirm:true});
    const p = (await req(route,{type:'addSource',segment:'video',title:'Public reference',url:'https://youtu.be/abcdefghijk',excerpt:'A reference video to analyse, not evidence of performance.'})).project;
    const sourceId = p.sources[0].id;
    let calls = 0, sent: Record<string, unknown> = {};
    let mutateDuringCall = false, accessible = true;
    globalThis.fetch = (async (_url: unknown, init?: {body?:string}) => {
      calls++; sent = JSON.parse(init!.body!);
      if (mutateDuringCall) await repo.mutate(owner.workspaceId, db => { db.projects.find(x=>x.id===project.id)!.channels = ['instagram']; });
      return Response.json({responseId:'video-'+calls,usageMetadata:{promptTokenCount:100,candidatesTokenCount:200},candidates:[{content:{parts:[{text:JSON.stringify({accessible,durationSeconds:20,style:'Documentary',lighting:'Soft window light',motion:'Slow push in',graphics:'Simple captions',pacing:'A measured opening',audio:'Ambient sound',hook:'Product in use',adaptation:'Propose an original demonstration',limitations:'Two fps sample; no conversion evidence',shots:[{atSeconds:0,observation:'Hands using a product'}]})}]}}]});
    }) as typeof fetch;
    await login('customer');
    assert.equal((await raw(route+'/video-analysis',{sourceId})).status,403,'customer cannot trigger paid video analysis');
    await login('producer'); await req('accounts',{accountId:owner.accountId});
    assert.equal((await raw(route+'/video-analysis',{sourceId:'another-project-source'})).status,400);
    assert.equal(calls,0,'denied requests have no external calls');
    await req(route+'/video-analysis',{sourceId});
    const body = JSON.stringify(sent);
    assert.match(body,/fileData/); assert.match(body,/abcdefghijk/); assert.match(body,/120s/); assert.ok(!body.includes('google_search'),'direct video does not also launch paid web search');
    let current = (await req(route)).project;
    const analysed = current.sources.find((s: {videoAnalysis?:unknown}) => s.videoAnalysis);
    assert.equal(analysed.status,'unreviewed'); assert.equal(analysed.videoAnalysis.basis,'direct_video');
    const { sourceRules } = await import('../src/lib/factory/producer-reviews');
    const reviewedReference = { ...current, sources: current.sources.map((s: {id:string}) => s.id === sourceId ? { ...s, status: 'supported' } : s) };
    assert.equal(sourceRules(reviewedReference, [analysed.id])[0].verdict, 'accept', 'a new direct-video observation is not rejected as a duplicate of its discovery link');
    assert.equal(current.runs.at(-1).capabilityVersion,'2.0.0'); assert.equal(current.runs.at(-1).contextBundle.skillVersion,'2.0.0');
    let rows = await exportApiCalls(repo);
    assert.equal(rows.length,1); assert.equal(rows[0].agent,'research:video'); assert.equal(rows[0].accountId,owner.accountId); assert.equal(rows[0].usage?.inputTokens,100); assert.equal(rows[0].status,'completed');
    accessible=false;
    const unavailable = await raw(route+'/video-analysis',{sourceId});
    assert.equal(unavailable.status,400); current=(await req(route)).project;
    assert.equal(current.sources.filter((s:{videoAnalysis?:unknown})=>s.videoAnalysis).length,1,'inaccessible video never yields visual evidence');
    accessible=true; mutateDuringCall=true;
    const stale=await raw(route+'/video-analysis',{sourceId}); assert.equal(stale.status,400);
    current=(await req(route)).project;
    assert.match(current.runs.at(-1).error,/context|authorisation/);
    assert.equal(current.sources.filter((s:{videoAnalysis?:unknown})=>s.videoAnalysis).length,1,'changed channels reject late analysis');
    rows=await exportApiCalls(repo); assert.equal(rows.length,3,'usage survives rejected output');
    assert.notEqual(researchContextHash(current),researchContextHash({...current,channels:['youtube']}));
    // Source balancing includes late research roles even when the first four fill the old 30-source window.
    const { segments } = await import('../src/lib/factory/model');
    const synthetic={...current,channels:['youtube'],sources:segments.flatMap(segment=>Array.from({length:8},(_,i)=>({id:segment+i,segment,title:segment,url:'https://example.com/'+segment+i,excerpt:'Evidence for this segment',kind:'public_source',status:'supported',collectedAt:new Date().toISOString(),method:'fixture'}))),insights:[]};
    const { digest }=await import('../src/lib/factory/engine'); synthetic.aiConsent={briefHash:digest(JSON.stringify(synthetic.brief)),dataClass:'PUBLIC',by:'producer',at:new Date().toISOString()};
    const prepared=prepareSynthesis(synthetic,'insights');
    assert.ok(segments.every(segment=>prepared.payload.sources.some(s=>s.segment===segment)),'every segment reaches synthesis');
    console.log('Video API: permissions, native input, metering, inaccessible video, stale context and balanced synthesis passed');
  } finally { globalThis.fetch=original; await rm(dir,{recursive:true,force:true}); }
}
void main().catch(e=>{ console.error(e); process.exitCode=1; });
