import assert from 'node:assert/strict';
import { createProject, transition } from '../src/lib/factory/engine';
import { segments } from '../src/lib/factory/model';
import { methodsFor } from '../src/lib/factory/research-methods';
import { planningInputKey, mediumCurrent } from '../src/lib/factory/planning-context';
import { prepareResearchPlanning, validateResearchProposal } from '../src/lib/factory/research-planner';
import { prepareMediumSelection, validateMediumSelection } from '../src/lib/factory/medium-selection';
const a={role:'operator' as const,subject:'p',workspaceId:'w'};
let p=createProject({business:'Shop',contact:'p@example.test',objective:'Purchases',workRequest:'campaign',requestedFormats:['static']},a,'p');
p=transition(p,{type:'authoriseAI',confirm:true},a);p.channels=['instagram'];
p.sources=[{id:'s',segment:'channel',title:'Audience research',url:'https://example.com',excerpt:'Audience uses visuals',kind:'public_source',status:'supported',collectedAt:'2026-11-01',method:'fixture'}];
p.insights=[{id:'i',title:'Visual evidence',interpretation:'Test visual explanation',sourceIds:['s'],status:'reviewed',confidence:'limited',createdAt:'2026-11-01'}];
const empty=prepareMediumSelection(p);
const initialPlanningKey = prepareResearchPlanning(p).inputKey;
p=transition(p,{type:'recordPerformance',campaign:'Pilot',channel:'instagram',format:'static',objective:'Purchases',audience:'UK',offer:'Repairable',start:'2026-10-01',end:'2026-10-31',provenance:'Account export',attribution:'7-day click',currency:'GBP',impressions:1000,clicks:50,spend:100,conversions:5,publicAuthorised:true},a);
assert.equal(prepareResearchPlanning(p).payload.historicalPerformance.length,0);
p=transition(p,{type:'reviewPerformance',revision:p.revision,id:p.performance![0].id,status:'accepted',reason:'Checked report and attribution'},a);
assert.notEqual(prepareResearchPlanning(p).inputKey, initialPlanningKey, "Accepted performance stales the research plan");
const context=prepareMediumSelection(p), id=p.performance![0].id;
assert.notEqual(context.inputHash,empty.inputHash);assert.notEqual(context.evidenceKey,empty.evidenceKey);
assert.equal(prepareResearchPlanning(p).payload.historicalPerformance[0].id,id);
const recommendation={channel:'instagram',format:'static',score:7,confidence:'limited',basis:'observed_performance',performanceIds:[id],reason:'Observed results inform a test; audience transfer remains uncertain',sourceIds:[],insightIds:[],counterargument:'Different offer or attribution could change the result',uncertainties:['No controlled comparison']};
const proposal={summary:'Test against a comparable baseline',recommendations:[recommendation],gaps:['Incremental outcomes unknown']};
assert.equal(validateMediumSelection(proposal,context).recommendations[0].performanceIds?.[0],id);
assert.throws(()=>validateMediumSelection({...proposal,recommendations:[{...recommendation,performanceIds:['invented']}]},context),/historical/i);
assert.throws(()=>validateMediumSelection({...proposal,recommendations:[{...recommendation,format:'video_short'}]},context),/historical/i);
assert.throws(()=>validateMediumSelection({...proposal,recommendations:[{...recommendation,performanceIds:[]}]},context),/citation/i);
p.performance![0].publicAuthorised=false;
assert.equal(prepareMediumSelection(p).payload.historicalPerformance.length,0);
assert.throws(()=>validateMediumSelection(proposal,prepareMediumSelection(p)),/historical/i);
console.log('Performance prompts, freshness and explicit historical citations passed');

const planning = prepareResearchPlanning(p);
// Restore an authorised observation for citation validation.
p.performance![0].publicAuthorised=true;
const citedContext=prepareResearchPlanning(p);
const basePlan = {summary:'Observe the supplied report and test transfer',unknowns:[],agents:[],mediumHypotheses:[],gaps:[],performanceIds:['not-available']};
assert.throws(()=>validateResearchProposal(basePlan,citedContext),/performance|historical/i);
void planning;

const validPlan = {...basePlan,performanceIds:[id],agents:segments.map(segment=>({segment,selected:['brand','customer'].includes(segment),reason:'Research a decision-relevant question',questions:['What evidence supports the offer?','What is uncertain for buyers?'],sourceTypes:['Primary sources'],methods:[methodsFor(segment)[0].id],avoid:[],maxPages:6}))};
assert.deepEqual(validateResearchProposal(validPlan,citedContext).performanceIds,[id]);
assert.throws(()=>validateResearchProposal({...validPlan,performanceIds:[]},citedContext),/historical|citation/i);
p.researchPlanning={enabled:true,status:'completed',version:1,inputKey:planningInputKey(p),history:[],proposal:{...validateResearchProposal(validPlan,citedContext),mediumHypotheses:[{channel:'instagram',format:'static',reason:'Earlier supplied performance informed this hypothesis',confidence:'limited',basis:'channel_prior'}]}};
assert.equal(prepareMediumSelection(p).payload.plannerHypotheses.length,1);
p=transition(p,{type:'reviewPerformance',revision:p.revision,id,status:'rejected',reason:'Export is unreliable'},a);
assert.equal(prepareMediumSelection(p).payload.plannerHypotheses.length,0,'Rejected observations cannot leak through stale hypotheses');
// A launched/approved direction keeps its execution gates; feedback informs a future campaign.
p.researchPlanning!.status='completed';p.researchPlanning!.inputKey=planningInputKey(p);
p.mediumSelection={status:'completed',version:1,evidenceKey:prepareMediumSelection(p).evidenceKey,history:[],proposal:{summary:'Approved medium assessment',recommendations:[],gaps:[]}};
p.strategies.push({id:'d',version:1,status:'approved',audience:'UK',message:'Offer',rationale:'Evidence',design:'Simple',channels:'Instagram',format:'static',cta:'Buy',evidenceIds:['s'],insightIds:['i'],hypothesis:'Test purchase interest',uncertainties:'Attribution limits',createdAt:'2026-11-01',hash:'direction'});
p=transition(p,{type:'reviewPerformance',revision:p.revision,id,status:'accepted',reason:'Corrected report for the next campaign'},a);
assert.equal(p.researchPlanning!.status,'completed','Feedback must not reopen locked direction planning');

assert.equal(mediumCurrent(p),true,'Post-direction result reports preserve the completed medium gate');
p.sources[0].excerpt='Changed source evidence';
assert.equal(mediumCurrent(p),false,'Freezing performance feedback must not bypass source-evidence freshness');
