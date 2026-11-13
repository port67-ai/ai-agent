import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import { classifyByRules, templateScope, validateScope, scopeFromClassification, scopeForCustomer, CATEGORY_LABEL } from '../src/lib/factory/scope';
import { prepareResearchPlan, researchDossier, renderDossierMarkdown } from '../src/lib/factory/research-plan';
import { createProject, digest } from '../src/lib/factory/engine';
import { scopeCurrent } from '../src/lib/factory/scope-run';
import { segments } from '../src/lib/factory/model';

// Pure: the same brief wording gives clearly different scopes for different kinds and sizes of business.
const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
const mk = (brief: Record<string, string>, channels: string[] = ['instagram']) => { const p = createProject({ objective: 'Grow enquiries this season', contact: 'a@example.com', ...brief } as never, op, 'p' + Math.random().toString(36).slice(2, 8)); p.channels = channels; return p; };
const florist = mk({ business: 'Rosie Blooms', description: 'Independent family-run florist in Bath selling bouquets and wedding flowers to local customers.', competitors: 'Bloom Direct' });
const telco = mk({ business: 'Northwave Telecom', description: 'National mobile and broadband operator selling connectivity and wholesale services to enterprises and businesses.' }, ['linkedin']);
const hotel = mk({ business: 'The Harbour Hotel', description: 'Boutique hotel and restaurant with 24 rooms in a small coastal town, popular with weekend guests.' });
const bank = mk({ business: 'Trustly Savings', description: 'A regional building society offering mortgages and savings accounts.' });
const thin = mk({ business: 'Brand', description: '' });
const cf = classifyByRules(florist.brief), ct = classifyByRules(telco.brief), ch = classifyByRules(hotel.brief);
assert.deepEqual([cf.category, cf.size, cf.reach, cf.audienceModel, cf.regulated], ['local_shop', 'small', 'local', 'b2c', false]);
assert.deepEqual([ct.category, ct.regulated, ct.audienceModel, ct.reach], ['telecom', true, 'b2b', 'national']);
assert.equal(ch.category, 'hospitality');
assert.equal(classifyByRules(bank.brief).category, 'regulated');
assert.equal(classifyByRules(thin.brief).category, 'other');
assert.equal(classifyByRules(thin.brief).confidence, 'limited');
const sf = templateScope(florist, { briefHash: 'h', version: 1 }), st = templateScope(telco, { briefHash: 'h', version: 1 }), sh = templateScope(hotel, { briefHash: 'h', version: 1 });
assert.equal(sf.source, 'template');
assert.match(sf.segments.brand.questions[0], /Rosie Blooms/);
assert.ok(sf.segments.customer.questions.some((q) => /Google/.test(q)), 'a florist is asked about local reviews');
assert.ok(sf.segments.competitor.questions[0].includes('Bloom Direct'), 'named competitors drive the competitor questions');
assert.ok(sf.segments.competitor.avoid.some((x) => /chains/i.test(x)), 'a florist does not research national chains');
assert.ok(st.segments.customer.questions.some((q) => /buying committee/.test(q)), 'a telecom operator is asked about the buying committee');
assert.ok(sh.segments.customer.questions.some((q) => /Tripadvisor/.test(q)));
for (const s of segments) assert.equal(sf.segments[s].questions.filter((q) => st.segments[s].questions.includes(q)).length, 0, 'no shared questions between florist and telco: ' + s);
assert.ok(sf.segments.brand.maxPages <= 8 && st.segments.brand.maxPages >= 14, 'page budget follows size and type');
assert.ok(sf.segments.creative.questions[0].includes('Instagram') && st.segments.creative.questions[0].includes('LinkedIn'), 'creative questions follow the launch channels');
const big = scopeFromClassification(florist, { ...cf, size: 'enterprise' });
assert.ok(big.segments.brand.maxPages >= 14, 'the same type at a larger size gets a larger budget');

// Validation is strict, for model output and for edits alike.
const good = { classification: st.classification, competitorSet: ['Acme Net', 'https://evil.example'], segments: st.segments };
const v = validateScope(good);
assert.deepEqual(v.competitorSet, ['Acme Net'], 'links are dropped from suggestions');
assert.throws(() => validateScope({ ...good, classification: { ...st.classification, category: 'spaceships' } }), /category/);
assert.throws(() => validateScope({ ...good, segments: { ...st.segments, brand: undefined } }), /brand is missing/);
assert.throws(() => validateScope({ ...good, segments: { ...st.segments, brand: { ...st.segments.brand, questions: ['see https://evil.example now', 'a'] } } }), /at least 2/);
assert.equal(validateScope({ ...good, segments: { ...st.segments, brand: { ...st.segments.brand, maxPages: 99 } } }).segments.brand.maxPages, 20);
assert.equal(validateScope({ ...good, segments: { ...st.segments, brand: { ...st.segments.brand, maxPages: 1 } } }).segments.brand.maxPages, 4);
const cust = scopeForCustomer({ ...st, provider: 'openai', model: 'm', runId: 'r', by: 'producer', note: 'internal' });
for (const k of ['provider', 'model', 'runId', 'by', 'note']) assert.ok(!(k in cust), 'customers never see ' + k);
// The stored scope feeds the plan and the dossier, and goes stale when the brief changes.
const planned = { ...florist, scope: sf };
const plan = prepareResearchPlan(planned);
assert.deepEqual(plan.segments.find((s) => s.segment === 'customer')!.questions, sf.segments.customer.questions);
assert.equal(plan.scope?.classification.category, 'local_shop');
assert.ok(plan.segments[0].maxPages && plan.segments[0].avoid);
assert.equal(prepareResearchPlan(florist).scope, undefined, 'no stored scope: the generic plan is unchanged');
const md = renderDossierMarkdown(researchDossier(planned, 'operator', '2026-11-13T10:00:00Z'));
assert.match(md, /Scoped as: Local shop or service \(Local shop or service; size small; reach local; audience b2c/);
assert.ok(CATEGORY_LABEL.telecom);
const hashed = { ...florist, scope: { ...sf, briefHash: digest(JSON.stringify(florist.brief)) } };
assert.equal(scopeCurrent(hashed), true);
assert.equal(scopeCurrent({ ...hashed, brief: { ...hashed.brief, objective: 'A different goal now' } }), false, 'a changed brief makes the stored scope stale');

async function main(){
const dir=await mkdtemp(join(tmpdir(),'port67-scope-'));Object.assign(process.env,{PORT67_DATA_DIR:dir,PORT67_SESSION_SECRET:'s'.repeat(48),PORT67_OPERATOR_PASSWORD:'p'.repeat(24),PORT67_FIREBASE_PROJECT_ID:'ai-agency-3671b',PORT67_ADMIN_UIDS:'owner',PORT67_OPERATOR_UIDS:'producer',PORT67_RESEARCH_ENABLED:'true',PORT67_SYNTHESIS_ENABLED:'true',PORT67_RESEARCH_MODEL:'test-research',PORT67_SYNTHESIS_MODEL:'test-drafting',PORT67_OPENAI_API_KEY:'test-only',PORT67_ANTHROPIC_API_KEY:'test-only',PORT67_DEEPSEEK_API_KEY:'test-only',PORT67_GEMINI_API_KEY:'test-only',PORT67_RESEARCH_PROVIDER:'openai',PORT67_AUTO_APPROVE_PRODUCER:'true'});
const {handleFactory}=await import('../src/lib/factory/service');
const verifier=async(uid:string)=>({uid,aud:'ai-agency-3671b',iss:'https://securetoken.google.com/ai-agency-3671b',email_verified:true,auth_time:Math.floor(Date.now()/1000)});const lookup=async(uid:string)=>({uid,emailVerified:true,disabled:false});let cookie='';
async function raw(path:string,data?:unknown){const r=await handleFactory(new Request('http://localhost:3000/api/factory/'+path,{method:data?'POST':'GET',headers:{cookie,origin:'http://localhost:3000',...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),path.split('/'),verifier,lookup);const set=r.headers.get('set-cookie');if(set){const pair=set.split(';')[0],name=pair.split('=')[0];cookie=cookie.split(';').filter(x=>x.trim()&&!x.trim().startsWith(name+'=')).concat(pair).join(';');}return r;}
async function req(path:string,data?:unknown){const r=await raw(path,data);assert.ok(r.ok,`${path}: ${r.status} ${r.ok?'':await r.text()}`);return r;}
async function login(uid:string){cookie='';await req('session');return(await(await req('identity-login',{idToken:uid})).json()).principal;}
const original=globalThis.fetch;let mode:'good'|'bad'='good';let scopeCalls=0;const researchInputs:{input:string;instructions:string}[]=[];let n=0;
const aiScope={classification:{category:'local_shop',businessType:'Independent florist',size:'small',reach:'local',audienceModel:'b2c',regulated:false,confidence:'moderate',rationale:'The brief says independent florist selling to local customers.'},competitorSet:[],segments:Object.fromEntries(segments.map((s)=>[s,{questions:[`Scoped question one for ${s}?`,`Scoped question two for ${s}?`,`Scoped question three for ${s}?`],sourceTypes:['Google reviews'],avoid:['National chains'],maxPages:6}]))};
globalThis.fetch=(async(_u:unknown,init?:{body?:string})=>{const b=JSON.parse(String(init?.body||'{}'));n++;
if(b.text?.format?.name==='port67_scope'){scopeCalls++;return Response.json({id:'scope-'+n,usage:{input_tokens:30,output_tokens:60},output:[{content:[{type:'output_text',text:mode==='good'?JSON.stringify(aiScope):'not a scope'}]}]});}
researchInputs.push({input:String(b.input),instructions:String(b.instructions)});
return Response.json({id:'r-'+n,usage:{input_tokens:40,output_tokens:20},output:[{type:'web_search_call'},{content:[{type:'output_text',text:'FINDING | A synthetic claim | https://example.com/s/'+n+' | quote\nCONFIDENCE | limited',annotations:[{type:'url_citation',url:'https://example.com/s/'+n,title:'Fixture source'}]}]}]});}) as typeof fetch;
try{
const customer=await login('customer');
async function createAndRun(brief:Record<string,string>){await login('customer');const created=(await(await req('projects',{objective:'Grow enquiries this season',contact:'fake@example.test',...brief})).json()).project;const route='projects/'+created.id;await req(route,{type:'setChannels',channels:['instagram']});await req(route,{type:'requestResearch'});
await login('producer');await req('accounts',{accountId:customer.accountId});
for(let i=0;i<80&&(await(await req(route)).json()).project.runs.filter((r:{stage:string;status:string})=>r.stage==='research'&&r.status!=='running').length<4;i++)await new Promise(r=>setTimeout(r,100));
return route;}
// 1. The scoping agent classifies, saves to the project, and the researchers use it.
const route=await createAndRun({business:'Rosie Blooms',description:'Independent family-run florist in Bath selling bouquets and wedding flowers to local customers.',website:'https://rosie.example'});
let view=await(await req(route+'/scope')).json();
assert.equal(view.stored,true);assert.equal(view.current,true);assert.equal(view.scope.source,'ai');assert.equal(view.scope.provider,'openai');assert.equal(view.scope.classification.businessType,'Independent florist');assert.equal(view.scope.version,1);assert.equal(scopeCalls,1,'one scoping call per brief, not one per researcher');
const research=researchInputs.filter((x)=>/pageBudget/.test(x.input));assert.equal(research.length,4,'all four researchers received the scope');
const brand=JSON.parse(research[0].input);assert.equal(brand.businessProfile.type,'Independent florist');assert.deepEqual(brand.researchQuestions,aiScope.segments.brand.questions);assert.deepEqual(brand.outOfScope,['National chains']);assert.equal(brand.pageBudget,6);assert.deepEqual(brand.preferredSources,['Google reviews']);assert.match(research[0].instructions,/scoping step/);
const full=(await(await req(route)).json()).project;
assert.equal(full.scope.classification.category,'local_shop');assert.equal(full.scopeHistory.length,1);assert.ok(full.runs.some((r:{stage:string;status:string})=>r.stage==='scope'&&r.status==='completed'));assert.ok(full.audit.some((x:{action:string})=>x.action==='scope_saved'));
// Customers can read the classification and the questions, never the model or the run.
await login('customer');const cv=await(await req(route+'/scope')).json();assert.equal(cv.scope.classification.businessType,'Independent florist');assert.ok(!('model' in cv.scope)&&!('provider' in cv.scope)&&!('runId' in cv.scope));assert.deepEqual(cv.history,[]);
assert.equal((await(await req(route)).json()).project.scope,undefined,'the project view for customers carries no scope record');
const denied=await raw(route+'/scope',{action:'classify'});assert.equal(denied.status,403,'customers cannot re-run or edit the scope');
// 2. The ledger and the admin map see the scoping agent and the stored classification.
await login('owner');const ov=await(await req('admin/ai-agents')).json();
assert.ok(ov.agents.some((a:{id:string;group:string})=>a.id==='scope:business'&&a.group==='scoping'));assert.ok(ov.flow.edges.some((e:{agent:string})=>e.agent==='scope:business'),'the scoping call is metered and attributed');
assert.equal(ov.flow.pipeline.scopes.classified,1);assert.equal(ov.flow.pipeline.scopes.ai,1);assert.equal(ov.flow.pipeline.scopes.byCategory.local_shop,1);assert.equal(ov.flow.scopes[0].businessType,'Independent florist');assert.equal(ov.flow.scopes[0].current,true);
// 3. A producer can edit it; invalid edits are refused; the edit is versioned and used from then on.
await login('producer');await req('accounts',{accountId:customer.accountId});
const edited={classification:{...view.scope.classification,businessType:'Wedding florist'},competitorSet:[],segments:view.scope.segments};
const saved=await(await req(route+'/scope',{action:'save',scope:edited})).json();assert.equal(saved.scope.source,'manual');assert.equal(saved.scope.version,2);assert.equal(saved.scope.by,'producer');assert.equal(saved.scope.classification.businessType,'Wedding florist');
const bad=await raw(route+'/scope',{action:'save',scope:{...edited,segments:{...edited.segments,brand:{...edited.segments.brand,questions:['only https://x.example']}}}});assert.equal(bad.status,400);
view=await(await req(route+'/scope')).json();assert.equal(view.scope.version,2);assert.deepEqual(view.history.map((h:{version:number})=>h.version),[1,2]);
const re=await(await req(route+'/scope',{action:'classify'})).json();assert.equal(re.scope.version,3);assert.equal(re.scope.source,'ai');assert.equal(scopeCalls,2,'classify again runs the agent');
// 4. If the agent returns nothing usable the free template is saved instead and research still ran.
mode='bad';const before=scopeCalls;
const route2=await createAndRun({business:'Northwave Telecom',description:'National mobile and broadband operator selling connectivity to enterprises and businesses.'});
const v2=await(await req(route2+'/scope')).json();assert.equal(scopeCalls,before+1);assert.equal(v2.scope.source,'template');assert.equal(v2.scope.classification.category,'telecom');assert.match(v2.scope.note,/did not return a usable scope/);
const p2=(await(await req(route2)).json()).project;assert.equal(p2.runs.filter((r:{stage:string;status:string})=>r.stage==='research'&&r.status==='completed').length,4,'research never waits on the scoping agent');assert.ok(p2.runs.some((r:{stage:string;status:string})=>r.stage==='scope'&&r.status==='failed'));
// 5. Switched off: no scoping call, template scope with the reason.
process.env.PORT67_SCOPING_ENABLED='false';mode='good';const before3=scopeCalls;
const route3=await createAndRun({business:'The Harbour Hotel',description:'Boutique hotel and restaurant with 24 rooms in a small coastal town.'});
const v3=await(await req(route3+'/scope')).json();assert.equal(scopeCalls,before3);assert.equal(v3.scope.source,'template');assert.equal(v3.scope.classification.category,'hospitality');assert.match(v3.scope.note,/switched off/);
delete process.env.PORT67_SCOPING_ENABLED;
console.log('Business scope: classification by type and size, strict validation, stored on the project, used by every researcher, metered, editable, versioned, template fallback');
}finally{globalThis.fetch=original;delete process.env.PORT67_AUTO_APPROVE_PRODUCER;await rm(dir,{recursive:true,force:true});}
}void main();
