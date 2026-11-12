"use client";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, Check, Link2 } from "lucide-react";

import { Tag, Empty, Field, fields, researchLabels, Actions } from "./shared";
export default function Direction({ p, operator, busy, command }: Actions) {
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
                  f.name === "cta" ? 100 : f.name === "message" ? 600 : 6000
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
          <span className="f-small">DIRECTION V{s.version}</span>
        </div>
        <h2 className="f-direction-message">{s.message}</h2>
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
