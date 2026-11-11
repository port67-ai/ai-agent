# Port67 Factory — canonical product requirements

## Authority and scope

GitHub is the permanent project record. This PRD is canonical; agent entry points and historical plans must not redefine it. The 2026-11-11 user governance instruction approves GOV-001 through GOV-006 below. This repository, port67-ai/ai-agent, implements a Port67 Business Assistant web application. A broader Factory platform roadmap has not been supplied and is not implied by existing marketing copy.

## Approved governance requirements

### GOV-001 — Canonical project record

Maintain PRD.md, AGENTS.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/DECISIONS.md, docs/CHANGELOG.md, docs/IMPLEMENTATION_STATUS.md, docs/HANDOVER.md and docs/TESTING.md in GitHub. Claude and Gemini entry points reference universal AGENTS.md without contradictory requirement copies.

Acceptance: all documents exist, contain useful content, and match inspected source and actual verification evidence; pointers direct new agents to the same workflow.

### GOV-002 — Task preparation and controlled implementation

Before development, read universal instructions, PRD, architecture, decisions, status and handover; inspect source and Git state; identify requirement IDs, dependencies, known issues and acceptance criteria. Use feature branches and small reviewable commits, preserve others' work, document approved scope changes and material decisions, and test behavior changes.

Acceptance: task handover and PR identify approved requirement IDs, verification and scope; no unapproved product expansion or lost local work.

### GOV-003 — Verified completion and handover

Code, tests, product documentation and handover must reflect the same verified state. Update PRD for approved requirement/behavior changes, status, changelog, testing, affected architecture/data documentation and decisions. Commit applicable documents with code. Record actual failures, blockers, unrun checks, relevant commits and PR links.

Acceptance: handover includes date/environment, branch/commit, milestone/IDs, changes, files, test results, migrations/deployments, problems/risks, decisions and exact next task. Unverified work is never labeled complete.

### GOV-004 — Automated review checks

GitHub Actions validate required documents, relevant documentation updates, PRD references, formatting, type checking and automated tests. Flag undocumented schema/architecture changes; require a PR template with documentation impact, test evidence and acceptance criteria.

Acceptance: negative tests demonstrate rejection of missing documents, absent evidence, unknown IDs, missing feature tests and omitted schema/architecture docs. CI fails when underlying commands fail. Human review compares semantic content with implementation.

### GOV-005 — Protected branch enforcement

Protected branches must reject incomplete or failing checks. Configure GitHub rules to require PRs and all documented CI checks, including up-to-date branches, with no bypass allowing failing work to merge.

Acceptance: remote GitHub branch rules are inspected and the required check contexts are confirmed active. A workflow committed locally does not satisfy this requirement by itself.

### GOV-006 — Security, isolation and operational accountability

Preserve tenant isolation, auditability, cost tracking and security controls throughout development. Record uncovered gaps as blockers and add targeted security tests for behavior changes.

Acceptance: changes include relevant ownership/access tests and document audit/cost impact. Existing vulnerabilities cannot be represented as verified controls. Full production isolation, audit and cost readiness remain unverified in the current application.

## Observed application baseline — not approved feature acceptance

The source contains landing/pricing pages, Firebase sign-in/sign-up, business details and AI review forms, dashboards, Firestore user/metrics/call history operations, Stripe and Airtable integrations with mock paths, and legacy Clerk-backed routes. These are source observations, not evidence that full workflows or 24/7 voice/WhatsApp/Facebook booking services work. No approved IDs or end-to-end acceptance criteria for those product features have been supplied.

## Dependencies and release constraints

Node compatible with Next.js 16 (onboarding used Node 24.22.1/npm 11.9.0), npm lockfile installation, real Firebase project configuration for UI authentication, secure Admin credentials for server token verification, and verified Google Fonts access for builds. Live payments, live enrichment, deployment and destructive cleanup are outside this governance task. See docs/TESTING.md for verification and docs/IMPLEMENTATION_STATUS.md for gaps.

## Change control

Add stable requirement IDs and measurable acceptance criteria only for newly approved requirements. Retain existing IDs when requirements change and record the decision. Broader Factory requirements, organizational tenancy, audit retention and cost accounting models need explicit product decisions before implementation.
