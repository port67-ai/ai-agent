# Decisions

## DEC-001 — Canonical governance record (2026-11-11)

Approved source: user's Mandatory Engineering Governance — Port67 Factory instruction. Implement GOV-001 through GOV-006 with PRD.md as the sole requirements authority and AGENTS.md as the shared agent workflow. Claude/Gemini entry points only reference it. Historical chat and marketing text are not verified product specifications.

## DEC-002 — Repository baseline and bounded scope (2026-11-11)

Record actual Business Assistant architecture, schema and failures; do not invent a Factory platform roadmap or silently fix product behavior in a governance change. Firebase migration, tenant isolation, auditability and cost-accounting gaps remain explicit open work. This is an implementation scope decision, not approval of insecure existing behavior.

## DEC-003 — Enforcement design (2026-11-11)

Use a dependency-free Node validator with negative fixture tests, pinned Prettier, PR-body sections and path-based documentation checks. Require handover/status/changelog/testing updates for implementation changes, architecture/decisions for integration/configuration changes, and data docs for schema-related paths. Require test changes for application source changes. Conservative heuristics may require a documentation note for a nonbehavioral edit; reviewers verify relevance rather than treating touched files as proof. PRD.md itself changes only when approved requirements change; valid PRD references are always required for PRs.

Run existing lint as a failing gate rather than suppressing its known errors. Add no blanket exemptions or continue-on-error. Node tests currently exercise governance only; they do not prove application behavior. Formatting is enforced on governance files initially; extending legacy application formatting is separate work.

## DEC-004 — Remote enforcement and limits (2026-11-11)

GitHub Actions cannot activate branch protection through a workflow file. An administrator must require the documented check contexts and prohibit bypass. Remote configuration is not represented as active without inspection. Workflow definitions, canonical docs and validation code are themselves subject to semantic review; repository administrators can change them, so automation is not tamper-proof.

## Outstanding product decisions

Define the scope of the wider Port67 Factory, approve application feature IDs/acceptance criteria, resolve Firebase versus legacy Clerk, define tenant and role boundaries, audit retention and cost attribution. No decision is implied by this list.

## DEC-005 — Minimal Render prerender correction (2026-11-11)

DEP-001 wraps query-dependent sign-in and pricing content with React Suspense instead of disabling static prerender checks or forcing every route dynamic. Both existing useSearchParams consumers were inspected and tested. Test rendering replaces external navigation/services/UI dependencies to avoid contacting Firebase, Make or payment providers; it does not verify those integrations. A test-only Google font response may isolate the production prerender check from this cloud machine's blocked font access; it must never be saved as Render configuration or described as verification of real font delivery. Missing Admin credentials are a separate configuration issue, not the reported fatal sign-in export failure.
