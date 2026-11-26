"use client";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Copy, Lock, Sparkles } from "lucide-react";
import type { PipelineStage, PipelineEntry, VideoPlan, VideoTarget } from "@/lib/factory/model";
import { AgentPopout } from "./AgentPopout";
import type { LibraryImage } from "./ImageLibrary";
import { Field } from "./shared";

const STAGES = [
  { id: "info", title: "Project information", button: "Generate project info", slot: "synthesis:video-project-info", description: "Consolidate brand context, commission brief, audience psychology and creative seed and assets." },
  { id: "beats", title: "Director's beat script", button: "Generate director's beat script", slot: "synthesis:video-director-beats", description: "Develop timed cinematic beats from the accepted project information." },
  { id: "technical", title: "Technical generation prompt", button: "Generate technical prompt", slot: "synthesis:video-technical", description: "Select a video target and its prompting skill. Convert the accepted beats and selected references into one detailed prompt." },
] as const;
type Save = (action: string, data: Record<string, unknown>) => Promise<boolean>;
function Output({ entry, busy, onAccept, allowAccept }: { entry: PipelineEntry; busy: boolean; onAccept: (text: string) => void; allowAccept: boolean }) {
  const [text, setText] = useState(entry.text);
  const [copied, setCopied] = useState(false);
  return <div className="w-stack"><Field label="Generated output"><textarea rows={18} maxLength={24000} value={text} disabled={busy} onChange={e => setText(e.target.value)} /></Field><div className="w-actions"><button type="button" className="f-button" disabled={busy || !allowAccept || !text.trim()} onClick={() => onAccept(text)}>Save and accept</button><button type="button" className="f-button secondary" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }}><Copy size={14} /> {copied ? "Copied" : "Copy output"}</button></div><p className="f-small">{entry.model} · {entry.accepted ? "Accepted" : "Draft — review before proceeding"} · {text.length.toLocaleString()} characters</p></div>;
}
export function VideoPipelineSection({ plan, cid, images, busy, onSave }: { plan: VideoPlan | null; cid: string; images: LibraryImage[]; busy: boolean; onSave: Save }) {
  const p = plan?.pipeline;
  const [open, setOpen] = useState<PipelineStage>(!p?.info?.accepted ? "info" : !p.beats?.accepted ? "beats" : "technical");
  const [duration, setDuration] = useState(p?.duration ?? (plan?.script?.shots.reduce((n,s) => n+s.seconds,0) || 15));
  const [aspectRatio, setAspectRatio] = useState(p?.aspectRatio ?? "16:9");
  const [assetIds, setAssetIds] = useState<string[]>(p?.technical?.assetIds || []);
  const [videoTarget, setVideoTarget] = useState<VideoTarget>(p?.technical?.videoTarget || "seedance-2.5");
  const [running, setRunning] = useState<PipelineStage | null>(null);
  const selection = images.filter(i => assetIds.includes(i.id)).map(i => i.id);
  const selectedChanged = JSON.stringify(p?.technical?.assetIds || []) !== JSON.stringify(selection);
  const targetChanged = !!p?.technical && p.technical.videoTarget !== videoTarget;
  const settingsChanged = !!p && (p.duration !== duration || p.aspectRatio !== aspectRatio);
  const ready = !!plan?.script;
  async function generate(stage: PipelineStage) {
    setRunning(stage);
    try { await onSave("pipeline-generate", { stage, duration, aspectRatio, assetIds: selection, videoTarget }); } finally { setRunning(null); }
  }
  async function accept(stage: PipelineStage, entry: PipelineEntry, text: string) {
    if (await onSave("pipeline-accept", { stage, revision: entry.revision, text, assetIds: selection, videoTarget })) setOpen(stage === "info" ? "beats" : "technical");
  }
  return <div className="w-stack w-pipeline">
    {!ready && <p className="f-callout">Save a script in Scripting first.</p>}
    {STAGES.map((s, i) => {
      const entry = p?.[s.id];
      const unlocked = ready && (s.id === "info" || (!!p?.info?.accepted && !settingsChanged && (s.id !== "technical" || !!p?.beats?.accepted)));
      return <section key={s.id} className="f-panel w-pipeline-stage">
        {i < 2 && <p className="f-small w-pipeline-section">{i === 0 ? "Step 1 · Project information" : "Step 2 · Prompt pipeline"}</p>}
        <button type="button" className="w-pipeline-heading" aria-expanded={open === s.id} disabled={!unlocked || busy} onClick={() => setOpen(s.id)}><span><span className="f-small">Stage {i+1}</span><strong>{s.title}</strong></span><span className="w-pipeline-status">{!unlocked ? <><Lock size={16}/> Locked</> : entry?.accepted ? <><CheckCircle2 size={16}/> Accepted</> : entry ? "Draft" : "Not started"}<ChevronDown size={18}/></span></button>
        {unlocked && open === s.id && <div className="w-stack w-pipeline-body">
          <p className="f-small">{s.description}</p><AgentPopout slot={s.slot}/>
          {s.id === "info" && <div className="w-pickers"><Field label="Target duration (seconds)"><input type="number" min={3} max={120} step={1} value={duration} disabled={busy} onChange={e => setDuration(Number(e.target.value))}/></Field><Field label="Aspect ratio"><select value={aspectRatio} disabled={busy} onChange={e => setAspectRatio(e.target.value)}>{["16:9","9:16","1:1","4:5","2.35:1"].map(r => <option key={r}>{r}</option>)}</select></Field></div>}
          {s.id === "technical" && <div className="w-stack"><fieldset className="w-stack"><legend>Select target video model</legend><label><input type="radio" name="video-target" checked={videoTarget==="seedance-2.5"} disabled={busy} onChange={()=>setVideoTarget("seedance-2.5")}/> Seedance 2.5 — multishot omni reference</label><label><input type="radio" name="video-target" checked={videoTarget==="magi-3"} disabled={busy} onChange={()=>setVideoTarget("magi-3")}/> MAGI-3 — MAGI-2 Lite skill (compatibility unverified)</label></fieldset>{targetChanged && <p className="f-callout">Video target changed. Regenerate before accepting.</p>}<h4>Select project assets</h4><p className="f-small">Select all relevant references. Only selected references may appear in the technical prompt. Attach the actual files separately in the video tool.</p>{images.length === 0 && <p className="f-small">No project images uploaded yet. You can generate without image references.</p>}<div className="w-pipeline-assets">{images.map(i => <label className="w-pipeline-asset" key={i.id}><input type="checkbox" checked={selection.includes(i.id)} disabled={busy} onChange={e => setAssetIds(old => e.target.checked ? [...old,i.id] : old.filter(id => id !== i.id))}/>{/* eslint-disable-next-line @next/next/no-img-element */}<img loading="lazy" src={`/api/factory/video-images/${cid}/${i.commissionId}/file/${i.id}`} alt={i.title || i.name}/><span><strong>{i.title || i.name}</strong><small>{i.category || "Uncategorised"} · @{i.name}{videoTarget==="seedance-2.5" && selection.includes(i.id) ? " → @Image"+(selection.indexOf(i.id)+1) : ""}</small></span></label>)}</div>{selectedChanged && entry && <p className="f-callout">Asset selection changed. Regenerate before accepting.</p>}</div>}
          {settingsChanged && s.id === "info" && <p className="f-callout">Production settings changed. Regenerate project information before continuing.</p>}
          <div><button type="button" className="f-button" disabled={busy || !!running || !Number.isInteger(duration) || duration < 3 || duration > 120} onClick={() => void generate(s.id)}><Sparkles size={15}/> {running === s.id ? "Generating…" : entry ? "Regenerate " + s.title.toLowerCase() : s.button}</button></div>
          {entry && <Output key={entry.revision} entry={entry} busy={busy} allowAccept={!settingsChanged && !(s.id === "technical" && (selectedChanged || targetChanged))} onAccept={text => void accept(s.id,entry,text)}/>}
        </div>}
      </section>;
    })}
  </div>;
}
