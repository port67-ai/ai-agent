# Render and Firebase staging (DEP-001)

## Current target

Repository: port67-ai/ai-agent. Render service name entered by the user: ai-agent, in the existing project's Staging environment. Region selected: Frankfurt. User's last form showed a $7/month plan. Firebase project: ai-agency-3671b, web app Port67 Web. Console authentication/database creation is user-reported, not remotely inspected. Render has not deployed successfully yet.

## Render configuration

Runtime Node; root directory blank; NODE_VERSION=24.22.1. Build command: `npm ci && npm run build`. Start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`. Let Render supply PORT.

Render's failed attempt used main at 26ab3be and `npm install && npm run build`, rather than the recommended frozen install. The prerender fix is on fix/render-prerender, based on the governance branch at 1a6aa26. For staging, select that fix branch after it is pushed, verify Render's checked-out SHA in the build logs and retry. Do not merge failing PR checks merely to select a staging branch. Move deployment back to main only after reviewed changes are merged there.

The six NEXT*PUBLIC_FIREBASE*\* variables are API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID and APP_ID. Use the user's Firebase web configuration as supplied; these are public browser configuration, and must be present at build time. Do not include getAnalytics merely because the generated console snippet included it. No Analytics integration is needed for this deployment.

After Render supplies an actual hostname, add that hostname to Firebase Authentication's authorized domains. Set NEXT_PUBLIC_APP_URL to the actual HTTPS service URL for flows that need it, then rebuild. No hostname or deployment URL is invented here.

## Server and database prerequisites

/api/users initializes Firebase Admin using FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY. Configure real server credentials securely in Render; never add a private key to Git, docs, chat or NEXT_PUBLIC variables. Missing Admin credentials are logged during page collection but the supplied Render log's fatal error was the sign-in Suspense violation. Server data access also uses the client Firebase SDK and needs separate verification; Admin credentials alone do not prove it works.

Keep the new Firestore database locked in production mode until reviewed owner-scoped rules and emulator tests exist. The repository's existing firestore.rules allows all authenticated users across all documents and must not be deployed as a quick workaround. Legacy Clerk-backed APIs remain unresolved. Staging build success does not establish secure sign-up, database or paid workflows.

## Validation and next actions

1. Run npm test, npm run typecheck, npm run format:check, npm run governance:check and lint; record actual failures.
2. Run the normal production build where Google Fonts and the public Firebase web configuration are available. A font-isolated build is supplementary prerender evidence only.
3. Deploy the fixed SHA on Render staging; require successful build/start logs and HTTP responses for /, /sign-in and /pricing. Verify query forms in a browser before claiming a working app.
4. Complete secure Firebase access configuration and integration tests before allowing database workflows. No real webhook, payments, destructive cleanup or production deployment is part of this bug fix.

Do not run npm audit fix --force as deployment troubleshooting. The Render audit findings need a separate reviewed dependency remediation task.
