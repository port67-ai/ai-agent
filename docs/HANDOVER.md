# Latest handover — account menu and sign-in landing

2026-11-12; Claude; claude/login-ux-header; base 6d7723f (main after PR7). CHG-0011. PRD unchanged (1.3.0).

Done: header avatar menu (email, role, Sign out; Escape/outside click close), sign-out confirmation on welcome page, post-sign-in banner with one clear next step, Create your first brief button on empty workspace, optional email on the signed session Principal (display only). Files: UserMenu.tsx, user-display.ts, Portal.tsx, Welcome.tsx, portal.css, service.ts identity-login.

Checks: npm test, tsc --noEmit, eslint (touched files), next build passed in a sandbox copy; run with TMPDIR=/tmp because the sandbox temp path trips factory-config.test.ts on unmodified main too. Browser test updated but NOT run (no Chromium here): run npm run test:browser and check the account-menu screenshot before merging. Not pushed or deployed.

Update CHG-0012: owner reports live sign-in, Firestore-backed workspace and brief creation work on the CHG-0011 build. Small follow-up: the sign-in banner now clears when a brief is created. Observed after the owner set PORT67_OPERATOR_UIDS/ADMIN_UIDS: the workspace still showed "Account owner" with no producer or admin menu items, so the UID values, redeploy or fresh sign-in need checking in Render; do not assume producer access works.

Still open and owner-only: live sign-up needs Firebase Web app, PORT67_FIREBASE_WEB_API_KEY / AUTH_DOMAIN / PROJECT_ID in Render, Email/Password enabled and the Render domain authorised (CHG-0010). Persisted sessions issued before this change have no email and show the role label until next sign-in.
