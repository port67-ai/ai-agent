"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";
import { PROVIDERS, SLOTS, providerLabel } from "@/lib/factory/ai-slots";
import type { FailedAgent } from "@/lib/factory/failed-agents";
import type { RerunResult } from "@/lib/factory/agent-rerun";
import type { Routing, Suggest } from "./agent-client";

// Rerun one failed agent for one project (CHG-0100): the failure in plain English, the raw message in a fold, the recommendation,
// the current model, and a model picker (admins only) prefilled with another configured provider when the failure means the same
// provider will fail again (quota, key or model).
export type RerunReply = { result?: RerunResult; results?: RerunResult[]; stopped?: RerunResult; failed?: FailedAgent[] };
export async function postRerun(projectId: string, path: "rerun" | "rerun-failed", body: Record<string, unknown>): Promise<RerunReply> {
  const response = await fetch(`/api/factory/projects/${projectId}/agents/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, confirm: true }), cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Rerun failed");
  return data;
}
const route = (r?: { provider: string; model: string }) => (r ? `${providerLabel(r.provider)} ${r.model}` : "");
const isResearch = (slot: string) => SLOTS.find((s) => s.id === slot)?.stage === "research";
/** Another provider with a key that fits this agent: research needs OpenAI or Gemini, image generation OpenAI only. */
export function suggestSwitch(agent: Pick<FailedAgent, "slot" | "provider">, routing?: Routing | null, suggest?: Suggest | null): { provider: string; model: string } | undefined {
  if (!routing) return undefined;
  const research = isResearch(agent.slot);
  const fits = (id: string) => (!research || PROVIDERS.find((p) => p.id === id)?.research) && (agent.slot !== "studio:image" || id === "openai");
  const choices = routing.providers.filter((p) => p.keyConfigured && p.id !== agent.provider && fits(p.id));
  for (const p of choices) {
    const known = [routing.config.slots?.[agent.slot], routing.config.defaults?.[research ? "research" : "synthesis"], ...Object.values(routing.config.slots || {})].find((r) => r?.provider === p.id)?.model;
    const model = suggest?.best[p.id] || known;
    if (model) return { provider: p.id, model };
  }
  return choices[0] ? { provider: choices[0].id, model: "" } : undefined;
}

export default function RerunDialog({ projectId, agent, name, current, admin, routing, suggest, onClose, onDone }: { projectId: string; agent: FailedAgent; name?: string; current?: { provider: string; model: string }; admin: boolean; routing?: Routing | null; suggest?: Suggest | null; onClose: () => void; onDone: (ok: boolean) => void }) {
  const title = name || agent.label;
  const now = current || { provider: agent.provider, model: agent.model };
  const switchFirst = agent.failure.switchFirst;
  const proposal = switchFirst ? suggestSwitch(agent, routing, suggest) : undefined;
  const [provider, setProvider] = useState(proposal?.provider || now.provider);
  const [model, setModel] = useState(proposal?.model || now.model);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RerunResult | null>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose, busy]);
  const research = isResearch(agent.slot);
  const options = (routing?.providers || []).filter((p) => (!research || p.research) && (agent.slot !== "studio:image" || p.id === "openai"));
  const target = { provider, model: model.trim() };
  const same = target.provider === now.provider && target.model === now.model;
  async function go(switchTo?: { provider: string; model: string }) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const reply = await postRerun(projectId, "rerun", { slot: agent.slot, ...(switchTo ? { switchTo } : {}) });
      setResult(reply.result || null);
      onDone(!!reply.result?.ok);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rerunButton = (primary: boolean) => (
    <button ref={primary ? first : undefined} type="button" className={"f-button small" + (primary ? "" : " secondary")} disabled={busy || !agent.canRerun} onClick={() => void go()}>
      <RotateCcw size={14} aria-hidden="true" /> Rerun with {now.model || "the current model"}
    </button>
  );
  const switchButton = (primary: boolean) => admin ? (
    <button ref={primary ? first : undefined} type="button" className={"f-button small" + (primary ? "" : " secondary")} disabled={busy || !agent.canRerun || !target.provider || !target.model || same} onClick={() => void go(target)}>
      Switch to {target.model || "another model"} and rerun
    </button>
  ) : null;
  return (
    <div className="f-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="f-modal" role="dialog" aria-modal="true" aria-labelledby="f-rerun-title" data-rerun={agent.slot}>
        <div className="f-section-heading">
          <div>
            <h2 id="f-rerun-title">Rerun {title}</h2>
            <p className="f-small">Failed {agent.at.slice(0, 16).replace("T", " ")} UTC on {route(agent)}.</p>
          </div>
          <button type="button" className="f-text-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="f-callout" role="group" aria-label="What went wrong">
          <strong><AlertTriangle size={14} aria-hidden="true" /> {agent.failure.title}</strong>
          <p className="f-small">{agent.failure.what}</p>
          <p className="f-small"><strong>Recommended:</strong> {agent.failure.recommendation}</p>
          <details className="f-small"><summary>Raw error message</summary><pre className="f-rerun-raw">{agent.error}</pre></details>
        </div>
        {!!agent.pieces?.length && <p className="f-small">Pieces to redraw: {agent.pieces.map((x) => x.title).join(", ")}.</p>}
        {agent.wholeDraft && <p className="f-small">The first pre-production draft failed; the rerun drafts every piece once.</p>}
        <p className="f-small">Current model: <strong>{route(now) || "none"}</strong>. A rerun makes one paid call per agent{agent.pieces && agent.pieces.length > 1 ? " and piece" : ""}.</p>
        {!agent.canRerun && <p className="f-team-error" role="alert">{agent.why}</p>}
        {admin ? (
          <fieldset className="f-rerun-switch" disabled={busy}>
            <legend className="f-small">{switchFirst ? "Switch provider (recommended: the same provider will fail again)" : "Or switch model first"}</legend>
            <label>
              Provider
              <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(suggest?.best[e.target.value] || ""); }}>
                {!options.some((p) => p.id === provider) && <option value={provider}>{providerLabel(provider)}</option>}
                {options.map((p) => <option key={p.id} value={p.id} disabled={!p.keyConfigured}>{p.label}{p.keyConfigured ? "" : " (key not set in Render)"}{p.id === agent.provider && switchFirst ? " (failing)" : ""}</option>)}
              </select>
            </label>
            <label>
              Model ID
              <input list={"rerun-models-" + agent.slot} maxLength={180} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Exact model ID" />
              <datalist id={"rerun-models-" + agent.slot}>{(suggest?.models[provider] || []).map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <p className="f-small">Switching changes this agent&apos;s model for every project and is recorded in the AI models history.</p>
          </fieldset>
        ) : (
          <p className="f-small">{switchFirst ? "This failure will most likely repeat on the same provider. " : ""}Only an admin can switch this agent&apos;s model (AI agents page). Rerun with the current model, or ask an admin to switch it.</p>
        )}
        {busy && <p className="f-small" role="status"><Loader2 size={14} className="f-spin" aria-hidden="true" /> Running {title}. One paid call; this can take up to two minutes.</p>}
        {error && <p className="f-team-error" role="alert">{error}</p>}
        {result && (result.ok ? (
          <p className="f-team-ok" role="status">Done: {title} ran successfully{result.switched ? ` on ${result.to}` : ""}. The task is no longer blocked and the project carries on from here.</p>
        ) : (
          <div className="f-team-error" role="alert">
            <strong>It failed again: {result.failure?.title || "see the message"}.</strong> {result.failure?.recommendation}
            <details className="f-small"><summary>Raw error message</summary><pre className="f-rerun-raw">{result.error}</pre></details>
          </div>
        ))}
        <div className="f-actions">
          {result?.ok ? (
            <button ref={first} type="button" className="f-button small" onClick={onClose}>Close</button>
          ) : switchFirst ? (<>{switchButton(true)}{rerunButton(!admin)}</>) : (<>{rerunButton(true)}{switchButton(false)}</>)}
          {!result?.ok && <button type="button" className="f-text-button" disabled={busy} onClick={onClose}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}

/** Failed agents that block a page's work (studio stage pages): each with its plain-English failure and a Rerun button. */
export function FailedAgentsBar({ failed, onRerun, busy }: { failed: FailedAgent[]; onRerun?: (slot: string) => void; busy?: boolean }) {
  if (!failed.length) return null;
  return (
    <div className="f-callout f-failed-agents" role="group" aria-label="Failed agents">
      <strong><AlertTriangle size={14} aria-hidden="true" /> {failed.length === 1 ? "An AI agent failed" : `${failed.length} AI agents failed`} on this project</strong>
      <ul className="f-small">
        {failed.map((f) => (
          <li key={f.slot} data-failed={f.slot}>
            <strong>{f.label}</strong>{f.pieces?.length ? ` (${f.pieces.map((x) => x.title).join(", ")})` : ""}: {f.failure.title}. {f.failure.recommendation}{" "}
            {onRerun && <button type="button" className="f-button small" disabled={busy || !f.canRerun} title={f.why || "Rerun this agent"} onClick={() => onRerun(f.slot)}>Rerun</button>}
            {!f.canRerun && f.why && <span> {f.why}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
