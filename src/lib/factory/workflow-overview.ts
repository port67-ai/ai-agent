import type { ApiCall } from "./costs";
import type { CustomerAccount, Commission, BrandIntelVersion, VideoPlan, VideoImage } from "./model";
import { effectiveStatus, currentVersion } from "./brand-intel";
import { inputStatus, GENERATIONS } from "./commissions";
import { pipelineIsCurrent } from "./video-pipeline";

export type OverviewStatus = "complete" | "review" | "idle" | "running" | "failed" | "blocked" | "stale";
export type OverviewNode = { id: string; group: number; title: string; kind: "U" | "T" | "V" | "AI"; status: OverviewStatus; detail: string; preview?: string; agentIds: string[]; runs?: number; calls?: number; models?: string[]; knownMicroUsd?: number; unknownCosts?: number; action: "open" | "run" | "external"; scope: "customer" | "project"; };
export type OverviewData = { customer: string; project: string; projectCount: number; groups: {key:string;label:string}[]; nodes: OverviewNode[]; costsVisible: boolean; total: { runs: number; calls: number; knownMicroUsd?: number; unknownCosts?: number }; shared: { runs: number; calls: number; knownMicroUsd?: number; unknownCosts?: number } };
export const STAGE_AGENTS: Record<string,string[]> = {
  brandIntel: ["research:brand-intel","synthesis:brand-intel"],
  objective: ["research:commission-objective"], product: ["research:commission-product"], audience: ["synthesis:intended-audience"], expression: ["research:commission-brand"],
  references: ["synthesis:video-references"], script: ["synthesis:video-script"], assets: ["synthesis:video-sheets"],
  info: ["synthesis:video-project-info"], beats: ["synthesis:video-director-beats"], technical: ["synthesis:video-technical","synthesis:video-prompts"],
};
export function telemetry(rows: ApiCall[], costs: boolean) {
  return { runs: new Set(rows.map(r=>r.runId)).size, calls: rows.length,
    ...(costs ? { knownMicroUsd: rows.reduce((n,r)=>n+(r.reconciliation?.actualMicroUsd ?? r.estimatedMicroUsd ?? 0),0), unknownCosts: rows.filter(r=>r.reconciliation?.actualMicroUsd === undefined && r.estimatedMicroUsd === undefined).length } : {}) };
}
export function buildOverview(c: CustomerAccount, project: Commission, projects: number, versions: BrandIntelVersion[], plans: VideoPlan[], images: VideoImage[], rows: ApiCall[], costs: boolean): OverviewData {
  const customerRows=rows.filter(r=>r.accountId===c.id && r.projectId===c.id && r.workspaceId===`factory-brandintel-${c.id}`);
  const projectRows=rows.filter(r=>r.accountId===c.id && r.projectId===project.id && [`factory-commissions-${c.id}`,`factory-video-${c.id}`].includes(r.workspaceId));
  const groups=GENERATIONS.filter(g=>(project.directionGenerations||[]).includes(g.key)&&project.audience?.[g.key]);
  const selected=plans.filter(p=>groups.some(g=>g.key===p.generation));
  const current=currentVersion(versions);
  const nodes: OverviewNode[]=[];
  const add=(id:string, group:number,title:string,kind:OverviewNode["kind"],status:OverviewStatus,detail:string,preview?:string,action:OverviewNode["action"]="open")=>{
    const agentIds=STAGE_AGENTS[id]||[], scope=group===0?"customer":"project", source=scope==="customer"?customerRows:projectRows;
    const own=source.filter(r=>r.agent&&agentIds.includes(r.agent));
    const latest=[...own].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if (id!=="brandIntel" && latest?.status==="reserved" && Date.now()-Date.parse(latest.createdAt)<180000) status="running";
    else if (status==="idle" && latest?.status==="failed") status="failed";
    nodes.push({id,group,title,kind,status,detail,preview:preview?.slice(0,24000),agentIds,action,scope,...telemetry(own,costs),models:[...new Set([...own].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>r.provider+" "+r.model))]});
  };
  const yes=(v:unknown):OverviewStatus=>v?"complete":"idle";
  add("business",0,"Business information","U",c.name&&c.website?"complete":c.name?"review":"idle",c.website||"Website not entered",c.name);
  add("social",0,"Social links","U",yes(Object.values(c.socials).some(Boolean)),Object.values(c.socials).filter(Boolean).length+" links saved");
  add("purpose",0,"Brand purpose & reputation","T",c.purposeText&&c.knownFor?"complete":c.purposeText||c.knownFor||c.brandPurpose.length?"review":"idle",c.brandPurpose.length+" supporting files",[c.purposeText,c.knownFor].filter(Boolean).join("\n"));
  add("red",0,"Client red lines","T",yes(c.redLines.length),c.redLines.length+" entered",c.redLines.map(r=>r.text).join("\n"));
  const latest=versions.at(-1);
  add("brandIntel",0,"Brand Intelligence","AI",latest&&effectiveStatus(latest)==="running"?"running":current?"complete":latest?"failed":"idle",current?"Accepted dossier v"+current.version:"No completed dossier",undefined,"run");
  add("project",1,"Project","U","complete",projects+" project"+(projects===1?"":"s")+" for customer",project.name);
  for (const [id,key,title] of [["objective","objective","Commission objective"],["product","product","Product / service"],["audience","audience","Current & intended audience"],["expression","brand","Brand expression & boundaries"]] as const) {
    const s=inputStatus(project,key);
    add(id,1,title,"T",s==="complete"?"complete":s==="in_progress"?"review":"idle",key==="audience"?Object.keys(project.audience||{}).length+" saved cohorts":s.replaceAll("_"," "),key==="audience"?undefined:Object.entries(project.answers[key]||{}).filter(([,v])=>v).map(([k,v])=>k+": "+v).join("\n"),"open");
  }
  const status=(pred:(p:VideoPlan)=>boolean, draft:(p:VideoPlan)=>boolean):OverviewStatus=>!groups.length?"blocked":groups.every(g=>selected.some(p=>p.generation===g.key&&pred(p)))?"complete":selected.some(draft)?"review":"idle";
  const count=(f:(p:VideoPlan)=>number)=>selected.reduce((n,p)=>n+f(p),0);
  add("references",2,"References","U",status(p=>p.references.some(r=>r.accepted),p=>p.references.length>0),count(p=>p.references.filter(r=>r.accepted).length)+" accepted / "+count(p=>p.references.length)+" total",selected.flatMap(p=>p.references.filter(r=>r.accepted).map(r=>r.title)).join("\n"),"run");
  add("script",2,"Scripting","T",status(p=>!!p.script,p=>!!p.script||p.chat.length>0),count(p=>p.script?1:0)+"/"+groups.length+" saved scripts",selected.map(p=>p.script?.narrative||p.script?.title||"").filter(Boolean).join("\n\n"),"open");
  add("assets",2,"Characters, locations & props","U",status(p=>p.sheets.some(s=>s.accepted)||images.length>0,p=>p.sheets.length>0||images.length>0),images.length+" uploaded images · "+count(p=>p.sheets.filter(s=>s.accepted).length)+" accepted sheets",images.map(i=>"@"+i.name).join("\n"),"run");
  for(const [id,title] of [["info","Project information"],["beats","Director’s beat script"],["technical","Technical prompt"]] as const){
    const stale=selected.some(p=>p.pipeline?.[id]&&!pipelineIsCurrent({customer:c,commission:project,generation:p.generation,dossier:current},p,images));
    const s=status(p=>!!p.pipeline?.[id]?.accepted,p=>!!p.pipeline?.[id]);
    const locked=id==="beats"&&!selected.some(p=>p.pipeline?.info?.accepted)||id==="technical"&&!selected.some(p=>p.pipeline?.info?.accepted&&p.pipeline?.beats?.accepted);
    add(id,3,title,id==="technical"?"V":"T",stale?"stale":locked?"blocked":s,count(p=>p.pipeline?.[id]?.accepted?1:0)+"/"+groups.length+" accepted",selected.map(p=>p.pipeline?.[id]?.text||"").filter(Boolean).join("\n\n"),"open");
  }
  add("video",3,"Final video output","V","blocked","External video generation — not connected",undefined,"external");
  return {customer:c.name,project:project.name,projectCount:projects,groups:groups.map(g=>({key:g.key,label:g.label})),nodes,costsVisible:costs,total:telemetry(projectRows,costs),shared:telemetry(customerRows,costs)};
}
