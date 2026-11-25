# Latest handover — CHG-0084 specialists and performance feedback

Owner authorised autonomous build while asleep, continuing the main deployment workflow. Branch feat/research-performance-feedback, base fd0b183. New segments: channel (audience/channel behaviour), offer (product/proposition/proof/friction), measurement (KPIs/attribution/experiments), each independently selectable with approved methods and existing provider routes/metering. Old stored seven-role plans are supported; new AI plans decide all ten roles.

Performance learning now includes Campaign performance feedback (also linked from Overview): enter results or import CSV, explicitly authorise PUBLIC model use and review report provenance/attribution. Accepted authorised observations inform research planning and medium selection through structured historical citations. Ratios preserve missing data; observations do not prove causation. Rejected observations and their stale derived hypotheses are excluded. After changing history before direction, replan research and refresh medium recommendations. Existing approved direction is not unapproved by a results upload.

To test the loop: finish a campaign, record dated results with audience/offer/attribution, accept them, create the next campaign in the same account, choose the old project under Carry reviewed history, review copies, then authorise/start planning. Inspect historical IDs in the plan and observed-performance recommendations. Carry is explicit and deduplicated; no cross-client history or model training. Runtime customer approvals remain unchanged.

Independent review identified stored-plan scoping crashes, history freshness/derived-hypothesis leakage and missing planner citations; regression tests reproduce and fix them. Full npm test, all four browser journeys, lint, TypeScript, production build, documentation governance and diff checks passed locally on 16 November 2026. GitHub checks and hosting statuses establish merge/deployment evidence. No paid model calls or actual ad-account results were used during development.

---

# Latest handover — CHG-0083 AI research planning and evidence-backed media, 16 November 2026

Branch: `feat/ai-research-medium-planning`, base `bfaf83e` (PR #57). Owner authorises completing, merging and deploying while away, without further development approval pauses. Runtime customer approvals remain unchanged. This entry records implementation/acceptance; GitHub PR/commit and hosting statuses establish actual merge/deployment state.

New explicit work-type briefs enable an LLM research planner before research starts. It reads the authorised public brief and chosen channels, proposes selected/excluded roles, reasons, questions, compatible methods, provisional medium hypotheses and capability gaps. The task manager validates the fixed catalogue and creates the dependency graph. It does not let a model register agents or tools. Existing clients/projects retain their old path; producers can enable planning in Overview before direction work begins.

Two new model/skill slots are visible on the AI agents map: Research planning agent (`synthesis:planner`) and Medium selection strategist (`synthesis:medium`). Explicit routes and synthesis defaults win; otherwise the new slots can inherit the configured scoping/format model, then environment settings. Calls use existing consent, account/project cost ledger, spend caps and invocation limits. Planner/medium failures require explicit retry. Rules fallback needs a producer reason and uses cached free scoping. Accepted planner questions avoid a redundant paid scope call. Existing manual scope edits update the plan and survive subsequent execution.

After source and insight review, the medium strategist recommends format-channel pairs with cited accepted evidence, counterarguments, confidence and uncertainty. Requested deliverables remain unchanged. Producer confirmation needs a rationale and the expected recommendation/evidence context; stale submissions are rejected. A confirmed video alternative adds craft research while compatible existing research remains reusable. New evidence invalidates old medium confirmation. General channel familiarity is a limited prior, never invented campaign history. No private ad-account connector, cross-client learning or automatic model training exists.

Original Port67 research methods strengthen the seven existing roles, including product/offer and category/market depth. Gap proposals appear in Capabilities with existing limitations and required inputs. They remain non-executable until reviewed promotion; this change does not automatically launch a larger researcher catalogue.

Independent review found four important issues: scope API bypass of pending planners, stale format confirmation, repeated rules scopes and stale manual-decision UI. These are fixed with regressions. Additional tests protect producer scope edits, dynamic video dependencies, requested-output preservation, stale paid usage, inherited model routes and provider output limits. Browser checks use synthetic API fixtures plus the real validators/transition code; no paid live call or real campaign-effectiveness claim is made.

## Test this live

1. Create a fresh brief with a work type, requested outputs, full business context and launch channels. Authorise/start research. In Overview inspect the AI plan, reasons, questions, methods and limited medium hypotheses.
2. Review sources and insights. In Campaign direction run the medium recommendation, compare the unchanged request against the options/evidence, then choose formats with a rationale. If selecting a new video alternative, finish its craft research and reconfirm against the updated evidence before direction/production.
3. Inspect Capabilities for gap proposals. For an old project, enable AI research planning in Overview before any direction exists. Configure planner/medium model slots only if no existing synthesis or inherited route resolves.

Local full test suite, all four browser journeys, lint, TypeScript, production build, documentation governance and diff checks passed. Exact commands are recorded in CHG-0083. Firestore and actual hosting status are verified by CI/deployment checks; real selected-model quality and public-source availability still require the owner's keyed live acceptance.

---
Earlier handover follows.

# Latest handover — CHG-0082 customer-driven project tasks, 16 November 2026

Branch: `feat/customer-task-planning`. Base: `origin/main` at `9f629cd` (includes the Skill writer). Owner authorised adding task-based architecture to the existing MVP. Implementation is local, not merged or deployed.

New project HTTP intake stores a plan from campaign/research-only work, objective, requested deliverables and channels. `task-plan.ts` selects relevant research agents with reasons, validates dependencies and reconciles persisted task status. Existing records continue their legacy path until a producer creates a plan in Overview. Producer overrides require a reason and expected version. Brief/channel/format edits before direction work replan; historical runs/costs are preserved, stale results rejected, and post-direction scope locks remain.

Overview has the task board, version history, agent selection and Run ready tasks. Research preparation/progress uses selected agents. Research-only work stops after reviewed insights. Confirmed formats select template production tasks: static-only does not run motion or copy. Full unsupported outputs stay visible as producer work with a completion/handoff note; customer asset approvals remain enforced. The global map now shows task manager feeding orchestrator and remains a capability catalogue.

Review corrections: source/insight holds and pending redrafts take precedence over apparent completion; failed paid drafting tasks cannot automatically retry. Task-aware reviewer results are rejected after input/consent changes with usage kept. Scope versions remain monotonic after brief invalidation. New tests reproduce the independent review's findings and the stale reviewer case.

Verification on this branch, 16 November 2026:
- `npm test` passed (existing suite plus planner/API/UI tests; synthetic provider transport only).
- `npm run check:factory` passed; `./node_modules/.bin/tsc --noEmit` passed.
- `npm run build` passed. Existing dynamic file-tracing warnings from video-store remain.
- `PORT67_TEST_ORIGIN=http://localhost:3100 npm run test:browser` passed, including task-plan selection/version save and desktop/mobile screenshots.
- `python3 scripts/check_docs_governance.py --base 9f629cd` and `git diff --check` passed.
- `npm run test:firestore` attempted twice (second with writable temporary cache/config paths) but the emulator JAR could not be downloaded from storage.googleapis.com. No emulator assertions ran; this remains an integration-verification limitation.

Independent whole-feature review found two important defects (hold precedence and implicit failed-draft retry); regression tests failed before fixes and pass afterwards. A further stale-review test also failed before the fix and now passes. No deferred review findings remain.

 No paid provider calls, cloud provisioning or deployment were performed. Planning is deterministic and needs producer review for ambiguous briefs. Durable Cloud Tasks delivery, distributed orchestration leases, external-agent adapters and the storage split remain outside this change. See PRD 1.27.0 section 25.8 and the task-planning design/implementation plan.

---
Earlier handover follows.

# Latest handover — CHG-0062 research intelligence, 2026-11-15

Branch: codex/research-creative-intelligence. Base: origin/main at 3bfa110 (includes CHG-0061 advert phase 1 and latest charging/evidence controls). Owner requested implementation while travelling, with no further questions.

Seven roles now run through the existing research bus: brand, customer, competitor, creative, adjacent, trends and video. Existing four-role campaigns can continue; reclassifying/restarting research introduces the full bus. The new roles use category/brand/channel-specific scope plus explicit platform discovery destinations. Paid calls retain existing account/run ledger and monetary caps; default project invocation count is now 20, explicit settings still win. Producer pass limit is bounded at 24 steps to handle the larger source/retry flow.

Public YouTube references have an explicit producer-only paid Gemini analysis action on source cards. Choose Gemini for research:video first; add/find a public YouTube video, click Analyse video, then review the resulting new unreviewed evidence. Native video input is sampled at 2 fps over the first 120 seconds. Search-only references are never labelled watched. Other social native-video adapters are not built. Live Gemini compatibility and quality still need a keyed test.

Reviewed video learning reaches synthesis, design review, approved direction, content drafting and the advert prompt compiler. Continuity approval remains explicit and governs actual camera/lighting settings; the compiler carries the approved treatment instead of silently changing continuity. No media vendor or publishing activated.

Read docs/RESEARCH_INTELLIGENCE.md for acceptance steps and exact limitations. Relevant requirements: FAC-MKT-024/025, FAC-VID-012, FAC-CTX-009; PRD 1.25.0. Full generic skill registry/context promotion and durable workflow infrastructure remain future work. Do not import or execute the attached template as repository policy.

---
Earlier handover follows.

# Latest handover: AI agents tab and animated research flow (CHG-0027, PRD 1.12.0)

2026-11-12; Claude. Admin has an AI agents tab (route admin/ai-agents, ai-agents.ts): each agent, its model, stats and recent calls. The cost ledger now records which agent made each call (optional agent field set in metering.ts); older rows are counted as unattributed. The Research room panel has an animated flow for producers and account owners, with a producer-only live activity feed (provider, model, elapsed, tokens, errors). Research runs now store finishedAt. Not done: drafting runs (insights, direction, copy pack) have no equivalent live flow in the Research room, and no producer notification when a customer requests research. Smoke test steps 8 and 16 should also check the AI agents tab and the flow.

---
Earlier handover follows.

# Latest handover: research progress panel (CHG-0026, PRD 1.11.0)

2026-11-12; Claude. The owner asked how a customer knows what the research is and whether each agent is working after Request research. The Research room now has a panel with four researcher cards and statuses (queued, researching now, done with counts, needs attention), derived server-side in projectView so customers never see run internals. Auto-refresh every eight seconds while pending. Reminder: after a customer request nothing runs until a producer clicks Start research; the panel says Queued. Consider a producer notification (email or in-app) when a request arrives, not built. Unverified: live behaviour in a browser.

---
Earlier handover follows.

# Latest handover: baseline principles in the PRD (CHG-0025, PRD 1.10.0)

2026-11-12; Claude. Documentation only: PRD section 25.4 adds FAC-BAS-001 to 006 (agents do the middle work, warehouse-first data, approved tool layer, URL to multiple on-brand static ads, optional UGC avatar ads, creative velocity). 001 and 004 are partly met by the research, direction and copy work; 002, 003, 005 and 006 are not built. Vendors and figures from the owner's summary are unverified candidates; open vendor decisions are listed in section 23.1. Suggested next build candidates when the owner chooses: multi-variant static ads from a URL (004), then variant tracking (006); data pipeline (002) belongs with phase-two measurement.

---
Earlier handover follows.

# Latest handover: launch channels and updated smoke test (CHG-0024, PRD 1.9.0)

2026-11-12; Claude. Research room has a launch channel picker (nine channels, logo buttons, up to five). Customers choose channels and request research; the producer authorises AI and clicks Start research, which runs the four segments in turn. Channels flow into research prompts, direction drafting and copy-pack channels, and lock once a direction exists. Customers cannot run paid research (cost and consent control); if the owner wants customers to trigger it, that is a deliberate policy change needing a cap and consent design. docs/LIVE_SMOKE_TEST.md is now the full end-to-end script. Unverified: look and feel in a live browser, live model behaviour with channel-aware prompts.

---
Earlier handover follows.

# Latest handover: video gating and 480p drafts (CHG-0023, PRD 1.8.0)

2026-11-14; Claude; CHG-0043: system map now shows the producer Orchestrator (top right, styled like an LLM, rules only) with its four reviewers beneath it and the LLM column below. Click a reviewer to choose its model. Layout checked in a static render only.

2026-11-14; Claude; CHG-0042: admin-only Restart from the brief (Research room) keeps the brief, logo and account and clears channels, request, authorisation, scope, sources, insights, directions, drafts, assets, videos, runs and reviews so the full journey can be rerun. Audit trail and cost ledger are kept. Then as the account owner choose launch channels and request research.

2026-11-13; Claude; CHG-0041: documentation-only triage of the imported requirement list. 30 rows moved from NOT_VERIFIED to IN_PROGRESS (partial) with their evidence and gaps. The remaining untouched rows are genuinely unbuilt (workflow engine, skills/tool registry, claim library, rights, finance reporting, warehouse data, Synapse audit, separate environments). Next: one live end-to-end run of the foymore project, then promote what passes.

2026-11-13; Claude; CHG-0040: the producer agent is now an orchestrator plus four walled-garden reviewers (scope, source, insight, direction), each with its own model slot on the AI agents page (Producer reviewers group), free rule checks first, one metered call each, one rework per gate then a hold for a person. Reviewer verdicts and holds show in the Producer orchestrator panel (Research room). Choose a model for each reviewer, ideally different from the drafters; with none chosen they use the free checks only. Verdicts need PORT67_SYNTHESIS_ENABLED=true and an authorised brief to use a model. PORT67_PRODUCER_AGENT=true runs it automatically. Not verified live.

2026-11-13; Claude; CHG-0039: producer agent (rules only) runs the producer steps between approvals and stops at the account owner gates; see docs/CHANGELOG.md CHG-0039. Set PORT67_PRODUCER_AGENT=true in Render to run it automatically; the button works without it. Not yet verified live with the AI steps. Combined button on Production: Drafts, copy pack and share.

2026-11-13; Claude; CHG-0038 follow-up: Draft direction with AI failed the evidence/insight contract with no reason shown. The error now names the validation reason; over-long fields are clipped and omitted insight evidence is added rather than rejecting the draft. If it fails again, the diagnostics line will say why; paste it.

2026-11-13; Claude; CHG-0038 follow-up: Accept all draft insights (Research room), Approve all assets (Assets, account owner and test-mode producer) and an optional PORT67_PRODUCER_APPROVALS=true switch so a producer or admin can press the customer's Approve direction / Approve asset buttons while testing (recorded as on the customer's behalf; off by default; remove before real customers). The account owner already approves direction and assets.

2026-11-13; Claude; CHG-0038 follow-up: one Accept all button for unreviewed sources (command reviewAllSources, audited as sources_bulk_accepted). A future AI source-review agent must follow the loop rules in docs/RESEARCH_RUNBOOK.md before it is built.

2026-11-13; Claude; CHG-0038 follow-up: Accept evidence / Reject existed on every source card but were 10px faint text; restyled as real buttons. Source review is per source, in the Research room tabs (not in preparation or the dossier).

2026-11-13; Claude; CHG-0038 follow-up: added a Gate 1 callout with a Go to source review button in the Research room (the review tabs were far down the page).

2026-11-13; Claude; CHG-0038 follow-up: second run completed all four researchers (72 sources, all unreviewed: Gate 1 is next). Map and failing list now follow the latest call, not lifetime failures; unpriced agents show cost unknown (research calls have no price because the web search tool price is not set on the model: set it in the model overlay). Executions end on an agent repeat or a three minute gap.

2026-11-13; Claude; CHG-0038 follow-up: Diagnostics panel now defaults to the latest execution only (selector for earlier ones or full history); there is no stored error file, the report is generated from the project's runs and audit on each load.

2026-11-13; Claude; CHG-0038 follow-up from the owner's diagnostics: (1) a researcher that returns only GAP lines (creative, 14:25) is now a completed run with the gaps kept, not a failure; (2) scope staleness now covers launch channels as well as the brief, because the scope still asked about Instagram after the channel changed to Facebook. Scope v2 on foymore lodge is therefore stale and will be redone at the next Start research. Unverified live: whether the creative researcher finds citable pages for a niche business.

2026-11-13; Claude; CHG-0038 follow-up: "Research invocation cap reached for this project" means the project has used PORT67_MAX_RESEARCH_RUNS runs (default 12, max 50), failed runs included. Scoping runs no longer count. To continue on a project that hit it, raise PORT67_MAX_RESEARCH_RUNS in Render (for example 30).

2026-11-13; Claude; CHG-0038 follow-up: the producer's Research room showed no Business scope or Research preparation panel (panels returned null while loading and cancelled their own fetch on parent re-render). They now use one hook (useProjectGet) and show Loading or a red error line. If a panel still shows an error, paste it.

2026-11-13; Claude; CHG-0038: scoping agent built. It classifies the business from the brief (no web search) and saves scope on the project in Firestore (versioned, tied to a brief digest); every researcher then gets its own questions, preferred sources, out-of-scope list and page budget. Free template fallback when the agent is off, has no model, is unauthorised or fails. Read it any time (producer and admin only, never customers): Research room, Business scope panel, or GET /api/factory/projects/{id}/scope (POST action classify or save). Failures: Research room, Diagnostics panel (Copy all) or GET .../diagnostics. Map: new "2 · SCOPING" band (agent, Firestore classification and scope store, producer scope edit); AI agents page has a Scoping agent group and a Business classifications table. To use the AI classification, click the Scoping agent on the map and choose a model (it falls back to the drafting default); PORT67_SCOPING_ENABLED=false turns it off. It adds one small call per brief, so test counts rose by one (factory-auto-approve, factory-campaign). Unverified: live scope quality and whether narrower asks fix the empty competitor run. MP4/Storage and secret rotation remain parked.

2026-11-13; Claude; CHG-0037: OpenAI research returned findings with no inline citations. Findings are now accepted if their URL is a page the search tool reported consulting (include web_search_call.action.sources). If a run still fails, read the diagnostic: "N consulted pages; M findings parsed" tells whether the tool reported pages and whether the model wrote findings in the required format.

2026-11-13; Claude; CHG-0036: live run 1 diagnosis. OpenAI brand/customer: answered but no citations (likely the 1800 output-token limit consumed by reasoning; raised to 5000, diagnostics added). Gemini competitor/creative: HTTP 429 quota/rate limit on gemini-3.8-flash with search grounding; switch those agents to OpenAI on the map or fix the Gemini plan. Pickers in the header now labelled.

2026-11-13; Claude; CHG-0035: the first live research attempt failed on all four agents with no visible reason. Provider errors are now kept and shown (agent card, blockers, connector hover, and the Research runs list for producers); research timeout raised to 100 s. Re-run with Start research (auto-start does not repeat once runs exist). Failed calls with unknown usage hold $1 each against the cap until reconciled in Private API costs.

2026-11-13; Claude; CHG-0034: the system map is now interactive. Hover a connector for calls, tokens, cost and time; click an AI agent to choose its provider, model and prices in an overlay. The old per-card and Advanced model editors (AiModels.tsx) are removed. Not exercised in a live browser.

2026-11-13; Claude; CHG-0033: auto-start now retries when the project is viewed and records/ shows why it could not start (reason in audit as producer_step_auto_failed). Typical causes: no model chosen on the AI agents page, no provider key, PORT67_RESEARCH_ENABLED not true.

2026-11-13; Claude; CHG-0032. The red Factory MVP check was a lint failure only (check:factory, prefer-const in tests/factory-research-progress.test.tsx), fixed. Before every commit run, in this order: `npx eslint src/lib/factory src/components/factory src/app/portal src/app/api/factory 'tests/factory*.ts*'`, `npx tsc --noEmit`, `npm test`, `npm run build`, then `python3 scripts/check_docs_governance.py --base origin/main`. Browser acceptance (Playwright) and the Firestore emulator test only run in CI. Owner decision 2026-11-13: MP4 and Firebase Storage enablement and the PORT67_SESSION_SECRET rotation are PARKED until the jpell@me.com research run has been executed; do not start them early. Next for the owner: run docs/RESEARCH_RUNBOOK.md with jpell@me.com using the existing completed brief.

2026-11-13; Claude; CHG-0031; PRD 1.16.0. The AI agents page now has ONE dark system map (replaces the journey and data-flow diagrams), a "where data is blocked or not flowing" list and a cost-by-model table, all from observability.ts. The Research room gained a Research preparation panel (readiness, assumptions, questions per agent) and a downloadable Research dossier; the questions are also sent to the research agents. To test with the jpell@me.com account follow docs/RESEARCH_RUNBOOK.md. Not verified live: the map and panels in a browser at real data volumes, the questions improving research quality, background research on the 512 MB instance. Readiness is advisory, not a block.

2026-11-12; Claude; CHG-0030: set PORT67_AUTO_APPROVE_PRODUCER=true in Render to auto-approve the producer start step (consent plus the four researchers run in the background when a customer requests research); remove it to restore the producer. Gates 1 to 5 after research stay human. Not verified live.

2026-11-12; Claude; CHG-0029: AI agents page now opens with a journey swimlane (owner, producer, agents, five human gates, publishing outside the product). Not verified live.

2026-11-12; Claude; CHG-0028; PRD 1.13.0 (FAC-HAR-007). The AI models tab is gone: models are chosen on the AI agents tab (per-agent Change model, Apply suggested setup, Advanced section for defaults and prices) and a data-flow diagram shows how agents hand off via Firestore and approvals. Research room shows Research requested and Port67 starts; nothing runs until a producer authorises public data and clicks Start research. Not verified in a live browser. Open: Factory MVP CI red, live smoke test, Firebase Storage.

2026-11-12; Claude. MP4 render now needs an approved storyboard and an approved copy set, defaults to 480p, and offers HD 1080p on request. Video is optional; content without video needs nothing. Note the video test file had been missing from the repo copy until this change; confirm tests/factory-video.test.ts is in the commit (package.json test:factory runs it). Template renders never use AI tokens, so the saving is encode time, memory and storage; an AI video model would be a separate future slot. Unverified live: Firebase Storage upload and memory on the production instance.

---
Earlier handover follows.

# Latest handover: research to strategy to content (CHG-0020 to CHG-0022, PRD 1.7.0)

2026-11-12; Claude. Research now returns claim-level findings, gaps and confidence per source (FINDING/GAP/CONFIDENCE line format parsed in research.ts). The direction gained positioning, audience segments, key messages with proof, tone and claims to avoid; AI drafting must supply them with source-bound proof. A new content stage drafts an AI copy pack from the approved direction (content.ts, content-run.ts), validated against evidence including no invented numbers, saved as a draft Copy asset for normal approval, with its own model slot on the AI models page. Existing directions created before this change have no key messages, so the copy pack button stays disabled until a new direction version is drafted. Not verified live: that the chosen model follows the research line format (if it does not, sources fall back to the old whole-answer excerpt), strategy and copy quality, and the Production button in a browser. Run the live smoke test with the new flow and record results. Open: Factory MVP workflow red on PR 11 and 12 runs, log not yet read.

---
Earlier handover follows.

# Latest handover: rendered MP4 (CHG-0019, PRD 1.6.0)

2026-11-12; Claude. Producers can Render MP4 on an approved motion storyboard: three template scenes, 15 s, no AI cost, stored in Firebase Storage and downloadable via the authorised API. New dependencies: @resvg/resvg-js, @ffmpeg-installer/ffmpeg, dejavu-fonts-ttf (package-lock regenerated; next.config serverExternalPackages). Owner must enable Firebase Storage for ai-agency-3671b (may need a billing plan) and optionally set PORT67_FIREBASE_STORAGE_BUCKET. Unverified live: Storage upload and memory on the 512 MB instance; if the render is killed for memory, lower VIDEO_SIZE in video.ts or upgrade the instance. Open items: Factory MVP workflow red on PR 11 and 12 runs (log not yet read); owner runs the live smoke test.

---
Earlier handover follows.

# Latest handover: admin AI model routing

2026-11-12; Claude; CHG-0016; PRD 1.5.0 (FAC-HAR-005). Owner admins now pick provider and model per job on the AI models page, with prices suggested from a public list (litellm catalogue) then editable. Precedence: job route, stage default, env PORT67_*_PROVIDER/MODEL. Keys stay in Render; the page only enables providers whose key is set. Owner prices override PORT67_MODEL_PRICING_JSON. Search per-call fees must be entered by hand. Verified in a sandbox copy with stubbed transport only; the live public fetch, the page in a browser and live calls are unverified. Image and video routing is not built. CHG-0017 adds suggested defaults from provider model lists; CHG-0018 removes account and project pickers from owner pages. docs/LIVE_SMOKE_TEST.md now configures models on the AI models page. Known open item: the GitHub Factory MVP workflow was red on the runs for PRs 11 and 12; the failing step has not been read yet. Next: MP4 rendering from an approved storyboard; owner runs the live smoke test. Do not run git write commands from the Claude sandbox against the repo.

---
Earlier handover (team access, CHG-0014) follows.

# Latest handover — team access (admin, producer, client)

2026-11-12; Claude; branch to be named by owner (suggest claude/team-access); base main after PR10 (spend caps). CHG-0014. PRD 1.4.0 (new FAC-TEN-009).

Live state reported by the owner: Firebase sign-in, Firestore-backed workspace, brief creation and USD spend caps (CHG-0013, $25 per UTC month default) work on Render. Required Render settings found along the way: PORT67_FIREBASE_DATABASE exactly (default); NEXT_PUBLIC_FIREBASE_PROJECT_ID must not equal the Factory project (deleted); PORT67_LIVE_ENABLED exactly true. At the last check the owner still saw "Account owner" because PORT67_ADMIN_UIDS and PORT67_OPERATOR_UIDS were absent from Render; they were asked to add their own UID to both once.

CHG-0014 design (owner delegated the decision): three tiers. Admin: only via PORT67_ADMIN_UIDS in Render (bootstrap, break-glass, never grantable in-app). Producer: added by the admin on the Team access page by verified Firebase email; stored in server-only Firestore document factory-team (collection factory_system_v1) with an audit trail; PORT67_OPERATOR_UIDS still works. Client: any verified sign-up, own account only. Role is recomputed on every request in service.ts principal() via team.ts withTeamRole() using the Firebase-verified email; unreadable registry fails closed to client; revocation is immediate, including mid-session on a client account. Files: team.ts, Team.tsx, Portal.tsx (nav and tab), service.ts (admin/team route, identity-login, principal), model.ts, portal.css, tests/factory-team.test.ts.

Checks: npm test, tsc --noEmit, eslint and next build pass in a sandbox copy with TMPDIR=/tmp (the sandbox temp path trips factory-config.test.ts on unmodified main). Browser tests and the Firestore emulator suite not run here; read GitHub CI. The factory-team document needs no new index or rule: all browser access to Firestore remains denied.

Limits and next steps: one registry read per non-producer request; staff MFA, per-client producer assignment and approval of open client sign-up are not implemented. Do not run git write commands from the Claude sandbox against the repo: they leave undeletable lock files. Claude edits files; the owner commits with GitHub Desktop.

Update CHG-0015: the owner confirmed team access works live (admin jed@port67.ai, producer producer@port67.ai, client jpell@me.com). The live research smoke test is prepared in docs/LIVE_SMOKE_TEST.md (Gemini for both stages, one dated price line, billing prerequisite, steps and evidence template) but has NOT been run; prices came from the ai.google.dev page stamped 2026-06-02 and need owner confirmation. Next owner action: set the Render variables listed there, then run the steps and record evidence.

Queue agreed with the owner: spend caps (done), team access (done), live research smoke test (prepared, owner to run), producer and admin polish (next code work: Team page subtitle and header dropdowns), rendered MP4. Remaining earlier: price list PORT67_MODEL_PRICING_JSON, task and workflow level caps, phase-two publishing and measurement.
2026-11-14; Claude; CHG-0044: producer orchestrator also kicks (auto, fingerprint-skipped) when a project is opened after research, so source review and later steps resume without a manual click. Needs PORT67_PRODUCER_AGENT=true. Customer direction approval and final asset approval stay human.
2026-11-14; Claude; CHG-0045: admin switch (AI agents page) between manual and AI producer approval of the direction, default AI; needs PORT67_PRODUCER_APPROVALS=true in Render. Agent never approves final assets.
2026-11-14; Claude; CHG-0046: Private API costs now has editable spend limits (monthly, project, run, per-call hold, per model) stored in the admin settings store (override Render env, blank = env) and an interactive cumulative cost chart (day/month/3/6/12 months, per harness and model, hover shows cost and tokens). 6 and 12 month views use weekly and monthly points.
2026-11-14; Claude; CHG-0047: built-in standard DeepSeek prices (standard-prices.ts) apply when a DeepSeek model has no admin or env price; peak rate used as a conservative single rate. Edit the file to update when DeepSeek changes prices.
2026-11-14; Claude; CHG-0048: standard Gemini prices added to standard-prices.ts from Google's page (high tier for Pro; grounded search as a per-call fee). Counting real search queries from the response is a follow-up.
2026-11-14; Claude; CHG-0049: standard OpenAI prices (27 models) in standard-prices.ts; no web search fee yet.
2026-11-14; Claude; CHG-0050: standard Claude prices (Fable 5.2, Opus 5.5, Sonnet 5.5, Haiku 5.5) in standard-prices.ts, checked against Anthropic's pricing page.
2026-11-14; Claude; CHG-0051: activation buttons use orange f-button; rule added to AGENTS.md.
2026-11-14; Claude; CHG-0052: map Approve direction node is orange and AI-labelled when AI producer approval is effective; otherwise customer gate.
2026-11-14; Claude; CHG-0053: map Approve direction node is now the Direction producer AI reviewer; right-column Direction review removed. Check the layout visually after deploy.
2026-11-14; Claude; CHG-0054: static storyboard grid asset (kind grid) produced with the motion storyboard. CHG-0055: producer reviewers give a 0-100 relevance score, list unsupported claims, direction reviewer sees cited evidence, free invented-figure check; scores shown in the Research room.
2026-11-14; Claude; CHG-0056: next session, start from docs/EVIDENCE_QUALITY_PLAN.md (layered evidence scoring using Admiralty, CRAAP, triangulation and GRADE-style ratings). Planned only; confirm the open questions with the owner first.
2026-11-14; Claude; CHG-0057: evidence plan decisions recorded (Admiralty, CRAAP, GRADE-style; warn and re-trigger the agent with clearer guidance). Build is the next piece of work.
2026-11-14; Claude; CHG-0058: evidence.ts grades sources (Admiralty, CRAAP) and rates segments and insights (GRADE-style); weak research segment re-run once with guidance then warned; shown in the Research room. Next: portal thresholds, structured facts from researchers, evidence index into copy and production, map display.
2026-11-14; Claude; CHG-0059: OpenAI web search fee added ($0.01/call); Private API costs has Recalculate unknown costs and Reset usage counter (testing aid, remove later). The $29 shown earlier was $1 holds on 29 unpriced calls.
2026-11-15; Claude; CHG-0060: PRD 1.24.0 adds section 25.5 video advert production (FAC-VID-001 to 011), separate from the explainer. Planned only. Suggested first build: treatment and shot list, Continuity Profile contract, deterministic prompt compiler, in-app Advert board and prompt pack, with no external vendor.

2026-11-15; Claude; CHG-0061: video advert phase 1 built (treatment and shot list, Continuity Profile, deterministic prompt compiler, Advert tab, prompt pack). Not built: AI treatment drafter, reference extraction, image and video adapters, cost metering, AI advert reviewers, timeline export. Next: phase 2 needs a vendor evaluation under PRD 23.1 and the owner's choice of tools.

2026-11-15; Claude; CHG-0063: PRD 1.26.0 section 25.7. Built skills (versioned, latest runs, map popup), ad format gate (producer agent now waits for a format choice before the direction), strapline and audience segments, research pack and rules-based ideas bank. Not built: AI format suggester and AI ideas drafter (both should be new skill-backed agents), ad account metrics, creator sourcing and outreach, per-format production beyond storyboard, copy and advert. After deploying, open the AI agents page and check the Skill chip sits cleanly on each node.

2026-11-15; Claude; CHG-0064: Run progress panel (Overview, producers only) and orchestrator hold hover on the map. NOT BUILT: more spacing between agent nodes on the AI agents map (owner request; lines currently cross and overlap in the research and review bands), a customer-safe run tracker, and live running state for AI-reviewer steps.

2026-11-15; Claude; CHG-0065: AI format agent and AI ideas agent built (skill-backed, metered, producer decides). New map nodes sit in the right column below the LLM providers, without API connector lines yet; fix with the map layout work (FAC-OBS-002). Next decisions for the owner: choose models for the two new agents on the AI agents page. Still not built: ad account metrics, creator sourcing and outreach (tool adoption review first, section 23.1) and per-format production beyond storyboard, copy pack and advert.

2026-11-15; Claude; CHG-0066: AI agents map layout fixed (spacing, two research rows, one four-fact layout for every agent). I rendered the map to an image to check it. Provider connectors now leave the bottom edge of every AI agent (reviewers and campaign plan agents included). Check the live map after deploy.

2026-11-15; Claude; CHG-0067: Accept all sources no longer bounces back to Gate 1. The producer agent had been re-running each weak research area once after the accept, adding new unreviewed sources (up to seven times). A person's bulk accept now stops the re-run for that area. If you want the agent to re-run weak areas first, do it before accepting, or run the research again by hand.

2026-11-15; Claude; CHG-0068: after "Restart from the brief" the AI authorisation is cleared, so Start research is greyed out until the project is authorised. The research tab now has one button that authorises and starts research. The diagnostics for the Harry Fraser project also confirmed the CHG-0067 loop (seven re-runs after one Accept all) before the fix was deployed.
2026-11-15; Claude; CHG-0069: AI audiences agent (synthesis:audiences). Choose its model on the AI agents page; the producer panel then offers Suggest strapline and audiences with AI. Suggestions are advisory and stored in audienceSuggestion; segments now carry demographics.
2026-11-15; Claude; CHG-0070: direction draft failure "format is required" fixed (blank format falls back to chosen formats). Redeploy, then press Run producer agent again.
2026-11-15; Claude; CHG-0071: default per-call hold for unknown cost is now $0.10 (was $1). If you saved a hold under Private API costs or set PORT67_CALL_HOLD_USD, that still wins; clear or lower it.
2026-11-15; Claude; CHG-0072: to approve the direction, sign in as the account owner (jpell@me.com) and use Approve direction at the top banner area; or set PORT67_PRODUCER_APPROVALS=true so producer/admin get Approve (on behalf). Green disabled buttons mean the step is done.
2026-11-15; Claude; CHG-0073: Overview Run progress rows now hold the AI generate, share and approve buttons; account owners get a Waiting for you card.
2026-11-15; Claude; CHG-0074: portal auto-refreshes every 20 seconds while visible; the producer view no longer shows a stale Waiting for approval.
2026-11-16; Claude; CHG-0075: skill variables ({{business}} etc.) and per-agent input list in the Skill popup. Skills you saved before this keep their text; open the popup, Load built-in default or add variables, and save to use them.
2026-11-16; Claude; CHG-0076: reviewer skills limited to variables from their own view; popup lists exact reviewer inputs.
2026-11-16; Claude; CHG-0077: storage gauge on the producer Overview and in diagnostics; old run copies are trimmed automatically when a save nears the limit, or press Trim old run copies. Splitting project records is PLANNED (FAC-STO-002); start it when the gauge reaches about 60 percent for an account.
2026-11-16; Claude; CHG-0078: researchers now get the full audience; new optional brief fields (where you operate, what makes you different, proof) and richer insight writer inputs (grade, findings, profile, gaps). Next: audit strategy, copy and scoping inputs; customer-level profile for multi-product customers is planned with FAC-STO-002.
2026-11-16; Claude; CHG-0079: direction and copy writers receive previous direction, customer feedback, kept ideas, playbooks, formats, graded sources and change requests; skill editor shows used variables in green and the edit box is highlighted.
2026-11-16; Claude; CHG-0080: Run progress rows for Source review and Insight review open a one-at-a-time review queue (Accept, Reject, Skip, Accept all remaining).
2026-11-16; Claude; CHG-0081: admin Skill writer tab (OpenAI reasoning model). First live call: check cost and run time in Private API costs under admin:skill-writer; set a larger per-call hold if you use a pro model often.
2026-11-16; Claude; CHG-0085: Run progress ignores stale AI-producer holds once a person has decided the sources, insights or direction.
2026-11-18; Claude; CHG-0086: AI agents page has a Project dropdown with per-project map marks; Run progress shows who acts. Producers and admins can now approve customer gates by default (set PORT67_ACCOUNT_APPROVALS=required on Render to go back to customer-only). PORT67_PRODUCER_APPROVALS is only needed for AI auto-approval.
2026-11-18; Claude; CHG-0087: producer Overview is now the Campaign deliverables sheet (AI agent vs Review rows, jump links, return to overview); new brief asks for the customer account first. A customer account is created when the customer signs in once.
2026-11-18; Claude; CHG-0088: producer Overview now holds Research setup (channels, Start research) above the deliverables; Brief tab is read-only with Edit brief; Research tab no longer shows Start research for producers.
2026-11-18; Claude; CHG-0089: Overview is one numbered Task planner (all tasks, AI agent vs Review, Run ready tasks, Plan settings fold). tests/factory-task-plan-browser.cjs was updated but not run.
2026-11-18; Claude; CHG-0090: provider calls retry 429/5xx twice before failing. If the research planner still shows 503, change its model on the AI agents page.
2026-11-18; Claude; CHG-0091: cost ledger archives itself when full. Until this is deployed, open Admin, API spend and usage, and press Archive completed ledger batch.
2026-11-19; Claude; CHG-0092: AI research and medium plans no longer fail with Unknown launch channel when the model writes a channel's display name. Retry the plan after deploying.
2026-11-19; Claude; CHG-0095: Nash's Bakery research stopped on 'Workspace storage limit reached' because the 700 KB limit was applied to the whole account. Firebase saves are now checked per project document and the per-project run limit defaults to 500. After deploying, press Run ready tasks again. Spend caps are unchanged: raise the monthly limit and clear project, run and model limits on Private API costs. Not run here: full npm test, lint, build, browser tests, Firestore emulator test.
2026-11-19; Claude; CHG-0096: owner asked for no caps. Spend limits are now off by default (set PORT67_SPEND_LIMITS=on to enforce); run, planning, reviewer and pass limits raised to about 1000. Offer and Measurement research still default to Gemini, which returns 429 quota errors: change the Research default (or those two agents) to OpenAI on the AI agents page. Not run here: build, full lint, browser tests, Firestore emulator test.
2026-11-20; Claude; CHG-0097: studio stages piece A built locally (not committed, not deployed): New brief now starts a studio project (offer first; the classic brief is one click away), Stage 1 intake with uploads and completeness, gate bar (approve, approve with a note, reopen), piece cards, studio sidebar, and the gate 1 bridge into the existing research engine (brand, customer, competitor, creative and channel only). Nothing paid runs on a studio project before gate 1. Next: piece B (Stage 2 research and gate 2, Stage 3 generators using `registerStudioRerun` and `registerStudioGateCheck`). Not run: browser tests, Firestore emulator, visual check; on Render check that Firebase Storage accepts the studio/ prefix and that uploads up to 100 MB pass the proxy.
2026-11-20; Claude; CHG-0098: studio piece B built locally (not committed, not deployed): Stage 2 page (research, sources, insights, strapline and audiences, ideas, direction; "Approve research and strategy"), stage gating of the orchestrator and paid routes, thin research now only a warning everywhere, Stage 3 pre-production writer and OpenAI image adapter (jobs Studio: pre-production writer and Studio: image generation on the AI agents page; PORT67_IMAGE_MODEL optional, default gpt-image-1), gate 2 and gate 3 checks, Ready for client review. Next: piece C (Stage 4 stills batch via `generateImage`, Hook pack uploads and matrix, go-to-market checks in `StudioState.gtm`, gate 4). Before first live use: choose a model for Studio: pre-production writer, check gpt-image-1 access on the OpenAI key and add a price for it on Private API costs. Not run: browser tests, Firestore emulator, live model or image calls.
2026-11-20; Claude; CHG-0099: studio piece C built locally (not committed, not deployed): Stage 4 Production (Prepare production; Scene Pack stills drawn with the test frame and packshots as references, 4:5 cropped; Hook pack variants uploaded from per-variant prompt packs; optional motion loops), go-to-market checklist (scope, rights, claims, AI disclosure, specs, safe zones, product accuracy, naming and test plan, delivery pack, handoff), gate 4 and the Delivered view (read-back per variant, winners, Start next cycle). Reruns now leave project runs; Restart from the brief is refused on studio projects. Before the first real client: check gpt-image-1 access (including the images edits endpoint) on the OpenAI key, add a gpt-image-1 price on Private API costs, confirm Firebase Storage for the studio/ prefix and 100 MB uploads, and read PRD 28 "How to run your first client". Not run: browser tests, Firestore emulator, live model, image or video calls.
2026-11-20; Claude; CHG-0100: agent rerun built locally (not committed, not deployed): on the AI agents page choose a project to see its failed agents (FAILED badge per project, Rerun on the node, Rerun failed agents (n)); the Rerun dialog explains the failure, recommends switching provider for quota, key and model errors, and an admin can Switch to another model and rerun; a "<Provider> has no quota left" banner moves every affected agent at once; blocked task rows and the Your turn banner offer Rerun too. After deploying, on Nash's Bakery open the AI agents page, choose the project, and use Rerun or Move these agents to OpenAI (then Rerun failed agents). Not run: browser tests, Firestore emulator, live model calls.
2026-11-20; Claude; CHG-0101: Confirm formats works without a typed reason, and the panel says why it is unavailable when it is. The AI agents map no longer shows holds that were already dealt with (still in the log). Not run here: build, browser tests.
2026-11-20; Claude; CHG-0102: a held campaign direction now shows Your decision on the Direction page (Share as it is, Create new version, Redraft with AI), and sharing it moves the plan on without Re-run automatic checks. Until deployed: Share direction, then Re-run automatic checks.

2026-11-25; Claude; CHG-0103: documentation only, branch claude/login-ux-header, nothing committed. Owner wants a producer and admin only, video-first creative workspace: new minimal shell (Overview, Customer account, Projects), customer role removed, non-video features hidden, existing customer accounts removed for a clean start after an exported, owner-confirmed step. Read docs/superpowers/specs/2026-11-25-video-workspace-design.md, ADR-0004, PRODUCT-023 and PRD section 30 (FAC-VWS-001 to 009). Customer account inputs are specified; project inputs and Overview are deferred by the owner. Next task: owner signs off the spec, then build the new shell and Customer account (spec build order steps 2 and 3). Resolved 25 November: brand purpose types PDF, DOCX, TXT, PNG, JPG at 25 MB per file; cost ledger kept through the reset; producer and admin allowlists carry over (verify before removing the customer role). Awaiting the owner go to build. Docs ARCHITECTURE, DATA_MODEL and TESTING are stale at CHG-0084 and DECISIONS had no entries after PRODUCT-022 until this one.

2026-11-25; Claude; CHG-0104: video workspace shell and Customer account built locally, uncommitted. Branch feat/video-workspace-customer-account, base e011bcd. New route /workspace (producers and admins only) with Overview and Projects placeholders and a working Customer account page: business name, website, social links with Find from website, brand purpose files (private; AI steps read a file only after a producer ticks it), red lines, history. Server: customers.ts, customers-commands.ts, customers-api.ts, customer-store.ts, site-links.ts; hook in service.ts. To try it: sign in at /workspace as a producer (a verified Firebase account on the producer list, or the producer password), create an account, save the website, press Find from website, review and save the links, upload a PDF, tick the rights box first. Next: owner tries it and signs off the spec; then specify project inputs (D9), then remove the customer role (own CHG, verify allowlists first), then the exported and confirmed data reset. Blockers: a stale .git/index.lock stops commits from the build environment, so commit from a terminal after checking no git process is running; no real-browser check was possible, so look at /workspace on desktop and phone width. Customer role, old portal and studio code are unchanged.

2026-11-25; Claude; CHG-0105: Customer account gains two text boxes, Brand purpose (type or paste) and What is the brand known for, with one model-read permission that is withdrawn when the text is edited. Uncommitted on feat/video-workspace-customer-account with CHG-0104. No model reads them yet.

2026-11-25; Claude; CHG-0106: documentation only. Design for the Commission project and Inspiration baseline (spec, PRD 1.35.0 section 31, FAC-VWS-011 to 016, PRODUCT-024). Next task: owner signs off the spec and answers its two open questions (sidebar wording, name-only start), then build the commission list and the four inputs with evidence, then the baseline view. Customer account work (CHG-0104, CHG-0105) is still uncommitted on feat/video-workspace-customer-account.

2026-11-25; Claude; CHG-0107: Projects page built (FAC-VWS-011 to 016). Code: src/lib/factory/commissions*.ts, src/components/factory/{Projects,CommissionEditor,InspirationBaseline}.tsx, data in workspace factory-commissions-<customerId>. Tests, tsc, lint and build pass in a clean copy; no browser check, uncommitted. Next task: owner tries /workspace, then choose between Overview contents, the three secondary checks, AI drafting of the baseline, customer role removal and the data reset.

2026-11-25; Claude; CHG-0108: Brand Intelligence built (FAC-VWS-017 to 019). Submit button under the customer account runs 3 searching calls plus 1 synthesis in the background; versions stored in workspace factory-brandintel-<customerId>; `brandFoundation(repo, customerId)` is how later agents read it. Not yet run for real: do one live run on a test account and check cost on the admin costs page, the length of each section and whether run time is acceptable. Next task: the first Project creation step the owner mentioned.

2026-11-25; Claude; CHG-0109: dossier gains section 7 (researched red lines, fourth searching call, 5 calls per run), customer account sections collapse, files are chips in the brand box, PDFs open inline. Check in a real browser: collapsing keeps state after Save, Add then confirm opens the picker, a PDF chip opens in a tab.

2026-11-25; Claude; CHG-0110: Generate from AI on Input 4 (FAC-VWS-021). Route `commissions/:cid/:id` action `generate`; code in src/lib/factory/audience-agent.ts. It returns a draft, saves nothing, and records an audit line. Needs a completed Brand Intelligence dossier and PORT67_SYNTHESIS_ENABLED=true. Try it live after one Brand Intelligence run. The same pattern can be reused for Inputs 1, 3 and 5.

2026-11-25; Claude; CHG-0111: audience error fix plus age groups (FAC-VWS-022). If "could not be read" still appears, the message now says whether the AI was cut off or sent nothing; if it says cut off, pick a model with more output room for the job Commission: intended audience on the AI models page. Next task: the direction step, which should read `commission.directionGenerations` and refuse to start with none selected.

2026-11-25; Claude; CHG-0112: project layout is single column and full width; Evidence and Can change or out of character are greyed dropdowns (switches EVIDENCE_ACTIVE and CHANGE_LIST_ACTIVE in src/lib/factory/commissions.ts). Objective now has think, feel and do boxes. Check the layout in a real browser.

2026-11-25; Claude; CHG-0113: Generate from AI on Inputs 1 and 3 (needs the product or service in the Project box), AI agent box on Inputs 1, 3 and 4 (model dropdown, editable prompt, shared by all projects). Video steps is design only: owner to sign off the spec and answer its five questions (ShotDeck assumption, script templates, character images, which video model, age groups). Try live: set PORT67_RESEARCH_ENABLED, run Generate on a real customer and compare with the site.

2026-11-25; Claude; CHG-0114: Input 5 has Generate from AI and an AI agent box (job research:commission-brand). The two brand boxes hold long labelled prose (12,000 characters). Project details gained product page link, sub-brand or collection and video format. Try live on a known brand and check the structure comes back and the run time is acceptable. The Preserve list is not filled by this agent; that could be a next step.
2026-11-25; Claude; CHG-0115: Video steps. Sidebar group after Projects (References, Scripting, Characters/locations/props, Video generation); API `video/:customerId/:commissionId/:generation` (video-steps-api.ts, commands, run, pure rules in video-steps.ts); workspace `factory-video-<customerId>`; four AI jobs synthesis:video-*; UI in VideoSteps.tsx and VideoStepsSections.tsx. Gate: age group must be saved and selected for direction. Defaults taken for the five open questions, see DECISIONS. Never run against a live provider; no browser check. Uncommitted.
2026-11-25; Claude; CHG-0116: project image library. Routes `video-images/:customerId/:commissionId` (list, update, remove), `/upload?name&description` raw body, `/file/:imageId`; code in video-images.ts (pure), video-image-store.ts, video-images-api.ts, ImageLibrary.tsx. Prompts get @names via videoContext. Not seen in a browser. Uncommitted.
