import Link from "next/link";
export const metadata = {
  alternates: { canonical: "https://port67.ai/privacy" },
  title: "Privacy notice | Port67.ai",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <section className="studio-section">
      <div className="studio-container studio-legal">
        <span className="studio-eyebrow">
          LEGAL INFORMATION / IN PREPARATION
        </span>
        <h1>Privacy notice</h1>
        <p className="studio-notice">
          A controller-specific privacy notice is being prepared. Online
          enquiries are disabled until it is complete and enquiry delivery is
          configured.
        </p>
        <h2>Before online enquiries open</h2>
        <p>
          Verified legal identity, contact details, applicable terms and
          data-processing information must be published. We will not present
          invented entity details or a generic notice as a completed policy.
        </p>
        <p>
          No non-essential analytics or third-party marketing trackers have been
          added to the studio pages.
        </p>
        <Link className="studio-text-link" href="/">
          Return to the studio →
        </Link>
      </div>
    </section>
  );
}
