"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { enquiryAttempt, type EnquiryAttempt } from "@/lib/enquiry-attempt";
export function EnquiryForm({ available }: { available: boolean }) {
  const [status, setStatus] = useState(""),
    [sending, setSending] = useState(false),
    [sent, setSent] = useState(false);
  const attempt = useRef<EnquiryAttempt | undefined>(undefined);
  const message = useRef<HTMLDivElement>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!available || sending || sent) return;
    setSending(true);
    setStatus("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const body = JSON.stringify({ ...payload, ack: form.get("ack") === "on" });
    attempt.current = enquiryAttempt(body, attempt.current);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body,
      });
      if (res.status !== 201)
        throw new Error(
          res.status === 429
            ? "Please wait before trying again."
            : "Your enquiry could not be confirmed. Please try again later.",
        );
      const data = await res.json();
      if (!data.lead_id)
        throw new Error("Your enquiry could not be confirmed.");
      setSent(true);
      setStatus("Your enquiry has been received for human review.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Your enquiry has not been sent. Please try again.",
      );
    } finally {
      setSending(false);
      requestAnimationFrame(() => message.current?.focus());
    }
  }
  return (
    <form
      className="studio-form"
      onSubmit={submit}
      aria-describedby={!available ? "form-unavailable" : "form-note"}
    >
      {!available && (
        <div id="form-unavailable" className="studio-notice">
          <strong>Online enquiries are not yet open.</strong>
          <p>
            This form previews the information we will ask for. Submission is
            disabled while the privacy notice and enquiry delivery are being
            completed. Please do not enter personal information yet.
          </p>
        </div>
      )}
      <fieldset disabled={!available || sent} className="studio-form-fields">
        <label className="studio-field">
          Name *
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="studio-field">
          Email *
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
          />
        </label>
        <label className="studio-field">
          Organisation *
          <input
            name="organisation"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={160}
          />
        </label>
        <label className="studio-field">
          Role <span>(optional)</span>
          <input
            name="role"
            autoComplete="organization-title"
            maxLength={100}
          />
        </label>
        <label className="studio-field">
          What do you need? *
          <select name="service" required defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            <option value="understand">Understand — dashboards</option>
            <option value="automate">Automate — workflows</option>
            <option value="explain">Explain — technology stories</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
        <label className="studio-field">
          Indicative budget *
          <select name="budget" required defaultValue="">
            <option value="" disabled>
              Select a budget
            </option>
            <option value="under-5k">Under £5,000</option>
            <option value="5-8k">£5,000–£8,000</option>
            <option value="8-12k">£8,000–£12,000</option>
            <option value="12k-plus">£12,000+</option>
            <option value="unknown">Not agreed yet</option>
          </select>
        </label>
        <label className="studio-field">
          Timing *
          <select name="timing" required defaultValue="">
            <option value="" disabled>
              Select timing
            </option>
            <option value="now">Now — ready to explore</option>
            <option value="soon">Soon — planning a project</option>
            <option value="later">Later — exploring possibilities</option>
          </select>
        </label>
        <label className="studio-field">
          Involved in the decision? <span>(optional)</span>
          <select name="decision" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="yes">Yes, I make the decision</option>
            <option value="shared">It is a shared decision</option>
            <option value="no">I am exploring for someone else</option>
          </select>
        </label>
        <label className="studio-field studio-field-wide">
          What needs to change? *
          <textarea
            name="challenge"
            required
            minLength={20}
            maxLength={1800}
            aria-describedby="challenge-help"
          />
          <span id="challenge-help" className="studio-field-help">
            20–1,800 characters. Describe the problem and the useful outcome.
          </span>
        </label>
        <label className="studio-field studio-field-wide">
          Relevant systems <span>(optional)</span>
          <input name="systems" maxLength={200} />
        </label>
        <label className="studio-honey" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="studio-check studio-field-wide">
          <input type="checkbox" name="ack" required />
          <span>
            I have read the <Link href="/privacy/">privacy notice</Link> and
            understand how my enquiry will be handled. *
          </span>
        </label>
      </fieldset>
      <p id="form-note" className="studio-field-wide studio-field-help">
        Do not include secrets, private customer records or sensitive documents.
        This is an enquiry, not marketing consent.
      </p>
      <button
        className="studio-button"
        type="submit"
        disabled={!available || sending || sent}
      >
        {sending
          ? "Sending…"
          : sent
            ? "Enquiry received"
            : "Send project enquiry"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      {status && (
        <div
          ref={message}
          tabIndex={-1}
          role={sent ? "status" : "alert"}
          className="studio-form-status"
        >
          {status}
        </div>
      )}
    </form>
  );
}
