# Verification

## Documentation baseline
Run `python3 scripts/check_docs_governance.py --base <base-commit>` and `git diff --check`. Python 3 and Git suffice; no package installation or service credentials required. The baseline PRD hash can be compared with docs/reference/PROVENANCE.md.

## Application
Existing scripts: `npm run lint`, `npm run build`, `npm run dev`. Inspect required environment variables before running. No application tests, build, deployment or security certification are implied by documentation checks. Future code changes require checks matched to affected behaviour; implement Factory acceptance suites from PRD section 18 incrementally.

## Evidence rule
Record command, result, date, environment and tested commit/CI run before marking VERIFIED. Structural checks cannot prove truthful narrative, runtime correctness or harness compliance.

## CHG-0004 automated acceptance
`npm test` now includes all existing suites and Factory domain, persistence/concurrency, API/auth/invitation, portal-rendering, research failure/recovery, isolated login rate-limit and lazy legacy-Firebase import tests. Stubbed provider transport tests verify billing evidence and schema handling without paid calls. `npm run check:factory` is scoped lint; existing unrelated lint debt is not silently declared fixed. `npm run test:browser` exercises a running app on desktop/mobile: synthetic research, direction approval, three production drafts, customer asset approvals, SVG download, learning and overflow/contrast checks. Set PORT67_TEST_ORIGIN/CHROMIUM_PATH if needed. See MVP_VERIFICATION.md for the final execution record.

Live-foundation checks and limits: FOUNDATION_VERIFICATION.md. npm run audit:security gates high/critical findings; moderate findings remain tracked. Browser includes setup/consent/revocation; cloud/model transport is stubbed and must be smoke-tested separately.

CHG-0009 tests: npm test includes provider/identity/account/API/storage-schema/metering/campaign/archive contracts. npm run test:firestore uses demo-only Firestore emulator with Java21 and verifies real Admin persistence/transactions and browser-deny rules; CI runs it. npm run test:browser includes synthetic journey plus explicit account/admin UI fixtures. No mock is live acceptance; cloud/provider checks still required. Evidence ACCOUNTS_VERIFICATION.md.

CHG-0010: factory-account-errors.test.ts validates allowlisted diagnostics and no raw-error leaks/unknown-user enumeration. Account browser test reproduces auth-config503 with zero Firebase requests, then a mocked Firebase OPERATION_NOT_ALLOWED response with a specific setup message. Fixtures use fake credentials only and do not establish real sign-up activation.


## CHG-0082 customer task plans

`npm test` includes `factory-task-plan.test.ts`, `factory-task-plan-api.test.ts` and `factory-task-plan-ui.test.tsx`. These cover relevance, DAG validation, versioned overrides, role isolation, static-only production, manual task completion, review holds/pending rework, explicit retry boundaries, stale research/reviewer results with retained paid usage and local restart reconstruction. Existing campaign/scoping/auto-start fixtures now assert the selected five-researcher path where appropriate; video campaigns explicitly collect video evidence before drafting.

`npm run test:browser` includes `factory-task-plan-browser.cjs`. With a local app running at `PORT67_TEST_ORIGIN` (default localhost:3000), it uses explicit synthetic API fixtures and the real transition engine to test the task board, agent checkbox edits, reason/version save, history and desktop/mobile rendering. It does not call a paid provider. Screenshots live in ignored `work/screenshots/`.


## CHG-0083 AI planning and medium selection

`npm test` includes planner/medium contracts, metered planning runs, API journey, UI rendering and all-provider output-limit tests. New tests cover complete public brief context, approved agents/methods, accepted linked citations, no fabricated figures, requested-output preservation, stale paid result usage, scope bypass/caching, producer scope overrides, expected recommendation/evidence checks and selective craft dependencies. `npm run test:browser` additionally runs `factory-ai-planning-browser.cjs`, a synthetic fixture using real validators/transition code to confirm visible hypotheses, gap proposals, alternative medium evidence and a versioned producer decision. Screenshots are ignored intermediates in work/screenshots. These do not establish real campaign effectiveness.

## CHG-0084 acceptance
New suites: factory-specialists, factory-specialist-legacy, factory-performance, factory-performance-planning, factory-performance-api and factory-performance-ui. They cover catalogue/method availability, persisted seven-role scoping, producer-only capture/review/carry, customer privacy, dates/counts/zero denominators/CSV quoting, history freshness, rejected-history hypothesis exclusion and historical citations. Existing AI browser journey now enters and reviews results, replans, refreshes medium selection and checks observed-performance citations. Transport is simulated; no paid performance claim or live advertising-platform integration is tested.

Additional regressions cover concurrent feedback rejection during a paid planner call (stale result discarded, usage retained), compact freshness fingerprints, and post-direction feedback preserving existing planning gates while source-evidence changes remain stale.


## CHG-0104 acceptance
New suites, all in `npm test`: factory-customers (validation, commands, limits, file type detection, website link reading), factory-customers-site (address safety, redirects, size and type limits, with network and DNS injected), factory-customers-api (roles, validation, uploads, private storage, authorisation, audit) and factory-customers-ui (the three-entry shell, access, editor render). The site safety tests were mutation-checked. A scratch jsdom run of the real components against the real handler was also used once and is not in the repository; it would need jsdom added as a dev dependency to be kept. Browser tests, the Firestore emulator and Firebase Storage were not run, and Find from website has not touched a real site. Commands: `npm test`, `npm run check:factory`, `npx tsc --noEmit`, `npm run build`, `python3 scripts/check_docs_governance.py --base origin/main`.

## CHG-0107 acceptance
tests/factory-commissions.test.ts (rules, commands, baseline), factory-commissions-api.test.ts (routes, roles, limits) and factory-commissions-ui.test.tsx (inputs 1, 3, 4, 5 and no Input 2, locked secondary checks, evidence basis, confirm ticks, baseline gaps). Manual: open /workspace, Projects, create a project with only a name, fill an input, add evidence, open Inspiration baseline.

## CHG-0108 acceptance
tests/factory-brand-intel.test.ts (parsing, citations, intake withholds unauthorised text, four ledger rows, verbatim red lines, failed run never current, single run at a time, version cap, interrupted run, not-configured refusal) and factory-brand-intel-ui.test.tsx. Manual live check: set PORT67_RESEARCH_ENABLED=true and keys, open /workspace, Customer account, press Submit and run Brand Intelligence, then compare the dossier with the brand's real site and check the cost on the admin costs page.

## CHG-0109 acceptance
factory-customers-ui (collapsibles, chips, Add button, dossier slot below red lines), factory-customers-api (PDF served inline, private, no-store), factory-brand-intel (section 7 prompt wording, 5 ledger rows) and factory-brand-intel-ui (verify-first callout, red line cards, source chips). Manual: open a filled account, confirm the three sections are closed and keep their state after Save; Add a PDF; click its chip.
