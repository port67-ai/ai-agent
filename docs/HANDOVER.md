# Latest handover — spend caps and sign-in polish

2026-11-12; Claude; branch to be named by owner (suggest claude/spend-caps); base main after PR for CHG-0011. CHG-0012, CHG-0013. PRD unchanged (1.3.0).

Live state reported by the owner: Firebase sign-in, Firestore-backed workspace and brief creation work on Render after CHG-0011. Required fixes were configuration only: PORT67_FIREBASE_DATABASE must be exactly (default), NEXT_PUBLIC_FIREBASE_PROJECT_ID must not equal the Factory project, PORT67_LIVE_ENABLED must be true. Producer access was NOT working at the last screenshot (workspace showed Account owner after setting PORT67_OPERATOR_UIDS/ADMIN_UIDS); check UID values, redeploy and fresh sign-in before assuming it works.

CHG-0012: sign-in banner clears when a brief is created. CHG-0013: hard USD caps enforced at reservation in costs.ts via budget.ts. Defaults: $25 per UTC month for the workspace, optional per-project cap, $1 hold per call with unknown cost. Without PORT67_MODEL_PRICING_JSON every call is held, so $25 allows 25 calls; set pricing for realistic use. Settings are in config/factory.env.example; the admin cost view and readiness list show them. Existing tests that make many unpriced calls must set PORT67_MONTHLY_BUDGET_USD high (see tests/factory-ledger-archive.test.ts).

Checks: npm test, tsc --noEmit, eslint on touched paths and next build passed in a sandbox copy with TMPDIR=/tmp (sandbox temp path trips factory-config.test.ts on unmodified main). Browser tests (npm run test:browser) not run here: no Chromium. Read GitHub CI before merging. No provider call was made.

Do not run git write commands from the Claude sandbox against the repo: they leave undeletable lock files. Claude edits files only; the owner commits with GitHub Desktop.

Queue agreed with the owner, in order: (1) spend caps, done pending merge; (2) guided live research smoke test on a public-data test brief with the $25 cap; (3) producer and admin polish once producer access works; (4) rendered MP4 from the approved storyboard. Remaining from earlier: per-person MFA, task and workflow level caps, phase-two publishing and measurement.
