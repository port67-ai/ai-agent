"use client";
import { useEffect, useRef, useState } from "react";
import { Play, ArrowUpRight, RefreshCw, Minus, Plus, Maximize, Film, LoaderCircle } from "lucide-react";
import type { OverviewData, OverviewNode } from "@/lib/factory/workflow-overview";
import { api } from "./workspace-api";
export type WorkflowSelection={cid:string;pid:string};
type Destination="customers"|"projects"|"video-references"|"video-script"|"video-sheets"|"video-prompts";
const GROUPS=["Customer account","Project","Video steps","Video generation"];
const LABEL={complete:"Complete",review:"Needs review",idle:"Not run yet",running:"Running",failed:"Failed",blocked:"Blocked",stale:"Needs regeneration"};
const destination=(n:OverviewNode):Destination=>n.group===0?"customers":n.group===1?"projects":n.id==="references"?"video-references":n.id==="script"?"video-script":n.id==="assets"?"video-sheets":"video-prompts";
const money=(n:number|undefined)=>n===undefined?"":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:4}).format(n/1e6);
type Choice={id:string;name:string};
export function WorkflowCanvas({data,busyNode,onRun,onOpen}:{data:OverviewData;busyNode:string;onRun:(n:OverviewNode)=>void;onOpen:(n:OverviewNode)=>void}){
  const [zoom,setZoom]=useState(.85);
  const [active,setActive]=useState("");
  const viewport=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const n=data.nodes.find(n=>n.id===active);
  return <div className="wf-dark">
    <div className="wf-toolbar"><div><strong>{data.customer} / {data.project}</strong><small>{data.groups.length} selected audience cohorts · {data.projectCount} customer projects</small></div><div className="wf-summary"><span>Project AI runs <b>{data.total.runs}</b></span><span>Calls <b>{data.total.calls}</b></span>{data.costsVisible&&<span>Known project cost <b>{money(data.total.knownMicroUsd)}{data.total.unknownCosts? " + unknown":""}</b></span>}<span>Shared account runs <b>{data.shared.runs}</b></span>{data.costsVisible&&<span>Shared account cost <b>{money(data.shared.knownMicroUsd)}{data.shared.unknownCosts?" + unknown":""}</b></span>}</div></div>
    <div className="wf-legend">{Object.entries(LABEL).map(([k,v])=><span key={k} className={"wf-status "+k}>{v}</span>)}</div>
    <div className="wf-viewport" ref={viewport} onPointerDown={e=>{if(e.button!==0||(e.target as HTMLElement).closest("button,article,select"))return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(d){e.currentTarget.scrollLeft=d.left-(e.clientX-d.x);e.currentTarget.scrollTop=d.top-(e.clientY-d.y)}}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
      <div style={{width:1480*zoom,height:1230*zoom}} className="wf-size"><div className="wf-world" style={{transform:`scale(${zoom})`}}>
        <svg className="wf-edges" viewBox="0 0 1480 1230" aria-hidden="true">{[0,1,2].map(i=><path key={i} className={busyNode||data.nodes.some(n=>n.status==="running")?"wf-flow":""} d={`M${i*365+340} 108 C${i*365+370} 108 ${i*365+355} 108 ${i*365+385} 108`} stroke={["#619cf6","#45d39e","#efb85b"][i]} fill="none" strokeWidth="2.5"/>)}</svg>
        {GROUPS.map((g,i)=><section key={g} className="wf-column" style={{left:20+i*365}}><h3><span>0{i+1}</span>{g}</h3>{data.nodes.filter(n=>n.group===i).map(node=><article key={node.id} className={"wf-node "+(active===node.id?"selected ":"")+(busyNode===node.id?"running":"")}>
          <header><span className="wf-icon">{node.kind}</span><strong>{node.title}</strong><i className="wf-port"/></header>
          <button className="wf-preview" type="button" onClick={()=>setActive(node.id)} aria-label={"Inspect "+node.title}>{node.id==="video"?<Film size={38}/>:null}<span>{node.preview||node.detail}</span></button>
          <div className="wf-node-status"><span className={"wf-status "+(busyNode===node.id?"running":node.status)}>{busyNode===node.id?"Running":LABEL[node.status]}</span><small>{node.detail}</small></div>
          {node.models?.length? <div className="wf-model" title={node.models.join(", ")}>{node.models.join(" · ")}</div>:null}
          <footer><span>{node.runs? `Runs: ${node.runs}${data.costsVisible?" · "+money(node.knownMicroUsd)+(node.unknownCosts?" + unknown":""):""}`:node.agentIds.length?"—":node.action==="external"?"External":data.costsVisible?"Manual · $0.00":"Manual"}</span>{node.action!=="external"&&<button type="button" className="f-button small" disabled={!!busyNode||node.status==="running"||node.action==="run"&&node.status==="blocked"} onClick={()=>node.action==="run"?onRun(node):onOpen(node)}>{node.action==="run"?<Play size={12}/>:<ArrowUpRight size={12}/>} {node.action==="run"?"Run":"Open"}</button>}</footer>
        </article>)}</section>)}
      </div></div>
    </div>
    <div className="wf-toolbar wf-bottom"><div><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.4,z-.1))}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.5,z+.1))}><Plus size={16}/></button><button onClick={()=>{setZoom(Math.max(.4,Math.min(1,(viewport.current?.clientWidth||1480)/1480)));viewport.current?.scrollTo(0,0)}}><Maximize size={15}/> Fit</button></div><small>Drag background to pan · Click preview to inspect</small></div>
    {n&&<section className="wf-inspector"><header><strong>{n.title}</strong><button type="button" onClick={()=>setActive("")}>Close</button></header><p>{n.detail}</p><pre>{n.preview||"No saved preview yet."}</pre>{n.action!=="external"&&<button type="button" className="f-button" onClick={()=>onOpen(n)}>Open section</button>}</section>}
  </div>
}
export function WorkflowOverview({selection,onSelection,onOpen}:{selection:WorkflowSelection;onSelection:(s:WorkflowSelection)=>void;onOpen:(d:Destination)=>void}){
  const [customers,setCustomers]=useState<Choice[]>([]),[projects,setProjects]=useState<Choice[]>([]);
  const [data,setData]=useState<OverviewData|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[busyNode,setBusyNode]=useState(""),[cohort,setCohort]=useState("");
  const [revision,setRevision]=useState(0);
  const {cid,pid}=selection;
  useEffect(()=>{let alive=true;void api<{customers:Choice[]}>("customers").then(d=>{if(alive)setCustomers(d.customers)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[]);
  useEffect(()=>{if(!cid)return;let alive=true;void api<{commissions:Choice[]}>(`commissions/${cid}`).then(d=>{if(alive)setProjects(d.commissions)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[cid]);
  useEffect(()=>{if(!cid||!pid)return;let alive=true;const load=()=>api<OverviewData>(`workflow-overview/${cid}/${pid}`).then(d=>{if(alive){setData(d);setCohort(g=>d.groups.some(x=>x.key===g)?g:d.groups[0]?.key||"");setError("")}}).catch(e=>{if(alive)setError(e.message)});void load();const timer=window.setInterval(()=>void load(),8000);return()=>{alive=false;window.clearInterval(timer)}},[cid,pid,revision]);
  async function run(n:OverviewNode){if(!window.confirm("Run "+n.title+"? This may incur AI costs."))return;setBusy(true);setBusyNode(n.id);setError("");try{await api(`workflow-overview/${cid}/${pid}`,{action:"run",node:n.id,generation:cohort});setRevision(x=>x+1)}catch(e){setError((e as Error).message)}finally{setBusy(false);setBusyNode("")}}
  return <div className="w-page wf-page"><header className="f-page-header"><h1>Workflow overview</h1><p>Monitor saved project progress, AI execution and attributed costs.</p></header><div className="w-pickers"><label>Business / customer<select aria-label="Business / customer" value={cid} disabled={busy} onChange={e=>{setData(null);setProjects([]);onSelection({cid:e.target.value,pid:""})}}><option value="">Choose business</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Project<select aria-label="Project" value={pid} disabled={busy||!cid} onChange={e=>{setData(null);onSelection({cid,pid:e.target.value})}}><option value="">Choose project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
  {error&&<p role="alert" className="f-toast error">{error}</p>}{data?<><div className="wf-controls"><label>Run for audience <select value={cohort} disabled={busy} onChange={e=>setCohort(e.target.value)}><option value="">No audience selected</option>{data.groups.map(g=><option key={g.key} value={g.key}>{g.label}</option>)}</select></label><button type="button" className="f-button secondary" onClick={()=>setRevision(x=>x+1)}><RefreshCw size={14}/> Refresh</button></div><WorkflowCanvas key={cid+"/"+pid} data={data} busyNode={busyNode} onRun={n=>void run(n)} onOpen={n=>onOpen(destination(n))}/></>:pid?<p><LoaderCircle size={16}/> Loading workflow…</p>:<p>Choose a business and project to view the canvas.</p>}</div>
}
