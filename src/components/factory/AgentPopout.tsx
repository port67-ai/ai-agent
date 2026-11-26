"use client";
import { useState } from "react";
import { Bot } from "lucide-react";
import type { AgentSlot } from "@/lib/factory/agent-prompts";
import { modelUse } from "@/lib/factory/curated-models";
import { api } from "./workspace-api";

// The AI agent box on a project input (CHG-0113): which model the agent uses and the prompt it follows. Settings are shared by every project.
export type AgentSettings = {
  slot: string; label: string; stage: string;
  route: { provider: string; model: string; source: string } | { error: string };
  providers: { id: string; label: string; models: string[] }[];
  switches: { research: boolean; synthesis: boolean };
  prompt: { body: string; isDefault: boolean; version: number; by?: string; at?: string; defaultBody: string; placeholders: { key: string; label: string }[]; contract: string };
};
const stamp = (at?: string) => (at ? at.slice(0, 16).replace("T", " ") + " UTC" : "");

export function AgentPanel({ s, busy, onRoute, onPrompt, onReset }: { s: AgentSettings; busy: boolean; onRoute: (provider: string, model: string) => void; onPrompt: (body: string) => void; onReset: () => void }) {
  const current = "error" in s.route ? "" : `${s.route.provider}|${s.route.model}`;
  const [choice, setChoice] = useState(() => s.providers.some(p => p.models.some(m => `${p.id}|${m}` === current)) ? current : "");
  const [body, setBody] = useState(s.prompt.body);
  const listed = new Set(s.providers.flatMap((p) => p.models.map((m) => `${p.id}|${m}`)));
  const enabled = s.stage === "research" ? s.switches.research : s.switches.synthesis;
  return (
    <div className="w-agent">
      <h4>{s.label}</h4>
      <p className="f-small">
        {s.stage === "research" ? "Searches the web, so it needs a model with web search." : "Works from your saved information only, with no web search."}{" "}
        These settings are shared by every project.
        {!enabled && (s.stage === "research" ? " Live research is switched off in Render, so Generate from AI will refuse until PORT67_RESEARCH_ENABLED is true." : " AI drafting is switched off in Render, so Generate from AI will refuse until PORT67_SYNTHESIS_ENABLED is true.")}
      </p>

      <div className="f-form-grid">
        <label className="f-field">
          <span>Large language model</span>
          <select aria-label="Large language model" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {(!current || !listed.has(current)) && <option value="" disabled>{"error" in s.route ? s.route.error : "Choose an API-listed model"}</option>}
            {s.providers.map((p) => (
              <optgroup key={p.id} label={p.label}>{p.models.map((m) => <option key={m} value={`${p.id}|${m}`}>{m} — {modelUse(m)}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <div>
          <button type="button" className="f-button" disabled={busy || !listed.has(choice) || choice === current} onClick={() => { const [provider, model] = choice.split("|"); onRoute(provider, model); }}>Save model</button>
          {"provider" in s.route && <span className="f-small"> Now using {s.route.provider}: {s.route.model} ({s.route.source === "slot" ? "set for this agent" : "default"}).</span>}
        </div>
        {current && !listed.has(current) && <p className="f-small" role="status">The configured model is outside the current recommended shortlist (or unavailable). Choose an available model before changing the route.</p>}
        {s.providers.length > 0 && listed.size === 0 && <p className="f-small">No recommended models returned by the configured APIs. Close and reopen to retry.</p>}
        {s.providers.length === 0 && <p className="f-small">No AI provider key{s.stage === "research" ? " with web search (OpenAI or Gemini)" : ""} is set in Render yet.</p>}
      </div>

      <details className="w-dropdown">
        <summary>Prompt <span className="f-small">{s.prompt.isDefault ? "(original)" : `(version ${s.prompt.version}, edited ${stamp(s.prompt.at)} by ${s.prompt.by})`}</span></summary>
        {s.prompt.placeholders.length > 0 && (
          <p className="f-small">Filled in automatically from the customer account and this project: {s.prompt.placeholders.map((p) => <code key={p.key}>{`{{${p.key}}}`} </code>)}</p>
        )}
        <textarea aria-label="Prompt" className="w-prompt" rows={20} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="w-agent-actions">
          <button type="button" className="f-button" disabled={busy || !body.trim() || body.trim() === s.prompt.body.trim()} onClick={() => onPrompt(body)}>Save prompt</button>
          <button type="button" className="f-button secondary" disabled={busy || s.prompt.isDefault} onClick={() => { if (window.confirm("Go back to the original prompt? Your edits stay in the history.")) { setBody(s.prompt.defaultBody); onReset(); } }}>Reset to original</button>
        </div>
        <details className="w-dropdown">
          <summary>Fixed output rules <span className="f-small">(added after your prompt, not editable)</span></summary>
          <pre className="w-contract">{s.prompt.contract}</pre>
        </details>
      </details>
    </div>
  );
}

export function AgentPopout({ slot }: { slot: AgentSlot }) {
  const [s, setS] = useState<AgentSettings>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  async function run(body?: Record<string, unknown>, done = "") {
    setBusy(true); setError(""); setNote("");
    try { setS(await api<AgentSettings>(`agent-settings/${slot}`, body)); if (done) setNote(done); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <details className="w-dropdown w-agentbox" onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; setOpen(o); if (o) void run(); }}>
      <summary><Bot size={14} aria-hidden="true" /> AI agent</summary>
      {open && !s && !error && <p className="f-small">Loading…</p>}
      {error && <div className="f-toast error" role="alert">{error}</div>}
      {note && <div className="f-callout" role="status">{note}</div>}
      {s && (
        <AgentPanel key={s.prompt.version + (s.prompt.isDefault ? "d" : "e") + ("provider" in s.route ? s.route.model : "")} s={s} busy={busy}
          onRoute={(provider, model) => void run({ action: "route", provider, model }, "Model saved. It applies to every project.")}
          onPrompt={(body) => void run({ action: "prompt", body }, "Prompt saved as a new version. It applies to every project.")}
          onReset={() => void run({ action: "reset-prompt" }, "Back to the original prompt.")} />
      )}
    </details>
  );
}
