"use client";
import { AlertTriangle, CircleSlash, Hourglass } from "lucide-react";
import type { agentsOverview } from "@/lib/factory/ai-agents";

type Flow = Awaited<ReturnType<typeof agentsOverview>>["flow"];
const usd = (micro: number) => "$" + (micro / 1e6).toFixed(micro >= 1e6 ? 2 : 4);
const secs = (ms?: number) => (ms === undefined ? "n/a" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const icon = { blocked: Hourglass, failed: AlertTriangle, idle: CircleSlash };
const label = { blocked: "Blocked by a person", failed: "Failing", idle: "Not flowing" };

export default function FlowHealth({ flow }: { flow: Flow }) {
  const top = flow.models[0];
  return (
    <>
      <section className="f-panel">
        <div className="f-section-heading">
          <div>
            <h2>Where data is blocked or not flowing</h2>
            <p className="f-small">Each line is worked out from counts in Firestore and the call ledger, across every account. Blocked means a person has to act; failing means a call did not complete; not flowing means nothing has passed through yet.</p>
          </div>
        </div>
        {flow.projectsError && <p className="f-team-error" role="alert">Project counts unavailable: {flow.projectsError}</p>}
        {flow.blockers.length === 0 ? (
          <p className="f-small" role="status">Nothing is blocked, failing or idle.</p>
        ) : (
          <ul className="f-team-list f-blockers">
            {flow.blockers.map((b, i) => {
              const I = icon[b.level];
              return (
                <li key={i} className={"f-blocker " + b.level}>
                  <I size={16} aria-hidden="true" />
                  <div>
                    <strong>{b.where}</strong>
                    <span>{label[b.level]}: {b.text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="f-panel">
        <div className="f-section-heading">
          <div>
            <h2>Business classifications</h2>
            <p className="f-small">What the scoping step decided each business is. Saved on the project in Firestore, so the researchers, the preparation panel and the dossier all read the same record. Stale means the brief changed after it was classified; it is redone at the next research start.</p>
          </div>
        </div>
        {!(flow.scopes || []).length ? (
          <p className="f-small">No business has been classified yet. It happens automatically when research starts.</p>
        ) : (
          <div className="f-flow-scroll">
            <table className="f-table">
              <thead>
                <tr><th>Business</th><th>Type</th><th>Size · reach</th><th>Audience</th><th>Source</th><th>Version</th><th>Status</th></tr>
              </thead>
              <tbody>
                {flow.scopes.map((r) => (
                  <tr key={r.accountId + r.projectId}>
                    <td><strong>{r.business}</strong></td>
                    <td>{r.businessType}<br /><span className="f-small">{r.category.replace(/_/g, " ")}{r.regulated ? " · regulated" : ""}</span></td>
                    <td>{r.size} · {r.reach}</td>
                    <td>{r.audienceModel}</td>
                    <td>{r.source === "ai" ? `AI${r.model ? " · " + r.model : ""}` : r.source}</td>
                    <td>v{r.version}</td>
                    <td>{r.current ? "Current" : "Stale"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="f-panel">
        <div className="f-section-heading">
          <div>
            <h2>Cost by model</h2>
            <p className="f-small">{top && top.microUsd > 0 ? `${top.provider} ${top.model} is the most expensive model so far (${top.sharePct}% of estimated spend).` : "No priced calls yet. Costs appear here once agents run."} Calls with no price are counted separately and are never treated as free.</p>
          </div>
        </div>
        {flow.models.length === 0 ? (
          <p className="f-small">No model has been called yet.</p>
        ) : (
          <div className="f-flow-scroll">
            <table className="f-table">
              <thead>
                <tr><th>Model</th><th>Calls</th><th>Failed</th><th>Tokens in / out</th><th>Avg time</th><th>Estimated cost</th><th>Share</th></tr>
              </thead>
              <tbody>
                {flow.models.map((m) => (
                  <tr key={m.provider + m.model}>
                    <td><strong>{m.model}</strong><br /><span className="f-small">{m.provider}</span></td>
                    <td>{m.calls}</td>
                    <td>{m.failed + m.unknown}</td>
                    <td>{m.inputTokens.toLocaleString()} / {m.outputTokens.toLocaleString()}</td>
                    <td>{secs(m.avgLatencyMs)}</td>
                    <td>{usd(m.microUsd)}{m.unpriced ? <span className="f-small"> + {m.unpriced} unpriced</span> : null}</td>
                    <td><span className="f-bar" aria-label={`${m.sharePct}%`}><i style={{ width: `${m.sharePct}%` }} /></span> {m.sharePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
