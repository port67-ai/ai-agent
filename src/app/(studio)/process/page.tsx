import { Hero, CTA, stages } from "@/components/studio/Shared";
export const metadata = {
  alternates: { canonical: "https://port67.ai/process" },
  title: "Our Process | Discover, Define, Build & Validate | Port67.ai",
  description:
    "Listen, define, create, validate and hand over. Defined scope, reviewable increments and agreed quality gates.",
};
export default function Process() {
  return (
    <>
      <Hero
        eyebrow="LISTEN FIRST. BUILD WHAT MATTERS."
        title="Good work starts with a better question."
        lead="We begin with the context, not the tool. Our process is designed to create the right thing, with a clear scope and agreed quality gates."
      />
      <section className="studio-section">
        <div className="studio-container studio-process-expanded">
          {stages.map(([n, t, d]) => (
            <article key={n}>
              <span>{n}</span>
              <h2>{t}</h2>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="studio-principle">
        <div className="studio-container studio-editorial">
          <div>
            <span className="studio-eyebrow">A NAME WITH A PRINCIPLE</span>
            <h2>
              Listen carefully.
              <br />
              Respond with relevance.
            </h2>
          </div>
          <div>
            <p>
              In network configuration, DHCP servers listen on UDP port 67 for
              requests before responding with appropriate configuration. That
              technical origin informs our name — but it is the business
              principle that matters.
            </p>
            <p>
              Listen carefully. Respond with relevance. Build only what is
              useful.
            </p>
          </div>
        </div>
      </section>
      <section className="studio-section">
        <div className="studio-container studio-editorial">
          <div>
            <span className="studio-eyebrow">WHAT HAPPENS NEXT</span>
            <h2>A clear path to a defined project.</h2>
          </div>
          <div>
            <p>
              Qualification → 20–30-minute discovery → fixed-scope proposal or
              optional separately scoped paid diagnostic → agreement and
              delivery.
            </p>
            <p>
              We agree assumptions, scope and acceptance criteria before
              delivery begins. Work is reviewed at meaningful checkpoints, with
              a clear handover and support path.
            </p>
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}
