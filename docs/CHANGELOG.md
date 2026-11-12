# Central change log

Single ongoing ledger. Historical imported PRD section 26 is a baseline record only. Commit association: `git log -- docs/CHANGELOG.md`.

## CHG-0001 — 2026-11-11 — Shared repository memory
- Author/harness: Codex; requested by owner in this session.
- What: preserve supplied PRD and business plan; establish shared harness rules, status register, decisions, handover, documentation checks and PR template. Preserve previous CLAUDE guidance separately.
- Why: enable future coding sessions to continue from repository evidence without prior chat context.
- Requirements: FAC-DEV-001, FAC-DEV-002, FAC-DEV-003, FAC-DEV-004, FAC-DEV-005, FAC-DEV-006; governance support only, not verified Factory acceptance.
- PRD impact: none. Product requirements unchanged; imported PRD stays proposed 1.0.0. Central-ledger convention documented in GOVERNANCE.md.
- Evidence: `python3 scripts/check_docs_governance.py --base 26ab3be` and `git diff --check` (results recorded in HANDOVER.md).
- Status: prepared for commit on docs/port67-project-memory; merge, remote CI and deployment not claimed. Resolve exact commit through Git history.
- Runtime/deployment effects: none; no application source, infrastructure configuration or customer data changed.

## CHG-0002 — 2026-11-11 — Reconcile current main
- Author/harness: Codex.
- What/why: integrate origin/main a5e8ceb into the documentation branch; resolve README conflict by keeping shared project-memory navigation and the current studio setup/deployment guidance.
- Requirements: FAC-DEV-002, FAC-DEV-003, FAC-DEV-004.
- PRD impact: none; requirements and original baseline unchanged.
- Evidence: documentation checks, diff checks and application checks recorded in HANDOVER.md.
- Status: prepared on docs/port67-project-memory for PR #2; no merge into main or deployment claimed.
- External checks: previous commit reports failures for two Vercel preview projects; logs/root cause not yet available. Current main describes Render hosting; no hosting settings changed.

## CHG-0003 — 2026-11-12 — Research-led managed creative service
- Author/harness: Codex; owner requested summary and PRD update after confirming managed service, B2B/B2C flexibility, minimal intake, research-backed messaging/design approval and expandable specialist capabilities.
- PRD impact: 1.0.0 -> 1.1.0, new approved capability scope; no existing runtime contract migration or implementation claimed.
- Requirements: FAC-MKT-001–012; FAC-TEN-006 promoted to required phase-one portal intent. Broaden EXPLAIN formats, reconcile workflow/portal/roadmap assumptions and preserve the other portfolio pillars.
- Reason: derive campaigns from evidence and customer objectives while supporting unfamiliar niches through reviewed agent/skill expansion.
- Phase one: brief, research, strategy approval, managed production and asset approval/delivery. Phase two: performance feedback and separately authorised publishing.
- Evidence: documentation governance, whitespace and requirement coverage checks recorded in HANDOVER.md.
- Status: documentation change on docs/research-led-creative-scope; no product implementation, deployment or merge claimed.
- References: https://www.graphed.com/ and https://www.graphed.com/skills are inspiration, not adopted dependencies or verified performance evidence; uploaded creative-framework notes are reference material, not instructions or verified video claims.

## CHG-0004 — 2026-11-12 — First managed creative MVP
- Author/harness: Codex; autonomous implementation explicitly authorised by owner; independent read-only code review performed under the review skill.
- What: /portal workspace and server API; producer/customer scoped sessions and revocable invitations; minimal intake/logo/context; four research segments and source review; interpreted insights; versioned campaign direction with customer approval; specialist production briefs; real SVG/HTML/copy draft generation, asset review/approval/download/manifest; capability-gap register and phase-two hypothesis view. Add atomic local persistence and configurable dedicated Firebase/OpenAI seams; preserve honest demo/live boundaries.
- Why: prove one connected research-to-delivery journey with a usable customer portal and portable contracts before scaling harnesses/media infrastructure.
- Requirements: FAC-MKT-001–011, FAC-TEN-006; partial supporting FAC-DEV/FAC-ART/FAC-WFL/FAC-CST/FAC-HAR implementation. FAC-MKT-012 remains phase two.
- PRD impact: 1.1.0 -> 1.1.1, documented bounded implementation/local adapter/demo/production format limits; existing product scope and historical commercial hypotheses preserved.
- Tests/evidence: full existing+Factory suites, scoped lint, TypeScript, production build, desktop/mobile browser journey and structural docs checks; final results in MVP_VERIFICATION.md. Independent review findings on interrupted research, failed-output usage and shared login throttle fixed with regression tests. No paid provider calls.
- Deployment/migrations: no cloud database, credentials, legacy rules, ad accounts or production state changed. Existing app Firebase imports are lazy so unconfigured legacy modules do not break Factory builds. /portal is noindexed and linked from site navigation. A merge may trigger the existing hosting pipeline; live auth/provider access remains configuration-gated.
- Status: prepared on feat/explain-managed-mvp; exact commit/PR/merge status is in Git/GitHub, not inferred from this entry.
- Limits: dedicated cloud account/model keys unavailable; live adapters unverified; local store requires one process/durable disk; shared producer password, bearer invites and bounded templates are MVP choices, not full production certification. Premium video rendering, full RBAC/cost ledger and measured performance/publishing remain future work.

## CHG-0005 — 2026-11-12 — Writable synthetic demo storage
- Author/harness: Codex. Requirements: FAC-DEV-005, FAC-TEN-006 demo support.
- What/why: place disposable synthetic demo snapshots in the OS temporary directory by default, with explicit directory override. Read-only app bundles cannot create a runtime directory beneath their source tree. Live client storage remains separate and unchanged.
- PRD impact: none; compatibility fix for the existing isolated demo requirement, not a new production storage guarantee. PRD remains 1.1.1.
- Evidence: default-directory regression test RED -> GREEN; full suite/lint/type/build/browser checks repeated before push. New brief/logo/source/insight production-browser workflow also passed.
- Status: follow-up on PR #4; serverless cross-instance durability is not claimed. Persistent Node hosting/storage and stable secrets remain required for live use.

## CHG-0006 — 2026-11-12 — Reproducible browser CI runner
- Author/harness: Codex. Requirements: FAC-DEV-003, FAC-DEV-005, FAC-DEV-006.
- What/why: pin Factory CI to ubuntu-24.04 with a 15-minute job bound. The first remote run passed clean install/tests/lint/types/build, then Playwright 1.58.2 explicitly rejected the new ubuntu-latest/Ubuntu 26 runner during browser dependency installation.
- PRD impact: none; fix the CI platform compatibility, preserve application behaviour.
- Evidence: GitHub run 43131195215 / job 130895468357 error identifies unsupported OS; new run must confirm browser acceptance on the supported pinned runner. Local production/development browser tests passed.
- Status: follow-up on PR #4; no claim that the failed first remote browser run passed.

## CHG-0007 — 2026-11-12 — Dependency security baseline
- Author/harness: Codex. What/why: compatible dependency upgrades, explicit grpc override, preserve Stripe API by pinning its SDK; add high/critical audit CI gate.
- Requirements: FAC-DEV-008. PRD impact: new explicit security gate within the owner-authorised next stage, documented in 1.2.0 with CHG-0008.
- Evidence: FOUNDATION_VERIFICATION.md; native audit 0 critical/high, 15 moderate remaining. No actual cloud compatibility claim.
- Status: prepared on feat/live-research-foundation; consult GitHub for merge/CI/deployment status.

## CHG-0008 — 2026-11-12 — Render readiness and reviewed AI drafting
- Author/harness: Codex; owner requested next sections after the synthetic MVP, with prior autonomous implementation authorisation.
- What/why: producer setup/readiness, explicit production/durable-storage gates, exact-brief PUBLIC authorisation/revocation, bounded source-grounded insight/direction synthesis, validated lineage, human acceptance and concurrency protection. Retain failed/rejected usage and reserve storage headroom for paid completions.
- Requirements: FAC-MKT-002–006, FAC-MKT-013–015, FAC-DEV-008. PRD impact: 1.1.1 → 1.2.0; add explicit live-foundation requirements. Optional fields preserve existing snapshots; no destructive migration.
- Evidence: FOUNDATION_VERIFICATION.md; full tests, lint, types, build and production browser passed; independent review findings fixed with regression tests. No paid provider call.
- Deployment: Render remains the host. No secrets, disk, cloud database, legacy rules or paid resources changed. Activation requires existing service configuration and persistence/provider smoke tests; RENDER_ACTIVATION.md.
- Status: prepared on feat/live-research-foundation; resolve exact commit/PR/merge from GitHub. Full video, individual auth, monetary ledger and phase-two measurement/publishing remain outside this change.

## CHG-0009 — 2026-11-12 — Account-owned campaigns, four providers and private admin costs
- Author/harness: Codex; owner explicitly requested items 1–4 plus individual accounts/common ownership and admin-only all-model cost tracking. Independent modules implemented in parallel under the dispatch skill; whole-branch read-only review performed.
- What/why: verified Firebase signup/session exchange, stable account IDs, producer account selection, scoped invitations and common research/build/asset lineage; dedicated account/project Firestore layout and separate client-deny config; OpenAI/Claude/DeepSeek/Gemini drafting, grounded OpenAI/Gemini research; reserve-before-dispatch private ledger, raw/normalised usage, frozen USD prices, unknown/estimated/reconciled costs, export and durable archive.
- Requirements: FAC-TEN-008, FAC-CST-009, FAC-HAR-004; bounded supporting FAC-TEN-001–003/006, FAC-CST-001/002/004/008 and FAC-HAR-001/002. PRD impact: 1.2.0 → 1.3.0, explicit owner-requested scope. No blanket baseline architecture approval.
- Evidence: ACCOUNTS_VERIFICATION.md. Application/unit/integration tests, scoped lint, TypeScript and production build passed; production browser and remote Firestore CI results must be read at the exact GitHub commit. Four-provider campaign test uses explicit identity/transport fixtures, not a paid campaign.
- Review: fixed account invitation lookup, Claude cache creation and incomplete research tool pricing with RED→GREEN tests. Added durable active-ledger archival and historical reconciliation regression; archive copies persist before removal from active batch.
- Data/deployment: dedicated Firebase ID ai-agency-3671b confirmed by owner screenshot; no authenticated cloud identity/Render secret access available, no cloud database creation, IAM/rules change, credential creation or paid API call performed. Existing legacy config/data untouched; new accounts use v2 documents, legacy snapshots retain their namespace. New ownership fields are optional for compatibility and filled server-side. Render remains host.
- Limits: actual cloud/provider/model smoke tests remain blocked on access/configuration. One account per user, bounded account snapshots/ledger batches, no monetary hard-budget enforcement, no full video rendering or phase-two publishing/measurement. Infrastructure invoices are not automatically imported into token-cost reporting.
- Status: prepared on feat/accounts-provider-costs; exact commit/PR/merge and checks are in Git/GitHub, not inferred from this entry.

CHG-0009 follow-up: remote Firestore emulator checks passed at120c947 (run43209732747); preserve original Firebase sign-in time in server sessions so a concurrent token revocation is not hidden by a later cookie exchange timestamp. Identity regression RED→GREEN; no PRD scope change.

## CHG-0010 — 2026-11-12 — Show the actual sign-up setup blocker
- Author/harness: Codex; owner reports account creation failure and confirms deployed auth-config responds “Account sign-in is not configured”.
- What/why: replace catch-all account error with allowlisted phase-specific messages for missing web configuration, disabled Email/Password, invalid Firebase configuration, password policy, connectivity, verification and server-session handoff. Never show raw SDK messages or distinguish unknown-user/wrong-password.
- Requirements: FAC-TEN-008. PRD impact: none; restore understandable failure handling for existing sign-up requirement, no scope change or authentication bypass.
- Evidence: missing/disabled configuration browser regressions, safe error mapping tests, full suite/lint/types/build/browser checks; exact remote results in GitHub. Unit test first failed before implementation.
- Runtime/configuration: user-confirmed live failure is missing/rejected Render Firebase web-auth settings; changing UI does not provision those settings. Owner must configure dedicated web apiKey/authDomain and enable Email/Password, then redeploy. No credentials or real user records changed; no paid calls.
- Status: prepared on fix/signup-diagnostics; consult Git/GitHub for exact commit/PR/merge evidence.

## CHG-0011 — 2026-11-12 — Standard account menu and clear post-sign-in landing
- Author/harness: Claude (Cowork); owner asked for a solid base: clear next page after login and a standard signed-in avatar menu with sign out.
- What/why: header avatar (initials) opens an account menu showing the signed-in email, role and Sign out; closes on outside click and Escape. Sign out moved from the sidebar footer to this menu and now returns to the welcome page with a confirmation. After sign-in a dismissible banner states who is signed in and the single next step (create first brief, open research, or open direction). Empty workspace now has a primary Create your first brief button. Verified sign-in email is carried in the signed session for display only.
- Requirements: FAC-TEN-008 (account sign-in experience). PRD impact: none; presentation and navigation only, no change to authentication, authorisation, storage or provider behaviour.
- Evidence: tests/factory-user-display.test.ts (new, added to test:factory); npm test, tsc --noEmit, eslint on touched files and next build passed in a clean sandbox copy with TMPDIR=/tmp. tests/factory-account-browser.cjs extended for menu open/Escape/sign out but NOT run: no Chromium available in this workspace; run npm run test:browser or read CI.
- Status: prepared on claude/login-ux-header; not pushed, merged or deployed. This does not fix the live Render sign-up failure, which still requires the Firebase web app and PORT67_FIREBASE_* settings (see CHG-0010).

## CHG-0012 — 2026-11-12 — Dismiss sign-in banner after creating a brief
- Author/harness: Claude (Cowork); found in the owner's live check of CHG-0011.
- What/why: the post-sign-in banner stayed visible after the first brief was created and then repeated the next step the user had just taken. Creating a brief now dismisses it.
- Requirements: FAC-TEN-008. PRD impact: none; presentation only.
- Evidence: one-line change in Portal.tsx; owner confirmed live that sign-in, Firestore persistence and brief creation work on the CHG-0011 build. This change has not been run or deployed; read GitHub CI.
- Status: prepared in the working tree; consult Git/GitHub for branch, commit and merge status.

