"use client";
import { Check, Sparkles, X } from "lucide-react";
import { formatById } from "@/lib/factory/formats";
import { Tag, Empty, Actions } from "./shared";

/** The weekly research pack (what the project knows, ranked next actions) and the ideas bank (a producer keeps the best, drops the rest). */
export default function Ideas({ p, busy, command, aiReady, onAi }: Actions & { aiReady?: boolean; onAi?: () => void }) {
  const pack = p.researchPack;
  const ideas = p.ideas || [];
  const km = p.strategies.at(-1)?.keyMessages || [];
  return (
    <>
      {pack && (
        <section className="f-panel">
          <div className="f-eyebrow">Research pack</div>
          <p className="f-small">What the project holds right now. The pack suggests; you decide. It does not write ads.</p>
          {pack.sections.map((s) => (
            <div key={s.title}>
              <h3>{s.title}</h3>
              {s.items.length ? <ul className="f-small">{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="f-small">Nothing accepted yet.</p>}
            </div>
          ))}
          <h3>Ranked next actions</h3>
          {pack.actions.length ? <ol className="f-small">{pack.actions.map((a) => <li key={a.rank}>{a.text}</li>)}</ol> : <p className="f-small">Nothing outstanding.</p>}
        </section>
      )}
      <section className="f-panel">
        <div className="f-section-heading">
          <div>
            <div className="f-eyebrow">Ideas bank</div>
            <p className="f-small">Ideas are built from the direction&apos;s key messages, the chosen formats and the audience segments. Keep the strongest few; they carry the strapline unchanged.</p>
          </div>
          <div className="f-actions">
            {aiReady && (
              <button className="f-button" disabled={busy || !km.length || !p.formats?.selected.length} onClick={onAi}>
                Generate with AI <Sparkles size={14} />
              </button>
            )}
            <button className="f-button secondary" disabled={busy || !km.length} onClick={() => void command({ type: "generateIdeas" }, "Ideas added to the bank.")}>
              Generate (rules) <Sparkles size={14} />
            </button>
          </div>
        </div>
        {!km.length && <p className="f-small">Draft a direction with key messages first.</p>}
        {!p.formats?.selected.length && <p className="f-small">Choose the ad formats first to use the AI ideas agent.</p>}
        {!ideas.length ? (
          <Empty title="No ideas yet">Press Generate ideas to propose up to ten.</Empty>
        ) : (
          ideas.filter((i) => i.status !== "dropped").sort((a, b) => a.rank - b.rank).map((i) => (
            <div key={i.id} className="f-review">
              <strong>{i.title}</strong> <Tag>{formatById(i.format)?.name || i.format}</Tag> <Tag>{i.by === "ai" ? "AI" : "rules"}</Tag> <Tag tone={i.status === "kept" ? "good" : "neutral"}>{i.status}</Tag> <Tag>{i.priority} priority</Tag>
              <p className="f-small">Hook: {i.hook}</p>
              {i.angle && <p className="f-small">Angle: {i.angle}</p>}
              <p className="f-small">Key message: {km[i.keyMessage]?.message || "n/a"}</p>
              <p className="f-small">Judge it on: {i.criteria.join("; ")}.</p>
              <p className="f-small">Production notes: {i.productionNotes}</p>
              <div className="f-actions">
                {i.status !== "kept" && <button className="f-button small" disabled={busy} onClick={() => void command({ type: "keepIdea", id: i.id }, "Idea kept.")}>Keep <Check size={14} /></button>}
                <button className="f-button secondary small" disabled={busy} onClick={() => void command({ type: "dropIdea", id: i.id }, "Idea dropped.")}>Drop <X size={14} /></button>
                <select aria-label="Priority" value={i.priority} onChange={(e) => void command({ type: "setIdeaPriority", id: i.id, priority: e.target.value })}>
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
