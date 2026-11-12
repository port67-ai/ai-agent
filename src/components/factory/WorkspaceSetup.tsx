"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, RefreshCw, Settings2 } from "lucide-react";
import type { ConfigurationCheck } from "@/lib/factory/config";
import { Tag } from "./shared";
type Readiness = {
  host: "Render";
  production: boolean;
  liveReady: boolean;
  checks: ConfigurationCheck[];
};
async function readConfiguration(): Promise<Readiness> {
  const response = await fetch("/api/factory/readiness", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Cannot read workspace status");
  return data;
}
export default function WorkspaceSetup() {
  const [status, setStatus] = useState<Readiness>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setStatus(await readConfiguration());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void readConfiguration()
      .then((data) => {
        if (active) {
          setStatus(data);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError((e as Error).message);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <section className="f-panel f-production-head">
        <div>
          <Tag tone="orange">RENDER / LIVE WORKSPACE SETUP</Tag>
          <h2>From synthetic to real work.</h2>
          <p>
            Configure private access, durable storage and your approved AI
            provider. This page reports configuration presence; it never shows
            or changes secret values, and does not make paid API calls.
          </p>
        </div>
        <button
          className="f-button secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          Refresh checks
        </button>
      </section>
      {error && (
        <div className="f-alert error" role="alert">
          {error}
        </div>
      )}
      <div className="f-two-col">
        <section className="f-panel">
          <div className="f-section-heading">
            <h2>Configuration checks</h2>
            <Tag tone={status?.liveReady ? "green" : "orange"}>
              {status?.liveReady ? "Access configured" : "Setup in progress"}
            </Tag>
          </div>
          {!status ? (
            <p>Checking configuration…</p>
          ) : (
            status.checks.map((check) => (
              <article className="f-setup-check" key={check.id}>
                <div className="f-section-heading">
                  <h3>{check.label}</h3>
                  <Tag
                    tone={
                      check.state === "ready"
                        ? "green"
                        : check.state === "disabled"
                          ? "neutral"
                          : "orange"
                    }
                  >
                    {check.state === "ready" ? "Configured" : check.state}
                  </Tag>
                </div>
                <p>{check.message}</p>
                <div className="f-env-names">
                  {check.variables.map((name) => (
                    <code key={name}>{name}</code>
                  ))}
                </div>
                <small>
                  {check.requiredForLive
                    ? "Required for production live access"
                    : "Optional paid capability; manual paths remain available"}
                </small>
              </article>
            ))
          )}
        </section>
        <section className="f-panel f-fit">
          <div className="f-section-heading">
            <h2>Your Render setup path</h2>
            <Settings2 size={18} />
          </div>
          <ol className="f-setup-steps">
            <li>
              <strong>Keep this service on Render.</strong>
              <p>
                Open the ai-agent service → Environment. Set the canonical HTTPS
                origin and strong, randomly generated operator/session secrets.
                Never paste secrets into chat or the project repository.
              </p>
            </li>
            <li>
              <strong>Choose durable private storage.</strong>
              <p>
                For one Node instance, attach a Render persistent disk, point
                PORT67_DATA_DIR to a private directory on it and confirm
                persistence after testing. Alternatively configure a separate
                server-only Factory Firebase project; keep it separate from the
                legacy application.
              </p>
            </li>
            <li>
              <strong>Enable the live workspace.</strong>
              <p>
                Set PORT67_LIVE_ENABLED=true after storage and launch checks.
                The synthetic demo remains isolated and available independently.
                Read-only or temporary storage is not sufficient for real
                customer records.
              </p>
            </li>
            <li>
              <strong>Configure research and drafting.</strong>
              <p>
                Add your approved provider keys, stage provider choices and model names to Render
                Environment. OpenAI and Gemini support grounded research; all four providers support reviewed-context drafting. Enable research and synthesis separately; paid
                tasks also require authorisation of the exact project context.
              </p>
            </li>
            <li>
              <strong>Verify one real project.</strong>
              <p>
                Check sign-in, persistence after restart, invitation access, a
                bounded cited research call and usage records before onboarding
                customers. Configuration checks alone do not prove cloud
                connectivity or security readiness.
              </p>
            </li>
          </ol>
          <a
            className="f-button secondary"
            href="https://dashboard.render.com"
            target="_blank"
            rel="noreferrer"
          >
            Open Render dashboard <ArrowUpRight size={16} />
          </a>
          <p className="f-small">
            <Check size={12} /> Your approvals and manual research/production
            workflow remain available while provider setup is pending.
          </p>
        </section>
      </div>
    </>
  );
}
