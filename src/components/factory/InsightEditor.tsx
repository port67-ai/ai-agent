"use client";
import { Link2 } from "lucide-react";
import { Field, Actions } from "./shared";
export default function InsightEditor({
  p,
  busy,
  command,
}: Omit<Actions, "operator">) {
  return (
    <section className="f-panel f-insights">
      <h2>Interpret the evidence</h2>
      <p>
        Connect a research finding to the message it could inform. Only reviewed
        sources can support an insight.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          void command(
            {
              type: "addInsight",
              title: fd.get("title"),
              interpretation: fd.get("interpretation"),
              confidence: fd.get("confidence"),
              sourceIds: fd.getAll("sourceIds"),
            },
            "Insight linked to its evidence",
          )?.then((ok) => {
            if (ok) form.reset();
          });
        }}
      >
        <Field label="Insight title">
          <input name="title" required maxLength={200} />
        </Field>
        <Field label="What does the evidence suggest, and why?">
          <textarea name="interpretation" required maxLength={3000} />
        </Field>
        <Field label="Confidence">
          <select name="confidence">
            <option value="limited">Limited — hypothesis to explore</option>
            <option value="moderate">Moderate — recurring evidence</option>
            <option value="strong">Strong — substantial corroboration</option>
          </select>
        </Field>
        <fieldset className="f-source-checks">
          <legend>Supporting reviewed sources</legend>
          {p.sources
            .filter((s) => s.status === "supported")
            .map((s) => (
              <label key={s.id}>
                <input type="checkbox" name="sourceIds" value={s.id} />
                {s.title}
              </label>
            ))}
        </fieldset>
        <button
          className="f-button secondary"
          disabled={busy || !p.sources.some((s) => s.status === "supported")}
        >
          Save insight <Link2 size={15} />
        </button>
      </form>
    </section>
  );
}
