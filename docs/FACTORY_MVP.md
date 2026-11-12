# EXPLAIN managed creative MVP

Research-led marketing content and creative production.

## Open the workspace
Run `npm ci`, `npm run dev`, open `/portal` and choose **Explore the demo**. The fictional Fieldwork brand and its source material are labelled synthetic. Each visitor receives an isolated demo workspace. Demo role switching tests producer/customer experiences only within that workspace; it cannot access live projects. Production template creation is real file generation, not a simulated success notification.

1. Start a new brief or explore the synthetic one. Business name, objective and approval email are required; add website, known context, competitor/inspiration references, colour and a small PNG logo optionally.
2. Collect sources in brand, customer, competitor and creative segments. Review them before accepting evidence; a client assertion cannot become independently verified by clicking a button.
3. Record interpreted insights with supporting source IDs and confidence. All linked sources must belong to the same project and be reviewed.
4. Create/edit a campaign direction: audience, message, detailed research reasoning, design, channel/format recommendation, CTA, hypothesis and uncertainty. Share it for customer review only after linking reviewed evidence and at least one interpreted insight.
5. In demo, select **View as customer**, approve or request changes to the exact direction. Return to producer. Live customers use private invitation links created from the business brief view.
6. Create production drafts from the approved direction. The MVP generates original branded SVG artwork, an HTML 15-second motion storyboard and Markdown copy/script plus role-specific tasks. These are editable concepts, not MP4 exports or finished premium animation. Review them, then share with the customer.
7. Customer previews, requests changes or approves individual asset versions. Approved current versions can be downloaded with a JSON delivery manifest containing lineage, hashes and approval timestamps. New direction versions require fresh approval and prevent delivery of stale assets.
8. Performance learning displays the campaign hypothesis and intended context. No ad metrics or attribution are invented; account connections, publishing and measured optimisation are phase two.

## Live configuration
See `config/factory.env.example`. A session secret of at least 32 characters and operator password of at least 16 are mandatory; absent configuration returns 503 for live sign-in. Configure them through hosting environment settings, not source. Login creates an eight-hour signed HttpOnly session. Operators invite customers to one project with hashed, expiring seven-day capability links; creating a replacement revokes the previous invitation and associated customer sessions. Share these links privately yourself; the app sends no email. Before opening real customer access, configure privacy/retention responsibilities and review deployment security.

Local mode requires one Node process and a durable disk at PORT67_DATA_DIR; do not rely on a serverless ephemeral filesystem or scale multiple local writers across processes. Workspace files are private and written atomically, with serialized mutations and optimistic revision checks. Backup/recovery and retention remain operator responsibilities. Workspace size is bounded to 700KB, 20 projects and finite source/version counts; archive/export as needed. This is a bounded MVP store, not the long-term high-volume artifact database.

Optional Firebase mode uses a separately configured named Admin app and `factory_workspaces_v1` namespace. It stores a bounded workspace snapshot transactionally; no client SDK access is granted. Keep its project/data/IAM separate from the legacy app. Existing root Firestore rules are permissive and are NOT suitable protection for this namespace: use a dedicated project with client access denied before activation. Firebase CLI inspection failed in this environment because no authenticated cloud account is configured; the cloud adapter has not been integration-tested or provisioned. Split workspace snapshots into tenant/project/artifact collections before volume growth. No migration or production rules deployment has been made.

Live research requires the three explicit provider settings and an operator action. The OpenAI Responses adapter uses web search for one selected segment, excludes sibling outputs, accepts only cited public HTTPS sources and marks every result unreviewed. Frozen brief/context hashes, source/run links, model, timestamp, usage and failure records persist; actual invoiced costs are not reconciled. A per-project invocation cap and output/time limits bound calls but are not a monetary budget guarantee. Calls do not retry automatically. Interrupted research has a two-minute lease; the operator can explicitly recover it from Research activity after expiry, preserving unknown billing state and avoiding automatic retries. Demo never invokes a paid provider. No provider credentials were available for a live smoke test.

## Extension seams
`src/lib/factory/model.ts`: portable data contracts.
`engine.ts`: deterministic review/approval/version/provenance transitions.
`repository.ts`: persistence boundary (local/Firebase).
`auth.ts` and `service.ts`: server authentication, isolation and authorised actions.
`research.ts`: bounded optional provider seam.
`src/components/factory/Portal.tsx`: managed-service workspace.

The capability register records unmet niche requirements and evaluation expectations. It does not install code, grant tools or activate arbitrary agents. Future provider/harness adapters must preserve these contracts and pass the same tests. Shared AGENTS.md/PRD/changelog/handover govern Codex, Claude and Gemini contributions.

## Boundaries
This MVP is not a completed implementation of all PRD P0 requirements. No production-grade media renderer, automated market strategy, vector store, scheduler, complete cost ledger, full tenant administration or channel integrations are claimed. Source/claims verification and creative strategy remain human responsibilities. The public studio and legacy app are retained. No Synapse reuse has occurred.

For live hosting, set PORT67_PUBLIC_ORIGIN to the canonical HTTPS origin. Configure edge authentication throttling; only enable PORT67_TRUST_PROXY=true when the proxy overwrites client-supplied forwarding headers. Signed visitor buckets prevent one demo visitor consuming another login allowance, but are not a substitute for network-level abuse controls.

Demo snapshots default to the OS temporary directory so read-only application bundles can still run an isolated synthetic demo. They are disposable: serverless cold starts/instances may reset demo sessions/state without shared storage and a stable session secret. Use a persistent Node service for the complete durable workflow; do not interpret a successful serverless preview build as live storage certification. Real client records never silently fall back to temporary demo storage.
