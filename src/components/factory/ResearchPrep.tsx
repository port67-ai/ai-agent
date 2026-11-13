"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, ClipboardList, Download, FileSearch } from "lucide-react";
import type { Dossier, ResearchPlan } from "@/lib/factory/research-plan";

async function get<T>(path: string): Promise<T> {
  const response = await fetch("/api/factory/projects/" + path, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
type Project = { id: string; revision: number };

/** Readiness and plan: shown before research runs, so everyone can see what will be asked and what is missing. */
export function ResearchPrep({ p, operator }: { p: Project; operator: boolean }) {
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      get<{ plan: ResearchPlan }>(p.id + "/research-plan").then((r) => alive && setPlan(r.plan)).catch((e: Error) => alive && setError(e.message));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [p.id, p.revision]);
  if (error) return <section className="f-panel"><p className="f-team-error" role="alert">{error}</p></section>;
  if (!plan) return null;
  const missing = plan.checks.filter((c) => !c.ok);
  return (
    <section className="f-panel f-prep">
      <div className="f-section-heading">
        <div>
          <h2><ClipboardList size={18} aria-hidden="true" /> Research preparation</h2>
          <p className="f-small" role="status">
            {plan.ready ? "The brief has what the researchers need." : "Complete the required items first; research can still run, but the results will be weak."} Brief readiness {plan.score}%.
          </p>
        </div>
      </div>
      <ul className="f-prep-checks">
        {plan.checks.map((c) => (
          <li key={c.id} className={c.ok ? "ok" : c.level === "required" ? "bad" : "warn"}>
            {c.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
            <div>
              <strong>{c.label}</strong> <small>{c.level === "required" ? "required" : "recommended"}</small>
              {!c.ok && <span>{c.fix}</span>}
            </div>
          </li>
        ))}
      </ul>
      {plan.assumptions.length > 0 && (
        <div className="f-callout">
          <strong>What the researchers will assume</strong>
          <ul>{plan.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      <h3>What each researcher will be asked</h3>
      <div className="f-prep-segments">
        {plan.segments.map((s) => (
          <details key={s.segment}>
            <summary><strong>{s.label}</strong> <small>{s.questions.length} questions</small></summary>
            <p className="f-small">{s.delivers}</p>
            <p className="f-small"><strong>Starts from:</strong> {s.startFrom.join(" · ")}</p>
            <ul>{s.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </details>
        ))}
      </div>
      <h3>What the research produces</h3>
      <ul className="f-small">{plan.expectedOutputs.map((o) => <li key={o}>{o}</li>)}</ul>
      {operator && <p className="f-small">Each of the {plan.estimate.runs} research calls sends roughly {plan.estimate.inputTokensPerRun.toLocaleString()} input tokens before search results. {plan.estimate.note}</p>}
      {operator && missing.some((c) => c.level === "required") && <p className="f-team-error" role="alert">The brief is missing required items, so results will be weak until you add: {missing.filter((c) => c.level === "required").map((c) => c.label).join(", ")}.</p>}
    </section>
  );
}

/** The research output before any drafting. Producers see every source; customers only accepted ones. */
export function ResearchDossier({ p }: { p: Project }) {
  const [data, setData] = useState<{ dossier: Dossier; markdown: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      get<{ dossier: Dossier; markdown: string }>(p.id + "/research-dossier").then((r) => alive && setData(r)).catch(() => undefined);
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [p.id, p.revision]);
  if (!data || data.dossier.totals.sources === 0) return null;
  const d = data.dossier;
  const download = () => {
    const url = URL.createObjectURL(new Blob([data.markdown], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-dossier-${d.business.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "project"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="f-panel">
      <div className="f-section-heading">
        <div>
          <h2><FileSearch size={18} aria-hidden="true" /> Research dossier</h2>
          <p className="f-small" role="status">{d.totals.sources} sources ({d.totals.supported} supported, {d.totals.unreviewed} unreviewed, {d.totals.rejected} rejected), {d.totals.findings} findings, {d.totals.gaps} gaps. {d.nextStep}</p>
        </div>
        <button className="f-button secondary small" onClick={download}><Download size={14} /> Download (.md)</button>
      </div>
      <div className="f-prep-segments">
        {d.segments.map((s) => (
          <details key={s.segment}>
            <summary><strong>{s.label}</strong> <small>{s.sources.length} sources · {s.sources.reduce((n, x) => n + x.findings.length, 0)} findings · {s.gaps.length} gaps</small></summary>
            {s.sources.map((src) => (
              <div key={src.id} className="f-detail">
                <span>{src.title} · {src.status}{src.confidence ? ` · ${src.confidence}` : ""}</span>
                <small>{src.url}</small>
                <ul>{src.findings.map((f, i) => <li key={i}>{f.claim}{f.quote ? <em> &ldquo;{f.quote}&rdquo;</em> : null}</li>)}</ul>
              </div>
            ))}
            {s.gaps.length > 0 && <p className="f-small"><strong>Could not confirm:</strong> {s.gaps.join(" · ")}</p>}
          </details>
        ))}
      </div>
    </section>
  );
}
