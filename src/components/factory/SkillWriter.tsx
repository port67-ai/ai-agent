"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Save, Sparkles } from "lucide-react";
import { post } from "./agent-client";
import { Field } from "./shared";

type Config = { agents: { agent: string; title: string; purpose: string; current: string; version: number }[]; models: string[]; defaultModel: string; efforts: string[]; keyConfigured: boolean; maxSkillChars: number; maxOutside: number };
type Result = { skill: string; removed: string[]; kept: string[]; variablesUsed: string[]; conflicts: string[]; testQuestions: string[]; problems: string[]; model: string; usage: Record<string, number>; chars: number };

/** Admin tab: write or adapt a skill for one agent with a strong reasoning model. It returns text; saving is a separate, explicit step. */
export default function SkillWriter() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [agent, setAgent] = useState("");
  const [outside, setOutside] = useState("");
  const [change, setChange] = useState("");
  const [notes, setNotes] = useState("");
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("high");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [text, setText] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);

  useEffect(() => {
    post<Config>("skill-writer").then((c) => { setCfg(c); setModel(c.defaultModel); setAgent(c.agents[0]?.agent || ""); }).catch((e) => setError((e as Error).message));
  }, []);
  const row = cfg?.agents.find((a) => a.agent === agent);
  const groups = useMemo(() => {
    const g: Record<string, Config["agents"]> = { Research: [], Drafting: [], Reviewers: [], Other: [] };
    for (const a of cfg?.agents || []) (a.agent.startsWith("research:") ? g.Research : a.agent.startsWith("synthesis:") ? g.Drafting : a.agent.startsWith("review:") ? g.Reviewers : g.Other).push(a);
    return Object.entries(g).filter(([, v]) => v.length);
  }, [cfg]);

  async function create() {
    setBusy(true); setError(""); setOk(""); setRes(null);
    try {
      const r = await post<{ result: Result }>("skill-writer", { agent, outsideSkill: outside, change, notes, model, effort });
      setRes(r.result); setText(r.result.skill);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!row || !text.trim()) return;
    if (!window.confirm(`Save this as a new version of the ${row.title} skill? The agent uses it from its next call. You can roll back from its version history.`)) return;
    setBusy(true); setError(""); setOk("");
    try {
      await post("skills", { agent, body: text, note: "Written with the skill writer (" + (res?.model || model) + ")" });
      setOk("Saved as a new version. The agent uses it from its next call.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setOk("Copied."); } catch { setOk("Select the text and copy it."); }
  }

  if (!cfg && !error) return <section className="f-panel"><p className="f-small">Loading…</p></section>;
  const tokens = res ? `${res.usage.input_tokens ?? "?"} in, ${res.usage.output_tokens ?? "?"} out${res.usage.reasoning_output_tokens ? `, ${res.usage.reasoning_output_tokens} reasoning` : ""}` : "";
  return (
    <section className="f-panel" aria-label="Skill writer">
      <div className="f-eyebrow">Admin · Skill writer</div>
      <h2>Write or adapt a skill for an agent</h2>
      <p className="f-small">Choose the agent, paste a skill that already works elsewhere if you have one, say what you want, and a strong OpenAI reasoning model returns a skill written for this system. It follows the adaptation method: keep what works, drop tools and layout the agent cannot use, and name the business, market and channels with variables. Nothing is saved until you save it as a new version. Each call is metered and counts against the spend caps; a pro model can cost around a dollar or more.</p>
      {cfg && !cfg.keyConfigured && <p className="f-team-error" role="alert">The OpenAI key is not set on the server (PORT67_OPENAI_API_KEY), so the writer cannot run.</p>}
      {cfg && (
        <>
          <Field label="Agent to write a skill for">
            <select value={agent} onChange={(e) => { setAgent(e.target.value); setRes(null); }}>
              {groups.map(([g, list]) => <optgroup key={g} label={g}>{list.map((a) => <option key={a.agent} value={a.agent}>{a.title}</option>)}</optgroup>)}
            </select>
          </Field>
          {row && (
            <p className="f-small">
              {row.purpose} <button type="button" className="f-text-button" onClick={() => setShowCurrent((v) => !v)}>{showCurrent ? "Hide" : "Show"} the skill it runs now (v{row.version})</button>
            </p>
          )}
          {row && showCurrent && <pre className="f-small" style={{ whiteSpace: "pre-wrap" }}>{row.current}</pre>}
          <Field label={`Skill to adapt (optional, from another system or one that works; up to ${cfg.maxOutside} characters)`}>
            <textarea className="f-skill-text" value={outside} onChange={(e) => setOutside(e.target.value)} rows={8} maxLength={cfg.maxOutside} />
          </Field>
          <Field label="What you want it to do or change (required)">
            <textarea value={change} onChange={(e) => setChange(e.target.value)} rows={3} maxLength={2000} placeholder="e.g. Find dated social trends for this business on its chosen channels; record the date and source of each." />
          </Field>
          <Field label="Supplementary notes or questions (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
          </Field>
          <div className="f-form-grid">
            <Field label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)}>{cfg.models.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            </Field>
            <Field label="Reasoning effort">
              <select value={effort} onChange={(e) => setEffort(e.target.value)}>{cfg.efforts.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            </Field>
          </div>
          <button className="f-button" disabled={busy || !cfg.keyConfigured || !change.trim()} onClick={() => void create()}>
            {busy ? "Writing, this can take a minute or two…" : "Create new skill"} <Sparkles size={14} />
          </button>
        </>
      )}
      {error && <p className="f-team-error" role="alert">{error}</p>}
      {ok && <p className="f-team-ok" role="status">{ok}</p>}
      {res && (
        <div style={{ marginTop: 16 }}>
          <h3>New skill ({text.length} characters)</h3>
          <textarea className="f-skill-text" value={text} onChange={(e) => setText(e.target.value)} rows={14} style={{ width: "100%" }} aria-label="New skill text" />
          {res.problems.map((p) => <p key={p} className="f-team-error" role="alert">{p}</p>)}
          <div className="f-actions">
            <button className="f-button secondary" onClick={() => void copy()}><Copy size={14} /> Copy</button>
            <button className="f-button" disabled={busy || text.length > cfg!.maxSkillChars} onClick={() => void save()}><Save size={14} /> Save as new version of this agent</button>
          </div>
          <p className="f-small">Model {res.model}; {tokens}. Edit the text above before saving if you want; saving checks the variables again.</p>
          {([["Removed and why", res.removed], ["Kept or brought across", res.kept], ["Conflicts with the system rules", res.conflicts], ["Test questions", res.testQuestions]] as [string, string[]][]).filter(([, l]) => l.length).map(([t, l]) => (
            <details key={t} open={t !== "Kept or brought across"}>
              <summary className="f-small"><strong>{t}</strong> ({l.length})</summary>
              <ul className="f-small">{l.map((x) => <li key={x}>{x}</li>)}</ul>
            </details>
          ))}
          {res.variablesUsed.length > 0 && <p className="f-small"><Check size={12} /> Variables used: {res.variablesUsed.map((v) => `{{${v}}}`).join(", ")}</p>}
        </div>
      )}
    </section>
  );
}
