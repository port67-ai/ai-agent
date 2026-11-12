import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {LocalRepository} from '../src/lib/factory/repository';
import {reserveApiCall,finishApiCall,adminCostReport,archiveApiCalls,reconcileApiCall,MAX_LEDGER_CALLS} from '../src/lib/factory/costs';
async function main(){const dir=await mkdtemp(join(tmpdir(),'port67-archive-'));const repo=new LocalRepository(dir);const input={accountId:'acct_a',workspaceId:'acct_a',projectId:'p',runId:'run',stage:'research',provider:'test',model:'test',actor:'owner'};
const first=await reserveApiCall(repo,input);await assert.rejects(()=>archiveApiCalls(repo,'owner'),/in flight/);await finishApiCall(repo,first,{status:'failed'});
for(let i=1;i<MAX_LEDGER_CALLS;i++){const id=await reserveApiCall(repo,{...input,runId:'run'+i});await finishApiCall(repo,id,{status:'completed',usage:{inputTokens:1,outputTokens:1}});}
await assert.rejects(()=>reserveApiCall(repo,input),/capacity/);await archiveApiCalls(repo,'owner');assert.equal((await adminCostReport(repo)).summary.callCount,MAX_LEDGER_CALLS);
await reconcileApiCall(repo,first,{actualMicroUsd:1,reference:'invoice',actor:'owner'});assert.equal((await adminCostReport(repo)).summary.actualMicroUsd,1);
await reserveApiCall(repo,input);assert.equal((await adminCostReport(repo)).summary.callCount,MAX_LEDGER_CALLS+1);await rm(dir,{recursive:true,force:true});console.log('Durable cost archive recovery preserves history and reconciliation');}
void main();
