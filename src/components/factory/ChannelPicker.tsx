"use client";
import { useState } from "react";
import { Check, Send, Sparkles } from "lucide-react";
import type { Project } from "@/lib/factory/model";
import { CHANNELS, MAX_CHANNELS, channelNames, type Channel } from "@/lib/factory/channels";

export function ChannelIcon({ channel, size = 26 }: { channel: Channel; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={channel.name + " logo"} fill="currentColor">
      <path d={channel.path} />
    </svg>
  );
}
// Near-black marks (TikTok, X) would vanish on a tinted tile, so they use a slate.
const tint = (c: Channel) => (["#000000", "#010101"].includes(c.color.toLowerCase()) ? "#334155" : c.color);

type PickerProps = {
  p: Project;
  operator: boolean;
  busy: boolean;
  live: boolean;
  command: (data: Record<string, unknown>, success?: string) => Promise<boolean> | undefined;
  onRunAll: () => void;
};
/** Remounts when the saved channels change so the unsaved selection always starts from what is stored. */
export default function ChannelPicker(props: PickerProps) {
  return <Picker key={props.p.id + "|" + (props.p.channels || []).join(",")} {...props} />;
}
function Picker({
  p,
  operator,
  busy,
  live,
  command,
  onRunAll,
}: PickerProps) {
  const [selected, setSelected] = useState<string[]>(p.channels || []);
  const locked = p.strategies.length > 0;
  const changed = [...selected].sort().join(",") !== [...(p.channels || [])].sort().join(",");
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_CHANNELS ? s : [...s, id]));
  const requested = p.researchRequest;
  const sameAsRequest = !!requested && [...requested.channels].sort().join(",") === [...selected].sort().join(",");
  async function saveThen(next: () => void, type: "setChannels" | "requestResearch", success: string) {
    const ok = await command({ type, channels: selected }, success);
    if (ok && next) next();
  }
  return (
    <section className="f-panel f-channels" aria-labelledby="f-channels-title">
      <div className="f-section-heading">
        <div>
          <h2 id="f-channels-title">Where will this launch?</h2>
          <p className="f-small">
            Choose up to {MAX_CHANNELS} channels. Research, the campaign direction and the copy will focus on them.
          </p>
        </div>
        <span className="f-channel-count" aria-live="polite">
          {selected.length} of {MAX_CHANNELS} chosen
        </span>
      </div>
      <div className="f-channel-grid" role="group" aria-label="Launch channels">
        {CHANNELS.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={"f-channel" + (on ? " on" : "")}
              style={{ ["--brand" as string]: tint(c) }}
              aria-pressed={on}
              disabled={busy || locked || (!on && selected.length >= MAX_CHANNELS)}
              onClick={() => toggle(c.id)}
              title={c.summary}
            >
              <span className="f-channel-icon">
                <ChannelIcon channel={c} />
              </span>
              <strong>{c.name}</strong>
              <small>{c.supporting ? "Supporting channel" : c.tag}</small>
              {on && (
                <span className="f-channel-check" aria-hidden="true">
                  <Check size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {locked && <p className="f-small">Channels are locked now direction work has begun. Ask Port67 for a scoped change.</p>}
      {operator && requested && (
        <div className="f-callout">
          Customer asked for research on {channelNames(requested.channels).join(", ")} ({new Date(requested.at).toLocaleDateString("en-GB")}).
        </div>
      )}
      {!operator && requested && (
        <p className="f-small" role="status">
          Research requested for {channelNames(requested.channels).join(", ")} on {new Date(requested.at).toLocaleDateString("en-GB")}. Port67 will start it and share what it finds.
        </p>
      )}
      {!locked && (
        <div className="f-actions">
          {operator ? (
            <>
              <button
                className="f-button"
                disabled={busy || !live || !p.aiAuthorised || !selected.length}
                title={
                  !selected.length
                    ? "Choose at least one channel"
                    : !p.aiAuthorised
                      ? "Authorise public project data first"
                      : !live
                        ? "Configure the research provider first"
                        : "Runs the four research segments, one paid call each"
                }
                onClick={() => void saveThen(onRunAll, "setChannels", "Channels saved")}
              >
                <Sparkles size={16} /> Start research
              </button>
              <button className="f-button secondary" disabled={busy || !changed} onClick={() => void command({ type: "setChannels", channels: selected }, "Channels saved")}>
                Save channels
              </button>
            </>
          ) : (
            <button
              className="f-button"
              disabled={busy || !selected.length || (sameAsRequest && !!requested)}
              onClick={() => void command({ type: "requestResearch", channels: selected }, "Research requested. Port67 has been asked to start it.")}
            >
              <Send size={16} /> {sameAsRequest && requested ? "Research requested" : "Request research"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
