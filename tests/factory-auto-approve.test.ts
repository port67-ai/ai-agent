import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
async function main(){
const dir=await mkdtemp(join(tmpdir(),'port67-campaign-'));Object.assign(process.env,{PORT67_DATA_DIR:dir,PORT67_SESSION_SECRET:'s'.repeat(48),PORT67_OPERATOR_PASSWORD:'p'.repeat(24),PORT67_FIREBASE_PROJECT_ID:'ai-agency-3671b',PORT67_ADMIN_UIDS:'owner',PORT67_OPERATOR_UIDS:'producer',PORT67_RESEARCH_ENABLED:'true',PORT67_SYNTHESIS_ENABLED:'true',PORT67_RESEARCH_MODEL:'test-research',PORT67_SYNTHESIS_MODEL:'test-drafting',PORT67_OPENAI_API_KEY:'test-only',PORT67_ANTHROPIC_API_KEY:'test-only',PORT67_DEEPSEEK_API_KEY:'test-only',PORT67_GEMINI_API_KEY:'test-only'});
const {handleFactory}=await import('../src/lib/factory/service');
const verifier=async(uid:string)=>({uid,aud:'ai-agency-3671b',iss:'https://securetoken.google.com/ai-agency-3671b',email_verified:true,auth_time:Math.floor(Date.now()/1000)});const lookup=async(uid:string)=>({uid,emailVerified:true,disabled:false});let cookie='';
async function req(path:string,data?:unknown){const r=await handleFactory(new Request('http://localhost:3000/api/factory/'+path,{method:data?'POST':'GET',headers:{cookie,origin:'http://localhost:3000',...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),path.split('/'),verifier,lookup);const set=r.headers.get('set-cookie');if(set){const pair=set.split(';')[0],name=pair.split('=')[0];cookie=cookie.split(';').filter(x=>x.trim()&&!x.trim().startsWith(name+'=')).concat(pair).join(';');}assert.ok(r.ok,`${path}: ${r.status} ${r.ok?'':await r.text()}`);return r;}
async function login(uid:string){cookie='';await req('session');return(await(await req('identity-login',{idToken:uid})).json()).principal;}
const customer=await login('customer');const created=(await(await req('projects',{business:'Synthetic integration fixture',objective:'Explain a useful everyday product',contact:'fake@example.test'})).json()).project;const route='projects/'+created.id;await login('producer');await req('accounts',{accountId:customer.accountId});
async function project(){return(await(await req(route)).json()).project;}
async function command(data:Record<string,unknown>){return(await(await req(route,data)).json()).project;}
const original=globalThis.fetch;let calls=0;process.env.PORT67_RESEARCH_PROVIDER='openai';
globalThis.fetch=(async()=>{calls++;const usage={input_tokens:40,output_tokens:20};
return Response.json({id:'auto-'+calls,usage,output:[{type:'web_search_call'},{content:[{type:'output_text',text:'FINDING | A synthetic claim | https://example.com/auto/'+calls+' | quote\nCONFIDENCE | limited',annotations:[{type:'url_citation',url:'https://example.com/auto/'+calls,title:'Fixture source'}]}]}]});}) as typeof fetch;
try{
await command({type:'setChannels',channels:['instagram']});
// Switch off: a request only queues, nothing runs and no consent is given.
let p=await command({type:'requestResearch'});await new Promise(r=>setTimeout(r,300));p=await project();
assert.ok(p.researchRequest);assert.equal(p.runs.length,0);assert.equal(calls,0);
// Switch on: the next request authorises public data and runs all four researchers without a producer.
process.env.PORT67_AUTO_APPROVE_PRODUCER='true';
await project();// self-healing: merely viewing the project starts a request made before the switch was on
for(let i=0;i<60&&(await project()).runs.filter((r:{status:string})=>r.status==='completed').length<4;i++)await new Promise(r=>setTimeout(r,100));
p=await project();
assert.equal(p.runs.filter((r:{status:string})=>r.status==='completed').length,4,'four researchers ran');
assert.deepEqual(new Set(p.runs.map((r:{segment:string})=>r.segment)),new Set(['brand','customer','competitor','creative']));
assert.equal(calls,4);assert.ok(p.sources.length>=4);
assert.ok(p.sources.every((s:{status:string})=>s.status==='unreviewed'),'source review stays a human gate');
await login('producer');await req('accounts',{accountId:customer.accountId});
const full=await project();assert.ok(full.audit.some((x:{action:string;actor:string})=>x.action==='producer_step_auto_approved'&&x.actor==='port67-auto-approve'));
// A second request does not run research again.
await login('customer');await command({type:'requestResearch'});await new Promise(r=>setTimeout(r,300));assert.equal(calls,4);
const plan=await(await req(route+'/research-plan')).json();assert.equal(plan.plan.segments.length,4);assert.ok(plan.plan.checks.length>=8);
const doss=await(await req(route+'/research-dossier')).json();assert.equal(doss.dossier.totals.unreviewed,0,'customer dossier hides unreviewed sources');assert.match(doss.markdown,/# Research dossier/);
await login('producer');await req('accounts',{accountId:customer.accountId});const pd=await(await req(route+'/research-dossier')).json();assert.ok(pd.dossier.totals.unreviewed>=4,'producer dossier shows every source');
// Not ready: the reason is recorded, shown to the producer, and customers see a neutral line.
await login('customer');process.env.PORT67_RESEARCH_ENABLED='false';
const two=(await(await req('projects',{business:'Second fixture',objective:'Explain a useful everyday product',contact:'fake@example.test'})).json()).project;
const r2='projects/'+two.id;
await req(r2,{type:'setChannels',channels:['instagram']});await req(r2,{type:'requestResearch'});await new Promise(r=>setTimeout(r,400));
const asCustomer=(await(await req(r2)).json()).project;assert.equal(asCustomer.runs.length,0);assert.match(asCustomer.researchNote,/setting up your research/);assert.ok(!/PORT67_/.test(asCustomer.researchNote),'customers never see configuration names');
await login('producer');await req('accounts',{accountId:customer.accountId});
const asProducer=(await(await req(r2)).json()).project;assert.match(asProducer.researchNote,/Automatic start could not run: research is not ready/);
process.env.PORT67_RESEARCH_ENABLED='true';
await login('owner');const overview=await(await req('admin/ai-agents')).json();assert.equal(overview.switches.autoApproveProducer,true);assert.ok(overview.flow.pipeline.sources.total>=4&&overview.flow.edges.some((e:{agent:string})=>e.agent==='research:brand'),'flow observability sees the ledger and the project');assert.equal(overview.flow.pipeline.waiting.sourceReview,1,'unreviewed sources show as blocked at gate 1');
console.log('Auto-approved producer step: off by default, customer request runs four researchers, sources stay unreviewed, audited, not repeated');
}finally{globalThis.fetch=original;delete process.env.PORT67_AUTO_APPROVE_PRODUCER;await rm(dir,{recursive:true,force:true});}
}void main();
