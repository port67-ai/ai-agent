# Implementation status

Updated: 2026-11-12. Baseline inspected: 26ab3be. Environment: local managed checkout.

The repository contains an existing appointment-booking Next.js application. Factory implementation and acceptance tests have not been audited. All requirements below are imported intent, not owner approval. Governance files now exist, but remote CI/branch protection and cross-harness compliance are not yet verified. FAC-DEV requirements therefore remain unverified rather than being promoted from document presence alone.

| Requirement | Intent | Delivery | Evidence / next verification |
|---|---|---|---|
| FAC-AGT-001 | Imported proposed baseline | IN_PROGRESS (partial) | Versioned capability registry; runs record capability and version (tests/factory.test.ts); enable/disable status not built |
| FAC-AGT-002 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-AGT-003 | Imported proposed baseline | IN_PROGRESS (partial) | Every agent runs on demand and run state is stored with a lease; no permanent loops; no durable task queue |
| FAC-AGT-004 | Imported proposed baseline | IN_PROGRESS (partial) | Each researcher payload holds the brief and its own scope only, so siblings cannot see each other's results by construction; no explicit test |
| FAC-AGT-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-AGT-006 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-ART-001 | Imported proposed baseline | IN_PROGRESS (partial) | Assets are versioned with a content hash and superseded versions are kept; addressing every old version is not separately tested |
| FAC-ART-002 | Imported proposed baseline | IN_PROGRESS (partial) | Assets carry direction hash, task, evidence IDs and, for AI drafts, the generating run; model and skill versions are on the run record but not linked on every asset |
| FAC-ART-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-ART-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-ART-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CST-001 | Imported proposed baseline | IN_PROGRESS (partial) | Each paid call is reserved in the admin ledger with project, run, account, agent, provider, model, usage and a pricing snapshot (tests/factory-metering.test.ts, factory-costs.test.ts); task-level links and invoice reconciliation not built |
| FAC-CST-002 | Imported proposed baseline | IN_PROGRESS (partial) | Price is stored on each call at reservation, so history does not change when prices do; provider request IDs recorded; a versioned price-table object is not built (prices are an owner overlay) |
| FAC-CST-003 | Imported proposed baseline | IN_PROGRESS (partial) | Monthly workspace USD cap and per-project call caps tested (tests/factory-budget.test.ts); per-task and per-workflow budgets not built |
| FAC-CST-004 | Imported proposed baseline | IN_PROGRESS (partial) | Estimate and reconciled actual are separate fields on each ledger row (tests/factory-costs.test.ts); no real invoice comparison yet |
| FAC-CST-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CST-006 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CST-007 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CST-008 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-002 | Imported proposed baseline | IN_PROGRESS (partial) | Each run stores a brief snapshot and its hash; formal immutable context bundles not built |
| FAC-CTX-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-006 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-007 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-CTX-008 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-002 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-006 | Imported proposed baseline | IN_PROGRESS (partial) | Four providers supported (see FAC-HAR-002); xAI/Grok is a gap |
| FAC-D-007 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-D-008 | Imported proposed baseline | IN_PROGRESS (partial) | docs/CHANGELOG.md, IMPLEMENTATION_STATUS.md and HANDOVER.md are checked on every change by scripts/check_docs_governance.py and a CI workflow |
| FAC-D-009 | Imported proposed baseline | IN_PROGRESS (partial) | Role and ownership checks run server-side in the engine and routes (customer approvals refused to producers unless the test-mode switch is on); external publishing does not exist |
| FAC-D-010 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-DEV-001 | Imported proposed baseline | IN_PROGRESS (partial) | PRD.md is the canonical requirements document and is versioned with every change; owner review of the whole document not recorded |
| FAC-DEV-002 | Imported proposed baseline | IN_PROGRESS (partial) | AGENTS.md is the shared policy; CLAUDE.md and GEMINI.md point to it; the governance script checks they do |
| FAC-DEV-003 | Imported proposed baseline | IN_PROGRESS (partial) | Governance script fails a change that does not touch the changelog, status and handover; runs in CI (.github/workflows/docs-governance.yml) |
| FAC-DEV-004 | Imported proposed baseline | IN_PROGRESS (partial) | This file separates planned, in-progress and not-verified; nothing is marked verified without evidence |
| FAC-DEV-005 | Imported proposed baseline | IN_PROGRESS (partial) | Three ADRs exist under docs/adr and docs/DECISIONS.md indexes decisions; owner review of each not recorded |
| FAC-DEV-006 | Imported proposed baseline | IN_PROGRESS (partial) | Factory CI and docs governance workflows run on pull requests and a PR template exists; branch protection and release tags are GitHub settings, unverified |
| FAC-DEV-007 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-EVD-001 | Imported proposed baseline | IN_PROGRESS (partial) | Source records carry URL, title, collection time, method, kind and review status; research findings cite the source URL (tests/factory-research-findings.test.ts); object-pointer sources and classification not built |
| FAC-EVD-002 | Imported proposed baseline | IN_PROGRESS (partial) | Sources are public, client assertion or synthetic, and a client assertion cannot be marked supported (tests/factory-source-review.test.ts); a full claim record (fact, inference, creative proposition) is not built |
| FAC-EVD-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-EVD-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-HAR-001 | Imported proposed baseline | IN_PROGRESS (partial) | AgentExecutionRequest contract exists in the registry; the live agents call providers through one adapter function (tests/factory-providers.test.ts); not every agent uses the typed contract |
| FAC-HAR-002 | Imported proposed baseline | IN_PROGRESS (partial) | OpenAI, Gemini, Anthropic and DeepSeek adapters tested with stubbed transport (see FAC-HAR-004); xAI/Grok not supported; no live compatibility smoke test |
| FAC-HAR-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-OBS-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-OBS-002 | Imported proposed baseline | IN_PROGRESS (partial) | Run records hold timing, usage, model and error; the Diagnostics timeline shows them (tests/factory-observability.test.ts, factory-scope.test.ts); attempts and error classification are basic |
| FAC-OBS-003 | Imported proposed baseline | IN_PROGRESS (partial) | Project audit trail separate from technical logs: actor, role, action, time, including producer reviewer verdicts and approvals made on a customer's behalf in test mode; authorisation-decision detail partial |
| FAC-OBS-004 | Imported proposed baseline | IN_PROGRESS (partial) | Prompts and raw model replies are not stored; the ledger keeps usage counters only; no automated log-redaction test |
| FAC-OBS-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-SKL-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-SKL-002 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-SKL-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-TEN-001 | Imported proposed baseline | IN_PROGRESS (partial) | Account-scoped workspaces with verified identity; two-account isolation tested (tests/factory-accounts.test.ts, factory-identity.test.ts); storage-rule and emulator checks partial |
| FAC-TEN-002 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-TEN-003 | Imported proposed baseline | IN_PROGRESS (partial) | Server-enforced customer, producer and admin roles with 403s and audit (tests/factory-team.test.ts); Reviewer, Contractor and Finance roles not built |
| FAC-TEN-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-TEN-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-TEN-006 | Owner-confirmed portal scope, CHG-0003 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | Customer intake/direction/asset approval; acceptance tests pending |
| FAC-TEN-007 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-TOL-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-002 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-003 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-004 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-006 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-007 | Imported proposed baseline | IN_PROGRESS (partial) | Direction and asset approvals are hash-checked and record approver and time; production, copy and video are blocked until approved (tests/factory.test.ts, factory-campaign.test.ts); reason capture partial; state machine is code, not a durable workflow engine |
| FAC-WFL-008 | Imported proposed baseline | IN_PROGRESS (partial) | Changes requested keep the rejected version and a redraft creates a new linked version; targeted asset rework is manual |
| FAC-WFL-009 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-010 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-WFL-011 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |

CHG-0002: integrated studio website commit a5e8ceb while resolving README conflict. Factory acceptance status unchanged; studio tests do not verify Factory capabilities.

## Owner-confirmed scope — CHG-0003

FAC-TEN-006 is now owner-approved portal intent, not implemented. The register row reflects the updated scope; no acceptance evidence exists.

| Requirement | Intent | Delivery | Evidence / next verification |
|---|---|---|---|
| FAC-MKT-001 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-002 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-003 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-004 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-005 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-006 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-007 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-008 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-009 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-010 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-011 | Owner-confirmed direction, 2026-11-12 | IN_PROGRESS — bounded MVP subset, see CHG-0004 | PRD 1.1.0; acceptance tests pending |
| FAC-MKT-012 | Owner-confirmed direction, 2026-11-12 | PLANNED / NOT_VERIFIED | PRD 1.1.0; acceptance tests pending |

## CHG-0004 — bounded managed creative MVP

Date: 2026-11-12. Scope is implemented and locally tested on feat/explain-managed-mvp; merge/remote deployment evidence must be consulted separately. No requirement below is promoted to full PRD VERIFIED merely because the synthetic browser journey passes. Test details: MVP_VERIFICATION.md; runtime guide: FACTORY_MVP.md.

| Requirement | Working subset | Remaining gap |
|---|---|---|
| FAC-MKT-001 / FAC-TEN-006 | Minimal intake, optional brand/PNG logo/context, scoped invitation/customer portal, brief edits before direction | Individual accounts/MFA, broader file storage and launch privacy/retention review |
| FAC-MKT-002 | B2B/B2C/mixed free-text audience, editable campaign approach, explicit unknowns | Live campaign-quality evaluation and provider smoke tests |
| FAC-MKT-003 | Four segments, manual sources, review, assertions, optional cited web-research adapter | Live source-permission/provider smoke tests and broader collectors |
| FAC-MKT-004 | Source-linked insights and campaign message/reasoning/design/format/hypothesis; sharing requires evidence/insight | Quality remains human-reviewed; campaign effectiveness unmeasured |
| FAC-MKT-005 | Version/hash-specific customer approval and revision pause before production | Enterprise reviewer assignment and individual accounts |
| FAC-MKT-006 | Versioned specialist task instructions and evidence/strategy lineage | Full media contracts, monetary budgets and worker dispatch |
| FAC-MKT-007 | Original SVG, HTML motion storyboard and copy/script drafts; review, approval, current-version downloads/manifest | Rendered MP4, broader uploads and rights workflow |
| FAC-MKT-008–010 | Source-controlled reviewed registry, portable request/result interfaces, recorded capability gaps | Agents drafting/evaluating/promoting new specialist code; unsupported promotion stays blocked |
| FAC-MKT-011 | Source -> insight -> strategy -> task -> asset -> approval hashes and hypothesis view | Publication/account/measurement mappings |
| FAC-MKT-012 | Phase-two placeholder and honest disconnected state | All live analytics/publishing integrations remain PLANNED |

Supporting subsets: FAC-DEV tests/CI/docs; FAC-HAR contracts only; FAC-CST raw usage/invocation limits only; FAC-WFL approval/idempotency/research recovery only; FAC-ART immutable template content; FAC-TEN server workspace/project isolation. Firebase integration, full security rule tests, full cost accounting and multi-provider parity remain NOT_VERIFIED.

CHG-0005: synthetic demo default storage moved to a writable OS-temporary namespace; default-path regression added. This does not promote cloud persistence or serverless session durability to VERIFIED.

CHG-0006: first remote application run passed npm ci, tests, lint, types and build but browser install rejected Ubuntu 26. Runner pinned to supported Ubuntu 24.04; subsequent run is authoritative.

## CHG-0007/0008 — live foundation

| Requirement | Intent | Delivery | Evidence / gap |
|---|---|---|---|
| FAC-MKT-013 | Authorised next-stage scope | IN_PROGRESS | Exact-brief consent/revocation implemented and regression-tested; live provider unverified |
| FAC-MKT-014 | Authorised next-stage scope | IN_PROGRESS | Reviewed source-grounded AI insight/direction drafting with human gates; model transport stubbed |
| FAC-MKT-015 | Authorised next-stage scope | IN_PROGRESS | Producer setup and production configuration gates tested; actual Render storage/cloud activation pending |
| FAC-MKT-016 | Owner-requested 2026-11-12 (CHG-0020) | IN_PROGRESS | Finding parser, per-source claims, gaps and confidence covered with stubbed transport; live provider behaviour with the new format unverified |
| FAC-MKT-017 | Owner-requested 2026-11-12 (CHG-0021) | IN_PROGRESS | Strategy fields, key-message proof validation, AI contract and Direction page covered by tests; live model quality unverified |
| FAC-MKT-018 | Owner-requested 2026-11-12 (CHG-0022) | IN_PROGRESS | Copy pack gates, evidence-bound validation and metered draft asset covered with stubbed transport; live output quality and the portal button in a browser unverified |
| FAC-MKT-019 | Owner-requested 2026-11-12 (CHG-0024) | IN_PROGRESS | Catalogue, role-aware selection and request, locking, channel-aware prompts and picker markup covered by tests/factory-channels.test.tsx; look and feel checked in a static render only, not in a live browser |
| FAC-MKT-020 | Owner-requested 2026-11-12 (CHG-0026) | IN_PROGRESS | Per-researcher status derivation, customer-safe view and panel markup covered by tests/factory-research-progress.test.tsx and a static render; automatic refresh and the live flow in a browser unverified |
| FAC-MKT-021 | Owner-requested 2026-11-12 (CHG-0027) | IN_PROGRESS | Flow, role split and activity feed covered by tests/factory-research-progress.test.tsx and static renders at desktop and phone widths; real-time animation in a live browser unverified |
| FAC-BAS-001 | Owner-adopted 2026-11-12 (CHG-0025) | IN_PROGRESS | Research, insight, direction and copy agents run under producer coordination with gates; data and platform access are not built |
| FAC-BAS-002 | Owner-adopted 2026-11-12 (CHG-0025) | NOT_VERIFIED | Not implemented; phase two. Pipeline and warehouse choice open |
| FAC-BAS-003 | Owner-adopted 2026-11-12 (CHG-0025) | NOT_VERIFIED | Registry and metering exist for research and drafting providers; image, video, transcription and contact-data tools not built or chosen |
| FAC-BAS-004 | Owner-adopted 2026-11-12 (CHG-0025) | IN_PROGRESS | Research to direction to copy pack and a single branded artwork template exist; multi-variant researched static ads not built |
| FAC-BAS-005 | Owner-adopted 2026-11-12 (CHG-0025) | NOT_VERIFIED | Not implemented; needs rights, consent and cost design |
| FAC-BAS-006 | Owner-adopted 2026-11-12 (CHG-0025) | NOT_VERIFIED | Not implemented; variant tracking and phase-two measurement open |
| FAC-DEV-008 | Authorised next-stage scope | IN_PROGRESS | Local audit 0 high/critical, CI gate added; remote result in GitHub; 15 moderate findings tracked |

FAC-MKT-002–006 now include optional bounded AI drafts. FACTORY_VERIFICATION is not implied: see FOUNDATION_VERIFICATION.md for exact local evidence and RENDER_ACTIVATION.md for outstanding infrastructure tests. Earlier “acceptance pending” entries describe full requirements, not absence of bounded local tests.

## CHG-0009 — account-owned production and owner costs

| Requirement | Intent | Delivery | Evidence / remaining verification |
|---|---|---|---|
| FAC-TEN-008 | Owner-requested 2026-11-12 | IN_PROGRESS | Verified-identity contracts, two-account isolation, producer selection, invitations and ownership tested with fixtures; real Firebase Auth/provider login pending |
| FAC-CST-009 | Owner-requested 2026-11-12 | IN_PROGRESS | Pre-dispatch metering, usage/pricing/unknowns, admin-only API, cache/tool accounting, export/archive and reconciliation tested; actual provider invoice comparison pending |
| FAC-HAR-004 | Owner-requested 2026-11-12 | IN_PROGRESS | All four drafting adapters and grounded OpenAI/Gemini adapters tested with explicit transport fixtures; selected live models unverified |
| FAC-HAR-005 | Owner-requested 2026-11-12 (CHG-0016) | IN_PROGRESS | Admin AI models page, per-job routing, public price suggestions and owner price overrides covered by tests/factory-ai-routing.test.ts; live public-price fetch and live providers unverified |
| FAC-HAR-006 | Owner-requested 2026-11-12 (CHG-0027) | IN_PROGRESS | Ledger attribution, agent overview, running-now detection and admin-only route covered by tests/factory-ai-agents.test.ts; the page in a live browser unverified |
| FAC-HAR-007 | Owner-requested 2026-11-12 (CHG-0028, reworked CHG-0034) | IN_PROGRESS | Map-driven model picker overlay (click an agent), one-click suggested setup and no separate models page; covered by tests/factory-map-interactive.test.tsx; not exercised in a live browser |
| FAC-HAR-008 | Owner-requested 2026-11-12 (CHG-0029, reworked CHG-0031, scoping band CHG-0038) | IN_PROGRESS | Single system map with models, API connectors, stores, gates and monitoring covered by tests/factory-system-map.test.tsx; layout checked in a static preview only, not in the live app |
| FAC-HAR-009 | Owner-requested 2026-11-12 (CHG-0030) | IN_PROGRESS | Auto-approve switch, background research run, audit and once-only behaviour covered by tests/factory-auto-approve.test.ts with stubbed transport (including self-heal on view and visible not-ready reason, CHG-0033); live providers and 512 MB instance behaviour unverified |
| FAC-HAR-010 | Owner-requested 2026-11-13 (CHG-0031) | IN_PROGRESS | Edge, model, pipeline and blocker computation covered by tests/factory-observability.test.ts and the admin route in tests/factory-auto-approve.test.ts; live ledger data unverified; Factory MVP lint step fixed in CHG-0032 (browser acceptance not yet re-run on this commit); failure reasons surfaced and provider error detail kept, covered by tests/factory-providers.test.ts and tests/factory-observability.test.ts (CHG-0035); no-citation diagnostics covered by tests/factory-research-findings.test.ts (CHG-0036); consulted-page fallback for findings without inline citations covered by tests/factory-research-findings.test.ts (CHG-0037) |
| FAC-MKT-022 | Owner-requested 2026-11-13 (CHG-0031) | IN_PROGRESS | Readiness, question plan, dossier, routes and customer filtering covered by tests/factory-research-plan.test.ts and tests/factory-auto-approve.test.ts; panels in a live browser unverified |
| FAC-HAR-011 | Owner-requested 2026-11-13 (CHG-0038) | IN_PROGRESS | Classification, strict validation, storage on the project, route, metering, edit, versioning and template fallback covered by tests/factory-scope.test.ts; live model scope quality and the panels in a live browser unverified (panels fixed to show loading and error states; scope staleness now includes channels; Gate 1 jump callout, clearer review buttons and bulk accept added; bulk accept, bulk insight and asset approval, clipped drafts with a stated validation reason, and producer test-mode approvals covered by tests/factory-source-review.test.ts) |
| FAC-HAR-012 | Owner-requested 2026-11-13 (CHG-0039, reworked CHG-0040) | IN_PROGRESS | Planner, four walled-garden reviewers (inputs asserted through a mocked provider call), free checks, strict parsing, metered reviewer runs, one rework per gate, holds, customer-gate stops, audit, caps, role and demo checks covered by tests/factory-producer-agent.test.ts; reviewer quality with real models, drafter redraft success, panel, buttons and automatic triggers unverified live; no map node (listed on the AI agents page) |
| FAC-MKT-023 | Owner-requested 2026-11-13 (CHG-0038) | IN_PROGRESS | Scope reaches each researcher payload and the plan and dossier (tests/factory-scope.test.ts); Business scope panel and run note in a live browser unverified |
| FAC-ART-006 | Owner-requested 2026-11-12 (CHG-0019) | IN_PROGRESS | Template MP4 render, approval gates, local store and download covered by tests/factory-video.test.ts with a real encode; Firebase Storage upload, memory use on the production instance and the portal buttons in a browser unverified |
| FAC-TEN-009 | Owner-requested 2026-11-12 (CHG-0014) | IN_PROGRESS | Admin-managed producer registry by verified email, immediate revocation, no admin escalation, fail-closed registry and audit trail tested with fixtures; live Firebase/Firestore behaviour, staff MFA and client sign-up approval not yet verified |

Supporting FAC-TEN-001/002/003/006, FAC-CST-001/002/004/008 and FAC-HAR-001/002 have additional working subsets. No full requirement is promoted to VERIFIED: no authenticated cloud provisioning or paid campaign occurred. See ACCOUNTS_VERIFICATION.md and ACCOUNTS_PROVIDERS_COSTS.md. One initial account per user; enterprise assignments/team RBAC and large media/cost infrastructure remain gaps.

CHG-0009 remote evidence: Firestore emulator transaction/reload/client-deny suite passed at120c947, run43209732747. This verifies the adapter against an emulator, not provisioning or operation of ai-agency-3671b. Sign-in-time revocation regression added in follow-up.

CHG-0010 / FAC-TEN-008: live owner signup is BLOCKED by confirmed missing/rejected Firebase web-auth config (auth-config503); not a verified password failure. Added allowlisted diagnostic/error-phase handling and browser cases for config503 and Firebase operation-not-allowed. Local unit/full suite/lint/types/build/browser evidence in current branch; exact remote checks in GitHub. Actual Render configuration remains owner-managed and unverified here.

CHG-0011: account menu (avatar, identity, Sign out) and clear post-sign-in landing implemented on claude/login-ux-header as presentation changes to FAC-TEN-008. Unit helper tests, types, lint and build pass; browser test updated but not yet run. No requirement promoted to VERIFIED; live sign-up still depends on Render/Firebase configuration (CHG-0010).

CHG-0012: post-sign-in banner now dismisses when a brief is created (presentation only). Owner confirmed on the live CHG-0011 build, 2026-11-12, that Firebase sign-in, workspace open and brief creation work; this is manual owner observation, not recorded acceptance evidence, so no requirement is promoted to VERIFIED.

CHG-0013 / FAC-CST-003: IN_PROGRESS, bounded subset. Hard USD caps (workspace monthly, default $25, and optional per-project monthly) are enforced before every managed model call with unknown costs held at a configured amount; unit and integration tests pass locally. Task and workflow level caps, provider-invoice reconciliation and live provider verification remain NOT_VERIFIED. No requirement promoted to VERIFIED.
