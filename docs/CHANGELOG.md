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

## CHG-0013 — 2026-11-12 — Hard USD spend caps before paid model calls
- Author/harness: Claude (Cowork); owner asked for spend caps first of four queued items and chose a $25 per month default.
- What/why: every managed model call now passes a cap check inside the same atomic ledger update that reserves it. Workspace cap defaults to $25 per UTC calendar month (PORT67_MONTHLY_BUDGET_USD); optional per-project monthly cap (PORT67_PROJECT_BUDGET_USD); any call whose cost is not yet known (in flight, unpriced, interrupted, missing usage) is held at PORT67_CALL_HOLD_USD, default $1, never counted as free. Reconciled actual cost overrides estimates. Archived batches still count, and an archive change during the check is refused for retry. Invalid cap values block paid calls rather than lifting the cap. Admin cost view and readiness list show the cap, use and remaining amount.
- Requirements: FAC-CST-003 (bounded subset: workspace and project monthly caps; no task or workflow level caps), supporting FAC-CST-001/004. PRD impact: none; implements a bounded subset of an existing P0 requirement with the owner-confirmed $25 default. Task/workflow-level caps remain NOT_VERIFIED.
- Evidence: tests/factory-budget.test.ts (new, in test:factory) covers parsing, month windows, hold and reconciled accounting, per-project isolation, enforcement at reservation, release on priced completion, archive non-evasion, invalid config fail-closed and the 25-call default. tests/factory-ledger-archive.test.ts raises the cap for its 150-call capacity scenario. Full npm test, tsc --noEmit, eslint on touched paths and next build passed in a clean copy with TMPDIR=/tmp. No provider call was made.
- Limits: caps use estimates and holds, not provider invoices, so provider-side budget limits remain advisable. A call's real cost can exceed its hold; set PORT67_CALL_HOLD_USD above your largest expected single call. Without PORT67_MODEL_PRICING_JSON every call is held at the hold amount, so $25 allows 25 calls.
- Status: prepared in the working tree; consult Git/GitHub for branch, commit and merge status. Not deployed.

## CHG-0014 — 2026-11-12 — Owner-managed team access (admin, producer, client)
- Author/harness: Claude (Cowork); owner asked for multi-user access with distinct staff and client views, each authenticated, and delegated the design decision.
- What/why: Setting producers by Render environment variable needs a redeploy and a UID per person. Decision: admins stay bootstrapped by PORT67_ADMIN_UIDS (and legacy PORT67_OPERATOR_UIDS still works); producers are added and removed by the admin on a new Team access page by verified email, stored in the server-only factory-team document with an audit trail (200 entries, 50 members). Role is recomputed on every request from the live Firebase user (verified email required) plus the registry: removal, disabling or lost verification take effect on the next request, including mid-session on a client account. The registry can only promote client to producer and never grants admin; an unreadable registry fails closed to client. Producers cannot read costs or the team. Clients keep their own account only.
- Requirements: FAC-TEN-009 (new), supporting FAC-TEN-008. PRD impact: 1.3.0 → 1.4.0, new section 25.3 with FAC-TEN-009, owner-requested.
- Evidence: tests/factory-team.test.ts (new, in test:factory): email normalisation, client cannot read or change the team, add (case-insensitive, idempotent), producer powers without admin, client isolation, immediate revocation incl. active client-account session, unverified email gets no session, audit trail, fail-closed registry, 50-member limit. Full npm test, tsc --noEmit, eslint and next build in a clean copy with TMPDIR=/tmp. Firestore emulator suite and browser tests not run here; read GitHub CI.
- Limits: one registry read per non-producer request; staff multi-factor authentication, per-client assignment of producers, and approval of open client self-sign-up are not implemented. Email matching relies on Firebase verifying the mailbox.
- Status: prepared in the working tree; consult Git/GitHub for branch, commit and merge status. Not deployed.

## CHG-0015 — 2026-11-12 — Live research smoke test plan
- Author/harness: Claude (Cowork); owner queued the live research test after spend caps and team access.
- What/why: documentation only. docs/LIVE_SMOKE_TEST.md fixes one low-cost configuration (Gemini for research and drafting), a dated price line for PORT67_MODEL_PRICING_JSON, the billing prerequisite for grounded search, step-by-step acceptance and negative checks under the $25 cap, and an evidence template. No code, data or setting changed.
- Requirements: FAC-MKT-003/004/013/014, FAC-CST-001/003/009 (supporting). PRD impact: none; test procedure for existing requirements, no requirement promoted.
- Evidence: prices read from the fetched ai.google.dev pricing page on 2026-11-12 (page stamped last updated 2026-06-02; the owner must confirm in AI Studio). OpenAI page values were not used. No provider call was made.
- Status: prepared in the working tree; consult Git/GitHub for branch, commit and merge status. The test itself has NOT been run.

## CHG-0016 — 2026-11-12 — Admin AI model routing and prices
- Author/harness: Claude (Cowork); owner asked to control which model each job uses without hardcoding providers in Render, and to pull prices from a public source first with editing in the admin page.
- What/why: new admin-only AI models page and route admin/ai-routing. Per-job routes (research brand, customer, competitor, creative; drafting insights, direction) with stage defaults; precedence job, stage default, then the existing PORT67_*_PROVIDER/MODEL variables. API keys stay in Render. Prices: a Fetch public prices action reads a fixed public catalogue (BerriAI/litellm model_prices_and_context_window.json) and fills suggestions the owner can edit and save; owner prices override PORT67_MODEL_PRICING_JSON in the cost ledger. Search tool fees are not in the public catalogue and are entered by hand. Changes are audited (last 100). Files: ai-routing.ts, AiModels.tsx, research.ts, synthesis.ts, synthesis-run.ts, service.ts, costs.ts, providers.ts, model.ts, Portal.tsx, portal.css, tests/factory-ai-routing.test.ts.
- Requirements: FAC-HAR-005 (new), FAC-HAR-004, FAC-CST-001. PRD 1.5.0.
- Evidence: tsc, eslint on changed files, npm test and next build pass in a sandbox copy; public fetch and providers use stubbed transport. The live fetch from Render and live calls are unverified.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status. Image and video routing not implemented.

## CHG-0017 — 2026-11-12 — Suggested AI setup from provider model lists
- Author/harness: Claude (Cowork); owner asked that the AI models page suggest the right defaults with the best model per job, based on research, instead of opening blank.
- What/why: admin/ai-routing action suggest lists the models each keyed provider reports (OpenAI, Gemini, Anthropic, DeepSeek model-list endpoints; no invented IDs), picks the newest fast mid-tier model, prefers Gemini for research (search billed per query with a free monthly allowance) and the same provider for drafting, and returns notes. The page runs it on first open when nothing is saved, fills defaults and public prices unsaved for review, offers a Suggest best setup button, offers model IDs as a type-ahead list, fills the model when a provider is picked, and treats a provider with no model as unset instead of an error. Env-fallback jobs with no model now read No model chosen yet. Files: ai-routing.ts, service.ts, AiModels.tsx, tests/factory-ai-routing.test.ts.
- Requirements: FAC-HAR-005. PRD impact: none beyond 1.5.0.
- Evidence: tests with stubbed provider lists. Web research on 2026-11-12 found third-party price pages that conflict on current model names and prices and no reliable independent quality benchmark, so the suggestion is a cost-sensible starting point, not a quality ranking. Live model-list calls unverified.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0018 — 2026-11-12 — Owner page header polish
- Author/harness: Claude (Cowork); queued polish item.
- What/why: Team access, AI models, Private API costs and Workspace setup no longer show the account and project pickers or the New brief button, and each has its own subtitle instead of "Create a project to begin." UI only in Portal.tsx; no data, access or API change.
- Requirements: FAC-TEN-009 (supporting). PRD impact: none.
- Evidence: tsc, eslint and unit tests pass in a sandbox copy. Existing browser fixtures leave Workspace setup before using project controls, but browser tests were not run here; read GitHub CI.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0019 — 2026-11-12 — Rendered MP4 from approved storyboard
- Author/harness: Claude (Cowork); owner chose a built-in template render with storage in Firebase Storage.
- What/why: producers get a Render MP4 button on an approved motion storyboard. video.ts draws three brand-coloured scenes from the approved direction (SVG rasterised by @resvg/resvg-js with a bundled DejaVu font), then encodes 15 seconds of H.264 with fades using the ffmpeg binary from @ffmpeg-installer/ffmpeg (override with PORT67_FFMPEG_PATH). One render at a time. video-store.ts stores the file in Firebase Storage (PORT67_FIREBASE_STORAGE_BUCKET, default ai-agency-3671b.firebasestorage.app) or a local folder. Routes projects/{id}/video (POST, producer) and projects/{id}/video/{videoId} (GET, same access rules as approved assets). Project gets a videos list, filtered for customers. Cost: no AI call, so nothing enters the spend ledger. Files: video.ts, video-store.ts, service.ts, engine.ts, model.ts, Assets.tsx, Portal.tsx, portal.css, next.config.ts, package.json and lockfile, tests/factory-video.test.ts.
- Requirements: FAC-ART-006 (new), FAC-ART-005 (supporting). PRD 1.6.0.
- Evidence: tests include a real encode (about 4 seconds, 15.0 second, 130 KB file in the sandbox) and a viewed frame. Not verified: upload to Firebase Storage, behaviour on the 512 MB production instance, and the buttons in a browser. Firebase Storage may need the project on a billing plan and a default bucket created; if it is unavailable the render fails with a clear message and nothing is saved.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0020 — 2026-11-12 — Claim-level research findings, gaps and confidence
- Author/harness: Claude (Cowork); owner asked to focus on research quality.
- What/why: each research source previously carried the whole segment answer, so reviewers could not tell which claim came from which link. Research now asks for FINDING / GAP / CONFIDENCE lines, parses them, and gives each cited source only its own claims and quotes (original text kept as fallback when a cited page has no finding). Segment prompts are specific (customer reality, competitor positioning and gaps, category conventions; business website first). Gaps are stored on the run and shown to producers; confidence shown on each source. Files: research.ts, model.ts, service.ts, Research.tsx, tests/factory-research-findings.test.ts.
- Requirements: FAC-MKT-016 (new), FAC-MKT-003/013. PRD 1.7.0.
- Evidence: stubbed-transport tests; live models following the line format is unverified and is checked in the live smoke test.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0021 — 2026-11-12 — Richer structured campaign direction
- Author/harness: Claude (Cowork).
- What/why: Strategy gains positioning, audience segments, key messages (message, proof, source IDs), tone and claims to avoid, as optional fields so existing directions and hashes are unchanged. AI drafting requires them and rejects key messages citing sources outside the direction's evidence; manual editing supports the text fields and carries key messages forward. Files: model.ts, engine.ts, synthesis.ts, Direction.tsx, three existing synthesis and campaign tests updated for the larger contract.
- Requirements: FAC-MKT-017 (new), FAC-MKT-014.
- Evidence: tests updated and passing; manual editing of key messages in the UI is not offered yet.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0022 — 2026-11-12 — AI copy pack from the approved direction
- Author/harness: Claude (Cowork).
- What/why: new content stage. content.ts prepares input only from the approved direction and its reviewed sources, validates output (key message from the direction, sources only from that message, no number absent from the material, three to twelve items), content-run.ts reserves and meters the call, and the result is a draft Copy asset titled AI copy pack that follows the normal approval flow. Registry capability drafting.content; AI models page gains a Drafting: copy pack job; service synthesis route accepts stage content; Production tab gets a Draft copy pack with AI button. Files: content.ts, content-run.ts, registry.ts, ai-routing.ts, service.ts, model.ts, Portal.tsx, tests/factory-content.test.ts.
- Requirements: FAC-MKT-018 (new), FAC-HAR-005, FAC-CST-001.
- Evidence: stubbed-transport tests including rejected output retaining usage. Live copy quality unverified.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0023 — 2026-11-12 — Video gated on approved copy set; 480p drafts
- Author/harness: Claude (Cowork); owner asked that copy and storyboard are approved before rendering, that drafts render at 480 to save resources, and that video stays optional.
- What/why: POST projects/{id}/video now also requires an approved copy set for the same direction (copy-set.ts: the AI copy pack if one exists, otherwise template copy), with a clear message when missing. Default render is 480 by 480; size 1080 is accepted only when requested (UI: Render 480p draft and Render HD). Video records store their size. The Asset library explains that video is optional and shows why a render is disabled. copy-set.ts is pure so the browser can share the rule. Files: copy-set.ts, video.ts, service.ts, model.ts, Assets.tsx, Portal.tsx, tests/factory-video.test.ts.
- Requirements: FAC-ART-006 (amended). PRD 1.8.0.
- Evidence: tests cover the copy gate, size validation, default 480, HD larger than draft. "Tokens" saved is compute and storage only: template renders never used AI tokens.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0024 — 2026-11-12 — Launch channel picker in the Research room; updated smoke test script
- Author/harness: Claude (Cowork); owner supplied the Core Social Media Channels list and asked for icon buttons, customer selection and a research kick-off.
- What/why: channels.ts holds the nine channels with summaries and playbook notes from the owner's brief and Simple Icons glyphs (CC0). ChannelPicker shows logo toggle buttons at the top of the Research room. Customers and producers can set channels (setChannels) and a customer can send requestResearch; neither can authorise AI or run paid research, which remain producer actions. The producer's Start research saves the channels then runs the four segments in turn. Channels steer research prompts (launch channels and playbooks), direction drafting (plan only for chosen channels) and the copy pack (channel enum). Locked once a direction exists. docs/LIVE_SMOKE_TEST.md rewritten as a step-by-step script for the whole flow, and corrected: AI authorisation is a producer action, not a client one. Files: channels.ts, ChannelPicker.tsx, Research.tsx, Portal.tsx, engine.ts, model.ts, research.ts, synthesis.ts, content.ts, portal.css, tests/factory-channels.test.tsx.
- Requirements: FAC-MKT-019 (new). PRD 1.9.0.
- Evidence: tests plus a static render screenshot. A customer cannot start paid research by design; confirm that matches intent.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0025 - 2026-11-12 - Baseline operating principles added to the PRD
- Author/harness: Claude (Cowork); owner asked that the following be subscribed to as baseline: agents do marketing's middle work given data, platform access and tools; warehouse-fed data instead of direct rate-limited APIs; URL to several researched on-brand static ads; optional UGC avatar ads with motion graphics; creative velocity.
- What/why: documentation only. PRD section 25.4 adds FAC-BAS-001 to FAC-BAS-006 written vendor-neutrally, with the guard rails that already govern the product (authorisation, metering, caps, evidence, human approval, no autonomous publishing or spend). Vendor names and figures in the source (including roughly five dollars per avatar ad and 5,000 search terms audited in 20 seconds) are recorded as unverified evaluation candidates, not commitments. Open vendor decisions added to section 23.1. No code, data or setting changed.
- Requirements: FAC-BAS-001 to FAC-BAS-006 (new). PRD impact: version 1.10.0, new section 25.4 and rows; two requirements partly met by existing work (001, 004), four not implemented.
- Evidence: owner-supplied summary only; no primary source checked and nothing implemented or tested for this change.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0026 - 2026-11-12 - Research progress panel for each research agent
- Author/harness: Claude (Cowork); the owner requested research and pressed Request research but could not tell what the research was or whether each agent was working.
- What/why: the Research room now has a "What the research is doing" panel under the channel picker. Four researcher cards (business and brand, customer insight, competitor, creative) show their purpose and a status: not started, queued once a request exists, researching now, done with a source count, or needing attention. Statuses come from researchProgress(), computed in projectView so customers get status and counts without run internals, provider names or error text. The panel polls every eight seconds while work is pending (visible tab only) and has a Refresh button; the producer's Start research marks the segment in flight and refreshes after each segment so the cards advance one by one. Producers also see gaps noted and a pointer to run history. Files: engine.ts, model.ts, ResearchProgress.tsx, Research.tsx, Portal.tsx, portal.css, tests/factory-research-progress.test.tsx.
- Requirements: FAC-MKT-020 (new), FAC-MKT-019. PRD 1.11.0.
- Evidence: tests and a static render screenshot. The customer cannot start research by design, so after Request research the panel shows Queued until a producer clicks Start research.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0027 - 2026-11-12 - Admin AI agents tab and animated research flow
- Author/harness: Claude (Cowork); owner asked for a separate AI agents tab in the administrator navigation and for producers and account owners to see how research is running, as an animated flow.
- What/why: (1) Ledger rows now carry an optional agent field (research:brand and so on, set by metering from the run). New admin-only route admin/ai-agents and an AI agents tab list each agent with purpose, contract, current model and its source (admin page, default or environment), calls, completed, failed or unknown, running now (a reservation under two minutes old), tokens, estimated cost, last activity, a chain strip with animated connectors, and the twelve most recent calls. Earlier unattributed calls are counted separately. (2) The Research room panel gains an animated flow (brief and channels, four researchers, source review, insights and direction) with moving connectors while data flows, pulsing active nodes, a vertical layout on phones and reduced-motion support. Producers also get a Live activity feed (time, researcher, provider and model, elapsed timer, sources found, duration, tokens, errors); account owners get the flow and states only. Research runs now record finishedAt. Files: ai-agents.ts, AiAgents.tsx, costs.ts, metering.ts, model.ts, service.ts, ResearchProgress.tsx, Portal.tsx, portal.css, tests/factory-ai-agents.test.ts and tests/factory-research-progress.test.tsx.
- Requirements: FAC-HAR-006 and FAC-MKT-021 (new), FAC-MKT-020, FAC-HAR-005. PRD 1.12.0.
- Evidence: tests and static renders at desktop and phone widths. Per-agent history before this change is not attributable. Both pages poll (8 and 10 seconds); the animation itself was not seen live.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0028 - 2026-11-12 - AI models merged into AI agents, agent data-flow diagram
- Author/harness: Claude (Cowork); owner asked to combine AI models into the AI agents page, list each agent's model, edit the provider and model by clicking an agent, and show graphically how agents interact and where data is stored or passed on.
- What/why: The separate AI models tab is removed. Each AI agent card shows its provider and model (or a clear "No model chosen yet" prompt) and has Change model, with provider, model ID, prices, Fetch public price and Save; Apply suggested setup saves suggested defaults with public prices; stage defaults, all jobs and prices remain under an Advanced section (AiModels). A new SVG diagram (AgentDataFlow) shows providers, agents with their models, human approval gates, Firestore and Firebase Storage, and states that prompts and raw model responses are not stored; running agents animate. The Research room flow gained Research requested and Port67 starts steps so a queued request visibly waits for a producer. Files: AiAgents.tsx, AgentDataFlow.tsx, Portal.tsx, ResearchProgress.tsx, portal.css, tests/factory-ai-agents-ui.test.tsx, tests/factory-research-progress.test.tsx, package.json.
- Requirements: FAC-HAR-007 (new), FAC-HAR-005, FAC-HAR-006, FAC-MKT-021. PRD 1.13.0.
- Evidence: tsc, factory lint, full npm test and next build in a sandbox copy. Not seen in a live browser.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0029 - 2026-11-12 - Full journey swimlane on the AI agents page
- Author/harness: Claude (Cowork); owner asked to adopt the merged user, agent and approval journey and map the agents into the AI agents page.
- What/why: New JourneyFlow component replaces the simple chain strip. It shows account owner, producer and agent lanes, the four research, three drafting and template production agents, five amber human gates, optional video render, download, and customer-side publishing (the product does not publish). Agent nodes show their model or "No model chosen yet", animate while running and scroll to the agent card when clicked. Files: JourneyFlow.tsx, AiAgents.tsx, portal.css, tests/factory-journey.test.tsx, package.json.
- Requirements: FAC-HAR-008 (new), FAC-HAR-006, FAC-HAR-007. PRD 1.14.0.
- Evidence: tsc, factory lint, full npm test and next build in a sandbox copy. Not seen in a live browser. The journey is a fixed description; gates are enforced by the existing engine rules, not by this diagram.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0030 - 2026-11-12 - Auto-approve the producer start step (test switch)
- Author/harness: Claude (Cowork); owner asked to assume the producer step is approved for build so agents and agent-to-agent flow can be tested, while keeping the option to put a Port67 person back in the loop.
- What/why: New env switch PORT67_AUTO_APPROVE_PRODUCER=true (off by default; auto-approve.ts). When a customer or producer requests research, the server records public-data authorisation under the approver "port67-auto-approve", writes a producer_step_auto_approved audit entry and runs the four research agents in the background, once per project. The research route body moved into runResearchSegment so manual and automatic runs share one code path with the same consent, cap, metering and lease checks. The AI agents page shows a Test mode banner while the switch is on. Source review, insight acceptance and later approvals stay human. Files: auto-approve.ts, service.ts, ai-agents.ts, AiAgents.tsx, tests/factory-auto-approve.test.ts, package.json.
- Requirements: FAC-HAR-009 (new), FAC-MKT-020. PRD 1.15.0.
- Evidence: tsc and the new integration test with stubbed transport (no paid calls). Background work relies on the long-lived Render server process; not verified live.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0031 - 2026-11-13 - One system map, flow observability, research preparation and dossier
- Author/harness: Claude (Cowork); owner asked, unattended, for one dark diagram of all agents, models, API calls, stores and forms; observability of where data flows, is blocked or does not flow, with cost by model; and a focus on preparing and capturing research before any rendering.
- What/why: (1) observability.ts computes edges (agent, provider, model: calls, failures, tokens, cost, average latency), cost by model, pipeline counts across all accounts and a plain-language blocker list; it is attached to the agents overview as flow. (2) SystemMap.tsx replaces JourneyFlow and AgentDataFlow with one dark SVG: forms, producer start, Firestore bars with live counts, four research agents, review and drafting agents, gates, production, Firebase Storage, provider boxes with colour-coded API connectors labelled with calls and cost, telemetry into monitoring, and dashboards, alerts and troubleshooting. FlowHealth.tsx adds the blocker list and cost-by-model table. (3) research-plan.ts adds readiness checks, per-agent questions, assumptions, expected outputs, a token-size estimate and a research dossier with Markdown export; research.ts now sends each agent its questions; routes projects/{id}/research-plan and research-dossier; ResearchPrep.tsx shows them in the Research room. Readiness is advisory and does not block research. Files: observability.ts, research-plan.ts, research.ts, ai-agents.ts, service.ts, SystemMap.tsx, FlowHealth.tsx, ResearchPrep.tsx, Research.tsx, AiAgents.tsx, portal.css, docs/RESEARCH_RUNBOOK.md, tests/factory-observability.test.ts, factory-system-map.test.tsx, factory-research-plan.test.ts, factory-auto-approve.test.ts, package.json. Removed: JourneyFlow.tsx, AgentDataFlow.tsx and their tests.
- Requirements: FAC-HAR-008 (reworked), FAC-HAR-010 and FAC-MKT-022 (new), FAC-HAR-009. PRD 1.16.0.
- Evidence: tsc, factory lint, full npm test, next build and documentation governance in a sandbox copy; map layout checked in a static browser preview. No live provider calls were made. Counts are read across up to 100 accounts per request.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.

## CHG-0032 - 2026-11-13 - Fix red Factory MVP check (lint) and record the CI diagnosis
- Author/harness: Claude (Cowork); owner asked to progress the open items starting with the red Factory MVP check.
- What/why: The GitHub run for commit ac7bc8f was read through the public Actions API. Every step passed (npm ci, audit, npm test, Firestore emulator test) except `npm run check:factory` (ESLint), which skipped tsc, build and browser acceptance after it. Reproduced locally: one error, `prefer-const` in tests/factory-research-progress.test.tsx (`let p` never reassigned). Fixed it, and removed two unused parameters in tests/factory-auto-approve.test.ts that produced warnings. No product behaviour changed.
- Requirements: none (verification and hygiene only). No PRD change.
- Evidence: `eslint` with the exact check:factory file list now reports 0 errors; tsc, npm test and next build pass in a sandbox copy. Not run here: the Firestore emulator test (sandbox Java is below 21; it passed in CI) and browser acceptance (Chromium cannot be downloaded in the sandbox); these were skipped or unchanged in the failing run, so their status on this commit is unknown until CI runs after the fix.
- Status: in the working tree; consult Git/GitHub for branch, commit and merge status.
