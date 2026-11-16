import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
async function main(){
 const directory=await mkdtemp(join(tmpdir(),'factory-performance-'));
 Object.assign(process.env,{PORT67_DATA_DIR:directory,PORT67_SESSION_SECRET:'s'.repeat(48),PORT67_OPERATOR_PASSWORD:'p'.repeat(24),PORT67_FIREBASE_PROJECT_ID:'ai-agency-3671b',PORT67_OPERATOR_UIDS:'producer',PORT67_RESEARCH_ENABLED:'false',PORT67_PRODUCER_AGENT:'false',PORT67_AUTO_APPROVE_PRODUCER:'false'});
 const {handleFactory}=await import('../src/lib/factory/service');
 const verifier=async(uid:string)=>({uid,aud:'ai-agency-3671b',iss:'https://securetoken.google.com/ai-agency-3671b',email_verified:true,auth_time:Math.floor(Date.now()/1000)});
 const lookup=async(uid:string)=>({uid,emailVerified:true,disabled:false});let cookie='';
 const req=async(path:string,data?:unknown)=>{const r=await handleFactory(new Request('http://localhost:3000/api/factory/'+path,{method:data?'POST':'GET',headers:{origin:'http://localhost:3000',cookie,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),path.split('/'),verifier,lookup);const set=r.headers.get('set-cookie');if(set){const pair=set.split(';')[0],name=pair.split('=')[0];cookie=cookie.split(';').filter(x=>x.trim()&&!x.trim().startsWith(name+'=')).concat(pair).join(';');}return r;};
 const login=async(uid:string)=>{cookie='';await req('session');return(await(await req('identity-login',{idToken:uid})).json()).principal;};
 try{
 const customer=await login('customer');
 const create=async()=>{const r=await req('projects',{business:'Shop',objective:'Purchases',contact:'c@example.test'});assert.equal(r.status,201);return(await r.json()).project;};
 const source=await create(),target=await create();
 assert.equal((await req('projects/'+target.id+'/performance-history',{sourceProjectId:source.id})).status,403);
 await login('producer');await req('accounts',{accountId:customer.accountId});
 const path='projects/'+source.id;
 let r=await req(path,{type:'recordPerformance',campaign:'Launch',channel:'instagram',format:'static',objective:'Purchases',audience:'UK',offer:'Product',start:'2026-10-01',end:'2026-10-31',provenance:'Account report',attribution:'7-day click',currency:'GBP',clicks:50,spend:100,publicAuthorised:true});assert.equal(r.status,200);let p=(await r.json()).project;
 assert.equal((await req('projects/'+target.id+'/performance-history',{sourceProjectId:source.id})).status,400);
 r=await req(path,{type:'reviewPerformance',id:p.performance[0].id,status:'accepted',reason:'Checked report',revision:p.revision});assert.equal(r.status,200);
 r=await req('projects/'+target.id+'/performance-history',{sourceProjectId:source.id});assert.equal(r.status,200);p=(await r.json()).project;assert.equal(p.performance.length,1);assert.equal(p.performance[0].status,'pending');assert.match(p.performance[0].provenance,/Carried from project/);
 assert.equal((await req('projects/'+target.id+'/performance-history',{sourceProjectId:source.id})).status,400,'Repeated carry must not duplicate observations');
 assert.equal((await req('projects/'+target.id+'/performance-history',{sourceProjectId:'other-account-project'})).status,403);
 await login('customer');r=await req('projects/'+target.id);assert.equal((await r.json()).project.performance,undefined);
 console.log('Performance API: producer-only entry/carry, reviewed source selection and customer privacy passed');
 }finally{await rm(directory,{recursive:true,force:true});}
}
void main();
