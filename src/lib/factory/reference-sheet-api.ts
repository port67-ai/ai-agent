import { randomUUID } from "node:crypto";
import type { Principal } from "./model";
import { repository } from "./repository";
import { videoWorkspace } from "./video-steps-run";
import { attachImage,buildImage,IMAGE_MAX_BYTES,imagesOf,sniffImage } from "./video-images";
import { getImage,putImage,imageKey,deleteImage } from "./video-image-store";
import { imageProviderFor,meteredImage } from "./image-provider";
import { resolveSelection,IMAGE_SLOT } from "./ai-routing";
import { cropPngToRatio } from "./studio-media";
import { draftsOf,publicDraft,sheetKind,sheetPrompt,PREFERRED_SHEET_MODEL,SHEET_STYLES,type SheetDraft } from "./reference-sheets";
import { styleOf,styleContext } from "./style-reference";
const json=(d:unknown)=>Response.json(d,{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
const clean=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
const modelId=(v:unknown)=>typeof v==="string"&&/^gpt-image-[a-zA-Z0-9.-]+$/.test(v);
export async function handleReferenceSheets(request:Request,cid:string,pid:string,a:Principal,d:Record<string,unknown>,sub:string,fileId?:string,readUpload?:()=>Promise<Buffer>){
 const ws=videoWorkspace(cid),actor=a.subject,db=await repository.read(ws),list=draftsOf(db,pid,actor);
 const find=(id:unknown,type?:SheetDraft["type"])=>{const item=list.find(x=>x.id===id&&(!type||x.type===type));if(!item||!item.storageKey.startsWith(`video-images/${cid}/${pid}/`))throw Error("Draft not found");return item};
 const options=async()=>{try{const sel=await resolveSelection(repository,IMAGE_SLOT);return [...new Set([PREFERRED_SHEET_MODEL,...(modelId(sel.model)?[sel.model]:[]),"gpt-image-1"])]}catch{return [PREFERRED_SHEET_MODEL,"gpt-image-1"]}};
 const add=async(bytes:Buffer,type:SheetDraft["type"],name:string,extra:Partial<SheetDraft>={})=>{
  const mime=sniffImage(bytes);if(!mime||!bytes.length||bytes.length>IMAGE_MAX_BYTES)throw Error("Expected PNG, JPEG or WebP up to 8 MB");
  const id=randomUUID(),storageKey=imageKey(cid,pid,id,mime);
  const item:SheetDraft={...extra,id,commissionId:pid,type,name,mime,bytes:bytes.length,storageKey,createdBy:actor,createdAt:new Date().toISOString()};
  await putImage(storageKey,bytes,mime);
  try{await repository.mutate(ws,x=>{if(draftsOf(x,pid,actor).length>=12)throw Error("Delete existing drafts before adding more (12 maximum)");(x.referenceSheetDrafts||=[]).push(item)})}catch(e){await deleteImage(storageKey);throw e}
  return publicDraft(item);
 };
 if(sub==="sheet-source"&&readUpload)return json({draft:await add(await readUpload(),"source",clean(new URL(request.url).searchParams.get("name"),120)||"Reference image")});
 if(request.method==="GET"&&fileId){const item=find(fileId),bytes=await getImage(item.storageKey);return new Response(new Uint8Array(bytes),{headers:{"content-type":item.mime,"cache-control":"private, no-store","x-content-type-options":"nosniff","content-security-policy":"sandbox; default-src 'none'","content-disposition":`inline; filename="reference-sheet.${item.mime.split("/")[1]}"`}})}
 if(request.method==="GET")return json({drafts:list.map(publicDraft),models:await options(),defaultModel:PREFERRED_SHEET_MODEL});
 if(fileId)throw Error("Unknown sheet action");
 if(d.action==="remove"){const item=find(d.id);await repository.mutate(ws,x=>{x.referenceSheetDrafts=(x.referenceSheetDrafts||[]).filter(y=>y.id!==item.id)});await deleteImage(item.storageKey);return json({ok:true})}
 if(d.action==="approve"){const item=find(d.id,"output");await repository.mutate(ws,x=>{const current=draftsOf(x,pid,actor).find(y=>y.id===item.id);if(!current)throw Error("Draft no longer exists");current.approved=true});return json({ok:true})}
 if(d.action==="save"){
  const item=find(d.id,"output");
  const img=await repository.mutate(ws,x=>{const current=draftsOf(x,pid,actor).find(y=>y.id===item.id);if(!current?.approved)throw Error("Approve the generated sheet first");const title=clean(d.title,120);if(!title||!d.category)throw Error("Enter image title and category");const saved=buildImage(x,{id:current.id,commissionId:pid,name:title,title,category:d.category,description:clean(d.description,500),mime:current.mime,bytes:current.bytes,storageKey:current.storageKey,actor});attachImage(x,saved);x.referenceSheetDrafts=(x.referenceSheetDrafts||[]).filter(y=>y.id!==current.id);return saved});
  const {storageKey:_,...safe}=img;void _;return json({image:safe});
 }
 if(d.action!=="generate")throw Error("Unknown sheet action");
 const kind=sheetKind(d.kind);
 if(!Array.isArray(d.sourceIds)||!d.sourceIds.length||d.sourceIds.length>7||new Set(d.sourceIds).size!==d.sourceIds.length)throw Error("Choose 1–7 source images");
 if(list.length>=12||imagesOf(db,pid).length>=60)throw Error("Remove drafts or project assets before generating");
 const sources=d.sourceIds.map(id=>find(id,"source"));
 const sel=await resolveSelection(repository,IMAGE_SLOT),model=clean(d.model,180);
 if(!modelId(model)||!(await options()).includes(model))throw Error("Choose a listed OpenAI image model");
 const references=await Promise.all(sources.map(async x=>({bytes:await getImage(x.storageKey),mime:x.mime,name:x.name})));
 const result=await meteredImage(repository,a,{id:pid,accountId:cid,workspaceId:ws},randomUUID(),imageProviderFor({...sel,model}),{prompt:sheetPrompt(kind,clean(d.notes,900),styleContext(styleOf(db,pid))),size:"1536x1024",references},"studio:reference-sheet");
 let bytes=result.bytes;
 if(result.mime==="image/png"){try{bytes=cropPngToRatio(bytes,16/9).bytes}catch{/* retain actual provider image if crop unsupported */}}
 return json({draft:await add(bytes,"output",kind+" reference sheet",{kind,model,sourceIds:sources.map(x=>x.id),approved:false})});
}
