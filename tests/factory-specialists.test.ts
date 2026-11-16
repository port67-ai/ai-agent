import assert from 'node:assert/strict';
import { segments } from '../src/lib/factory/model';
import { methodsFor } from '../src/lib/factory/research-methods';
import { selectedResearch } from '../src/lib/factory/task-plan';
for (const role of ['channel','offer','measurement']) {
 assert.ok((segments as readonly string[]).includes(role), `Missing specialist ${role}`);
 assert.ok(methodsFor(role as typeof segments[number]).length);
}
assert.equal(selectedResearch({}).length, 7, 'Legacy work does not silently expand');
console.log('Specialist catalogue tests passed');
// A model can commission channel behaviour alone without firing the other new specialists.
import { createProject,transition } from '../src/lib/factory/engine';
import { prepareResearchPlanning,validateResearchProposal } from '../src/lib/factory/research-planner';
import { planningInputKey } from '../src/lib/factory/planning-context';
import { planProject } from '../src/lib/factory/task-plan';
const a={role:'operator' as const,subject:'p',workspaceId:'w'};
let p=createProject({business:'Shop',contact:'p@example.test',objective:'Research audience channel behaviour',workRequest:'research',useAIPlanner:true},a,'p');
p=transition(p,{type:'setChannels',channels:['linkedin']},a);p=transition(p,{type:'authoriseAI',confirm:true},a);
const proposal=validateResearchProposal({summary:'Investigate channel audience behaviour',unknowns:[],agents:segments.map(segment=>({segment,selected:['brand','customer','channel'].includes(segment),reason:'Only decision-relevant evidence is commissioned',questions:['What dated evidence supports suitability?','Which counterexamples limit transfer?'],methods:[methodsFor(segment)[0].id],sourceTypes:['Primary sources'],avoid:[],maxPages:6})),mediumHypotheses:[],gaps:[]},prepareResearchPlanning(p));
p.researchPlanning={enabled:true,status:'completed',version:1,history:[],inputKey:planningInputKey(p),proposal};planProject(p,a.subject,'Validated selective specialists');
assert.deepEqual(p.taskPlan!.research,['brand','customer','channel']);
assert.equal(p.taskPlan!.tasks.find(t=>t.id==='research:offer')?.status,'skipped');
assert.equal(p.taskPlan!.tasks.find(t=>t.id==='research:measurement')?.status,'skipped');
assert.ok(!p.taskPlan!.tasks.some(t=>t.id==='draftDirection'));
