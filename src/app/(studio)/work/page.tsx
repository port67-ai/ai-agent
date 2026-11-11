import Link from "next/link";
import { Hero, CTA, concepts } from "@/components/studio/Shared";
import { Dashboard } from "@/components/studio/Dashboard";
export const metadata = {
  alternates: { canonical: "https://port67.ai/work" },
  title: "Selected Work & Concept Demonstrations | Port67.ai",
  description:
    "Inspect clearly labelled Port67.ai concepts: executive dashboards, controlled workflows and technology stories.",
};
export default function Work() {
  return (
    <>
      <Hero
        eyebrow="SELECTED CONCEPTS"
        title="Show the work. Not the hype."
        lead="We believe credibility starts with outputs you can inspect. The examples below are illustrative concepts, clearly separated from commissioned client work."
      />
      <section className="studio-section">
        <div className="studio-container">
          <p className="studio-notice">
            No client testimonials, actual project metrics or finished demo
            media are presented at this stage. The examples here are interactive
            or illustrated concepts.
          </p>
          {concepts.map((c, i) => (
            <article key={c.id} id={c.id} className="studio-work-example">
              <div>
                <span className="studio-eyebrow">
                  0{i + 1} / CONCEPT DEMONSTRATION
                </span>
                <h2>{c.name}</h2>
                <h3>{c.type}</h3>
                <p>{c.description}</p>
                <p className="studio-caption">
                  Fictional business. Synthetic content. No client results.
                </p>
                <Link className="studio-text-link" href={"/" + c.id + "/"}>
                  Explore {c.id} →
                </Link>
              </div>
              <div>
                {i === 0 ? (
                  <Dashboard />
                ) : i === 1 ? (
                  <div className="studio-work-graphic">
                    <span>RECEIVE</span>
                    <strong>Enquiry</strong>
                    <b aria-hidden="true">↓</b>
                    <span>CHECK & PREPARE</span>
                    <strong>Draft for review</strong>
                    <b aria-hidden="true">↓</b>
                    <span>HUMAN APPROVAL</span>
                    <strong>Record in CRM</strong>
                    <p>Exceptions → human review</p>
                  </div>
                ) : (
                  <div className="studio-work-graphic studio-story-graphic">
                    <span>FLOWPILOT / STORYBOARD CONCEPT</span>
                    <strong>
                      Less chasing.
                      <br />
                      More clarity.
                    </strong>
                    <p>One shared view of every handoff.</p>
                    <small>Storyboard only · completed video pending</small>
                  </div>
                )}
              </div>
            </article>
          ))}
          <div className="studio-notice">
            <h3>Our case study standard</h3>
            <p>
              Every future client case study should describe the initial
              business problem, the approved scope, the implemented solution,
              the constraints, and results only when verified and permissioned.
            </p>
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}
