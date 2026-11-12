import { reserveApiCall, finishApiCall, normalizeApiUsage } from './costs';
import type { Principal, Project, ResearchRun } from './model';
import type { Repository } from './repository';
type Result={usage:Record<string,number>;rawUsage?:unknown;providerRequestId?:string;error?:string};
// All managed model calls pass here. Reservations fail closed; no automatic retry.
export async function meteredModelCall<T extends Result>(repo:Repository,a:Principal,p:Project,run:ResearchRun,invoke:()=>Promise<T>):Promise<T> {
 if(a.demo) throw new Error('Paid model calls are disabled in demo');
 const callId=await reserveApiCall(repo,{accountId:p.accountId||p.workspaceId,workspaceId:p.workspaceId,projectId:p.id,runId:run.id,stage:run.stage||'research',provider:run.provider,model:run.model,actor:a.subject});
 let result:T;
 try { result=await invoke(); }
 catch(error) { await finishApiCall(repo,callId,{status:'unknown'}); throw error; }
 await finishApiCall(repo,callId,{status:result.error?'failed':'completed',usage:normalizeApiUsage(result.usage),rawUsage:result.rawUsage && typeof result.rawUsage === "object" && !Array.isArray(result.rawUsage) ? result.rawUsage as Record<string,unknown> : undefined,providerRequestId:result.providerRequestId});
 return result;
}
