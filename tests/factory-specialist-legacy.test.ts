import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRepository } from '../src/lib/factory/repository';
import { createProject,transition } from '../src/lib/factory/engine';
import { planningInputKey } from '../src/lib/factory/planning-context';
import { ensureScope } from '../src/lib/factory/scope-run';
import { methodsFor } from '../src/lib/factory/research-methods';
import { segments } from '../src/lib/factory/model';
async function main(){const dir=await mkdtemp(join(tmpdir(),'legacy-specialist-'));try{
 const repo=new LocalRepository(dir),a={subject:'p',workspaceId:'w',role:'operator' as const};
 let p=createProject({business:'Shop',contact:'p@example.test',objective:'Sales',workRequest:'campaign',useAIPlanner:true},a,'p');p=transition(p,{type:'authoriseAI',confirm:true},a);p.channels=['instagram'];
 p.researchPlanning={enabled:true,status:'completed',version:1,inputKey:planningInputKey(p),history:[],proposal:{summary:'Old seven-role proposal',unknowns:[],agents:segments.slice(0,7).map(segment=>({segment,selected:['brand','customer'].includes(segment),reason:'Existing scope',questions:['What supports the offer?','Which objections matter?'],sourceTypes:['Public sources'],methods:[methodsFor(segment)[0].id],avoid:[],maxPages:6})),mediumHypotheses:[],gaps:[]}};
 await repo.mutate('w',db=>{db.projects.push(p);});const scope=await ensureScope(repo,a,'p');assert.equal(scope.planningVersion,1);assert.equal(scope.segments.brand.questions[0],'What supports the offer?');console.log('Persisted seven-role plan scoping compatibility passed');
 }finally{await rm(dir,{recursive:true,force:true});}}
void main();
