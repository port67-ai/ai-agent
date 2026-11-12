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
