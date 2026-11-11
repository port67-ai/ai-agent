import Link from "next/link";
import { services } from "./services";
import { CTA, Hero } from "./Shared";
import { Dashboard } from "./Dashboard";
export function ServicePage({ id }: { id: keyof typeof services }) {
  const s = services[id];
  return (
    <>
      <Hero eyebrow={s.category.toUpperCase()} title={s.title} lead={s.lead} />
      <section className="studio-section">
        <div className="studio-container studio-editorial">
          <div>
            <span className="studio-eyebrow">THE BUSINESS CHALLENGE</span>
            <h2>{s.heading}</h2>
          </div>
          <p className="studio-lead">{s.body}</p>
        </div>
      </section>
      <section className="studio-section studio-section-tint">
        <div className="studio-container">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">
                CONCEPT DEMONSTRATION · FICTIONAL DATA
              </span>
              <h2>
                {id === "understand"
                  ? "One view. Better questions."
                  : id === "automate"
                    ? "A clear path, with controls."
                    : "From a feature list to a story."}
              </h2>
            </div>
            <p>
              {id === "explain"
                ? "Illustrative storyboard only. A completed concept video is not yet available."
                : "Explore an illustrative example. These are synthetic concepts, not commissioned client work or verified business results."}
            </p>
          </div>
          {id === "understand" ? (
            <div className="studio-demo-wide">
              <Dashboard />
            </div>
          ) : id === "automate" ? (
            <div className="studio-flow">
              <div>
                <span>01 / RECEIVE</span>
                <h3>Enquiry arrives</h3>
                <p>Capture the request and check required information.</p>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <span>02 / REVIEW</span>
                <h3>Human approval</h3>
                <p>Prepare a draft. A person decides what happens next.</p>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <span>03 / RECORD</span>
                <h3>Update the CRM</h3>
                <p>Log the outcome. Route exceptions for review.</p>
              </div>
            </div>
          ) : (
            <div className="studio-storyboard">
              {[
                ["The problem", "Handoffs hide the bigger picture."],
                ["The change", "A shared view makes the next step clear."],
                ["The outcome", "Know who needs to act, and when."],
              ].map(([t, d], i) => (
                <div key={t}>
                  <span>FRAME 0{i + 1} / FLOWPILOT</span>
                  <h3>{t}.</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          )}
          <p className="studio-caption">
            Concept demonstration ·{" "}
            {id === "understand"
              ? "Northstar Analytics"
              : id === "automate"
                ? "Meridian Operations"
                : "FlowPilot"}{" "}
            · no client results
          </p>
        </div>
      </section>
      <section className="studio-section">
        <div className="studio-container">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">A DEFINED STARTING POINT</span>
              <h2>{s.pilot}</h2>
            </div>
            <div className="studio-investment">
              <span>Indicative pilot</span>
              <strong>{s.price}</strong>
              <span>excluding VAT · subject to discovery and agreed scope</span>
            </div>
          </div>
          <div className="studio-scope-grid">
            <div>
              <h3>Included in the pilot</h3>
              <ul>
                {s.included.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Excluded unless quoted</h3>
              <ul>
                {s.excluded.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="studio-quality">
        <div className="studio-container studio-editorial">
          <div>
            <span className="studio-eyebrow">QUALITY, BUILT IN</span>
            <h2>{s.quality}</h2>
          </div>
          <div>
            <p>{s.qa}</p>
            <Link href="/process/" className="studio-text-link">
              Our process →
            </Link>
          </div>
        </div>
      </section>
      <CTA heading={s.closing} />
    </>
  );
}
