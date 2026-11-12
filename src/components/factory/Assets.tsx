"use client";
import { useState } from "react";
import { ArrowUpRight, Check, Clapperboard, Download } from "lucide-react";
import type { Asset } from "@/lib/factory/model";
import { Tag, Empty, Field, Actions } from "./shared";
import { copySetApproved } from "@/lib/factory/copy-set";
export default function Assets({ p, operator, busy, command, renderVideo }: Actions & { renderVideo?: (assetId: string, size?: 480 | 1080) => void }) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const current = p.strategies.at(-1);
  const copyReady = !!current && copySetApproved(p, current.hash);
  const approved = p.assets.filter(
    (a) =>
      !p.deliveryPaused &&
      a.status === "approved" &&
      a.strategyHash === current?.hash &&
      current.status === "approved",
  );
  return (
    <>
      {p.deliveryPaused && (
        <div className="f-callout">
          Revision in progress — delivery is paused until the current direction
          and its assets are approved. Previous shared versions remain visible
          for reference.
        </div>
      )}
      <div className="f-section-heading">
        <p className="f-small">
          Only customer-approved current versions enter delivery. Artwork, HTML
          motion storyboards and copy are downloadable files.
        </p>
        {approved.length > 0 && (
          <a
            className="f-button secondary small"
            href={"/api/factory/projects/" + p.id + "/export"}
            download
          >
            Delivery manifest <Download size={15} />
          </a>
        )}
      </div>
      {!p.assets.length ? (
        <Empty title="The library is ready for your first creation">
          Assets appear after Port67 produces from an approved campaign
          direction.
        </Empty>
      ) : (
        <div className="f-asset-grid">
          {p.assets.map((a: Asset) => (
            <article className="f-asset" key={a.id}>
              <div
                className={
                  "f-asset-preview " + (a.kind === "copy" ? "copy" : "")
                }
              >
                {a.kind === "copy" ? (
                  <pre>{a.content.slice(0, 1600)}</pre>
                ) : (
                  <iframe
                    title={a.title + " preview"}
                    srcDoc={
                      a.kind === "svg"
                        ? `<!doctype html><html><style>html,body{margin:0;width:100%;height:100%;background:#161d27}svg{display:block;width:100%;height:100%}</style><body>${a.content}</body></html>`
                        : a.content
                    }
                    sandbox=""
                    loading="lazy"
                  />
                )}
              </div>
              <div className="f-asset-body">
                <div className="f-section-heading">
                  <h3>{a.title}</h3>
                  <Tag tone={a.status === "approved" ? "green" : "neutral"}>
                    {a.status.replaceAll("_", " ")}
                  </Tag>
                </div>
                <p className="f-small">
                  {a.kind === "motion"
                    ? "15s HTML motion concept — not MP4"
                    : a.kind === "svg"
                      ? "1080 × 1080 · original SVG template"
                      : "Editable Markdown copy & script"}{" "}
                  · v{a.version}
                </p>
                <div className="f-lineage">
                  Strategy {a.strategyHash.slice(0, 10)} → task{" "}
                  {a.taskId.slice(0, 8)} → asset {a.hash.slice(0, 10)}
                  <br />
                  {a.evidenceIds.length} evidence links
                </div>
                {a.strategyHash !== current?.hash && (
                  <div className="f-callout">
                    Superseded direction — review the current campaign before
                    delivery.
                  </div>
                )}
                {a.feedback && (
                  <p className="f-callout">Feedback: {a.feedback}</p>
                )}
                <div className="f-actions">
                  {operator && a.status === "draft" && (
                    <button
                      className="f-button small"
                      disabled={busy}
                      onClick={() =>
                        void command(
                          { type: "shareAsset", id: a.id },
                          "Asset shared for customer review",
                        )
                      }
                    >
                      Share for review <ArrowUpRight size={14} />
                    </button>
                  )}
                  {(operator ||
                    (a.status === "approved" && !p.deliveryPaused)) && (
                    <a
                      className="f-button secondary small"
                      href={"/api/factory/projects/" + p.id + "/asset/" + a.id}
                      download
                    >
                      Download <Download size={14} />
                    </a>
                  )}
                </div>
                {a.kind === "motion" && a.status === "approved" && !p.deliveryPaused && (
                  <div className="f-video">
                    {(p.videos || []).filter((v) => v.assetId === a.id).map((v) => (
                      <a key={v.id} className="f-button secondary small" href={"/api/factory/projects/" + p.id + "/video/" + v.id} download>
                        MP4 {v.size || 1080}p, {v.seconds}s, {(v.bytes / 1048576).toFixed(1)} MB, {v.createdAt.slice(0, 10)} <Download size={14} />
                      </a>
                    ))}
                    {operator && renderVideo && (
                      <>
                        <button className="f-button small" disabled={busy || !copyReady} title={copyReady ? undefined : "Approve the copy set first"} onClick={() => renderVideo(a.id, 480)}>
                          Render 480p draft <Clapperboard size={14} />
                        </button>
                        <button className="f-text-button" disabled={busy || !copyReady} onClick={() => renderVideo(a.id, 1080)}>
                          Render HD (1080p)
                        </button>
                        {!copyReady && <span className="f-small">Video is optional. Approve the copy set first to render it.</span>}
                      </>
                    )}
                  </div>
                )}
                {!operator && !p.deliveryPaused && a.status === "shared" && (
                  <div className="f-review">
                    <Field label="Feedback">
                      <textarea
                        maxLength={2000}
                        value={feedback[a.id] || ""}
                        onChange={(e) =>
                          setFeedback({ ...feedback, [a.id]: e.target.value })
                        }
                      />
                    </Field>
                    <div className="f-actions">
                      <button
                        className="f-button small"
                        disabled={busy}
                        onClick={() =>
                          void command(
                            {
                              type: "approveAsset",
                              id: a.id,
                              hash: a.hash,
                              feedback: feedback[a.id],
                            },
                            "Asset approved for delivery",
                          )
                        }
                      >
                        Approve asset <Check size={14} />
                      </button>
                      <button
                        className="f-text-button"
                        disabled={busy || !feedback[a.id]?.trim()}
                        onClick={() =>
                          void command(
                            {
                              type: "requestAssetChanges",
                              id: a.id,
                              hash: a.hash,
                              feedback: feedback[a.id],
                            },
                            "Asset feedback sent",
                          )
                        }
                      >
                        Request changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
