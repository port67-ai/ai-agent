"use client";
import { Plus, Settings2, ShieldCheck } from "lucide-react";
import { Tag, Field, fields, Actions } from "./shared";
import { capabilityRegistry } from "@/lib/factory/registry";
export default function Capabilities({
  p,
  busy,
  command,
}: Omit<Actions, "operator">) {
  return (
    <>
      <div className="f-panel f-production-head">
        <div>
          <Tag tone="orange">BUILT TO EXPAND</Tag>
          <h2>New markets bring new questions.</h2>
          <p>
            Capture a missing specialism, research method or production
            capability. Proposals do not grant permissions or deploy new agents.
            Contracts, rights, cost and evaluation must be reviewed before
            promotion.
          </p>
        </div>
        <Settings2 size={44} />
      </div>
      <div className="f-two-col">
        <section className="f-panel">
          <h2>Reusable capabilities</h2>
          {capabilityRegistry.map((c) => (
            <div key={c.id} className="f-capability">
              <ShieldCheck size={17} />
              <div>
                {c.name} · v{c.version}
                <br />
                <small>
                  {c.kind === "research"
                    ? "Manual / configured public web search"
                    : c.kind === "synthesis"
                      ? "Configured AI drafts — producer review"
                      : c.kind === "human"
                        ? "Human-managed strategy"
                        : "Original template draft"}{" "}
                  · approval required
                </small>
              </div>
            </div>
          ))}
          {p.capabilities.map((c) => (
            <div className="f-evidence-link" key={c.id}>
              <Tag tone="orange">Proposed — not active</Tag>
              <h3>{c.name}</h3>
              <p>{c.reason}</p>
              <small>{c.evaluation}</small>
            </div>
          ))}
        </section>
        <section className="f-panel f-fit">
          <h2>Propose a capability</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              void command(
                { type: "proposeCapability", ...fields(form) },
                "Capability proposal recorded; no agent deployed",
              )?.then((ok) => {
                if (ok) form.reset();
              });
            }}
          >
            <Field label="Specialist or capability">
              <input
                name="name"
                required
                maxLength={120}
                placeholder="e.g. Beauty ingredient claims reviewer"
              />
            </Field>
            <Field label="Why is it needed?">
              <textarea
                name="reason"
                required
                maxLength={2000}
                rows={5}
                placeholder="What evidence or production gap did this project uncover?"
              />
            </Field>
            <button className="f-button secondary" disabled={busy}>
              Record proposal <Plus size={16} />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
