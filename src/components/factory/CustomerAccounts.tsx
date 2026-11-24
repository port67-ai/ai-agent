"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { CustomerAccount } from "@/lib/factory/model";
import { BrandIntel } from "./BrandIntel";
import { CustomerEditor, type FindResult } from "./CustomerEditor";
import { Empty, Field } from "./shared";
import { api, uploadFile } from "./workspace-api";

// Customer account page of the video workspace (CHG-0103): the list of companies and the editor for the chosen one.
export function CustomerAccounts() {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [found, setFound] = useState<FindResult>();
  const current = customers.find((c) => c.id === selected);

  const load = useCallback(async () => {
    const data = await api<{ customers: CustomerAccount[] }>("customers");
    setCustomers(data.customers);
    setSelected((id) => (data.customers.some((c) => c.id === id) ? id : data.customers[0]?.id || ""));
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try { await load(); } catch (e) { if (active) setError((e as Error).message); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [load]);

  /** Run one request. A failed press shows its message at the top of the page and brings it into view. */
  async function run(work: () => Promise<void>, done = ""): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try { await work(); if (done) setNotice(done); return true; }
    catch (e) { setError((e as Error).message); window.scrollTo({ top: 0, behavior: "smooth" }); return false; }
    finally { setBusy(false); }
  }
  const replace = (c: CustomerAccount) => setCustomers((list) => list.map((x) => (x.id === c.id ? c : x)));

  const NOTICES: Record<string, string> = {
    update: "Business details saved.", socials: "Social links saved.", "red-line-add": "Red line added.", "red-line-update": "Red line saved.", "red-line-remove": "Red line removed.",
    "brand-text": "Brand text saved.", "brand-text-authorise": "Model access updated.", "purpose-authorise": "Model access updated.", "purpose-remove": "File removed.",
  };
  async function save(action: string, payload: Record<string, unknown>) {
    if (!current) return false;
    return run(async () => {
      const result = await api<{ customer: CustomerAccount }>(`customers/${current.id}`, { action, ...payload });
      replace(result.customer);
      // Once social links are saved the website result has been dealt with.
      if (action === "socials") setFound(undefined);
    }, NOTICES[action] || "Saved.");
  }

  return (
    <div className="w-page">
      <header className="f-page-header">
        <h1>Customer account</h1>
        <p>The company you are producing for. The company is the brand, and every project belongs to one of these accounts.</p>
      </header>
      {error && <div className="f-toast error w-error" role="alert">{error}</div>}
      {!error && notice && <div className="f-toast f-toast-ok w-error" role="status">{notice}</div>}
      {loading ? <p>Opening customer accounts…</p> : (
        <div className="w-customers">
          <aside>
            {customers.length > 0 && (
              <ul className="w-list" aria-label="Customer accounts">
                {customers.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={c.id === selected ? "active" : ""} onClick={() => { setSelected(c.id); setFound(undefined); setNotice(""); setError(""); }}>
                      <strong>{c.name}</strong>
                      <small>{c.website ? c.website.replace(/^https:\/\//, "").replace(/\/$/, "") : "No website yet"}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form className="f-panel" onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const d = new FormData(form);
              await run(async () => {
                const result = await api<{ customer: CustomerAccount }>("customers", { name: d.get("name"), website: d.get("website") });
                setCustomers((list) => [...list, result.customer]);
                setSelected(result.customer.id);
                setFound(undefined);
                form.reset();
              }, "Customer account created.");
            }}>
              <h3>New customer account</h3>
              <Field label="Business name"><input name="name" required maxLength={120} /></Field>
              <Field label="Website (optional)"><input name="website" type="text" inputMode="url" placeholder="https://example.com" maxLength={2000} /></Field>
              <button className="f-button" disabled={busy}><Plus size={15} /> Create account</button>
            </form>
          </aside>
          <div>
            {current ? (
              <>
              <CustomerEditor
                key={current.id}
                customer={current}
                busy={busy}
                found={found}
                onSave={save}
                onFind={() => void run(async () => { setFound(await api<FindResult>(`customers/${current.id}`, { action: "find-socials" })); })}
                onUpload={(file) => run(async () => {
                  const result = await uploadFile<{ customer: CustomerAccount }>(`customers/${current.id}/purpose`, file, { name: file.name, rights: "confirmed" });
                  replace(result.customer);
                }, "File uploaded. It is private, and AI steps cannot read it until you allow that.")}
              >
                <BrandIntel key={"bi-" + current.id} customerId={current.id} name={current.name} />
              </CustomerEditor>
              </>
            ) : (
              <Empty title="No customer account yet">Create the first one on the left. You need a business name; the website, social links, brand purpose and red lines can follow.</Empty>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
