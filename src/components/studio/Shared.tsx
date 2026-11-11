import Link from "next/link";
export function CTA({
  heading = "Have a project in mind?",
  body = "Start with the problem. We will help establish whether a defined project makes sense.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="studio-cta">
      <div className="studio-container">
        <span className="studio-eyebrow">THE NEXT USEFUL CONVERSATION</span>
        <h2>{heading}</h2>
        <p>{body}</p>
        <Link className="studio-button" href="/contact/">
          Discuss a project <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
export function Hero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="studio-inner-hero">
      <div className="studio-container">
        <span className="studio-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{lead}</p>
        <div className="studio-actions">
          <Link href="/contact/" className="studio-button">
            Discuss a project ↗
          </Link>
          <Link className="studio-text-link" href="/work/">
            See our work <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
export const stages = [
  ["01", "Listen", "Understand the goal and the current reality."],
  ["02", "Define", "Agree scope, price, assumptions and tests."],
  ["03", "Create", "Build in reviewable increments."],
  ["04", "Validate", "Check accuracy, usability, security and rights."],
  ["05", "Hand over", "Deliver assets, documentation and a support path."],
];
export const concepts = [
  {
    id: "understand",
    name: "Northstar Analytics",
    type: "Executive dashboard concept",
    description:
      "Synthetic CRM, billing and product usage data organised into an executive view.",
  },
  {
    id: "automate",
    name: "Meridian Operations",
    type: "Controlled workflow concept",
    description:
      "An illustrative enquiry-to-CRM workflow with human approval and exception handling.",
  },
  {
    id: "explain",
    name: "FlowPilot",
    type: "Technology explainer concept",
    description:
      "A fictional product narrative showing handoffs, approvals and clearer visibility.",
  },
];
