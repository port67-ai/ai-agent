# Architecture: observed versus proposed

Observed at 26ab3be: package.json declares Next.js 16, React 19, TypeScript, Firebase client/admin, Stripe and Airtable. src/app contains landing, auth, checkout, dashboard and API routes; src/lib/services contains Firebase, Stripe and Airtable integrations. These observations are inventory, not security or functionality verification.

The Factory target architecture is in PRD.md sections 4–16 and remains proposed. Existing appointment-booking flows must not be presented as the multi-tenant Factory control/execution/evidence planes. No full source audit or reuse decision has been completed. Existing guidance is archived in EXISTING_APP_GUIDE.md.

Main advanced to a5e8ceb with a public studio site in src/app/(studio), src/components/studio and enquiry tests. Integrated without application edits during CHG-0002. This public site remains separate from the proposed Factory requirements.
