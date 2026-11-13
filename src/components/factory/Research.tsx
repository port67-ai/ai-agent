"use client";
import { useState } from "react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import type { Segment } from "@/lib/factory/model";
import {
  Tag,
  Empty,
  Field,
  fields,
  researchLabels,
  researchNotes,
  Actions,
} from "./shared";
import InsightEditor from "./InsightEditor";
import ChannelPicker from "./ChannelPicker";
import ResearchProgress from "./ResearchProgress";
import { ResearchPrep, ResearchDossier } from "./ResearchPrep";
import { ScopePanel } from "./ScopePanel";
const gapsFor = (p: { runs: { segment?: string; status: string; gaps?: string[] }[] }, segment: string) =>
  [...new Set(p.runs.filter((r) => r.segment === segment && r.status === "completed").flatMap((r) => r.gaps || []))].slice(0, 8);
export default function Research({
  p,
  operator,
  busy,
  command,
  live,
  onRun,
  onRunAll,
  runningSegment,
  onRefresh,
  onRecover,
  aiReady,
  onGenerate,
}: Actions & {
  live: boolean;
  aiReady: boolean;
  onGenerate: () => void;
  onRun: (segment: Segment) => void;
  onRunAll: () => void;
  runningSegment?: Segment | null;
  onRefresh: () => void;
  onRecover: (id: string) => void;
}) {
  const [segment, setSegment] = useState<Segment>("brand");
  return (
    <>
      <ChannelPicker p={p} operator={operator} busy={busy} live={live} command={command} onRunAll={onRunAll} />
      <ScopePanel p={p} operator={operator} />
      <ResearchPrep p={p} operator={operator} />
      <ResearchProgress p={p} operator={operator} runningSegment={runningSegment} onRefresh={onRefresh} />
      <ResearchDossier p={p} />
      {operator && (
        <section className="f-panel f-ai-consent">
          <div>
            <Tag tone={p.aiAuthorised ? "green" : "orange"}>
              {p.aiAuthorised
                ? "Project data authorised"
                : "AI data authorisation required"}
            </Tag>
            <h2>Control what leaves the workspace.</h2>
            <p>
              Paid research/drafting uses the exact authorised brief and
              reviewed public-source material. Confirm only if this is
              authorised PUBLIC information; customer assertions, contact email
              and logo files are excluded from synthesis. A brief change revokes
              this authorisation. The synthetic demo never makes paid calls.
            </p>
          </div>
          <button
            className="f-button secondary small"
            disabled={busy}
            onClick={() =>
              void command(
                {
                  type: p.aiAuthorised ? "revokeAI" : "authoriseAI",
                  confirm: true,
                },
                p.aiAuthorised
                  ? "AI authorisation revoked"
                  : "Project brief authorised as PUBLIC data for the configured provider",
              )
            }
          >
            {p.aiAuthorised
              ? "Revoke AI access"
              : "Authorise public project data"}
          </button>
        </section>
      )}
      <div className="f-research-tabs">
        {Object.entries(researchLabels).map(([id, label]) => (
          <button
            className={segment === id ? "active" : ""}
            key={id}
            onClick={() => setSegment(id as Segment)}
          >
            {label}
            <span>{p.sources.filter((s) => s.segment === id).length}</span>
          </button>
        ))}
      </div>
      <div className="f-two-col research">
        <section>
          <div className="f-section-heading">
            <div>
              <h2>{researchLabels[segment]}</h2>
              <p className="f-small">{researchNotes[segment]}</p>
            </div>
            {operator && (
              <button
                className="f-button secondary small"
                disabled={busy || !live || !p.aiAuthorised}
                title={
                  live
                    ? "Runs one bounded paid research call"
                    : "Configure the provider in a live workspace to enable web research"
                }
                onClick={() => onRun(segment)}
              >
                <Sparkles size={15} /> Run research
              </button>
            )}
          </div>
          {gapsFor(p, segment).length > 0 && (
            <div className="f-callout">
              <strong>Not found or unverified:</strong>
              <ul>
                {gapsFor(p, segment).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {p.sources
            .filter((s) => s.segment === segment)
            .map((s) => (
              <article className="f-source" key={s.id}>
                <div className="f-section-heading">
                  <Tag
                    tone={
                      s.kind === "synthetic"
                        ? "orange"
                        : s.status === "supported"
                          ? "green"
                          : "neutral"
                    }
                  >
                    {s.kind === "synthetic"
                      ? "Synthetic fixture"
                      : s.kind === "client_assertion"
                        ? "Client assertion"
                        : s.status}
                  </Tag>
                  <small>
                    {s.confidence ? s.confidence + " support · " : ""}
                    {new Date(s.collectedAt).toLocaleDateString("en-GB")}
                  </small>
                </div>
                <h3>{s.title}</h3>
                <p className="f-prewrap">{s.excerpt}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Open original source <ArrowUpRight size={14} />
                  </a>
                )}
                <div className="f-source-footer">
                  <span>
                    {s.method} · {s.id.slice(0, 8)}
                  </span>
                  {operator && s.status === "unreviewed" && (
                    <div>
                      {s.kind !== "client_assertion" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void command(
                              {
                                type: "reviewSource",
                                id: s.id,
                                status: "supported",
                              },
                              "Source reviewed. Any existing direction now needs a new approval.",
                            )
                          }
                        >
                          Accept evidence
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() =>
                          void command({
                            type: "reviewSource",
                            id: s.id,
                            status: "rejected",
                          })
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          {!p.sources.some((s) => s.segment === segment) && (
            <Empty title="No evidence collected yet">
              Add an authorised source or customer assertion. Missing evidence
              remains visible.
            </Empty>
          )}
        </section>
        {operator ? (
          <section className="f-panel f-fit">
            <div className="f-section-heading">
              <h2>Add a source</h2>
              <Plus size={18} />
            </div>
            <form
              key={segment}
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = fields(form);
                void command(
                  { type: "addSource", segment, ...data },
                  "Source added for review",
                )?.then((ok) => {
                  if (ok) form.reset();
                });
              }}
            >
              <Field label="Source type">
                <select name="kind">
                  <option value="public_source">Public source</option>
                  <option value="client_assertion">
                    Customer-supplied assertion
                  </option>
                </select>
              </Field>
              <Field label="Source title">
                <input name="title" required maxLength={240} />
              </Field>
              <Field label="Public HTTPS source URL">
                <input
                  name="url"
                  type="url"
                  placeholder="Required for public sources"
                />
              </Field>
              <Field label="Relevant finding or excerpt">
                <textarea name="excerpt" required maxLength={6000} rows={6} />
              </Field>
              <button className="f-button secondary" disabled={busy}>
                Add to research <Plus size={16} />
              </button>
            </form>
            <p className="f-small">
              Collect only authorised material. An assertion is not independent
              verification. Live model findings require review before informing
              the direction.
            </p>
            {!live && (
              <div className="f-callout">
                Live research is unavailable in this workspace. Manual
                collection works now; no sources or results are invented.
              </div>
            )}
          </section>
        ) : (
          <section className="f-panel f-fit">
            <h2>Why this evidence matters</h2>
            <p>
              These are the reviewed sources referenced by the campaign
              direction shared with you. Internal research drafts remain
              private.
            </p>
          </section>
        )}
      </div>
      {operator && <InsightEditor p={p} busy={busy} command={command} />}
      <section className="f-panel f-insights">
        <div className="f-section-heading">
          <h2>Research → insight</h2>
          {operator && (
            <button
              className="f-button secondary small"
              disabled={
                busy ||
                !aiReady ||
                !p.aiAuthorised ||
                !p.sources.some(
                  (source) =>
                    source.kind === "public_source" &&
                    source.status === "supported",
                )
              }
              onClick={onGenerate}
            >
              <Sparkles size={14} />
              Draft insights with AI
            </button>
          )}
        </div>
        {p.insights.length ? (
          p.insights.map((i) => (
            <div className="f-evidence-link" key={i.id}>
              <Tag tone={i.status === "draft" ? "orange" : "neutral"}>
                {i.status === "draft"
                  ? "AI draft — review required"
                  : i.status === "rejected"
                    ? "Rejected"
                    : i.confidence + " confidence"}
              </Tag>
              <h3>{i.title}</h3>
              <p>{i.interpretation}</p>
              <small>
                {i.sourceIds.length} reviewed source links · {i.id.slice(0, 8)}
                {i.generatedByRunId &&
                  " · AI run " + i.generatedByRunId.slice(0, 8)}
              </small>
              {operator && i.status === "draft" && (
                <div className="f-actions">
                  <button
                    className="f-button secondary small"
                    disabled={busy}
                    onClick={() =>
                      void command(
                        { type: "reviewInsight", id: i.id, status: "reviewed" },
                        "Insight reviewed and available to campaign strategy",
                      )
                    }
                  >
                    Accept insight
                  </button>
                  <button
                    className="f-text-button"
                    disabled={busy}
                    onClick={() =>
                      void command({
                        type: "reviewInsight",
                        id: i.id,
                        status: "rejected",
                      })
                    }
                  >
                    Reject insight
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>
            No interpreted insights yet. Review sources, then record what the
            evidence suggests and why.
          </p>
        )}
      </section>
      {operator && p.runs.length > 0 && (
        <section className="f-panel">
          <div className="f-section-heading">
            <h2>Research & drafting activity</h2>
            <button
              type="button"
              className="f-text-button"
              onClick={() => void navigator.clipboard?.writeText(p.runs.map((r) => `${r.segment || r.stage} | ${r.status} | ${r.provider}/${r.model} | ${r.error || "ok"} | ${r.providerRequestId || ""}${r.note ? " | note: " + r.note : ""}`).join("\n"))}
            >
              Copy run details
            </button>
          </div>
          {p.runs.map((r) => (
            <div className="f-detail" key={r.id}>
              <span>
                {r.segment || r.stage} · {r.status}
              </span>
              <p>
                {r.provider} / {r.model} ·{" "}
                {r.error || JSON.stringify(r.usage || {})} · billed cost not
                reconciled
              </p>
              {r.note && <p className="f-small">What the model wrote instead of cited findings (not evidence): {r.note}</p>}
              <small>
                Context {r.contextHash?.slice(0, 12) || "unrecorded"} · usage{" "}
                {r.usageStatus || "unknown"} ·{" "}
                {r.providerRequestId || "provider ID unavailable"}
              </small>
              {r.status === "running" && (
                <button
                  className="f-button secondary small"
                  disabled={busy}
                  onClick={() => onRecover(r.id)}
                >
                  Recover interrupted research (after 2 minutes)
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
