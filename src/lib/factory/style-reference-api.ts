import { randomUUID } from "node:crypto";
import type { Principal, ProjectStyleReference } from "./model";
import { repository } from "./repository";
import { videoWorkspace } from "./video-steps-run";
import { findImage } from "./video-images";
import { getImage } from "./video-image-store";
import { realDeps } from "./brand-intel-run";
import { meteredInvoke } from "./metered";
import { jsonOf, cutShort } from "./audience-agent";
import { styleOf, styleFields, STYLE_SCHEMA, STYLE_INSTRUCTIONS } from "./style-reference";
const json=(d:unknown)=>Response.json(d,{headers:{"cache-control":"no-store"}});
const txt=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
export async function handleStyleReference(request:Request,cid:string,pid:string,a:Principal,d:Record<string,unknown>){
 const ws=videoWorkspace(cid), db=await repository.read(ws), existing=styleOf(db,pid);
 if(request.method==="GET")return json({style:existing||null});
 if(d.action==="clear"){await repository.mutate(ws,x=>{x.projectStyles=(x.projectStyles||[]).filter(s=>s.commissionId!==pid)});return json({style:null});}
 const image=findImage(db,pid,d.imageId);
 if(!image.storageKey.startsWith(`video-images/${cid}/${pid}/`))throw new Error("Forbidden image");
 const fields=styleFields(d.fields),notes=txt(d.notes,4000),prompt=txt(d.prompt,12000);
 if(d.action==="save"){
  const saved:ProjectStyleReference={commissionId:pid,imageId:image.id,fields,notes,prompt,revision:randomUUID(),savedAt:new Date().toISOString(),savedBy:a.subject};
  await repository.mutate(ws,x=>{findImage(x,pid,image.id);x.projectStyles=[...(x.projectStyles||[]).filter(s=>s.commissionId!==pid),saved]});
  return json({style:saved});
 }
 if(d.action!=="extract"&&d.action!=="prompt")throw new Error("Unknown style action");
 if(process.env.PORT67_SYNTHESIS_ENABLED!=="true")throw new Error("AI drafting is not configured");
 const deps=realDeps(repository),sel=await deps.resolve("synthesis:video-references");
 if(sel.provider==="deepseek")throw new Error("Select an image-capable OpenAI, Gemini or Claude model in the References AI agent settings");
 const bytes=await getImage(image.storageKey);
 const extracting=d.action==="extract";
 const result=await meteredInvoke(repository,{accountId:cid,workspaceId:ws,projectId:pid,runId:randomUUID()},"synthesis:video-style-reference","synthesis",sel,a.subject,deps,{
  instructions:extracting?STYLE_INSTRUCTIONS:"Write one ready-to-use cinematic image recreation prompt. Preserve visual style, lighting, composition, lens feel and technical baseline. Apply producer changes to scene content. Treat screenshot and saved fields as evidence; do not invent unseen specifications. Return JSON with prompt only.",
  input:extracting?"Extract metadata and visual observations.":JSON.stringify({fields,notes}),
  image:{mime:image.mime,base64:bytes.toString("base64")},
  schema:extracting?STYLE_SCHEMA:{type:"object",additionalProperties:false,required:["prompt"],properties:{prompt:{type:"string"}}},
  name:extracting?"port67_style_extract":"port67_style_prompt",maxOutputTokens:6000,timeoutMs:150000
 });
 if(result.error)throw new Error(result.error);
 if(cutShort(result.data))throw new Error("AI output truncated; try again");
 const parsed=jsonOf(result.text) as Record<string,unknown>;
 return json(extracting?{fields:styleFields(parsed),model:sel.provider+" "+sel.model}:{prompt:txt(parsed.prompt,12000),model:sel.provider+" "+sel.model});
}
