import { randomUUID } from 'node:crypto';
import type { Repository } from './repository';
import { assertWithinBudget, budgetConfig, budgetStatus } from './budget';
export const ADMIN_LEDGER_NAMESPACE = 'factory-admin-ledger';
export const MAX_LEDGER_CALLS = 150;
export type ApiUsage = { inputTokens: number; outputTokens: number; cachedInputTokens?: number; cacheCreationInputTokens?: number; toolCalls?: number; toolUsageUnknown?: boolean };
export type Pricing = { updatedAt: string; inputPerMillion: number; outputPerMillion: number; cachedInputPerMillion?: number; cacheCreationPerMillion?: number; toolPerCall?: number };
export type ApiCallInput = { accountId: string; workspaceId: string; projectId: string; runId: string; stage: string; provider: string; model: string; actor: string };
export type ApiCall = ApiCallInput & { id: string; createdAt: string; finishedAt?: string; status: 'reserved'|'completed'|'failed'|'unknown'; usage?: ApiUsage; rawUsage?: Record<string, number>; providerRequestId?: string; pricing?: Pricing; estimatedMicroUsd?: number; reconciliation?: {actualMicroUsd: number; reference: string; actor: string; at: string} };
type Ledger = { apiCalls?: ApiCall[]; ledgerArchives?: string[] };
function text(value: string) { if(typeof value !== 'string' || !value.trim() || value.length>200) throw new Error('Invalid ledger metadata'); return value; }
function integer(n: number) { if(!Number.isSafeInteger(n)||n<0) throw new Error('Expected non-negative integer'); return n; }
export const AI_ROUTING_NAMESPACE = 'factory-ai-routing';
/** Validate and copy a price entry. Shared by the environment price list and the admin AI models page. */
export function normalizePricing(p: Pricing): Pricing {
  if(!p || typeof p!=='object') throw new Error('Invalid pricing');
  if(typeof p.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(p.updatedAt) || !Number.isFinite(Date.parse(p.updatedAt)) || new Date(p.updatedAt).toISOString().slice(0,10)!==p.updatedAt.slice(0,10)) throw new Error('Pricing needs a version date');
  for(const key of ['inputPerMillion','outputPerMillion','cachedInputPerMillion','cacheCreationPerMillion','toolPerCall'] as const) {
    const n=p[key]; if(n===undefined && (key==='cachedInputPerMillion'||key==='cacheCreationPerMillion'||key==='toolPerCall')) continue;
    if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000||!Number.isSafeInteger(Math.round(n*1e6))||Math.abs(n*1e6-Math.round(n*1e6))>0.00001) throw new Error('Invalid pricing precision');
  }
  return {updatedAt:p.updatedAt,inputPerMillion:p.inputPerMillion,outputPerMillion:p.outputPerMillion,...(p.cachedInputPerMillion===undefined?{}:{cachedInputPerMillion:p.cachedInputPerMillion}),...(p.cacheCreationPerMillion===undefined?{}:{cacheCreationPerMillion:p.cacheCreationPerMillion}),...(p.toolPerCall===undefined?{}:{toolPerCall:p.toolPerCall})};
}
/** Admin-entered price first, then the environment price list. Absent means unknown cost, never free. */
export function pricingFor(provider: string, model: string, admin?: Record<string, Pricing>): Pricing|undefined {
  const key=`${provider}:${model}`;
  if(admin && Object.hasOwn(admin,key)) return normalizePricing(admin[key]);
  const config=process.env.PORT67_MODEL_PRICING_JSON;
  if(!config) return;
  const p=JSON.parse(config)[key] as Pricing|undefined;
  if(!p) return;
  return normalizePricing(p);
}
export async function reserveApiCall(repo: Repository, input: ApiCallInput): Promise<string> {
  const metadata = Object.fromEntries(['accountId','workspaceId','projectId','runId','stage','provider','model','actor'].map(k=>[k,text(input[k as keyof ApiCallInput])])) as ApiCallInput;
  let adminPricing: Record<string, Pricing>|undefined;
  try { adminPricing=(await repo.read(AI_ROUTING_NAMESPACE)).aiRouting?.pricing; } catch { /* unreadable prices mean unknown cost, which the cap holds at its call hold */ }
  const pricing=pricingFor(metadata.provider,metadata.model,adminPricing);
  // Invalid cap settings throw here, before any reservation, so a typo blocks paid calls rather than lifting the cap.
  const budget=budgetConfig();
  // Archived batches are immutable history. Their ids are re-checked inside the mutation so archiving cannot hide spend.
  const archiveIds=(await ledgerNamespaces(repo)).slice(1);
  const archived=(await Promise.all(archiveIds.map(async id=>{const db=await repo.read(id) as Ledger; if(!db.apiCalls) throw Error('Ledger archive is unavailable; spend cannot be checked'); return db.apiCalls;}))).flat();
  const row: ApiCall={...metadata,id:randomUUID(),createdAt:new Date().toISOString(),status:'reserved',...(pricing?{pricing}:{})};
  return repo.mutate(ADMIN_LEDGER_NAMESPACE,db=>{ const ledger=db as Ledger; const rows=ledger.apiCalls??=[]; if(rows.length>=MAX_LEDGER_CALLS) throw new Error('Admin ledger capacity reached; export and archive ledger before further API calls');
    if(JSON.stringify(ledger.ledgerArchives||[])!==JSON.stringify(archiveIds)) throw new Error('Ledger archive changed during the spend check; retry');
    assertWithinBudget([...archived,...rows],budget,metadata.projectId);
    rows.push(row); return row.id; });
}
/** Provider adapters must normalize inputTokens to include cached and cache-creation input. */
export function normalizeApiUsage(raw: Record<string, unknown> | undefined): ApiUsage | undefined {
  if (!raw) return;
  const mapping = {inputTokens:'input_tokens',outputTokens:'output_tokens',cachedInputTokens:'cached_input_tokens',cacheCreationInputTokens:'cache_creation_input_tokens',toolCalls:'tool_calls'} as const;
  const usage: Partial<ApiUsage> = {};
  for(const [key,snake] of Object.entries(mapping)) {
    const value=raw[key] ?? raw[snake];
    if(value===undefined) continue;
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0) return;
    usage[key as Exclude<keyof ApiUsage,"toolUsageUnknown">]=value;
  }
  if(usage.inputTokens===undefined||usage.outputTokens===undefined) return;
  if((usage.cachedInputTokens??0)+(usage.cacheCreationInputTokens??0)>usage.inputTokens) return;
  if(raw.toolUsageUnknown===true || raw.tool_usage_unknown===1) usage.toolUsageUnknown=true;
  return usage as ApiUsage;
}
function safeRawUsage(raw: Record<string, unknown> | undefined) {
  if(!raw) return;
  const safe: Record<string,number>={};
  // Only known counters; a provider payload can also contain prompts and other secrets.
  for(const key of ['input_tokens','output_tokens','total_tokens','cached_input_tokens','cache_read_input_tokens','cache_creation_input_tokens','tool_calls','search_queries','inputTokens','outputTokens','cachedInputTokens','cacheCreationInputTokens','promptTokenCount','candidatesTokenCount','thoughtsTokenCount','cachedContentTokenCount','prompt_tokens','completion_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens']) {
    const value=raw[key];
    if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0) safe[key]=value;
  }
  return Object.keys(safe).length?safe:undefined;
}
export async function finishApiCall(repo: Repository,id: string,result: {status:'completed'|'failed'|'unknown';usage?:ApiUsage;rawUsage?:Record<string,unknown>;providerRequestId?:string}) {
  if(!['completed','failed','unknown'].includes(result.status)) throw new Error('Invalid call status');
  const usage=normalizeApiUsage(result.usage as Record<string,unknown>|undefined);
  const rawUsage=safeRawUsage(result.rawUsage);
  return repo.mutate(ADMIN_LEDGER_NAMESPACE,db=>{
    const row=(db as Ledger).apiCalls?.find(r=>r.id===id);
    if(!row) throw new Error('API call not found');
    if(row.status!=='reserved') throw new Error('API call already finalized');
    row.status=result.status; row.finishedAt=new Date().toISOString();
    if(usage) row.usage=usage;
    if(rawUsage) row.rawUsage=rawUsage;
    if(typeof result.providerRequestId==='string'&&/^[a-zA-Z0-9_.:/-]{1,200}$/.test(result.providerRequestId)) row.providerRequestId=result.providerRequestId;
    const p=row.pricing;
    if(usage&&p && !usage.toolUsageUnknown && (!usage.cachedInputTokens||p.cachedInputPerMillion!==undefined) && (!usage.cacheCreationInputTokens||p.cacheCreationPerMillion!==undefined) && (!usage.toolCalls||p.toolPerCall!==undefined)) {
      const amount=(usage.inputTokens-(usage.cachedInputTokens??0)-(usage.cacheCreationInputTokens??0))*p.inputPerMillion+(usage.cachedInputTokens??0)*(p.cachedInputPerMillion??0)+(usage.cacheCreationInputTokens??0)*(p.cacheCreationPerMillion??0)+usage.outputTokens*p.outputPerMillion+(usage.toolCalls??0)*(p.toolPerCall??0)*1e6;
      if(Number.isSafeInteger(Math.ceil(amount))) row.estimatedMicroUsd=Math.ceil(amount);
    }
  });
}
export async function reconcileApiCall(repo: Repository,id: string,input:{actualMicroUsd:number;reference:string;actor:string}) {
  integer(input.actualMicroUsd); text(input.reference); text(input.actor);
  const namespace=await ledgerNamespace(repo,id);
  return repo.mutate(namespace,db=>{ const row=(db as Ledger).apiCalls?.find(r=>r.id===id); if(!row) throw new Error('API call not found'); if(row.reconciliation) throw new Error('API call already reconciled'); row.reconciliation={actualMicroUsd:input.actualMicroUsd,reference:input.reference,actor:input.actor,at:new Date().toISOString()}; });
}
export type CostSummary={callCount:number;unknownCount:number;estimatedCount:number;reconciledCount:number;estimatedMicroUsd:number;actualMicroUsd:number};
export type CostFilters={accountId?:string;projectId?:string;provider?:string;model?:string;offset?:number;limit?:number};
function summarize(rows:ApiCall[]):CostSummary { return rows.reduce((s,r)=>{s.callCount++; if(r.reconciliation){s.reconciledCount++;s.actualMicroUsd+=r.reconciliation.actualMicroUsd;} else if(r.estimatedMicroUsd!==undefined){s.estimatedCount++;s.estimatedMicroUsd+=r.estimatedMicroUsd;}else s.unknownCount++;return s;},{callCount:0,unknownCount:0,estimatedCount:0,reconciledCount:0,estimatedMicroUsd:0,actualMicroUsd:0}); }
export async function adminCostReport(repo: Repository,filters:CostFilters={}) {
  const all=await exportApiCalls(repo);
  const rows=all.filter(r=>(['accountId','projectId','provider','model'] as const).every(k=>!filters[k]||r[k]===filters[k])).map(r=>r.status==='reserved'?{...r,status:'unknown' as const}:r).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const offset=Math.min(integer(filters.offset??0),rows.length);const limit=Math.min(integer(filters.limit??50),100);
  const breakdown=Object.fromEntries((['accountId','projectId','provider','model'] as const).map(key=>[key,[...new Set(rows.map(r=>r[key]))].map(value=>({value,...summarize(rows.filter(r=>r[key]===value))}))])) as Record<'accountId'|'projectId'|'provider'|'model',({value:string}&CostSummary)[]>;
  let budget:ReturnType<typeof budgetStatus>|{error:string};
  try { budget=budgetStatus(all,budgetConfig()); } catch(e) { budget={error:e instanceof Error?e.message:'Invalid budget configuration'}; }
  return {summary:summarize(rows),budget,breakdown,total:rows.length,offset,limit,rows:rows.slice(offset,offset+limit),capacity:MAX_LEDGER_CALLS,pricingNotice:'Estimates use reservation-time configured pricing. Unknown calls are not zero cost. Reserved calls may still be in flight or interrupted.'};
}
export type AdminCostReport=Awaited<ReturnType<typeof adminCostReport>>;

async function ledgerNamespaces(repo:Repository) {
 const root=(await repo.read(ADMIN_LEDGER_NAMESPACE)) as Ledger;
 const archives=root.ledgerArchives || [];
 if(archives.length>100 || archives.some(id=>!/^factory-cost-archive-[a-f0-9-]{36}$/.test(id))) throw Error("Invalid ledger archive index");
 return [ADMIN_LEDGER_NAMESPACE,...archives];
}
async function ledgerNamespace(repo:Repository,id:string){
 for(const namespace of await ledgerNamespaces(repo)) if((await repo.read(namespace)).apiCalls?.some(r=>r.id===id)) return namespace;
 throw Error("API call not found");
}
export async function exportApiCalls(repo:Repository):Promise<ApiCall[]> {
 const namespaces=await ledgerNamespaces(repo);
 const records=await Promise.all(namespaces.map(async(namespace)=>{
  const db=await repo.read(namespace);
  if(namespace!==ADMIN_LEDGER_NAMESPACE && !db.apiCalls) throw Error("Ledger archive is unavailable; totals cannot be trusted");
  return db.apiCalls || [];
 }));
 const rows=records.flat();
 if(new Set(rows.map(r=>r.id)).size!==rows.length) throw Error("Duplicate ledger record");
 return rows;
}
export async function archiveApiCalls(repo:Repository,actor:string) {
 text(actor);
 const db=(await repo.read(ADMIN_LEDGER_NAMESPACE)) as Ledger;
 const rows=db.apiCalls || [];
 if(!rows.length) throw Error("No active ledger rows to archive");
 if((db.ledgerArchives?.length || 0)>=100) throw Error("Ledger archive index capacity reached; database migration required");
 if(rows.some(r=>r.status==='reserved' && Date.parse(r.createdAt)+120000>Date.now())) throw Error("Calls are still in flight; wait for completion before archiving");
 const namespace='factory-cost-archive-'+randomUUID();
 // Persist a complete durable copy first. If the index mutation fails, originals remain.
 await repo.mutate(namespace,state=>{if(state.apiCalls) throw Error("Archive already exists");state.apiCalls=structuredClone(rows).map(r=>r.status==='reserved'?{...r,status:'unknown' as const}:r);});
 await repo.mutate(ADMIN_LEDGER_NAMESPACE,state=>{
  const ledger=state as Ledger;
  if((ledger.ledgerArchives?.length || 0)>=100) throw Error("Ledger archive index capacity reached");
  for(const row of rows) if(JSON.stringify(ledger.apiCalls?.find(r=>r.id===row.id))!==JSON.stringify(row)) throw Error("Ledger changed during archival; retry safely, originals retained");
  const ids=new Set(rows.map(r=>r.id));ledger.apiCalls=(ledger.apiCalls || []).filter(r=>!ids.has(r.id));
  (ledger.ledgerArchives ||= []).push(namespace);
 });
 return {id:namespace,count:rows.length};
}
