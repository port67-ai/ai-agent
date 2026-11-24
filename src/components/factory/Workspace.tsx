"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FolderKanban, LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import type { Principal } from "@/lib/factory/model";
import { AccountLogin } from "./AccountLogin";
import { CustomerAccounts } from "./CustomerAccounts";
import { Projects } from "./Projects";
import { Field } from "./shared";
import { api } from "./workspace-api";

// Video workspace shell (CHG-0103, FAC-VWS-001 and 002): producers and admins only, three sidebar entries, more added one at a time.
// The previous portal tabs stay in the repository, parked and unreachable from here.
type Tab = "overview" | "customers" | "projects";
const NAV: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "customers", label: "Customer account", icon: Building2 },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

export function Placeholder({ title, children }: { title: string; children: string }) {
  return (
    <div className="w-page">
      <header className="f-page-header"><h1>{title}</h1></header>
      <div className="w-placeholder">{children}</div>
    </div>
  );
}

/** Who may use the workspace: producers and admins. Customers and the synthetic demo are turned away. */
export const isStaff = (p: Principal | null): p is Principal => !!p && p.role === "operator" && !p.demo;

export function Shell({ principal, tab, setTab, onSignOut, children }: { principal: Principal; tab: Tab; setTab: (t: Tab) => void; onSignOut: () => void; children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const ownerAdmin = !!principal.admin && principal.identity === "firebase";
  const label = NAV.find((n) => n.id === tab)?.label || "";
  return (
    <div className="f-shell">
      <aside className={"f-sidebar " + (mobile ? "open" : "")}>
        <Link className="f-wordmark" href="/">PORT67<span> / VIDEO</span></Link>
        <div className="f-workspace-label">CREATIVE WORKSPACE</div>
        <nav aria-label="Workspace navigation">
          {NAV.map(({ id, label: text, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => { setTab(id); setMobile(false); }}><Icon size={18} />{text}</button>
          ))}
        </nav>
        {ownerAdmin && (
          <>
            <div className="f-workspace-label">ADMIN</div>
            <nav aria-label="Admin">
              <Link href="/portal" className="f-text-button"><ShieldCheck size={16} /> Admin pages: AI agents, costs, team</Link>
            </nav>
          </>
        )}
        <div className="f-sidebar-bottom">
          <div>
            <strong>{principal.email || "Producer"}</strong>
            <span>{ownerAdmin ? "Admin" : "Producer"}</span>
          </div>
          <button type="button" onClick={onSignOut} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
      <div className="f-main">
        <header className="f-topbar">
          <button className="f-mobile-menu" aria-label="Open navigation" onClick={() => setMobile(!mobile)}><Menu /></button>
          <div className="f-breadcrumb">Workspace / <span>{label}</span></div>
        </header>
        {children}
      </div>
    </div>
  );
}

export default function Workspace() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const refresh = useCallback(async () => {
    const session = await api<{ principal: Principal | null }>("session");
    setPrincipal(session.principal);
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try { await refresh(); } catch (e) { if (active) setError((e as Error).message); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [refresh]);
  async function signOut() {
    try { await api("logout", {}); } catch { /* the session cookie is cleared by the server; reload either way */ }
    setPrincipal(null);
  }

  if (loading) return <main className="f-loading"><p>Opening your workspace…</p></main>;
  if (!principal)
    return (
      <main className="f-shell">
        <div className="w-signin">
          <div className="f-login-card">
            <h1>Port67 video workspace</h1>
            <p>For Port67 producers and admins.</p>
            {/* Customers never sign in here, so account creation is not offered. */}
            <AccountLogin allowSignup={false} onAuthenticated={async (idToken) => { await api("identity-login", { idToken }); await refresh(); }} />
            <details className="f-legacy-login">
              <summary>Producer password access</summary>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const password = String(new FormData(e.currentTarget).get("password"));
                setError("");
                try { await api("login", { password }); await refresh(); } catch (err) { setError((err as Error).message); }
              }}>
                <Field label="Producer password"><input name="password" type="password" autoComplete="current-password" required minLength={16} /></Field>
                <button className="f-button secondary">Sign in</button>
              </form>
            </details>
            {error && <div className="f-toast error" role="alert">{error}</div>}
          </div>
        </div>
      </main>
    );
  if (!isStaff(principal))
    return (
      <main className="f-shell">
        <div className="w-signin">
          <div className="f-login-card">
            <h1>Producers and admins only</h1>
            <p>This workspace is for Port67 producers and admins. Ask the owner to add your email under Team access.</p>
            <button className="f-button secondary" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </main>
    );
  return (
    <Shell principal={principal} tab={tab} setTab={setTab} onSignOut={() => void signOut()}>
      {tab === "overview" && <Placeholder title="Overview">The overview will bring each customer account and its projects together. What goes here is still to be decided.</Placeholder>}
      {tab === "customers" && <CustomerAccounts />}
      {tab === "projects" && <Projects />}
    </Shell>
  );
}
