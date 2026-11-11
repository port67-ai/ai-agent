# Testing strategy and verification

## Local commands

From the repository root with Node 24 and dependencies installed using npm ci:

| Command                                                 | Purpose                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| npm test                                                | Node built-in test runner; governance validator and isolated page-rendering regression tests |
| npm run governance:check                                | Required documents and mandatory handover content                                            |
| node scripts/check-governance.mjs BASE_SHA PR_BODY_FILE | PR diff/documentation impact and canonical requirement references                            |
| npm run format:check                                    | Prettier for canonical/governance documents, workflow, validator, tests and package.json     |
| npm run typecheck                                       | TypeScript application check without emitting code                                           |
| npm run lint                                            | Existing ESLint rules across the repository, with no suppression of existing failures        |
| npm run build                                           | Production compilation; needs Google Fonts access and usable Firebase client configuration   |
| npm run dev                                             | Development server; functional validation requires an actual successful page request         |

Formatting initially covers governance surfaces only; it does not rewrite the legacy application. Add meaningful component/API tests for application behavior changes. Node governance tests are not application acceptance tests. The rendering tests exercise the real sign-in/pricing modules using React server rendering, with navigation and external UI/services replaced; they do not test Firebase or browser hydration. No Firebase emulator, auth, tenant-isolation, Stripe, Airtable or end-to-end application tests currently exist. Never contact live services or use destructive cleanup scripts as a substitute for isolated tests.

## Automated policy and its limits

.github/workflows/governance.yml runs on all PRs, main/master pushes, merge queues and manual dispatch. Stable required check names are **Documentation**, **Formatting**, **Typecheck**, **Lint**, **Tests**. Jobs do not use continue-on-error, path skips or dependency failures that conceal another required check. PR runs use a full checkout and PR-base diff with PR-body metadata from the event file. Push/merge-queue/manual runs check the document baseline; change-impact evidence is checked on the originating PR.

All PRs require canonical PRD IDs and populated documentation impact, testing evidence and acceptance criteria sections. Implementation changes require handover/status/changelog/testing changes. Application source changes require a changed test file. Schema-related paths require DATA_MODEL.md updates; integration/API/config paths require ARCHITECTURE.md and DECISIONS.md updates. Heuristics cannot determine whether a test is useful, a schema change is elsewhere, a touched document is accurate, or a PRD update is semantically necessary. Reviewers must check these points and the security/operations section manually.

Tests exercise missing and empty required documents, handover heading content, missing documentation, missing/unknown/mixed PRD IDs, empty PR template evidence, missing feature tests, schema/architecture heuristics, and valid changes. A green fixture suite proves validator behavior, not a production feature.

## Required GitHub administration

For main and any other protected release branch, enable a ruleset/branch protection requiring PRs, the five exact check names above, up-to-date branches (or merge queue), no force-push/deletion, no bypass of failing checks, and review of actual documentation accuracy. Verify the checks originate from the intended GitHub Actions workflow. Require appropriate owner review for governance/workflow/security changes under the organization's ownership policy. Repository files alone cannot enable these settings. No remote protection or successful remote CI run is claimed.

## Verification record — 2026-11-11

Environment: managed Codex Cloud, Linux; Node 24.22.1/npm 11.9.0. Source baseline 26ab3be. Governance verification: 11 Node tests passed, 0 failed/skipped; required-document checks (11 files), formatting, TypeScript, targeted validator/test ESLint and git diff --check passed. Frozen npm ci installed 572 packages with the updated lockfile. Full lint still failed with 40 existing errors/21 warnings. A negative test first exposed commented PRD examples being accepted and passed after correction. The actual validator CLI passed against the 19-path committed diff and a populated PR body; application source and rules were unchanged. Git push of implementation commit 48aeffa to the feature branch succeeded. See HANDOVER.md for external blockers. GitHub branch-protection API access was denied by the proxy (CONNECT HTTP 403), so remote rules could not be inspected. Build/page checks were not rerun for this governance-only change; their established onboarding blockers remain below.

Onboarding observations: npm ci installed 571 packages and repeat installation passed; npx tsc --noEmit passed. npm run lint failed with 40 errors/21 warnings. npm run build failed downloading Inter from Google Fonts; direct Google Fonts request received proxy HTTP 403. Dev server started, but GET / returned HTTP 500 with Firebase auth/invalid-api-key because client configuration is absent. No browser/authenticated/paid workflow was verified. No migrations or deployments ran. These baseline failures are not waived by adding governance checks.

## DEP-001 verification — 2026-11-11

Before the fix, the nine new rendering tests had 7 passes and 2 failing suspension cases. After the fix, all 9 passed; full npm test passed all 20 tests (0 failed/skipped). TypeScript and targeted ESLint for the rendering tests passed. Final full lint failed with the unchanged 40 existing errors and 21 warnings. Formatting, required-document checks and git diff --check passed; targeted rendering-test lint is clean.

A direct Google Fonts request received proxy CONNECT HTTP 403. To isolate the reported prerender failure, a temporary test-only NEXT_FONT_GOOGLE_MOCKED_RESPONSES file exported an explicit map from the Inter Google CSS URL to a CSS comment, and the six public Firebase web variables were supplied to the build process. No private credentials, source overrides or Render configuration were used. An initial Proxy-based fixture failed in the harness; replacing it with the explicit map allowed the actual Turbopack production build to complete all 15 pages. This verifies prerendering with fonts isolated, not real font downloads. Never set the font-test variable on Render.

Starting that output with next start and requesting /, /sign-in and /pricing produced HTTP 200 and expected Port67/loading content on each. Browser hydration, auth, database, authorized-domain and payment checks remain unrun. Missing Admin credentials still logged during build; they were not the fatal export error. Real Render rebuild is still required. See DEPLOYMENT.md and HANDOVER.md for next actions.
