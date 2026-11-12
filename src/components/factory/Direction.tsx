"use client";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, Check, Link2 } from "lucide-react";

import { Tag, Empty, Field, fields, researchLabels, Actions } from "./shared";
export default function Direction({
  p,
  operator,
  busy,
  command,
  aiReady,
  onGenerate,
}: Actions & { aiReady: boolean; onGenerate: () => Promise<boolean> }) {
  const s = p.strategies.at(-1);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!s || editing)
    return operator ? (
      <section className="f-panel f-direction-form">
        <div className="f-eyebrow">
          DIRECTION / {s ? "NEW VERSION" : "FIRST DRAFT"}
        </div>
        <h2>Connect the evidence to the idea.</h2>
        <p>
          Shape the message and design recommendation. Creating a proposal does
          not run an AI model. Add detailed reasoning and flag uncertainty
          before sharing.
        </p>
        <button
          className="f-button secondary"
          disabled={
            busy ||
            !aiReady ||
            !p.aiAuthorised ||
            !p.insights.some(
              (insight) =>
                insight.status !== "draft" && insight.status !== "rejected",
            )
          }
          onClick={() =>
            void onGenerate().then((ok) => {
              if (ok) setEditing(false);
            })
          }
        >
          Draft direction with AI <ArrowUpRight size={15} />
        </button>
        <p className="f-small">
          AI drafting uses only reviewed public evidence and accepted insights;
          outputs stay unshared until Port67 reviews them. Manual editing
          remains available.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = fields(e.currentTarget);
            void command(
              { type: "draftStrategy", ...data },
              "Direction version saved",
            )?.then((ok) => {
              if (ok) setEditing(false);
            });
          }}
        >
          {[
            {
              name: "positioning",
              label: "Positioning statement",
              value: s?.positioning || "",
              rows: 2,
            },
            {
              name: "audienceSegments",
              label: "Audience segments and their needs",
              value: s?.audienceSegments || "",
              rows: 3,
            },
            {
              name: "tone",
              label: "Tone of voice",
              value: s?.tone || "",
              rows: 2,
            },
            {
              name: "doNotClaim",
              label: "Claims to avoid",
              value: s?.doNotClaim || "",
              rows: 2,
            },
            {
              name: "message",
              label: "Campaign message",
              value: s?.message || p.brief.objective,
              rows: 2,
            },
            {
              name: "audience",
              label: "Audience and buying context",
              value: s?.audience || p.brief.audience,
              rows: 2,
            },
            {
              name: "rationale",
              label: "Research reasoning — why this direction?",
              value: s?.rationale || "",
              rows: 5,
            },
            {
              name: "design",
              label: "Visual and design direction",
              value: s?.design || "",
              rows: 3,
            },
            {
              name: "channels",
              label: "Recommended channels",
              value: s?.channels || "",
              rows: 2,
            },
            {
              name: "format",
              label: "Asset formats and durations",
              value: s?.format || "",
              rows: 2,
            },
            {
              name: "cta",
              label: "Call to action",
              value: s?.cta || "Discover more",
              rows: 1,
            },
            {
              name: "hypothesis",
              label: "What are we testing?",
              value: s?.hypothesis || "",
              rows: 2,
            },
            {
              name: "uncertainties",
              label: "Unknowns and limitations",
              value: s?.uncertainties || "",
              rows: 2,
            },
          ].map((f) => (
            <Field key={f.name} label={f.label}>
              <textarea
                name={f.name}
                defaultValue={f.value}
                rows={f.rows}
                maxLength={
                  f.name === "cta" ? 100 : f.name === "message" || f.name === "positioning" || f.name === "tone" ? 600 : f.name === "doNotClaim" ? 1500 : f.name === "audienceSegments" ? 2500 : 6000
                }
              />
            </Field>
          ))}
          <p className="f-small">
            {p.sources.filter((x) => x.status === "supported").length} reviewed
            sources will be linked to this version. A new version requires fresh
            customer approval.
          </p>
          <div className="f-actions">
            <button className="f-button" disabled={busy}>
              Save direction draft <ArrowRight size={16} />
            </button>
            {s && (
              <button
                type="button"
                className="f-text-button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    ) : (
      <Empty title="Your direction is being prepared">
        Port67 will share a research-backed messaging and design proposal here
        for your review.
      </Empty>
    );
  return (
    <div className="f-two-col">
      <section className="f-panel">
        {p.deliveryPaused && s.status === "approved" && (
          <div className="f-callout">
            Revision in progress — this is your previous approved direction.
            Delivery is paused while Port67 prepares the next proposal.
          </div>
        )}
        <div className="f-section-heading">
          <Tag tone={s.status === "approved" ? "green" : "orange"}>
            {s.status.replaceAll("_", " ")}
          </Tag>
          <span className="f-small">
            DIRECTION V{s.version}
            {s.generatedByRunId ? " · AI-assisted draft" : ""}
          </span>
        </div>
        <h2 className="f-direction-message">{s.message}</h2>
        {s.positioning && (
          <div className="f-detail">
            <span>Positioning</span>
            <p>{s.positioning}</p>
          </div>
        )}
        {s.keyMessages && s.keyMessages.length > 0 && (
          <div className="f-detail">
            <span>Key messages and their proof</span>
            <ul>
              {s.keyMessages.map((k) => (
                <li key={k.message}>
                  <strong>{k.message}</strong>
                  <br />
                  <small>
                    Proof: {k.proof} ({k.sourceIds.length} source{k.sourceIds.length === 1 ? "" : "s"})
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.audienceSegments && (
          <div className="f-detail">
            <span>Audience segments</span>
            <p className="f-prewrap">{s.audienceSegments}</p>
          </div>
        )}
        {s.tone && (
          <div className="f-detail">
            <span>Tone of voice</span>
            <p>{s.tone}</p>
          </div>
        )}
        {s.doNotClaim && (
          <div className="f-callout">Claims we will not make: {s.doNotClaim}</div>
        )}
        <div className="f-detail">
          <span>Who we want to reach</span>
          <p>{s.audience}</p>
        </div>
        <div className="f-detail">
          <span>The reasoning</span>
          <p className="f-prewrap">{s.rationale}</p>
        </div>
        <div className="f-detail">
          <span>Design direction</span>
          <p className="f-prewrap">{s.design}</p>
        </div>
        <div className="f-detail">
          <span>Channels & formats</span>
          <p>
            {s.channels}
            <br />
            {s.format}
          </p>
        </div>
        <div className="f-detail">
          <span>Call to action</span>
          <p>{s.cta}</p>
        </div>
        <div className="f-detail">
          <span>Creative hypothesis</span>
          <p>{s.hypothesis}</p>
        </div>
        <div className="f-callout">{s.uncertainties}</div>
        {s.feedback && (
          <div className="f-callout">Customer feedback: {s.feedback}</div>
        )}
        <div className="f-lineage">
          Version fingerprint: {s.hash.slice(0, 20)} · {s.evidenceIds.length}{" "}
          evidence links
        </div>
        {operator ? (
          <div className="f-actions">
            {s.status === "draft" && (
              <button
                className="f-button"
                disabled={busy}
                onClick={() =>
                  void command(
                    { type: "shareStrategy" },
                    "Direction shared for customer review",
                  )
                }
              >
                Share direction <ArrowUpRight size={16} />
              </button>
            )}
            <button
              className="f-button secondary"
              onClick={() => setEditing(true)}
            >
              Create new version
            </button>
          </div>
        ) : s.status === "shared" ? (
          <div className="f-review">
            <Field label="Your feedback (required for changes)">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={2000}
              />
            </Field>
            <div className="f-actions">
              <button
                className="f-button"
                disabled={busy}
                onClick={() =>
                  void command(
                    { type: "approveStrategy", hash: s.hash, feedback },
                    "Direction approved. Port67 can now start production.",
                  )
                }
              >
                Approve direction <Check size={16} />
              </button>
              <button
                className="f-button secondary"
                disabled={busy || !feedback.trim()}
                onClick={() =>
                  void command(
                    { type: "requestStrategyChanges", hash: s.hash, feedback },
                    "Feedback sent to Port67",
                  )
                }
              >
                Request changes
              </button>
            </div>
          </div>
        ) : (
          <p className="f-small">
            {s.status === "approved"
              ? "Approved " +
                new Date(s.approvedAt!).toLocaleDateString("en-GB")
              : "Your feedback is with Port67."}
          </p>
        )}
      </section>
      <section className="f-panel f-fit">
        <div className="f-section-heading">
          <h2>Behind this direction</h2>
          <Link2 size={19} />
        </div>
        {s.evidenceIds.length ? (
          p.sources
            .filter((x) => s.evidenceIds.includes(x.id))
            .map((source) => (
              <div className="f-evidence-link" key={source.id}>
                <small>
                  {researchLabels[source.segment]} ·{" "}
                  {source.kind === "synthetic" ? "Synthetic" : "Reviewed"}
                </small>
                <h3>{source.title}</h3>
                <p>{source.excerpt.slice(0, 300)}</p>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    View source <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            ))
        ) : (
          <p>
            No independently supported research is linked yet. This is a
            brief-led proposal, not a validated market recommendation.
          </p>
        )}
        <h3>Interpreted insights</h3>
        {p.insights
          .filter((i) => s.insightIds.includes(i.id))
          .map((i) => (
            <div className="f-evidence-link" key={i.id}>
              <h3>{i.title}</h3>
              <p>{i.interpretation}</p>
              <small>
                {i.sourceIds.length} source links · {i.confidence} confidence
              </small>
            </div>
          ))}
        <h3>Version history</h3>
        {p.strategies.map((v) => (
          <div className="f-history" key={v.id}>
            <span>Direction v{v.version}</span>
            <Tag>{v.status.replaceAll("_", " ")}</Tag>
          </div>
        ))}
      </section>
    </div>
  );
}
