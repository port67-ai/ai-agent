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
