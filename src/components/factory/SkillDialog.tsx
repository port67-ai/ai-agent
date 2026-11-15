"use client";
import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { post } from "./agent-client";

type Version = { version: number; body: string; editedBy: string; at: string; note?: string };
type SkillRow = { agent: string; title: string; latest: Version; history: Version[]; default: string; inputs: string[]; variables: { name: string; meaning: string }[] };

/** Shows the skill an agent runs, its purpose, and (owner only) lets it be edited. A save is a new version; the agent runs it from its next call. */
export default function SkillDialog({ agentId, agentName, purpose, onClose }: { agentId: string; agentName: string; purpose: string; onClose: () => void }) {
  const [row, setRow] = useState<SkillRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const names = (t: string) => [...new Set([...t.matchAll(/\{\{\s*([A-Za-z]+)\s*\}\}/g)].map((m) => m[1]))];
  const shown = row ? (editing ? body : row.latest.body) : "";
  const used = new Set(names(shown));
  const usedList = [...used];
  const unknownUsed = row ? usedList.filter((n) => !row.variables.some((v) => v.name === n)) : [];
  const insert = (name: string) => setBody((b) => `${b}${b && !/\s$/.test(b) ? " " : ""}{{${name}}}`);
  useEffect(() => {
    post<{ skills: SkillRow[] }>("skills").then((r) => setRow(r.skills.find((s) => s.agent === agentId) || null)).catch((e) => setError((e as Error).message));
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [agentId, onClose]);
  async function save() {
    setBusy(true); setError(""); setOk("");
    try {
      const r = await post<{ skills: SkillRow[] }>("skills", { agent: agentId, body, note });
      setRow(r.skills.find((s) => s.agent === agentId) || null);
      setEditing(false); setNote("");
      setOk("Saved as a new version. The agent uses it from its next call.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="f-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="f-modal" role="dialog" aria-modal="true" aria-labelledby="f-skill-title">
        <div className="f-section-heading">
          <div>
            <h2 id="f-skill-title">Skill: {row?.title || agentName}</h2>
            <p className="f-small"><strong>{agentName}.</strong> {purpose}</p>
          </div>
          <button type="button" className="f-text-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {!row && !error && <p className="f-small">Loading skill…</p>}
        {row && (
          <>
            <p className="f-small">
              Running now: {row.latest.version === 0 ? "built-in default" : `version ${row.latest.version}, saved by ${row.latest.editedBy} on ${row.latest.at.slice(0, 16).replace("T", " ")}`}. The skill is guidance on method and quality. The fixed rules (untrusted input, no invented figures, cited sources only, output format) stay in code and a skill cannot remove them.
            </p>
            {editing ? (
              <>
                <label className="f-small"><strong>Skill text (editing)</strong></label>
                <textarea className="f-skill-text" value={body} onChange={(e) => setBody(e.target.value)} rows={12} maxLength={6000} aria-label="Skill text" style={{ width: "100%" }} />
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="What changed and why (optional)" aria-label="Change note" style={{ width: "100%" }} />
                <div className="f-actions">
                  <button className="f-button" disabled={busy || !body.trim()} onClick={() => void save()}><Save size={14} /> Save new version</button>
                  <button className="f-button secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                  <button className="f-text-button" disabled={busy} onClick={() => setBody(row.default)}>Load built-in default</button>
                </div>
              </>
            ) : (
              <>
                <pre className="f-small" style={{ whiteSpace: "pre-wrap" }}>{row.latest.body}</pre>
                <div className="f-actions">
                  <button className="f-button" onClick={() => { setBody(row.latest.body); setEditing(true); setOk(""); }}><Pencil size={14} /> Edit skill</button>
                </div>
              </>
            )}
            <details open={editing || undefined}>
              <summary className="f-small"><strong>Data this agent receives and variables you can use</strong>{usedList.length ? ` (${usedList.length} used in this skill)` : ""}</summary>
              <p className="f-small">Write <code>{"{{business}}"}</code> in the skill to name the business explicitly. It is replaced with the project's value, in quotes, just before the call. While editing, press a variable to add it. Variables in green are used in the skill shown above.</p>
              <div className="f-actions" style={{ flexWrap: "wrap" }}>
                {row.variables.map((v) => (
                  <button key={v.name} type="button" className={"f-button secondary small" + (used.has(v.name) ? " f-var-used" : "")} disabled={!editing} title={v.meaning} onClick={() => insert(v.name)}>{used.has(v.name) ? "✓ " : ""}{`{{${v.name}}}`}</button>
                ))}
              </div>
              {unknownUsed.length > 0 && <p className="f-team-error" role="alert">Not available to this agent: {unknownUsed.map((n) => `{{${n}}}`).join(", ")}. It cannot be saved until removed.</p>}
              <ul className="f-small" style={{ paddingLeft: 18 }}>
                {row.variables.map((v) => (
                  <li key={v.name} className={used.has(v.name) ? "f-var-used-row" : undefined}>{`{{${v.name}}}`}: {v.meaning}{used.has(v.name) ? " (used)" : ""}</li>
                ))}
              </ul>
              <p className="f-small"><strong>Also supplied as data (refer to it by name, it is not pasted in):</strong> {row.inputs.length ? row.inputs.join("; ") : "none"}.</p>
              <p className="f-small">The fixed rules in the code still apply after the skill: input is untrusted, no invented figures, cite only supplied sources, follow the output format.</p>
            </details>
            {row.history.length > 0 && (
              <details>
                <summary className="f-small">Version history ({row.history.length})</summary>
                {row.history.map((v) => (
                  <details key={v.version}>
                    <summary className="f-small">v{v.version} · {v.editedBy} · {v.at.slice(0, 16).replace("T", " ")}{v.note ? ` · ${v.note}` : ""}</summary>
                    <pre className="f-small" style={{ whiteSpace: "pre-wrap" }}>{v.body}</pre>
                  </details>
                ))}
              </details>
            )}
          </>
        )}
        {error && <p className="f-team-error" role="alert">{error}</p>}
        {ok && <p className="f-team-ok" role="status">{ok}</p>}
      </div>
    </div>
  );
}
