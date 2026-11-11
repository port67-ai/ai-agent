# Changelog

## 2026-11-11 — Governance baseline (GOV-001 through GOV-006)

- Added canonical PRD, universal agent instructions, architecture, Firebase data model, decisions, implementation status, testing and mandatory handover.
- Replaced duplicated Claude guidance with the universal entry point; added a Gemini entry point.
- Added tested Node governance checks for required docs, handover content, PR evidence/requirement IDs, feature test changes and schema/architecture documentation impact.
- Added GitHub Actions for documentation, formatting, type checks, lint and automated tests, plus a PR template and pinned Prettier dependency.
- Kept application source, Firestore rules and runtime behavior unchanged. Documented existing failures and security gaps rather than treating them as implemented governance controls.
- Remote CI execution, branch protection, publication and product workflow readiness remain unverified. See TESTING.md and HANDOVER.md for actual checks and exact next actions.

Base commit: 26ab3be6e75a408b79fb6f1f66b894a7f5402113. The containing Git commit records this change; no PR URL exists yet.
