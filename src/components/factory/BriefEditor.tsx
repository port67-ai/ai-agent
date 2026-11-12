"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Field, fields, Actions } from "./shared";
import Image from "next/image";
export default function BriefEditor({
  p,
  busy,
  command,
}: Omit<Actions, "operator">) {
  if (p.strategies.length) return null;
  return (
    <section className="f-panel f-brief-editor">
      <h2>Your brief, in your words.</h2>
      <p>
        Update the essentials before direction work begins. Optional details
        help us focus the research.
      </p>
      <form
        key={p.id}
        onSubmit={(e) => {
          e.preventDefault();
          void command(
            { type: "updateBrief", ...fields(e.currentTarget) },
            "Customer brief updated",
          );
        }}
      >
        <div className="f-form-grid">
          <Field label="Business name">
            <input
              name="business"
              required
              defaultValue={p.brief.business}
              maxLength={120}
            />
          </Field>
          <Field label="Approval contact">
            <input
              type="email"
              name="contact"
              required
              defaultValue={p.brief.contact}
              maxLength={180}
            />
          </Field>
        </div>
        <Field label="Your objective">
          <textarea
            name="objective"
            defaultValue={p.brief.objective}
            required
            maxLength={1200}
          />
        </Field>
        <Field label="Website">
          <input name="website" type="url" defaultValue={p.brief.website} />
        </Field>
        <Field label="Product or service">
          <textarea
            name="description"
            defaultValue={p.brief.description}
            maxLength={4000}
          />
        </Field>
        <details>
          <summary>Optional brand and market context</summary>
          <div className="f-form-grid">
            <Field label="Brand colour">
              <input
                type="color"
                name="brandColor"
                defaultValue={p.brief.brandColor}
              />
            </Field>
            <Field label="Known audience">
              <input
                name="audience"
                defaultValue={p.brief.audience}
                maxLength={600}
              />
            </Field>
          </div>
          <Field label="Competitors">
            <textarea
              name="competitors"
              defaultValue={p.brief.competitors}
              maxLength={2000}
            />
          </Field>
          <Field label="Inspirational brands or examples">
            <textarea
              name="inspiration"
              defaultValue={p.brief.inspiration}
              maxLength={2000}
            />
          </Field>
          <LogoField initial={p.brief.logoData} />
        </details>
        <button className="f-button secondary" disabled={busy}>
          Save brief <Check size={16} />
        </button>
      </form>
    </section>
  );
}
export function LogoField({ initial }: { initial?: string }) {
  const [logo, setLogo] = useState(initial || "");
  const [error, setError] = useState("");
  return (
    <>
      <Field label="Logo (PNG, up to 30KB)">
        <input
          type="file"
          accept="image/png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.type !== "image/png" || file.size > 30000) {
              setError("Choose a PNG logo under 30KB.");
              return;
            }
            setError("");
            const reader = new FileReader();
            reader.onload = () => setLogo(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      <input type="hidden" name="logoData" value={logo} />
      {logo && (
        <>
          <div className="f-logo-preview">
            <Image
              unoptimized
              src={logo}
              width={180}
              height={65}
              alt="Uploaded brand logo"
            />
          </div>
          <label className="f-small">
            <input
              type="checkbox"
              required
              name="logoPermission"
              value="confirmed"
            />{" "}
            I have permission to use this logo in the campaign.
          </label>
        </>
      )}
    </>
  );
}
