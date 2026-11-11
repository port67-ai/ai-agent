# Current architecture

Inspected baseline: commit 26ab3be6e75a408b79fb6f1f66b894a7f5402113, 2026-11-11. Governance tooling adds no application runtime behavior.

## Application

Next.js 16.1.6 App Router, React 19.2.3, TypeScript 5, Tailwind 4 and Framer Motion. Routes are under src/app; shared UI is under src/components. Root layout imports Inter via next/font/google and wraps pages in the client AuthProvider.

AuthProvider uses firebase-auth.ts for Firebase Auth and firebase-db.ts for client Firestore operations. Client initialization in firebase.ts is unconditional; missing Firebase API configuration causes auth/invalid-api-key even on the landing page. Dashboard access is handled in client UI; middleware.ts is pass-through and is not a server authorization boundary.

## Server and external integrations

- /api/users verifies Firebase bearer tokens with Admin Auth and compares user IDs, then calls the client Firestore service. Admin credentials alone do not authenticate client Firestore calls; correctness of this mixed design is unverified.
- /api/stats and /api/checkout still use Clerk auth despite the Firebase UI migration. src/lib/actions.ts also retains Clerk and mock-user paths. Auth behavior is inconsistent and needs a separately scoped correction.
- stripe.ts and payments.ts are separate payment adapters; airtable.ts and db.ts are separate customer adapters. They support mock paths without service configuration. Mock success does not verify payment or persistence.
- AIReviewForm posts business metadata from the browser to a hard-coded Make.com webhook, merges string fields and saves aiReviewData in Firestore. Live webhook behavior was not exercised; endpoint management, ownership and audit controls require review.

## Trust and operations

Firestore currently allows any authenticated user to read/write any document. Tenant ownership is not enforced by the deployed-rule source. No organization/tenant membership model, durable audit trail, or provider-cost ledger was identified. Do not infer those controls from route ownership comparisons or dashboard metrics.

Firebase client configuration uses NEXT*PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID and APP_ID with the NEXT_PUBLIC_FIREBASE* prefix on each. Admin uses FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. Optional integration variables are STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME and NEXT_PUBLIC_APP_URL. Legacy Clerk paths may also require Clerk settings but the migration must be resolved before calling them supported.

Google font fetching requires fonts.googleapis.com and fonts.gstatic.com. Local development uses npm run dev; live processes do not survive cloud snapshots. No deployment or database change is part of governance setup.

## Governance tooling

scripts/check-governance.mjs is a dependency-free Node validator. GitHub Actions run it against the PR base diff, plus formatting, lint, type checks and tests in separate jobs. Tests use Node's built-in runner. Prettier is a pinned development dependency. File-path heuristics deliberately require review of architecture/data changes; they cannot prove semantic correctness. Branch rules are configured separately in GitHub; see TESTING.md.
