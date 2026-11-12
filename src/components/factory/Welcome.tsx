"use client";
import { ArrowUpRight, ArrowRight, Layers3 } from "lucide-react";
import { Field } from "./shared";
import Link from "next/link";
import { AccountLogin } from "./AccountLogin";
export function PortalWelcome({
  busy,
  onDemo,
  onLogin,
  error,
  onAuthenticated,
}: {
  busy: boolean;
  onDemo: () => void;
  onLogin: (password: string) => void;
  error: string;
  onAuthenticated?: (idToken:string)=>Promise<void>;
}) {
  return (
    <main className="f-welcome">
      <Link className="f-wordmark" href="/">
        PORT67<span> / EXPLAIN</span>
      </Link>
      <div className="f-welcome-grid">
        <section>
          <div className="f-eyebrow">THE MANAGED CREATIVE WORKSPACE</div>
          <h1>
            Research-led marketing content <em>and creative production.</em>
          </h1>
          <p className="f-lede">
            From what your customers need to what your brand says next. A
            connected workspace for research, direction, production and
            approval.
          </p>
          <button className="f-button" disabled={busy} onClick={onDemo}>
            Explore the demo <ArrowUpRight size={18} />
          </button>
          <p className="f-small">
            Synthetic brand. Real workflow. Your demo workspace is isolated from
            other visitors.
          </p>
          <div className="f-welcome-stages">
            BRIEF <ArrowRight size={14} /> RESEARCH <ArrowRight size={14} />{" "}
            DIRECTION <ArrowRight size={14} /> CREATE
          </div>
        </section>
        <section className="f-login-card">
          <div className="f-mini-icon">
            <Layers3 />
          </div>
          <h2>
            A clear brief.
            <br />A stronger direction.
          </h2>
          <p>
            Port67 manages the production. You bring the ambition and approve
            what comes next.
          </p>
          {onAuthenticated && <AccountLogin onAuthenticated={onAuthenticated} />}
          <details className="f-legacy-login"><summary>Producer password access</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLogin(String(new FormData(e.currentTarget).get("password")));
            }}
          >
            <Field label="Operator password">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={16}
                placeholder="Sign in to your live workspace"
              />
            </Field>
            <button className="f-button secondary" disabled={busy}>
              Sign in <ArrowRight size={17} />
            </button>
          </form></details>
          <p className="f-small">
            Create an account or use a private project invitation. Live access requires server configuration.
          </p>
        </section>
      </div>
      {error && (
        <div className="f-toast error" role="alert">
          {error}
        </div>
      )}
      <footer className="f-welcome-footer">
        LISTEN FIRST. BUILD WHAT MATTERS.<a href="/privacy">Privacy</a>
      </footer>
    </main>
  );
}
