# Accounts, providers and costs Implementation Plan

> **For agentic workers:** implement isolated modules in parallel, integrate sequentially, then perform one whole-branch review.

**Goal:** Individual account-owned campaigns, explicit four-provider drafting and owner-only API cost reporting on Render.
**Architecture:** Firebase identity -> server-derived account scope -> repository -> reviewed campaign pipeline; separate admin-only metered invocation ledger. No automatic provider retries.
**Tech Stack:** Existing Next.js16/React19/TypeScript, Firebase Auth/Admin, fixed provider HTTP endpoints.
**Spec:** docs/superpowers/specs/2026-11-12-accounts-provider-costs-design.md

## Global constraints
Render remains host; project ai-agency-3671b; secrets stay in protected settings; no legacy Firebase deployment; never claim untested live provisioning. Every account selection and admin request is authorized server-side.

## Review focus
Cross-account ID guesses/forged ownership; stale role/revoked identity; timeout or invalid billable output; cached token double counting/missing rates; account persistence across restart and legacy data isolation.

### Task 1: Provider contracts
- [ ] Add failing transport tests for four providers, cited-only research and normalized usage.
- [ ] Implement providers.ts and adapt research.ts/synthesis.ts without losing validation and consent guards.
- [ ] Run provider and existing synthesis/research suites.

### Task 2: Owner cost ledger
- [ ] Add failing tests for reserve-before-call, estimated/unknown/reconciled costs, cached input and invalid rates.
- [ ] Implement costs.ts and AdminCosts.tsx; separate private repository namespace, bound records and fail closed.
- [ ] Integrate metering around every managed model dispatch; test failed/rejected calls and admin-only API.

### Task 3: Individual identities/account isolation
- [ ] Add failing tests for verified Firebase identities, role allowlists, deterministic account ownership and forged foreign IDs.
- [ ] Implement identity.ts/firebase-admin.ts and AccountLogin.tsx, integrate secure session exchange/account directory and producer selection.
- [ ] Add ownership linkage on all research/build/assets records; preserve invitation and synthetic journeys.

### Task 4: Dedicated database and campaign validation
- [ ] Implement dedicated Firestore server schema/config, deny browser rules, local compatibility and adapter contract tests.
- [ ] Verify cloud access; provision/test only when authenticated, otherwise record exact access blocker.
- [ ] Execute full local tests/audit/lint/types/build and production browser including account/admin isolation using explicit test doubles where cloud unavailable.
- [ ] Update PRD/changelog/status/handover/activation records, request independent review, fix findings, commit/push PR and merge after green CI.
