# Port67 website remodel implementation plan

**Goal:** Replace the appointment-assistant landing page with the approved Port67 Quiet Signal studio website.
**Architecture:** Keep Next.js App Router; share a scoped marketing shell and content definitions across nine routes. Keep legacy application routes available. Accept enquiries only through a configured server-side delivery endpoint after privacy approval.
**Tech stack:** Existing Next.js, React, TypeScript, CSS; no new dependencies.
**Spec:** User-supplied SPECIFICATION.md, COPY_DECK.md, FORM_AND_ANALYTICS.md and logo.svg; design approved in chat on 11 November 2026.

## Constraints
- Three equal pillars; supplied copy and logo; UK English; indicative pricing excluding VAT.
- Concepts use synthetic data and carry explicit labels; no invented client outcomes.
- Never acknowledge an enquiry without confirmed durable delivery. No tracking or personal data in analytics by default.
- Legal details and actual enquiry processor are not supplied: explain this honestly and prevent collection until configured.

## Tasks
- [x] Build shared public shell, scoped responsive styles, metadata and accessible navigation.
- [x] Implement homepage, three service routes, work, process, contact and legal routes.
- [x] Test validation and delivery failure behavior before implementing server enquiry handler; add client field validation and failure handling.
- [ ] Run production build, endpoint checks and browser checks; review changes; commit and push main.

## Review focus
320px reflow; keyboard navigation; safe unavailable form state; no false enquiry success; existing app routes retain auth context.

## Verification
- `npm test`: all four suites passed (schema, delivery handler, nine route render checks, retry identity).
- Production build passed using build-only Firebase client placeholders; missing legacy Firebase Admin credentials still emit an existing initialization error locally. Preserve real production settings on Render.
- Code review completed; retry identity issue fixed and re-reviewed.
- Browser QA unverified: managed preview invokes `next dev --host ... --strictPort`, unsupported by Next.js. No alternate preview infrastructure introduced.
- User replaced provisional aperture logo with supplied robot/PORT67 reference; clean recolourable SVG recreation and four palette variants included.
