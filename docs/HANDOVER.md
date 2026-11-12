# Latest handover: admin AI model routing

2026-11-12; Claude; CHG-0016; PRD 1.5.0 (FAC-HAR-005). Owner admins now pick provider and model per job on the AI models page, with prices suggested from a public list (litellm catalogue) then editable. Precedence: job route, stage default, env PORT67_*_PROVIDER/MODEL. Keys stay in Render; the page only enables providers whose key is set. Owner prices override PORT67_MODEL_PRICING_JSON. Search per-call fees must be entered by hand. Verified in a sandbox copy with stubbed transport only; the live public fetch, the page in a browser and live calls are unverified. Image and video routing is not built. Next: update docs/LIVE_SMOKE_TEST.md to configure via this page (only keys, enable switches and cap remain in Render), producer and admin polish, MP4. Do not run git write commands from the Claude sandbox against the repo.

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
