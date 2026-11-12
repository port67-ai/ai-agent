# Architecture: observed versus proposed

Observed at 26ab3be: package.json declares Next.js 16, React 19, TypeScript, Firebase client/admin, Stripe and Airtable. src/app contains landing, auth, checkout, dashboard and API routes; src/lib/services contains Firebase, Stripe and Airtable integrations. These observations are inventory, not security or functionality verification.

The Factory target architecture is in PRD.md sections 4–16 and remains proposed. Existing appointment-booking flows must not be presented as the multi-tenant Factory control/execution/evidence planes. No full source audit or reuse decision has been completed. Existing guidance is archived in EXISTING_APP_GUIDE.md.

Main advanced to a5e8ceb with a public studio site in src/app/(studio), src/components/studio and enquiry tests. Integrated without application edits during CHG-0002. This public site remains separate from the proposed Factory requirements.

PRD 1.1.0 target extension (not implemented): segmented evidence -> CampaignStrategy/customer approval -> specialist ProductionTaskBrief -> assets/customer approval. A capability-gap proposal path feeds reviewed versioned agent/skill registration; it cannot bypass existing authorisation, evaluation or cost controls. Measurement lineage begins in phase one; channel result integrations and publishing are phase two. Runtime schemas and technical design remain pending.

## CHG-0004 — bounded MVP runtime
`/portal` is a separate Next.js client workspace calling `/api/factory/[...path]`. `src/lib/factory/model.ts` owns contracts; `engine.ts` owns immutable strategy/asset content and authorised state transitions; `service.ts` owns authentication, project scope and orchestration; `repository.ts` serialises atomic local writes or a configured dedicated Firebase workspace transaction. `registry.ts` defines reviewed versioned research/human/template capability contracts. Components are split by research, direction, production assets, intake and capabilities.

Only the service reads private records. Customer projection strips internal drafts/tasks/audit/registry proposals and pauses delivery during an unshared revision. Research reservations carry expiring leases, frozen brief/hash, provider metadata and usage status; operator recovery never silently retries a possibly billed call. Source -> interpreted insight -> strategy hash -> specialist task -> asset hash -> approval/delivery is the traceability chain. No queue, permanent agent loops or external publishing is introduced. Local mode is single-process/durable-disk only; Firebase mode and external research remain unverified integrations.

Live-foundation modules: config.ts supplies secret-free readiness and production gates; synthesis.ts validates bounded reviewed-context model responses; synthesis-run.ts reserves/meter/validates/applies drafts. Research and synthesis share invocation limits. See RENDER_ACTIVATION.md and ADR-0002.
