import type { Commission, RedLine } from "@/lib/factory/model";
import { EVIDENCE_BASIS, EVIDENCE_WHERE, INPUTS, STATUS_LABEL, baseline } from "@/lib/factory/commissions";
import { RED_LINE_CATEGORIES } from "@/lib/factory/customers";

// The Inspiration baseline (CHG-0107, FAC-VWS-016): a read-only page assembled from the inputs. No AI call.
const Lines = ({ items }: { items: { label: string; text: string }[] }) => items.length === 0 ? <p className="f-small">Nothing entered yet.</p> : (
  <dl>{items.map((i) => <div key={i.label}><dt className="f-small">{i.label}</dt><dd>{i.text}</dd></div>)}</dl>
);

export function InspirationBaseline({ commission, redLines }: { commission: Commission; redLines: RedLine[] }) {
  const v = baseline(commission, redLines);
  return (
    <div className="w-stack">
      <section className="f-panel" aria-labelledby="bl-status">
        <h3 id="bl-status">Inspiration baseline: {commission.name}</h3>
        <p className="f-small">Assembled from what has been entered. It shows even when incomplete.</p>
        <p>{INPUTS.map((d) => <span key={d.key} className="f-tag">Input {d.number}: {STATUS_LABEL[v.status[d.key]]}</span>)}</p>
      </section>
      <section className="f-panel" aria-labelledby="bl-gaps">
        <h3 id="bl-gaps">Gaps</h3>
        {v.gaps.length === 0 ? <p>Nothing is missing.</p> : <ul>{v.gaps.map((g) => <li key={g}>{g}</li>)}</ul>}
      </section>
      <section className="f-panel" aria-labelledby="bl-reach">
        <h3 id="bl-reach">Who to reach</h3>
        {v.audiences.length === 0 && v.reach.length === 0 && <p className="f-small">Nothing entered yet.</p>}
        {v.audiences.map((a) => (
          <div key={a.key} className="w-gen">
            <h4>{a.label} <span className="f-small">{a.range}</span> {a.selected && <span className="f-tag green">Selected for direction</span>}</h4>
            <Lines items={a.lines} />
          </div>
        ))}
        {v.reach.length > 0 && <div className="w-gen"><h4>Entered before age groups</h4><Lines items={v.reach} /></div>}
        <p className="f-small">{v.directionReady ? "Ready for direction." : "Select at least one saved age group to move on to direction."}</p>
      </section>
      <section className="f-panel" aria-labelledby="bl-achieve"><h3 id="bl-achieve">What to achieve</h3><Lines items={v.achieve} /></section>
      <section className="f-panel" aria-labelledby="bl-recognise">
        <h3 id="bl-recognise">What the audience should recognise</h3>
        <Lines items={v.recognise} />
        <h4>Preserve</h4>
        {v.preserve.length === 0 ? <p className="f-small">Nothing listed yet.</p> : <ul>{v.preserve.map((e) => <li key={e.id}>{e.text} <span className="f-small">({e.scope === "recurring" ? "recurs across years" : "single campaign"})</span></li>)}</ul>}
      </section>
      <section className="f-panel" aria-labelledby="bl-fresh">
        <h3 id="bl-fresh">Room for a fresh idea</h3>
        {v.fresh.length === 0 ? <p className="f-small">Nothing listed yet.</p> : <ul>{v.fresh.map((e) => <li key={e.id}><span className="f-tag">{e.kind === "out_of_character" ? "Out of character" : "Can change"}</span> {e.text}</li>)}</ul>}
        <h4>Guardrail: an example that went too far</h4>
        <p>{v.wentTooFar || <span className="f-small">None recorded yet.</span>}</p>
        <h4>Client red lines (customer account)</h4>
        {v.redLines.length === 0 ? <p className="f-small">None recorded.</p> : <ul>{v.redLines.map((l) => <li key={l.id}><span className="f-tag">{RED_LINE_CATEGORIES.find((c) => c.key === l.category)?.label}</span> {l.text}</li>)}</ul>}
      </section>
      <section className="f-panel" aria-labelledby="bl-proof"><h3 id="bl-proof">Proof</h3><Lines items={v.proof} /></section>
      <section className="f-panel" aria-labelledby="bl-evidence">
        <h3 id="bl-evidence">Evidence</h3>
        {v.evidence.length === 0 ? <p className="f-small">No evidence recorded yet.</p> : v.evidence.map((g) => (
          <div key={g.input}>
            <h4>{g.title}</h4>
            <ul>{g.items.map((e) => <li key={e.id}><span className="f-tag">{EVIDENCE_BASIS.find((b) => b.key === e.basis)?.label}</span> {e.source} <span className="f-small">{EVIDENCE_WHERE.find((w) => w.key === e.where)?.label}{e.note ? `. ${e.note}` : ""}</span></li>)}</ul>
          </div>
        ))}
      </section>
    </div>
  );
}
