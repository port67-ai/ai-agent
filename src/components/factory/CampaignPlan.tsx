"use client";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { FORMATS } from "@/lib/factory/formats";
import { Tag, Field, Actions } from "./shared";

type Seg = { name: string; demographics?: string; description: string; angle: string };
const toLines = (segs: Seg[] = []) => segs.map((x) => [x.name, x.demographics || "", x.description, x.angle].join(" | ")).join("\n");
const fromLines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const [name, demographics = "", description = "", angle = ""] = l.split("|").map((x) => x.trim());
  return { name, demographics, description, angle };
});

/** The two decisions that shape every ad: which formats to make (a producer decides, the system suggests) and the strapline plus audience segments. */
export default function CampaignPlan({ p, operator, busy, command, aiReady, onAi, onAiAudiences }: Actions & { aiReady?: boolean; onAi?: () => void; onAiAudiences?: () => void }) {
  const f = p.formats;
  const [picked, setPicked] = useState<string[]>(f?.selected || []);
  const [strap, setStrap] = useState(p.audiences?.strapline || "");
  const [segs, setSegs] = useState(toLines(p.audiences?.segments));
  const sug = p.audienceSuggestion;
  const lastOf = (stage: string) => p.runs.filter((r) => r.stage === stage).at(-1);
  const failure = (stage: string) => { const r = lastOf(stage); return r?.status === "failed" && r.error ? r.error : ""; };
  const why = new Map((f?.suggested || []).map((s) => [s.id, s.reason]));
  const insightsReady = p.insights.some((i) => (i.status || "reviewed") !== "draft" && i.status !== "rejected");
  return (
    <section className="f-panel">
      <div className="f-eyebrow">Campaign plan</div>
      <h3>Ad formats {f?.decidedAt ? <Tag tone="good">chosen</Tag> : <Tag>not chosen yet</Tag>}</h3>
      {operator ? (
        <>
          <p className="f-small">After the insight review, choose what to make. Destination channels come from the customer; the formats are suggested from them and the objective, and you decide. The direction and copy are then written for these formats.</p>
          {aiReady && (
            <button className="f-button" disabled={busy || !insightsReady} onClick={onAi}>
              Suggest with AI <Sparkles size={14} />
            </button>
          )}
          {failure("formats") && <p className="f-small" style={{ color: "#b42318" }}>The last AI suggestion failed: {failure("formats")}</p>}
          {f?.suggestedBy === "ai" && <p className="f-small">These suggestions were written by the AI format agent. You still decide.</p>}
          {!f?.suggested?.length && (
            <button className="f-button secondary" disabled={busy || !insightsReady} onClick={() => void command({ type: "suggestFormats" }, "Formats suggested.")}>
              Suggest formats (rules) <Sparkles size={14} />
            </button>
          )}
          {!insightsReady && <p className="f-small">Review at least one insight first.</p>}
          {FORMATS.map((x) => (
            <label key={x.id} className="f-small" style={{ display: "block", margin: "6px 0" }}>
              <input type="checkbox" checked={picked.includes(x.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((i) => i !== x.id))} />{" "}
              <strong>{x.name}</strong>{why.has(x.id) ? <Tag tone="good"> suggested</Tag> : null}: {x.summary}
              {why.get(x.id) ? <em> Why: {why.get(x.id)}.</em> : null}
            </label>
          ))}
          <button className="f-button" disabled={busy || !picked.length} onClick={() => void command({ type: "selectFormats", formats: picked }, "Formats chosen. The direction is written for them.")}>
            Confirm formats <Check size={14} />
          </button>
        </>
      ) : (
        <p className="f-small">{f?.selected?.length ? FORMATS.filter((x) => f.selected.includes(x.id)).map((x) => x.name).join(", ") : "Your producer is choosing the best ad formats for your channels."}</p>
      )}
      <h3>Strapline, audience segments and demographics</h3>
      <p className="f-small">The strapline is the one message every ad carries, in every format and for every audience. Audience segments, with their demographics, change the angle, hook and tone, never the strapline.</p>
      {operator && aiReady && (
        <button className="f-button" disabled={busy || !insightsReady} onClick={onAiAudiences}>
          Suggest strapline and audiences with AI <Sparkles size={14} />
        </button>
      )}
      {operator && failure("audiences") && <p className="f-small" style={{ color: "#b42318" }}>The last AI suggestion failed: {failure("audiences")}</p>}
      {operator && sug && (
        <div className="f-small" style={{ margin: "8px 0" }}>
          <p>AI suggestions from the accepted research. Nothing is saved until you use it and press save.</p>
          {sug.straplines.map((s) => (
            <div key={s.text} style={{ margin: "4px 0" }}>
              <strong>{s.text}</strong> <em>{s.why}</em>{" "}
              <button className="f-button secondary" onClick={() => setStrap(s.text)}>Use this strapline</button>
            </div>
          ))}
          {sug.segments.map((s) => (
            <div key={s.name} style={{ margin: "4px 0" }}>
              <strong>{s.name}</strong>: {s.demographics}. {s.description} Angle: {s.angle}
            </div>
          ))}
          <button className="f-button secondary" onClick={() => setSegs(toLines(sug.segments))}>Use these segments</button>
        </div>
      )}
      <Field label="Strapline"><input value={strap} onChange={(e) => setStrap(e.target.value)} maxLength={120} /></Field>
      <Field label="Audience segments, one per line: name | demographics | who they are | angle that will land (up to six)">
        <textarea value={segs} onChange={(e) => setSegs(e.target.value)} rows={4} />
      </Field>
      <button className="f-button" disabled={busy} onClick={() => void command({ type: "setAudiences", strapline: strap, segments: fromLines(segs) }, "Strapline, segments and demographics saved.")}>
        Save strapline, segments and demographics <Check size={14} />
      </button>
    </section>
  );
}
