import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject,transition } from '../src/lib/factory/engine';
import { LocalRepository } from '../src/lib/factory/repository';
import { runResearchPlanning } from '../src/lib/factory/planning-run';
import { segments } from '../src/lib/factory/model';
import { methodsFor } from '../src/lib/factory/research-methods';
async function main(){
 const dir=await mkdtemp(join(tmpdir(),'performance-run-'));const original=globalThis.fetch;
 try{
 Object.assign(process.env,{PORT67_SYNTHESIS_ENABLED:'true',PORT67_SYNTHESIS_PROVIDER:'openai',PORT67_SYNTHESIS_MODEL:'fixture',PORT67_OPENAI_API_KEY:'fixture-only'});
 const repo=new LocalRepository(dir),a={subject:'p',role:'operator' as const,workspaceId:'w'};
 let p=createProject({business:'Shop',contact:'p@example.test',objective:'Sales',workRequest:'campaign',useAIPlanner:true},a,'p');
 p=transition(p,{type:'setChannels',channels:['instagram']},a);p=transition(p,{type:'authoriseAI',confirm:true},a);
 p=transition(p,{type:'recordPerformance',campaign:'Pilot',channel:'instagram',format:'static',objective:'Sales',audience:'UK',offer:'Product',start:'2026-10-01',end:'2026-10-31',provenance:'Export',attribution:'7 day click',currency:'GBP',clicks:10,publicAuthorised:true},a);
 p=transition(p,{type:'reviewPerformance',id:p.performance![0].id,revision:p.revision,status:'accepted',reason:'Report checked'},a);
 await repo.mutate('w',db=>{db.projects.push(p);});
 let calls=0;
 globalThis.fetch=async(_url,init)=>{
 calls++;const input=JSON.parse(JSON.parse(String(init?.body)).input);assert.equal(input.historicalPerformance.length,1);
 await repo.mutate('w',db=>{db.projects[0]=transition(db.projects[0],{type:'reviewPerformance',id:p.performance![0].id,revision:db.projects[0].revision,status:'rejected',reason:'Discovered reporting fault'},a);});
 const value={summary:'Test transfer with attribution limitations',performanceIds:[p.performance![0].id],unknowns:['Incremental effect unknown'],agents:segments.map(segment=>({segment,selected:['brand','customer'].includes(segment),reason:'Decision-relevant research',questions:['What supports the offer?','Which objections matter?'],methods:[methodsFor(segment)[0].id],sourceTypes:['Primary sources'],avoid:[],maxPages:6})),mediumHypotheses:[],gaps:[]};
 return new Response(JSON.stringify({id:'fixture',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:50,output_tokens:60}}),{status:200,headers:{'content-type':'application/json'}});
 };
 await assert.rejects(()=>runResearchPlanning(repo,a,'p'),/stale|changed/i);
 const saved=(await repo.read('w')).projects[0];assert.equal(calls,1);assert.equal(saved.runs[0].status,'failed');assert.equal(saved.runs[0].usage?.input_tokens,50);assert.equal(saved.performance![0].status,'rejected');assert.equal(saved.researchPlanning?.proposal,undefined);
 console.log('Concurrent feedback rejection discards stale paid planner output and retains usage');
 }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
}
void main();
