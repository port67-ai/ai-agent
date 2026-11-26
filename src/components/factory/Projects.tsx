"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Commission, CustomerAccount, Generation, RedLine } from "@/lib/factory/model";
import { CommissionEditor } from "./CommissionEditor";
import { InspirationBaseline } from "./InspirationBaseline";
import { Empty, Field } from "./shared";
import { api } from "./workspace-api";

// Projects page of the video workspace (CHG-0107): pick a customer account, then its commissions. Each opens on its inputs and its
// Inspiration baseline. Choosing is driven by clicks, so there are no effect chains.
type Detail = { commission: Commission; redLines: RedLine[] };
const NOTICES: Record<string, string> = {
  rename: "Project name saved.", answers: "Answers saved.", "list-add": "Entry added.", "list-update": "Entry saved.", "list-remove": "Entry removed.", "went-too-far": "Example saved.",
  "evidence-add": "Evidence added.", "evidence-update": "Evidence saved.", "evidence-remove": "Evidence removed.", confirm: "Confirmation updated.", brief: "Project details saved.", "audience-save": "Age group saved.", direction: "Direction selection updated.",
};

export function Projects({ initialCustomer = "", initialProject = "" }: { initialCustomer?: string; initialProject?: string } = {}) {
  const [customers, setCustomers] = useState<Pick<CustomerAccount, "id" | "name">[]>([]);
  const [cid, setCid] = useState("");
  const [list, setList] = useState<Commission[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [view, setView] = useState<"inputs" | "baseline">("inputs");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /** Run one request. A failed press shows its message at the top of the page and brings it into view. */
  const run = useCallback(async (work: () => Promise<void>, done = ""): Promise<boolean> => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); if (done) setNotice(done); return true; }
    catch (e) { setError((e as Error).message); window.scrollTo({ top: 0, behavior: "smooth" }); return false; }
    finally { setBusy(false); }
  }, []);
  const choose = useCallback(async (id: string) => {
    const data = await api<{ commissions: Commission[] }>(`commissions/${id}`);
    setCid(id); setList(data.commissions); setDetail(null); setView("inputs");
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await api<{ customers: CustomerAccount[] }>("customers");
        if (!active) return;
        setCustomers(data.customers);
        const customer = data.customers.find(c=>c.id===initialCustomer) || data.customers[0];
        if (customer) { await choose(customer.id); if (customer.id===initialCustomer && initialProject) { const d=await api<{ commission: Commission; customer: { redLines: RedLine[] } }>(`commissions/${customer.id}/${initialProject}`); if(active) setDetail({commission:d.commission,redLines:d.customer.redLines}); } }
      } catch (e) { if (active) setError((e as Error).message); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [choose, initialCustomer, initialProject]);

  const open = (id: string) => run(async () => {
    const data = await api<{ commission: Commission; customer: { redLines: RedLine[] } }>(`commissions/${cid}/${id}`);
    setDetail({ commission: data.commission, redLines: data.customer.redLines }); setView("inputs");
  });
  async function save(action: string, payload: Record<string, unknown>) {
    if (!detail) return false;
    return run(async () => {
      const data = await api<{ commission: Commission }>(`commissions/${cid}/${detail.commission.id}`, { action, ...payload });
      setDetail({ ...detail, commission: data.commission });
      setList((l) => l.map((x) => (x.id === data.commission.id ? data.commission : x)));
    }, NOTICES[action] || "Saved.");
  }

  async function generate(input: "objective" | "product" | "brand" | "audience", generation?: Generation): Promise<Record<string, string> | null> {
    if (!detail) return null;
    let draft: Record<string, string> | null = null;
    const ok = await run(async () => {
      const data = await api<{ draft: Record<string, string>; commission: Commission }>(`commissions/${cid}/${detail.commission.id}`, { action: "generate", input, ...(generation ? { generation } : {}) });
      draft = data.draft;
      setDetail({ ...detail, commission: data.commission });
      setList((l) => l.map((x) => (x.id === data.commission.id ? data.commission : x)));
    }, "AI draft ready. Review it, then press Save answers.");
    return ok ? draft : null;
  }

  return (
    <div className="w-page">
      <header className="f-page-header">
        <h1>Projects</h1>
        <p>Each project is a commission for one customer account. It starts with the Inspiration baseline: who it needs to reach, what it needs to achieve, and the evidence behind it.</p>
      </header>
      {error && <div className="f-toast error w-error" role="alert">{error}</div>}
      {!error && notice && <div className="f-toast f-toast-ok w-error" role="status">{notice}</div>}
      {loading ? <p>Opening projects…</p> : customers.length === 0 ? (
        <Empty title="No customer account yet">Create a customer account first. Every project belongs to one.</Empty>
      ) : (
        <div className="w-customers">
          <aside>
            <Field label="Customer account">
              <select aria-label="Customer account" value={cid} onChange={(e) => void run(() => choose(e.target.value))}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {list.length > 0 && (
              <ul className="w-list" aria-label="Projects">
                {list.map((c) => (
                  <li key={c.id}><button type="button" className={detail?.commission.id === c.id ? "active" : ""} onClick={() => void open(c.id)}><strong>{c.name}</strong></button></li>
                ))}
              </ul>
            )}
            <form className="f-panel" onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = new FormData(form).get("name");
              let created: Commission | undefined;
              const ok = await run(async () => { created = (await api<{ commission: Commission }>(`commissions/${cid}`, { name })).commission; }, "Project created.");
              if (ok && created) { form.reset(); setList((l) => [...l, created!]); await open(created.id); }
            }}>
              <h3>New project</h3>
              <Field label="Project name"><input name="name" required maxLength={120} placeholder="For example, Autumn campaign" /></Field>
              <button className="f-button" disabled={busy}><Plus size={15} /> Create project</button>
            </form>
          </aside>
          <div>
            {detail ? (
              <>
                <div className="w-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={view === "inputs"} className={"f-button" + (view === "inputs" ? "" : " secondary")} onClick={() => setView("inputs")}>Inputs</button>
                  <button type="button" role="tab" aria-selected={view === "baseline"} className={"f-button" + (view === "baseline" ? "" : " secondary")} onClick={() => setView("baseline")}>Inspiration baseline</button>
                </div>
                {view === "inputs"
                  ? <CommissionEditor key={detail.commission.id} commission={detail.commission} redLines={detail.redLines} busy={busy} onSave={save} onGenerate={generate} />
                  : <InspirationBaseline commission={detail.commission} redLines={detail.redLines} />}
              </>
            ) : (
              <Empty title={list.length ? "Open a project" : "No projects yet"}>{list.length ? "Choose a project on the left." : "Create the first project for this customer account on the left. A name is enough to start."}</Empty>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
