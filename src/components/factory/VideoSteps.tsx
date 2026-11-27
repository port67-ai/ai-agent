"use client";
import { useCallback, useEffect, useState } from "react";
import type { Commission, CustomerAccount, Generation, VideoPlan } from "@/lib/factory/model";
import { GENERATIONS } from "@/lib/factory/commissions";
import { STEP_LABEL } from "@/lib/factory/video-steps";
import { PromptsSection, ReferencesSection, ScriptSection, SheetsSection, type ScriptSeed } from "./VideoStepsSections";
import { StyleReferencePanel } from "./StyleReferencePanel";
import { ImageLibrary, type LibraryImage } from "./ImageLibrary";
import { Empty, Field } from "./shared";
import { VideoPipelineSection } from "./VideoPipelineSection";
import { api } from "./workspace-api";

// Video steps page (CHG-0115): pick a customer, a project and one of its selected age groups, then work through the four sections.
export type VideoSection = "references" | "script" | "sheets" | "prompts";
const NOTICE: Record<string, string> = { "reference-add": "Reference added.", "reference-update": "Reference saved.", "reference-remove": "Reference removed.", "reference-accept": "Updated.", "script-save": "Script saved.", "sheet-add": "Sheet added.", "sheet-update": "Sheet saved.", "sheet-remove": "Sheet removed.", "sheet-accept": "Updated.", "prompts-save": "Prompt edits saved." };

export function VideoSteps({ section, initialCustomer = "", initialProject = "" }: { section: VideoSection; initialCustomer?: string; initialProject?: string }) {
  const [customers, setCustomers] = useState<Pick<CustomerAccount, "id" | "name">[]>([]);
  const [cid, setCid] = useState("");
  const [projects, setProjects] = useState<Commission[]>([]);
  const [pid, setPid] = useState("");
  const [gen, setGen] = useState<Generation | "">("");
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [seed, setSeed] = useState<ScriptSeed & { n: number }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const project = projects.find((p) => p.id === pid);
  const groups = GENERATIONS.filter((g) => (project?.directionGenerations || []).includes(g.key) && project?.audience?.[g.key]);

  const run = useCallback(async (work: () => Promise<void>, done = ""): Promise<boolean> => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); if (done) setNotice(done); return true; }
    catch (e) { setError((e as Error).message); window.scrollTo({ top: 0, behavior: "smooth" }); return false; }
    finally { setBusy(false); }
  }, []);
  const loadPlan = useCallback(async (c: string, p: string, g: string) => {
    const d = await api<{ plan: VideoPlan | null }>(`video/${c}/${p}/${g}`);
    setPlan(d.plan); setSeed(undefined);
  }, []);
  const chooseCustomer = useCallback(async (id: string) => {
    const d = await api<{ commissions: Commission[] }>(`commissions/${id}`);
    setCid(id); setProjects(d.commissions); setPid(""); setGen(""); setPlan(null); setSeed(undefined); setImages([]);
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const d = await api<{ customers: CustomerAccount[] }>("customers");
        if (!alive) return;
        setCustomers(d.customers);
        const customer=d.customers.find(c=>c.id===initialCustomer)||d.customers[0];
        if(customer){ await chooseCustomer(customer.id); if(customer.id===initialCustomer&&initialProject){ const list=await api<{commissions:Commission[]}>(`commissions/${customer.id}`); const p=list.commissions.find(x=>x.id===initialProject); if(p&&alive){ setPid(p.id); const first=GENERATIONS.find(g=>(p.directionGenerations||[]).includes(g.key)&&p.audience?.[g.key]); setGen(first?.key||""); if(first) await loadPlan(customer.id,p.id,first.key); if(section==="prompts") setImages((await api<{images:LibraryImage[]}>(`video-images/${customer.id}/${p.id}`)).images); } } }
      } catch (e) { if (alive) setError((e as Error).message); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [chooseCustomer,initialCustomer,initialProject,loadPlan,section]);

  const chooseProject = (id: string) => run(async () => {
    setPid(id); setPlan(null); setSeed(undefined); setImages([]);
    const p = projects.find((x) => x.id === id);
    const first = GENERATIONS.find((g) => (p?.directionGenerations || []).includes(g.key) && p?.audience?.[g.key]);
    setGen(first?.key || "");
    if (first) await loadPlan(cid, id, first.key);
    if (section === "prompts" && id) setImages((await api<{ images: LibraryImage[] }>(`video-images/${cid}/${id}`)).images);
  });
  const chooseGen = (g: Generation) => run(async () => { setGen(g); setPlan(null); await loadPlan(cid, pid, g); });
  const base = `video/${cid}/${pid}/${gen}`;
  const save = (action: string, payload: Record<string, unknown>) => run(async () => { setPlan((await api<{ plan: VideoPlan }>(base, { action, ...payload })).plan); }, NOTICE[action] || "Saved.");
  const generate = async (step: "references" | "script" | "sheets" | "prompts", extra: Record<string, unknown> = {}) => {
    setGenerating(true);
    await run(async () => {
      const d = await api<{ plan: VideoPlan; draft?: ScriptSeed | null }>(base, { action: "generate", step, ...extra });
      setPlan(d.plan);
      if (step === "script" && d.draft) setSeed({ ...d.draft, n: Date.now() });
    }, step === "script" ? "Draft ready in the editor. Check it, then press Save script." : "Done. Review the results below.");
    setGenerating(false);
  };
  const props = { plan, busy, generating, onSave: save, onGenerate: generate };
  const library = section === "sheets" && pid ? <ImageLibrary key={`${cid}/${pid}`} cid={cid} commissionId={pid} onChange={setImages} onError={setError} /> : null;

  return (
    <div className="w-page">
      <header className="f-page-header">
        <h1>{STEP_LABEL[section]}</h1>
        <p>Video steps for one project and one age group that was selected for direction.</p>
      </header>
      {error && <div className="f-toast error w-error" role="alert">{error}</div>}
      {!error && notice && <div className="f-toast f-toast-ok w-error" role="status">{notice}</div>}
      {loading ? <p>Opening video steps…</p> : customers.length === 0 ? (
        <Empty title="No customer account yet">Create a customer account and a project first.</Empty>
      ) : (
        <>
          <div className="w-pickers">
            <Field label="Customer account">
              <select aria-label="Customer account" value={cid} onChange={(e) => void run(() => chooseCustomer(e.target.value))}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </Field>
            <Field label="Project">
              <select aria-label="Project" value={pid} onChange={(e) => void chooseProject(e.target.value)}>
                <option value="">{projects.length ? "Choose a project" : "No projects yet"}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          {section==="references"&&pid&&<StyleReferencePanel key={cid+"/"+pid} cid={cid} pid={pid}/>}
          {library}
          {!pid ? <Empty title="Choose a project">Pick the project to work on.</Empty> : groups.length === 0 ? (
            <Empty title="Select an age group for direction first">Video steps start from a saved, selected age group. Open the project, save the audience for at least one age group on Input 4, and tick &quot;Use … for direction&quot;.</Empty>
          ) : (
            <>
              <div className="w-tabs" role="tablist" aria-label="Age groups">
                {groups.map((g) => <button key={g.key} type="button" role="tab" aria-selected={gen === g.key} className={"f-button small" + (gen === g.key ? "" : " secondary")} onClick={() => void chooseGen(g.key)}>{g.label} <span className="f-small">{g.range}</span></button>)}
              </div>
              {gen && section === "references" && <ReferencesSection {...props} />}
              {gen && section === "script" && <ScriptSection key={(plan?.script?.savedAt || "") + (seed?.n || "")} {...props} seed={seed} />}
              {gen && section === "sheets" && <SheetsSection {...props} />}
              {gen && section === "prompts" && <><VideoPipelineSection key={`${cid}/${pid}/${gen}`} plan={plan} cid={cid} images={images} busy={busy} onSave={save} /><details className="f-panel w-dropdown"><summary>Previous generation prompts (legacy)</summary><PromptsSection key={plan?.prompts?.generatedAt || "none"} {...props} images={images} /></details></>}
            </>
          )}
        </>
      )}
    </div>
  );
}
