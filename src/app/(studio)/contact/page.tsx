import { EnquiryForm } from "@/components/studio/EnquiryForm";
export const dynamic = "force-dynamic";
export const metadata = {
  alternates: { canonical: "https://port67.ai/contact" },
  title: "Discuss a Project | Contact Port67.ai",
  description:
    "Tell us what needs to change. Explore a defined dashboard, automation or technology explainer project with Port67.ai.",
};
export default function Contact() {
  const available =
    process.env.ENQUIRY_PRIVACY_APPROVED === "true" &&
    !!process.env.ENQUIRY_DELIVERY_URL &&
    !!process.env.ENQUIRY_DELIVERY_TOKEN;
  return (
    <>
      <section className="studio-inner-hero">
        <div className="studio-container">
          <span className="studio-eyebrow">START WITH THE PROBLEM</span>
          <h1>
            Tell us what
            <br />
            needs to change.
          </h1>
          <p>
            A useful conversation starts with a clear business challenge. Share
            a few details so we can understand whether Port67.ai is the right
            fit.
          </p>
        </div>
      </section>
      <section className="studio-section">
        <div className="studio-container studio-form-grid">
          <div className="studio-form-intro">
            <h2>
              A few details.
              <br />
              No sales theatre.
            </h2>
            <p>
              Port67 typically explores defined B2B projects in the
              £5,000–£12,000 range. Smaller and larger opportunities can still
              be described; we will assess fit case by case.
            </p>
            <p>
              Your enquiry is reviewed by a real person. Where there is a
              plausible fit, the next step is a focused discovery conversation.
              We do not promise an appointment or response time that has not
              been operationally established.
            </p>
          </div>
          <EnquiryForm available={available} />
        </div>
      </section>
    </>
  );
}
