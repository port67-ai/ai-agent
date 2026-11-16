import assert from 'node:assert/strict';
import { segments } from '../src/lib/factory/model';
import { createProject } from '../src/lib/factory/engine';
import { prepareResearchPlan } from '../src/lib/factory/research-plan';
import { templateScope } from '../src/lib/factory/scope';

const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const p = createProject({ business: 'Coast Lodge', objective: 'More direct bookings', description: 'Independent hotel serving weekend travellers.', website: 'https://coast.example', contact: 'a@example.com' }, op, 'p');
p.channels = ['instagram'];
assert.deepEqual([...segments], ['brand','customer','competitor','creative','adjacent','trends','video','channel','offer','measurement']);
const scope = templateScope(p, { briefHash: 'test', version: 1 });
for (const s of ['adjacent','trends','video'] as const) {
  assert.ok(scope.segments[s].questions.length >= 2);
  assert.ok(prepareResearchPlan(p).segments.some(x => x.segment === s));
}
assert.match(scope.segments.video.questions.join(' '), /lighting/i);
assert.match(scope.segments.trends.questions.join(' '), /date|recent|days/i);
console.log('Research intelligence: seven scoped roles passed');

async function videoTests() {
  const { youtubeVideoUrl, validateVideoAnalysis } = await import('../src/lib/factory/video-intelligence');
  assert.equal(youtubeVideoUrl('https://youtu.be/abcdefghijk'), 'https://www.youtube.com/watch?v=abcdefghijk');
  for (const url of ['https://youtube.com.evil.test/watch?v=abcdefghijk', 'http://127.0.0.1/a', 'https://youtube.com/playlist?list=x', 'https://user:pass@youtube.com/watch?v=abcdefghijk']) assert.throws(() => youtubeVideoUrl(url));
  assert.throws(() => validateVideoAnalysis({ accessible: false }), /access|view/i);
  const analysis = { accessible: true, durationSeconds: 20, style: 'Documentary', lighting: 'Soft window light', motion: 'Slow push-in', graphics: 'Large captions', pacing: 'Two cuts in opening', audio: 'Voice over ambient sound', hook: 'Product in use', adaptation: 'Test an original demonstration', limitations: 'No conversion data; subjective interpretation', shots: [{ atSeconds: 0, observation: 'Close-up of hands using product' }] };
  assert.equal(validateVideoAnalysis(analysis).basis, 'direct_video');
  assert.throws(() => validateVideoAnalysis({ ...analysis, shots: [{ atSeconds: 22, observation: 'after end' }] }), /time|duration/i);
  console.log('Video provenance and URL validation passed');
}

async function legacyTests() {
  const { planNext } = await import('../src/lib/factory/producer-agent');
  const old = structuredClone(p);
  for (const segment of ['brand','customer','competitor','creative'] as const) {
    old.runs.push({ id: 'old-'+segment, stage:'research', segment, status:'completed', at:'2026-11-14T00:00:00Z', provider:'fixture', model:'fixture' });
    old.sources.push({id:'old-'+segment,segment,title:'Prior reviewed source',url:'https://example.com/'+segment,excerpt:'Prior reviewed evidence on the original campaign.',kind:'public_source',status:'supported',collectedAt:'2026-11-14T00:00:00Z',method:'manual'});
  }
  assert.deepEqual(planNext(old,true),{step:'draftInsights'},'legacy four-role campaigns can continue without forced paid reruns');
  old.scope=scope;
  assert.match((planNext({...old,reviews:[{id:'review',at:'',gate:'scope',subject:'v1',by:'rules',verdict:'pass',summary:'pass',items:[]}]},true) as {stop:{reason:string}}).stop.reason,/adjacent/,'new seven-role scope requires the new research');
  console.log('Legacy campaigns retain their existing research coverage');
}

async function legacyScopeTests() {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { LocalRepository } = await import('../src/lib/factory/repository');
  const { ensureScope } = await import('../src/lib/factory/scope-run');
  const { scopeHash } = await import('../src/lib/factory/engine');
  const old = structuredClone(p);
  old.scope = templateScope(old, { briefHash: scopeHash(old), version: 4 });
  old.scope.source = 'manual';
  old.scope.segments.brand.questions = ['Preserve the producer custom brand question?', 'Preserve the approved custom geography?'];
  for (const key of ['adjacent','trends','video']) Reflect.deleteProperty(old.scope.segments,key);
  const dir=await mkdtemp(join(tmpdir(),'port67-legacy-scope-'));
  const previous=process.env.PORT67_SCOPING_ENABLED;
  process.env.PORT67_SCOPING_ENABLED='false';
  try {
    const repo=new LocalRepository(dir);
    await repo.mutate('w',db=>{db.projects.push(old);});
    const retained=await ensureScope(repo,op,old.id);
    assert.equal(retained.version,4,'ordinary legacy retry must not replace or expand the scope');
    assert.deepEqual(retained.segments.brand.questions,old.scope.segments.brand.questions,'manual scope questions survive');
    assert.equal(retained.segments.adjacent,undefined,'only explicit reclassification opts into expanded research');
  } finally { if(previous===undefined) delete process.env.PORT67_SCOPING_ENABLED; else process.env.PORT67_SCOPING_ENABLED=previous; await rm(dir,{recursive:true,force:true}); }
  console.log('Legacy manual scopes survive ordinary research retries');
}

async function videoCitationTests() {
  const { researchSegment } = await import('../src/lib/factory/research');
  const original=globalThis.fetch;
  const previous=process.env.PORT67_RESEARCH_ENABLED;
  process.env.PORT67_RESEARCH_ENABLED='true';
  globalThis.fetch=(async()=>Response.json({id:'different-video',usage:{input_tokens:1,output_tokens:1},output:[{content:[{type:'output_text',text:'FINDING | A claim about video A | https://www.youtube.com/watch?v=aaaaaaaaaaa | Claim about A',annotations:[{type:'url_citation',url:'https://www.youtube.com/watch?v=bbbbbbbbbbb',title:'Video B'}]}]}]})) as typeof fetch;
  try {
    const result=await researchSegment(p,'video',{provider:'openai',model:'fixture',key:'test-only'});
    assert.equal(result.sources.length,0,'a citation to video B cannot substantiate a finding about video A');
  } finally { globalThis.fetch=original;if(previous===undefined)delete process.env.PORT67_RESEARCH_ENABLED;else process.env.PORT67_RESEARCH_ENABLED=previous; }
  console.log('Different video IDs cannot corroborate each other');
}

async function main() { await videoTests(); await legacyTests(); await legacyScopeTests(); await videoCitationTests(); }
void main().catch(e=>{console.error(e);process.exitCode=1;});
