# Changelog

## 2026-11-11 — Render prerender fix (DEP-001)

- Added Suspense wrappers around /sign-in and /pricing query-dependent content with accessible loading fallbacks.
- Added nine rendering regression tests covering suspension, sign-in/reset selection and all pricing query steps. External services are not invoked by these tests.
- Added Render/Firebase staging instructions and recorded the actual deployment failure and remaining credentials/security blockers. No Firebase schema, rules, authentication handlers, payments or live services were changed.
- Base commit: 1a6aa26f65c2ad05166bfbf0dad9afd9fa59981a; governance PR #1 exists at https://github.com/port67-ai/ai-agent/pull/1. This fix is prepared on fix/render-prerender and is not a verified remote deployment.

## 2026-11-11 — Governance baseline (GOV-001 through GOV-006)

- Added canonical PRD, universal agent instructions, architecture, Firebase data model, decisions, implementation status, testing and mandatory handover.
- Replaced duplicated Claude guidance with the universal entry point; added a Gemini entry point.
- Added tested Node governance checks for required docs, handover content, PR evidence/requirement IDs, feature test changes and schema/architecture documentation impact.
- Added GitHub Actions for documentation, formatting, type checks, lint and automated tests, plus a PR template and pinned Prettier dependency.
- Kept application source, Firestore rules and runtime behavior unchanged. Documented existing failures and security gaps rather than treating them as implemented governance controls.
- Remote CI execution, branch protection, publication and product workflow readiness remain unverified. See TESTING.md and HANDOVER.md for actual checks and exact next actions.

Base commit: 26ab3be6e75a408b79fb6f1f66b894a7f5402113. Implementation commit: 48aeffac48e1414124bec35d59cf2850e8cf4282, pushed to chore/engineering-governance. This follow-up records publication and committed-diff verification; no PR URL exists yet.
