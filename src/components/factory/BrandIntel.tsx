"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import type { BrandIntelVersion } from "@/lib/factory/model";
import { SECTION_TITLES, TOTAL_CALLS } from "@/lib/factory/brand-intel";
import { RichText } from "./RichText";
import { api } from "./workspace-api";

// Brand Intelligence on the customer account (CHG-0108): the submit button that runs the agent, its progress, and the saved dossier.
const stamp = (at?: string) => (at ? at.slice(0, 16).replace("T", " ") + " UTC" : "");
const KNOWN = ["Cultural and Aesthetic Taboos", "Commercial and Pricing Boundaries", "Reputational and Regulatory Risks", "The Anti-Persona"];

/** Section 7 arrives with four sub-headings; split them into cards. Anything before the first heading is kept as an introduction. */
export function redLineCards(text: string): { intro: string; cards: { title: string; body: string }[] } {
  const parts = text.split(/^#{5}\s*(.+)$/m);
  const cards: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) cards.push({ title: parts[i].trim(), body: parts[i + 1].trim() });
  cards.sort((a, b) => KNOWN.indexOf(a.title) - KNOWN.indexOf(b.title));
  return { intro: (parts[0] || "").trim(), cards };
}

export function BrandIntelView({ name, versions, currentId, selectedId, busy, onSubmit, onSelect }: {
  name: string; versions: BrandIntelVersion[]; currentId: string | null; selectedId?: string; busy: boolean; onSubmit: () => void; onSelect: (id: string) => void;
}) {
  const running = versions.some((v) => v.status === "running");
  const shown = versions.find((v) => v.id === selectedId) || versions.find((v) => v.id === currentId) || versions[versions.length - 1];
  return (
    <section className="f-panel" aria-labelledby="brand-intel">
      <div className="f-section-heading"><h3 id="brand-intel">Brand Intelligence</h3></div>
      <p className="f-small">
        Submit when the inputs above are complete. The agent researches {name} from its website, social channels and the public web, and saves a Brand Foundation Dossier that later agents read.
        It makes {TOTAL_CALLS} paid AI calls, takes a few minutes, and never uses brand text that has not been authorised for AI reading. Uploaded files are not read yet.
      </p>
      <button type="button" className="f-button" disabled={busy || running} onClick={onSubmit}>
        <Sparkles size={15} /> {running ? "Researching…" : versions.length ? "Run again as a new version" : "Submit and run Brand Intelligence"}
      </button>
      {versions.length > 0 && (
        <div className="w-tabs" role="tablist" aria-label="Dossier versions">
          {versions.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={shown?.id === v.id} className={"f-button small" + (shown?.id === v.id ? "" : " secondary")} onClick={() => onSelect(v.id)}>
              Version {v.version}{v.id === currentId ? " (current)" : ""}{v.status === "failed" ? " (failed)" : v.status === "running" ? " (running)" : ""}
            </button>
          ))}
        </div>
      )}
      {shown && <Dossier v={shown} />}
    </section>
  );
}

function Dossier({ v }: { v: BrandIntelVersion }) {
  const red = v.sections["7"] ? redLineCards(v.sections["7"]) : undefined;
  const flow = (["1", "2", "3", "4", "5", "6"] as const).filter((id) => v.sections[id] || id === "6");
  return (
    <div className="w-dossier">
      <p className="f-small">Started {stamp(v.startedAt)} by {v.startedBy}{v.finishedAt ? `, finished ${stamp(v.finishedAt)}` : ""}. {v.calls} of {TOTAL_CALLS} calls done{v.model ? `, ${v.provider} ${v.model}` : ""}.</p>
      {v.status === "running" && <div className="f-callout" role="status">Working. This page updates by itself.</div>}
      {v.error && <div className="f-toast error" role="alert">{v.error}</div>}
      {v.warnings.length > 0 && <div className="f-callout">{v.warnings.join(". ")}.</div>}
      <div className="f-callout">Read for this run: {v.intake.purposeTextRead ? "typed brand purpose" : "no typed brand purpose"}, {v.intake.knownForRead ? "known-for text" : "no known-for text"}. {v.intake.filesNotRead.length ? `Files not read: ${v.intake.filesNotRead.join(", ")}.` : ""}</div>

      {v.sections["0"] && (
        <div className="w-verify">
          <h4><AlertTriangle size={16} aria-hidden="true" /> Verify before any creative work</h4>
          <RichText text={v.sections["0"]} />
        </div>
      )}

      {red && (
        <div className="w-redlines">
          <h4><ShieldAlert size={16} aria-hidden="true" /> Researched red lines</h4>
          <p className="f-small">Drawn from the brand&apos;s own history, statements and partnerships. These are not the client&apos;s stated red lines; confirm them with the client before relying on them.</p>
          {red.intro && <RichText text={red.intro} />}
          <div className="w-cards">
            {red.cards.map((c) => (
              <article key={c.title} className="w-card"><h5>{c.title}</h5><RichText text={c.body} /></article>
            ))}
          </div>
        </div>
      )}

      {flow.map((id) => (
        <details key={id} className="w-section" open={id === "1"}>
          <summary><span className="w-num">{id}</span> <strong>{SECTION_TITLES[id]}</strong></summary>
          {id === "6" && (
            <div className="f-callout">
              <strong>Hard client red lines (verbatim from intake)</strong>
              {v.redLines.length === 0 ? <div>None recorded.</div> : <ul>{v.redLines.map((r, i) => <li key={i}>{r.category}: {r.text}{r.reason ? ` (${r.reason})` : ""}</li>)}</ul>}
            </div>
          )}
          {v.sections[id] ? <RichText text={v.sections[id]!} /> : null}
        </details>
      ))}
      {v.sources.length > 0 && (
        <details className="w-section">
          <summary><strong>Sources found ({v.sources.length})</strong></summary>
          <ul className="w-sources">{v.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>)}</ul>
        </details>
      )}
    </div>
  );
}

export function BrandIntel({ customerId, name }: { customerId: string; name: string }) {
  const [versions, setVersions] = useState<BrandIntelVersion[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = versions.some((v) => v.status === "running");
  const alive = useRef(true);

  const load = useCallback(async () => {
    const data = await api<{ versions: BrandIntelVersion[]; currentId: string | null }>(`brand-intel/${customerId}`);
    if (alive.current) { setVersions(data.versions); setCurrentId(data.currentId); }
  }, [customerId]);
  useEffect(() => {
    alive.current = true;
    void (async () => { try { await load(); } catch (e) { if (alive.current) setError((e as Error).message); } })();
    return () => { alive.current = false; };
  }, [load]);
  // While a run is going, check every five seconds.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => { void load().catch(() => undefined); }, 5000);
    return () => clearInterval(t);
  }, [running, load]);

  async function submit() {
    setBusy(true); setError("");
    try { await api(`brand-intel/${customerId}`, { action: "submit" }); setSelected(undefined); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
      {error && <div className="f-toast error" role="alert">{error}</div>}
      <BrandIntelView name={name} versions={versions} currentId={currentId} selectedId={selected} busy={busy} onSubmit={() => void submit()} onSelect={setSelected} />
    </>
  );
}
