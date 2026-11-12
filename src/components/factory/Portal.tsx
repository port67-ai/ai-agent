"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Layers3,
  Search,
  Compass,
  Clapperboard,
  FolderOpen,
  ChartNoAxesCombined,
  Settings2,
  Check,
  ChevronRight,
  LogOut,
  Link2,
  ShieldCheck,
  X,
  Sparkles,
  FileText,
  Menu,
  RefreshCw,
} from "lucide-react";
import type { Principal, Project } from "@/lib/factory/model";
import { Tag, Empty, Field, fields, researchLabels } from "./shared";
import Link from "next/link";
import { PortalWelcome } from "./Welcome";
export { PortalWelcome } from "./Welcome";
import Research from "./Research";
import WorkspaceSetup from "./WorkspaceSetup";
import Direction from "./Direction";
import Assets from "./Assets";
import Capabilities from "./Capabilities";
import BriefEditor from "./BriefEditor";
import { LogoField } from "./BriefEditor";
type Config = {
  demoEnabled: boolean;
  liveReady: boolean;
  researchReady: boolean;
  synthesisReady: boolean;
  storage: string;
};
type Tab =
  | "overview"
  | "brief"
  | "research"
  | "direction"
  | "production"
  | "assets"
  | "learning"
  | "capabilities"
  | "setup";
const nav: { id: Tab; label: string; icon: typeof Layers3 }[] = [
  { id: "overview", label: "Overview", icon: Layers3 },
  { id: "brief", label: "Business brief", icon: FileText },
  { id: "research", label: "Research room", icon: Search },
  { id: "direction", label: "Campaign direction", icon: Compass },
  { id: "production", label: "Production", icon: Clapperboard },
  { id: "assets", label: "Asset library", icon: FolderOpen },
  { id: "learning", label: "Performance learning", icon: ChartNoAxesCombined },
  { id: "capabilities", label: "Capabilities", icon: Settings2 },
  { id: "setup", label: "Workspace setup", icon: Settings2 },
];
async function api(path: string, data?: unknown) {
  const response = await fetch("/api/factory/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
export default function Portal() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [config, setConfig] = useState<Config>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newProject, setNewProject] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [invite, setInvite] = useState("");
  const p = projects.find((x) => x.id === selected) || projects[0];
  const operator = principal?.role === "operator";
  const refresh = useCallback(async () => {
    const session = await api("session");
    setPrincipal(session.principal);
    setConfig(session.config);
    if (session.principal) {
      const data = await api("projects");
      setProjects(data.projects);
    } else setProjects([]);
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const token = fragment.get("invite");
        if (token) {
          await api("session");
          window.history.replaceState(null, "", window.location.pathname);
          await api("client-login", { token });
        }
        if (active) await refresh();
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);
  async function run(fn: () => Promise<unknown>, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
      if (success) setNotice(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function command(data: Record<string, unknown>, success = "Saved") {
    if (!p) return;
    return run(
      () =>
        api("projects/" + p.id, {
          ...data,
          revision: p.revision,
          requestId: crypto.randomUUID(),
        }),
      success,
    );
  }
  function go(t: Tab) {
    setTab(t);
    setMobile(false);
    setError("");
    setNotice("");
  }
  if (loading)
    return (
      <main className="f-loading">
        <Layers3 size={30} />
        <p>Opening your workspace…</p>
      </main>
    );
  if (!principal)
    return (
      <PortalWelcome
        busy={busy}
        error={error}
        onDemo={() => void run(() => api("demo", {}))}
        onLogin={(password) => void run(() => api("login", { password }))}
      />
    );
  const strategy = p?.strategies.at(-1);
  const approved = strategy?.status === "approved" && !p?.deliveryPaused;
  const approvedAssets =
    p?.assets.filter(
      (x) =>
        !p?.deliveryPaused &&
        x.status === "approved" &&
        x.strategyHash === strategy?.hash,
    ) || [];
  const stage =
    p?.deliveryPaused && strategy?.status === "approved"
      ? "Revision in progress — delivery paused"
      : approvedAssets.length
        ? "Delivery ready"
        : p?.assets.length
          ? "In production"
          : strategy?.status === "shared"
            ? "Awaiting your direction approval"
            : approved
              ? "Direction approved"
              : strategy
                ? "Shaping the direction"
                : "Research in progress";
  return (
    <div className="f-shell">
      <aside className={"f-sidebar " + (mobile ? "open" : "")}>
        <Link className="f-wordmark" href="/">
          PORT67<span> / EXPLAIN</span>
        </Link>
        <div className="f-workspace-label">CREATIVE WORKSPACE</div>
        <nav aria-label="Workspace navigation">
          {nav
            .filter(
              (n) =>
                operator ||
                !["production", "capabilities", "setup"].includes(n.id),
            )
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => go(id)}
              >
                <Icon size={18} />
                {label}
                {id === "assets" && !!p?.assets.length && (
                  <span className="f-count">{p.assets.length}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="f-sidebar-bottom">
          <div className="f-producer-icon">P67</div>
          <div>
            <strong>{operator ? "Port67 producer" : "Customer review"}</strong>
            <span>
              {principal.demo
                ? "Isolated demo workspace"
                : "Managed creative services"}
            </span>
          </div>
          <button
            aria-label="Sign out"
            onClick={() => void run(() => api("logout", {}))}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="f-main">
        <header className="f-topbar">
          <button
            className="f-mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="f-breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>{p?.brief.business || "Your projects"}</span>
          </div>
          <div className="f-top-actions">
            {principal.demo ? (
              <>
                <Tag tone="orange">SYNTHETIC DEMO</Tag>
                <button
                  className="f-text-button"
                  disabled={busy || !p}
                  onClick={() =>
                    void run(() =>
                      api("demo-role", {
                        role: operator ? "customer" : "operator",
                        projectId: p?.id,
                      }),
                    )
                  }
                >
                  {operator ? "View as customer" : "Back to producer"}{" "}
                  <ArrowUpRight size={14} />
                </button>
              </>
            ) : (
              <Tag tone="green">PRIVATE WORKSPACE</Tag>
            )}
            <button
              className="f-icon-button"
              aria-label="Refresh workspace"
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>
        {principal.demo && (
          <div className="f-demo-note">
            Explore the full workflow with a fictional brand. Research is
            synthetic; asset drafts use built-in templates. No live research or
            publishing runs in this demo.
          </div>
        )}
        <div className="f-content">
          <div className="f-page-header">
            <div>
              <div className="f-eyebrow">
                EXPLAIN / {nav.find((x) => x.id === tab)?.label.toUpperCase()}
              </div>
              <h1>
                {tab === "overview"
                  ? "Good work starts with understanding."
                  : nav.find((x) => x.id === tab)?.label}
              </h1>
              <p>
                {tab === "overview"
                  ? "Research-led marketing content and creative production."
                  : p
                    ? "Every decision connected. Every version accounted for."
                    : "Create a project to begin."}
              </p>
            </div>
            <div className="f-project-tools">
              <select
                aria-label="Select project"
                value={p?.id || ""}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setInvite("");
                }}
              >
                {projects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.brief.business}
                  </option>
                ))}
              </select>
              {operator && (
                <button
                  className="f-button small"
                  onClick={() => setNewProject(true)}
                >
                  <Plus size={16} /> New brief
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="f-alert error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="f-alert success" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {tab === "setup" ? (
            <WorkspaceSetup />
          ) : !p ? (
            <Empty title="Your next project starts here">
              Create a brief, invite your customer and build the evidence behind
              the campaign.
            </Empty>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className="f-hero-panel">
                    <div>
                      <Tag tone="light">{stage}</Tag>
                      <h2>
                        {p.brief.business}
                        <span>{p.brief.objective}</span>
                      </h2>
                      <p>
                        A shared path from the first question to the final
                        asset.
                      </p>
                      <button
                        className="f-button light"
                        onClick={() => go(strategy ? "direction" : "research")}
                      >
                        {strategy
                          ? "Open campaign direction"
                          : "Explore the research"}
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <div className="f-orbit" aria-hidden="true">
                      <div className="f-orbit-ring" />
                      <div className="f-orbit-ring second" />
                      <span className="f-orbit-centre">
                        <Compass size={46} />
                      </span>
                      <span className="f-orbit-dot one">Insight</span>
                      <span className="f-orbit-dot two">Direction</span>
                      <span className="f-orbit-dot three">Creation</span>
                    </div>
                  </div>
                  <div className="f-stats">
                    {[
                      {
                        name: "Research sources",
                        value: p.sources.length,
                        detail: principal.demo
                          ? "Synthetic evidence, clearly labelled"
                          : "Collected sources",
                        tab: "research",
                      },
                      {
                        name: "Reviewed evidence",
                        value: p.sources.filter((s) => s.status === "supported")
                          .length,
                        detail: "Available to support direction",
                        tab: "research",
                      },
                      {
                        name: "Creative versions",
                        value: p.strategies.length,
                        detail: strategy
                          ? "Latest: v" + strategy.version
                          : "Ready for the first proposal",
                        tab: "direction",
                      },
                      {
                        name: "Approved assets",
                        value: approvedAssets.length,
                        detail: "Ready for customer delivery",
                        tab: "assets",
                      },
                    ].map((s) => (
                      <button key={s.name} onClick={() => go(s.tab as Tab)}>
                        <span>
                          {s.name}
                          <ArrowUpRight size={16} />
                        </span>
                        <strong>{s.value.toString().padStart(2, "0")}</strong>
                        <small>{s.detail}</small>
                      </button>
                    ))}
                  </div>
                  <section className="f-section">
                    <div className="f-section-heading">
                      <h2>The connected creative process</h2>
                      <span className="f-small">
                        Evidence travels with the work
                      </span>
                    </div>
                    <div className="f-pipeline">
                      {[
                        {
                          t: "brief",
                          n: "01",
                          title: "Brief",
                          desc: "Your business. Your ambition.",
                          done: true,
                        },
                        {
                          t: "research",
                          n: "02",
                          title: "Research",
                          desc: "Find the needs behind the brief.",
                          done: p.sources.length > 0,
                        },
                        {
                          t: "direction",
                          n: "03",
                          title: "Direction",
                          desc: "An evidence-backed point of view.",
                          done: approved,
                        },
                        {
                          t: "production",
                          n: "04",
                          title: "Production",
                          desc: "Turn the direction into assets.",
                          done: p.assets.length > 0,
                        },
                        {
                          t: "assets",
                          n: "05",
                          title: "Approval",
                          desc: "Refine, approve and deliver.",
                          done: approvedAssets.length > 0,
                        },
                      ].map((s) => (
                        <button
                          key={s.n}
                          onClick={() =>
                            go(
                              (!operator && s.t === "production"
                                ? "assets"
                                : s.t) as Tab,
                            )
                          }
                        >
                          <span
                            className={
                              "f-stage-number " + (s.done ? "complete" : "")
                            }
                          >
                            {s.done ? <Check size={15} /> : s.n}
                          </span>
                          <h3>{s.title}</h3>
                          <p>{s.desc}</p>
                          <ArrowRight size={16} />
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="f-two-col">
                    <section className="f-panel">
                      <div className="f-section-heading">
                        <h2>The evidence behind the idea</h2>
                        <Link2 size={18} />
                      </div>
                      {p.sources.slice(0, 3).map((s) => (
                        <div className="f-insight-row" key={s.id}>
                          <span className="f-insight-icon">
                            <Search size={17} />
                          </span>
                          <div>
                            <small>{researchLabels[s.segment]}</small>
                            <strong>{s.title}</strong>
                          </div>
                          <Tag
                            tone={
                              s.status === "supported" ? "green" : "neutral"
                            }
                          >
                            {s.kind === "synthetic" ? "Synthetic" : s.status}
                          </Tag>
                        </div>
                      ))}
                      <button
                        className="f-text-button"
                        onClick={() => go("research")}
                      >
                        Open research room <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="f-panel f-next">
                      <div className="f-eyebrow">YOUR NEXT STEP</div>
                      <h2>
                        {approved
                          ? "Bring the direction to life."
                          : strategy?.status === "shared"
                            ? "A direction worth discussing."
                            : "Build a point of view."}
                      </h2>
                      <p>
                        {approved
                          ? "Translate the approved strategy into scoped specialist briefs and reviewable creative drafts."
                          : "Connect what the research says to the message and visual direction. Approval happens before production."}
                      </p>
                      <button
                        className="f-button secondary"
                        onClick={() =>
                          go(approved && operator ? "production" : "direction")
                        }
                      >
                        {approved
                          ? operator
                            ? "Open production"
                            : "Review approved direction"
                          : "Review direction"}
                        <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                </>
              )}
              {tab === "brief" && (
                <>
                  <BriefEditor p={p} busy={busy} command={command} />
                  <div className="f-two-col">
                    <section className="f-panel">
                      <div className="f-section-heading">
                        <h2>The starting point</h2>
                        <Tag>Brief v1</Tag>
                      </div>
                      {Object.entries({
                        Business: p.brief.business,
                        Website: p.brief.website,
                        Objective: p.brief.objective,
                        Description: p.brief.description,
                        Audience: p.brief.audience,
                        Competitors: p.brief.competitors,
                        Inspiration: p.brief.inspiration,
                        "Approval contact": p.brief.contact,
                      }).map(([k, v]) => (
                        <div className="f-detail" key={k}>
                          <span>{k}</span>
                          <p>
                            {v ||
                              "Not supplied — a research or clarification opportunity"}
                          </p>
                        </div>
                      ))}
                      <div className="f-colour">
                        <i style={{ background: p.brief.brandColor }} />
                        {p.brief.brandColor}
                      </div>
                    </section>
                    <section className="f-panel f-fit">
                      <h2>Keep the ask small.</h2>
                      <p>
                        We start with the business, the ambition and an approval
                        contact. Research shapes the recommendation. Unknowns
                        stay visible instead of becoming assumptions.
                      </p>
                      {operator && !principal.demo && (
                        <>
                          <button
                            className="f-button secondary"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const data = await api(
                                  "projects/" + p.id + "/invite",
                                  {},
                                );
                                setInvite(data.invitation);
                              }, "Private invitation created. Generating a new one revokes the old link.")
                            }
                          >
                            Create customer invitation <Link2 size={16} />
                          </button>
                          <button
                            className="f-text-button"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => api("projects/" + p.id + "/revoke", {}),
                                "Customer invitations revoked",
                              )
                            }
                          >
                            Revoke customer access
                          </button>
                          {invite && (
                            <Field label="Private link — expires in 7 days">
                              <input
                                readOnly
                                value={invite}
                                onFocus={(e) => e.target.select()}
                              />
                            </Field>
                          )}
                        </>
                      )}
                      {principal.demo && (
                        <p className="f-callout">
                          Use “View as customer” to test the approval
                          experience. Real invitations are disabled in the
                          synthetic demo.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {tab === "research" && (
                <Research
                  p={p}
                  operator={operator}
                  busy={busy}
                  live={!!config?.researchReady && !principal.demo}
                  command={command}
                  aiReady={!!config?.synthesisReady && !principal.demo}
                  onGenerate={() =>
                    void run(
                      () =>
                        api("projects/" + p.id + "/synthesis", {
                          stage: "insights",
                        }),
                      "AI insight drafts created. Review their evidence before accepting them.",
                    )
                  }
                  onRecover={(id) =>
                    void run(
                      () =>
                        api("projects/" + p.id + "/recover-research", { id }),
                      "Interrupted research recovered. Review provider billing before another invocation.",
                    )
                  }
                  onRun={(segment) =>
                    void run(
                      () => api("projects/" + p.id + "/research", { segment }),
                      "Research returned cited sources. Review them before using them as evidence.",
                    )
                  }
                />
              )}
              {tab === "direction" && (
                <Direction
                  p={p}
                  operator={operator}
                  busy={busy}
                  command={command}
                  aiReady={!!config?.synthesisReady && !principal.demo}
                  onGenerate={() =>
                    run(
                      () =>
                        api("projects/" + p.id + "/synthesis", {
                          stage: "strategy",
                        }),
                      "AI campaign direction saved as an unshared draft. Review before sharing.",
                    )
                  }
                />
              )}
              {tab === "production" && (
                <>
                  <div className="f-panel f-production-head">
                    <div>
                      <Tag tone={approved ? "green" : "orange"}>
                        {approved ? "DIRECTION APPROVED" : "APPROVAL REQUIRED"}
                      </Tag>
                      <h2>One direction. Specialist execution.</h2>
                      <p>
                        Generate original SVG artwork, a 15-second HTML motion
                        storyboard and a copy/script package from the approved
                        direction. These are reviewable template-created
                        concepts, not finished cinematic video.
                      </p>
                    </div>
                    <button
                      className="f-button"
                      disabled={
                        busy ||
                        !approved ||
                        p.tasks.some((t) => t.strategyId === strategy?.id)
                      }
                      onClick={() =>
                        void command(
                          { type: "produce" },
                          "Three production briefs and creative drafts created. Review before sharing.",
                        )
                      }
                    >
                      Create production drafts <Sparkles size={17} />
                    </button>
                  </div>
                  {!p.tasks.length ? (
                    <Empty title="Production starts with an approved direction">
                      Share the campaign direction with the customer and capture
                      their approval first.
                    </Empty>
                  ) : (
                    <div className="f-task-grid">
                      {p.tasks.map((t) => (
                        <section className="f-panel" key={t.id}>
                          <div className="f-section-heading">
                            <Tag tone="green">Draft created</Tag>
                            <Clapperboard size={20} />
                          </div>
                          <h2>{t.role}</h2>
                          <p className="f-prewrap">{t.instructions}</p>
                          <h4>Acceptance checks</h4>
                          {t.acceptance.map((x) => (
                            <p className="f-check-line" key={x}>
                              <ShieldCheck size={15} />
                              {x}
                            </p>
                          ))}
                          <div className="f-lineage">
                            Direction {t.strategyHash.slice(0, 10)}
                            <br />
                            {t.evidenceIds.length} evidence links ·{" "}
                            {t.agentVersion}
                          </div>
                          <button
                            className="f-text-button"
                            onClick={() => go("assets")}
                          >
                            Review asset <ArrowRight size={15} />
                          </button>
                        </section>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tab === "assets" && (
                <Assets
                  p={p}
                  operator={operator}
                  busy={busy}
                  command={command}
                />
              )}
              {tab === "learning" && (
                <>
                  <div className="f-panel f-production-head">
                    <div>
                      <Tag tone="orange">PHASE TWO</Tag>
                      <h2>Learning starts with a clear hypothesis.</h2>
                      <p>
                        Capture what each creative direction is testing now.
                        Connect actual channel results later. There are no
                        connected ad accounts, observed performance metrics or
                        automatic publishing in this MVP.
                      </p>
                    </div>
                    <ChartNoAxesCombined size={48} />
                  </div>
                  {strategy ? (
                    <div className="f-two-col">
                      <section className="f-panel">
                        <div className="f-eyebrow">
                          CREATIVE HYPOTHESIS / V{strategy.version}
                        </div>
                        <h2>{strategy.hypothesis}</h2>
                        <div className="f-detail">
                          <span>Intended audience</span>
                          <p>{strategy.audience}</p>
                        </div>
                        <div className="f-detail">
                          <span>Proposed channel</span>
                          <p>{strategy.channels}</p>
                        </div>
                        <div className="f-detail">
                          <span>Limitations</span>
                          <p>{strategy.uncertainties}</p>
                        </div>
                      </section>
                      <section className="f-panel">
                        <h2>The future feedback loop</h2>
                        {[
                          "Connect authorised channel and analytics data",
                          "Map results to published asset versions",
                          "Compare signals with the creative hypothesis",
                          "Recommend the next test — with attribution limits",
                        ].map((x, i) => (
                          <div className="f-learning-step" key={x}>
                            <span>0{i + 1}</span>
                            {x}
                          </div>
                        ))}
                        <Tag>Not connected</Tag>
                      </section>
                    </div>
                  ) : (
                    <Empty title="Give the next campaign something to learn from">
                      Create a campaign direction to record its hypothesis and
                      intended outcome.
                    </Empty>
                  )}
                </>
              )}
              {tab === "capabilities" && (
                <Capabilities p={p} busy={busy} command={command} />
              )}
            </>
          )}
          <footer className="f-workspace-footer">
            <span>PORT67 / LISTEN FIRST. BUILD WHAT MATTERS.</span>
            <span>
              {principal.demo ? "Isolated synthetic demo" : config?.storage} ·{" "}
              {busy ? "Saving…" : "Workspace ready"}
            </span>
          </footer>
        </div>
      </div>
      {newProject && (
        <div className="f-modal-backdrop">
          <section
            className="f-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="brief-title"
          >
            <button
              className="f-modal-close"
              aria-label="Close new brief"
              onClick={() => setNewProject(false)}
            >
              <X />
            </button>
            <div className="f-eyebrow">START WITH THE ESSENTIALS</div>
            <h2 id="brief-title">What are we creating for?</h2>
            <p>A small brief to start. We build the understanding together.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = fields(e.currentTarget);
                void run(async () => {
                  const result = await api("projects", data);
                  setSelected(result.project.id);
                  setNewProject(false);
                  setTab("research");
                }, "Brief created");
              }}
            >
              <div className="f-form-grid">
                <Field label="Business name *">
                  <input name="business" required maxLength={120} />
                </Field>
                <Field label="Approval contact email *">
                  <input name="contact" type="email" required maxLength={180} />
                </Field>
              </div>
              <Field label="What do you want to achieve? *">
                <textarea
                  name="objective"
                  required
                  maxLength={1200}
                  placeholder="Introduce a product, explain a service, encourage a new habit…"
                />
              </Field>
              <Field label="Website">
                <input
                  name="website"
                  type="url"
                  placeholder="https://your-business.com"
                />
              </Field>
              <Field label="What should we know? (optional)">
                <textarea
                  name="description"
                  maxLength={4000}
                  placeholder="Your product, your audience, or what makes this moment important."
                />
              </Field>
              <details>
                <summary>Brand, competitors & inspiration (optional)</summary>
                <div className="f-form-grid">
                  <Field label="Brand colour">
                    <input
                      name="brandColor"
                      type="color"
                      defaultValue="#ec663c"
                    />
                  </Field>
                  <Field label="Known audience">
                    <input name="audience" maxLength={600} />
                  </Field>
                </div>
                <Field label="Competitors">
                  <textarea name="competitors" maxLength={2000} />
                </Field>
                <Field label="Inspirational brands or references">
                  <textarea name="inspiration" maxLength={2000} />
                </Field>
                <LogoField />
              </details>
              <button className="f-button" disabled={busy}>
                Create brief <ArrowRight size={17} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
