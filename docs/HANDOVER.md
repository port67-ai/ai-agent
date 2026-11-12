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
