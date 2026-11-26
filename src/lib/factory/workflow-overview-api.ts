import type { Principal } from "./model";
import { repository } from "./repository";
import { CUSTOMERS_WORKSPACE } from "./customers";
import { CUSTOMER_ID, findCustomer } from "./customers-commands";
import { commissionsOf, findCommission } from "./commissions-commands";
import { brandIntelWorkspace, versionsOf } from "./brand-intel-run";
import { videoWorkspace } from "./video-steps-run";
import { plansOf } from "./video-steps-commands";
import { imagesOf } from "./video-images";
import { exportApiCalls } from "./costs";
import { buildOverview } from "./workflow-overview";
import { handleBrandIntel } from "./brand-intel-api";
import { handleVideo } from "./video-steps-api";
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
export async function handleWorkflowOverview(request:Request,path:string[],a:Principal,data:Record<string,unknown>):Promise<Response>{
  if(a.role!=="operator"||a.demo)return json({error:"Forbidden"},403);
  const [,cid,pid]=path;
  if(path.length!==3||!CUSTOMER_ID.test(cid||""))return json({error:"Not found"},404);
  const customer=findCustomer(await repository.read(CUSTOMERS_WORKSPACE),cid);
  const cdb=await repository.read(`factory-commissions-${cid}`);
  const project=findCommission(cdb,pid);
  if(request.method==="POST"){
    if(data.action!=="run")throw new Error("Unknown action");
    if(data.node==="brandIntel")return handleBrandIntel(request,["brand-intel",cid],a,{action:"submit"});
    if(data.node!=="references"&&data.node!=="assets")throw new Error("Open the editor for this stage to preserve its approval and input requirements");
    if(typeof data.generation!=="string")throw new Error("Choose an audience cohort");
    return handleVideo(request,["video",cid,pid,data.generation],a,{action:"generate",step:data.node==="assets"?"sheets":"references"});
  }
  const [bdb,vdb,rows]=await Promise.all([repository.read(brandIntelWorkspace(cid)),repository.read(videoWorkspace(cid)),exportApiCalls(repository)]);
  const costs=!!a.admin&&a.identity==="firebase";
  // Never serialize ledger rows or cost amounts for producers. Only aggregate scoped execution counts and model IDs.
  return json(buildOverview(customer,project,commissionsOf(cdb).length,versionsOf(bdb),plansOf(vdb).filter(p=>p.commissionId===pid),imagesOf(vdb,pid),rows,costs));
}
