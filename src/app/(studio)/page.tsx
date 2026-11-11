import Link from "next/link";
import { Dashboard } from "@/components/studio/Dashboard";
import { CTA, concepts, stages } from "@/components/studio/Shared";
export const metadata = { alternates: { canonical: "https://port67.ai/" } };
export default function Home() {
  return (
    <>
      <section className="studio-home-hero">
        <div className="studio-container studio-hero-grid">
          <div className="studio-hero-copy">
            <span className="studio-eyebrow">
              <i /> PORT67.AI — A BUSINESS DESIGN & AI STUDIO
            </span>
            <h1>
              Understand.
              <br />
              Automate.
              <br />
              <em>Explain.</em>
            </h1>
            <p>
              Better decisions. Smarter workflows. Clearer stories. We listen
              carefully, define the right problem and create work built for a
              purpose.
            </p>
            <div className="studio-actions">
              <Link href="/contact/" className="studio-button">
                Discuss a project <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/work/" className="studio-text-link">
                See our work →
              </Link>
            </div>
            <div className="studio-hero-note">
              <span>Listen First.</span> Build What Matters.
            </div>
          </div>
          <div className="studio-hero-proof">
            <div className="studio-proof-caption">
              <span>01 / UNDERSTAND</span>
              <span>CONCEPT DEMONSTRATION</span>
            </div>
            <Dashboard />
            <div className="studio-proof-under">
              <span className="studio-signal" aria-hidden="true">
                ↳
              </span>
              <p>
                From disconnected data
                <br />
                to a clearer next decision.
              </p>
              <Link
                href="/understand/"
                aria-label="Explore executive intelligence dashboards"
              >
                ↗
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="studio-section">
        <div className="studio-container">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">THREE WAYS TO MOVE FORWARD</span>
              <h2>
                Defined projects.
                <br />
                Tangible outcomes.
              </h2>
            </div>
            <p>
              Choose the challenge that matters most. Each service is scoped
              around a specific business need, not a vague AI transformation
              promise.
            </p>
          </div>
          <div className="studio-pillars">
            {[
              {
                name: "Understand",
                category: "EXECUTIVE INTELLIGENCE DASHBOARDS",
                description:
                  "Your numbers, brought into focus. A useful decision view, built around the questions that matter.",
                price: "£8,000",
                symbol: "◒",
              },
              {
                name: "Automate",
                category: "AI PROCESS TRANSFORMATION",
                description:
                  "One workflow worth fixing. Less repetitive work, with human approval where it matters.",
                price: "£10,000",
                symbol: "⇢",
              },
              {
                name: "Explain",
                category: "TECHNOLOGY EXPLAINERS & ANIMATION",
                description:
                  "A complex product, clearly told. A focused story that helps your buyers understand.",
                price: "£6,000",
                symbol: "▹",
              },
            ].map((s, i) => (
              <article className="studio-pillar" key={s.name}>
                <div className="studio-pillar-index">
                  <span>0{i + 1}</span>
                  <span className="studio-pillar-symbol" aria-hidden="true">
                    {s.symbol}
                  </span>
                </div>
                <span className="studio-eyebrow">{s.category}</span>
                <h3>{s.name}.</h3>
                <p>{s.description}</p>
                <div className="studio-pillar-price">
                  Indicative pilot <b>{s.price}</b>
                  <small>excluding VAT · subject to scope</small>
                </div>
                <Link
                  className="studio-text-link"
                  href={"/" + s.name.toLowerCase() + "/"}
                >
                  Explore service <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="studio-principle">
        <div className="studio-container studio-editorial">
          <div>
            <span className="studio-eyebrow">OUR STARTING POINT</span>
            <h2>
              First, understand
              <br />
              what needs
              <br />
              to change.
            </h2>
            <p>
              We begin with the context, not the tool. A better question leads
              to a more useful answer.
            </p>
            <Link href="/process/" className="studio-text-link">
              Explore our process →
            </Link>
          </div>
          <div className="studio-process-list">
            {stages.map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="studio-section">
        <div className="studio-container">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">IDEAS MADE INSPECTABLE</span>
              <h2>
                See the thinking
                <br />
                take shape.
              </h2>
            </div>
            <p>
              Our initial portfolio is built from clearly labelled concept
              demonstrations, not invented client stories.
            </p>
          </div>
          <div className="studio-concept-grid">
            {concepts.map((c, i) => (
              <Link
                key={c.id}
                href={"/work/#" + c.id}
                className="studio-concept-card"
              >
                <div
                  className={"studio-concept-art art-" + i}
                  aria-hidden="true"
                >
                  {i === 0 ? (
                    <>
                      <span>REVENUE / PLAN</span>
                      <div className="studio-mini-bars">
                        {[42, 65, 54, 82, 92, 110].map((h, j) => (
                          <i key={j} style={{ height: h }} />
                        ))}
                      </div>
                    </>
                  ) : i === 1 ? (
                    <div className="studio-workflow-mini">
                      Enquiry <span>↓</span> Human review <span>↓</span> CRM
                    </div>
                  ) : (
                    <div className="studio-story-mini">
                      <span>Complex.</span>
                      <span>Clear.</span>
                    </div>
                  )}
                </div>
                <span className="studio-eyebrow">CONCEPT DEMONSTRATION</span>
                <h3>
                  {c.name} <span aria-hidden="true">↗</span>
                </h3>
                <p>{c.type}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}
