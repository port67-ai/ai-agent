"use client";
import { useId,useRef,useState,type ReactNode } from "react";
export type WorkspaceTab={id:string;label:string;description?:string;icon?:ReactNode;content:ReactNode};
export function WorkspaceTabs({tabs,label,initial,active,onChange,disabled=false}:{tabs:WorkspaceTab[];label:string;initial?:string;active?:string;onChange?:(id:string)=>void;disabled?:boolean}){
 const [local,setLocal]=useState(initial||tabs[0]?.id||"");
 const prefix=useId(),buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const chosen=tabs.some(t=>t.id===(active??local))?(active??local):tabs[0]?.id;
 function choose(id:string){setLocal(id);onChange?.(id)}
 return <div className="w-workspace-tabs"><div className="w-workspace-tabbar" role="tablist" aria-label={label}>{tabs.map((t,i)=><button key={t.id} ref={el=>{buttons.current[i]=el}} type="button" role="tab" id={prefix+"-tab-"+t.id} aria-controls={prefix+"-panel-"+t.id} aria-selected={chosen===t.id} tabIndex={chosen===t.id?0:-1} disabled={disabled&&chosen!==t.id} onClick={()=>choose(t.id)} onKeyDown={e=>{if(disabled)return;const j=e.key==="ArrowRight"?(i+1)%tabs.length:e.key==="ArrowLeft"?(i+tabs.length-1)%tabs.length:e.key==="Home"?0:e.key==="End"?tabs.length-1:-1;if(j>=0){e.preventDefault();choose(tabs[j].id);buttons.current[j]?.focus()}}}>{t.icon&&<span className="w-tab-icon">{t.icon}</span>}<span><strong>{t.label}</strong>{t.description&&<small>{t.description}</small>}</span></button>)}</div>{tabs.map(t=><div key={t.id} className="w-workspace-tabpanel" id={prefix+"-panel-"+t.id} role="tabpanel" aria-labelledby={prefix+"-tab-"+t.id} hidden={chosen!==t.id}>{t.content}</div>)}</div>
}
