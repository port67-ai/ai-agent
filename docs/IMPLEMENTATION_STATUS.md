> **Authoritative status at reset (2026-11-21):** Code is restored to the exact source tree of `bebcdec`, the last verified Render-live commit. The table below is historical and may include locally implemented but undeployed features. No feature introduced after `bebcdec` is part of this reset candidate. Full CI/browser verification is pending. See `docs/RECOVERY_RESET_2026-11-21.md`.

# Latest change — CHG-0084 specialists and performance feedback

16 November 2026; branch feat/research-performance-feedback, base fd0b183 (PR #58). Local implementation/acceptance passed on 16 November 2026; this entry is not deployment evidence. FAC-PLN-007, FAC-FBK-001, FAC-FBK-002 and FAC-FBK-003 implemented with full local regression, browser, lint, typecheck and production build acceptance; GitHub CI/deployment pending. Existing seven-role execution is preserved. No live provider quality, direct advertising connector or measured causal lift is claimed.

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
| FAC-OBS-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion CHG-0073: row actions and customer Waiting for you card. CHG-0074: auto-refresh. |
| FAC-OBS-002 | Owner-requested 2026-11-15 (CHG-0063, CHG-0066) | PARTIAL | Built (CHG-0066): more space between agent nodes, research split into two clear rows, every AI agent node shows the same four facts (calls and cost, health, failed and unknown). Connectors to the LLM providers leave the bottom of every AI agent. Not built: a customer-safe run view.
| FAC-OBS-003 | Imported proposed baseline | IN_PROGRESS (partial) | Project audit trail separate from technical logs: actor, role, action, time, including producer reviewer verdicts and approvals made on a customer's behalf in test mode; authorisation-decision detail partial |
| FAC-OBS-004 | Imported proposed baseline | IN_PROGRESS (partial) | Prompts and raw model replies are not stored; the ledger keeps usage counters only; no automated log-redaction test |
| FAC-OBS-005 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion |
| FAC-SKL-001 | Imported proposed baseline | NOT_VERIFIED | No Factory acceptance evidence; audit before promotion CHG-0075: variables and input list. CHG-0076: reviewer variable limits. |
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
| FAC-HAR-008 | Owner-requested 2026-11-12 (CHG-0029, reworked CHG-0031, scoping band CHG-0038, producer column CHG-0043) | IN_PROGRESS | Single system map with models, API connectors, stores, gates and monitoring covered by tests/factory-system-map.test.tsx; layout checked in a static preview only, not in the live app |
| FAC-HAR-009 | Owner-requested 2026-11-12 (CHG-0030) | IN_PROGRESS | Auto-approve switch, background research run, audit and once-only behaviour covered by tests/factory-auto-approve.test.ts with stubbed transport (including self-heal on view and visible not-ready reason, CHG-0033); live providers and 512 MB instance behaviour unverified |
| FAC-HAR-010 | Owner-requested 2026-11-13 (CHG-0031) | IN_PROGRESS | Edge, model, pipeline and blocker computation covered by tests/factory-observability.test.ts and the admin route in tests/factory-auto-approve.test.ts; live ledger data unverified; Factory MVP lint step fixed in CHG-0032 (browser acceptance not yet re-run on this commit); failure reasons surfaced and provider error detail kept, covered by tests/factory-providers.test.ts and tests/factory-observability.test.ts (CHG-0035); no-citation diagnostics covered by tests/factory-research-findings.test.ts (CHG-0036); consulted-page fallback for findings without inline citations covered by tests/factory-research-findings.test.ts (CHG-0037) |
| FAC-MKT-022 | Owner-requested 2026-11-13 (CHG-0031) | IN_PROGRESS | Readiness, question plan, dossier, routes and customer filtering covered by tests/factory-research-plan.test.ts and tests/factory-auto-approve.test.ts; panels in a live browser unverified |
| FAC-HAR-011 | Owner-requested 2026-11-13 (CHG-0038) | IN_PROGRESS | Classification, strict validation, storage on the project, route, metering, edit, versioning and template fallback covered by tests/factory-scope.test.ts; live model scope quality and the panels in a live browser unverified (panels fixed to show loading and error states; scope staleness now includes channels; Gate 1 jump callout, clearer review buttons and bulk accept added; bulk accept, bulk insight and asset approval, clipped drafts with a stated validation reason, and producer test-mode approvals covered by tests/factory-source-review.test.ts) |
| FAC-HAR-012 | Owner-requested 2026-11-13 (CHG-0039, reworked CHG-0040) | IN_PROGRESS | Planner, four walled-garden reviewers (inputs asserted through a mocked provider call), free checks, strict parsing, metered reviewer runs, one rework per gate, holds, customer-gate stops, audit, caps, role and demo checks covered by tests/factory-producer-agent.test.ts; reviewer quality with real models, drafter redraft success, panel, buttons and automatic triggers unverified live; no map node (listed on the AI agents page) CHG-0068: after a restart from the brief the research tab offers one button that authorises public data and starts research. CHG-0072: direction approval banner, scroll-to-approval and green done buttons. |
| FAC-MKT-023 | Owner-requested 2026-11-13 (CHG-0038) | IN_PROGRESS | Scope reaches each researcher payload and the plan and dossier (tests/factory-scope.test.ts); Business scope panel and run note in a live browser unverified |
| FAC-ART-006 | Owner-requested 2026-11-12 (CHG-0019) | IN_PROGRESS | Template MP4 render, approval gates, local store and download covered by tests/factory-video.test.ts with a real encode; Firebase Storage upload, memory use on the production instance and the portal buttons in a browser unverified |
| FAC-TEN-009 | Owner-requested 2026-11-12 (CHG-0014) | IN_PROGRESS | Admin-managed producer registry by verified email, immediate revocation, no admin escalation, fail-closed registry and audit trail tested with fixtures; live Firebase/Firestore behaviour, staff MFA and client sign-up approval not yet verified |

Supporting FAC-TEN-001/002/003/006, FAC-CST-001/002/004/008 and FAC-HAR-001/002 have additional working subsets. No full requirement is promoted to VERIFIED: no authenticated cloud provisioning or paid campaign occurred. See ACCOUNTS_VERIFICATION.md and ACCOUNTS_PROVIDERS_COSTS.md. One initial account per user; enterprise assignments/team RBAC and large media/cost infrastructure remain gaps.

CHG-0009 remote evidence: Firestore emulator transaction/reload/client-deny suite passed at120c947, run43209732747. This verifies the adapter against an emulator, not provisioning or operation of ai-agency-3671b. Sign-in-time revocation regression added in follow-up.

CHG-0010 / FAC-TEN-008: live owner signup is BLOCKED by confirmed missing/rejected Firebase web-auth config (auth-config503); not a verified password failure. Added allowlisted diagnostic/error-phase handling and browser cases for config503 and Firebase operation-not-allowed. Local unit/full suite/lint/types/build/browser evidence in current branch; exact remote checks in GitHub. Actual Render configuration remains owner-managed and unverified here.

CHG-0011: account menu (avatar, identity, Sign out) and clear post-sign-in landing implemented on claude/login-ux-header as presentation changes to FAC-TEN-008. Unit helper tests, types, lint and build pass; browser test updated but not yet run. No requirement promoted to VERIFIED; live sign-up still depends on Render/Firebase configuration (CHG-0010).

CHG-0012: post-sign-in banner now dismisses when a brief is created (presentation only). Owner confirmed on the live CHG-0011 build, 2026-11-12, that Firebase sign-in, workspace open and brief creation work; this is manual owner observation, not recorded acceptance evidence, so no requirement is promoted to VERIFIED.

CHG-0013 / FAC-CST-003: IN_PROGRESS, bounded subset. Hard USD caps (workspace monthly, default $25, and optional per-project monthly) are enforced before every managed model call with unknown costs held at a configured amount; unit and integration tests pass locally. Task and workflow level caps, provider-invoice reconciliation and live provider verification remain NOT_VERIFIED. No requirement promoted to VERIFIED.

CHG-0044 / FAC-HAR-012: IN_PROGRESS (partial). Producer orchestrator also resumes when a project is opened after research (auto, fingerprint-skipped), so source review onward no longer depends on a single post-research kick. Customer direction approval and final asset approval remain human.

CHG-0045 / FAC-HAR-012: IN_PROGRESS (partial). Admin manual or AI producer approval switch for the direction (default AI, requires PORT67_PRODUCER_APPROVALS=true); final asset approval stays with the account owner.

CHG-0046 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Spend limits are now owner-editable in the portal (monthly, project, run, per-call hold, per model) and the Private API costs page has an interactive cumulative cost history by harness and model.

CHG-0047 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Built-in standard DeepSeek prices (peak rate) used when no admin or env price is set.

CHG-0048 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Built-in standard Gemini prices (official list, conservative tier, grounded search as per-call fee).

CHG-0049 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Built-in standard OpenAI prices (Standard short-context tier; no search fee).

CHG-0050 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Built-in standard Claude prices plus $10 per 1,000 web search.

CHG-0051 / FAC-CST-003, FAC-HAR-012: UI polish only; no status change. Activation buttons use the orange f-button style.

CHG-0052 / FAC-HAR-008, FAC-HAR-012: map node reflects AI or customer direction approval; no status change.

CHG-0053 / FAC-HAR-008, FAC-HAR-012: map change only; no status change.

CHG-0054 / FAC-HAR-008: static storyboard grid added to production output. CHG-0055 / FAC-HAR-012: IN_PROGRESS (partial). Reviewer relevance scores, unsupported-claim listing and invented-figure checks added; scores are model judgements, not proof.

CHG-0056 / FAC-HAR-012: PLANNED. Layered evidence-quality scoring recorded in docs/EVIDENCE_QUALITY_PLAN.md; not implemented.

CHG-0057 / FAC-HAR-012: PLANNED, owner decisions recorded; build not started.

CHG-0058 / FAC-HAR-012: IN_PROGRESS (partial). Source grading, segment and insight ratings, research re-run with guidance and warnings built; structured facts, portal thresholds and copy-pack trace not yet.

CHG-0059 / FAC-CST-003: IN_PROGRESS, bounded subset extended. Search fee priced, unknown-cost recalculation and a testing reset for the spend counter added.

| FAC-VID-001 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): separate advert plan on the project (`advert.ts`, Advert tab); explainer and template storyboard untouched. Clip and timeline kinds are phase 2 and 3. |
| FAC-VID-002 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): deterministic treatment and shot list from the approved direction, one shot per key message plus a closing shot, music cues, editable shots, figure check against approved key messages, customer approval gate. AI treatment drafter not built. |
| FAC-VID-003 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): typed Continuity Profile (hex palette, lighting, camera body, lens, aspect, grade, per-shot lens and lighting overrides), estimate or confirmed, editable, producer approval required before compile. Extraction from reference images not built. |
| FAC-VID-004 | Owner-requested 2026-11-15 (CHG-0060) | PLANNED | Not started; see PRD 25.5. Reference assets via an approved image tool. |
| FAC-VID-005 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): deterministic compiler, ruleset generic-v1, strict reference order, 10 second shot limit, draft 480p and final 1080p tiers, golden tests. Provider specific rule sets and approved-asset validation arrive with adapters. |
| FAC-VID-006 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): shot and advert length limits and tier selector with seconds shown. No spend, no dollar estimate and no ledger metering until a generation adapter exists. |
| FAC-VID-007 | Owner-requested 2026-11-15 (CHG-0060) | PARTIAL | Phase 1 built (CHG-0061): producer approves Continuity Profile, customer approves treatment (test mode on-behalf supported, audited). Draft clip and final render gates and AI advert reviewers not built. |
| FAC-VID-008 | Owner-requested 2026-11-15 (CHG-0060) | PLANNED | Not started; see PRD 25.5. Timeline and editor export. |
| FAC-VID-009 | Owner-requested 2026-11-15 (CHG-0060) | PLANNED | Not started; see PRD 25.5. Rights, consent and claims checks. |
| FAC-VID-010 | Owner-requested 2026-11-15 (CHG-0060) | PLANNED | Not started; see PRD 25.5. Vendor evaluation under section 23.1. |
| FAC-VID-011 | Owner-requested 2026-11-15 (CHG-0060) | PLANNED | Not started; see PRD 25.5. Measure time and cost per advert. |
## CHG-0062 — adjacent, social-trend and video research (2026-11-15)

| Requirement | Intent | Delivery | Evidence / remaining verification |
|---|---|---|---|
| FAC-MKT-024 | Owner-authorised unattended implementation | IN_PROGRESS (implemented bounded subset) | Seven roles wired through scope, routing, research bus, progress, system map and metering. tests/factory-research-intelligence.test.ts, factory-auto-approve.test.ts, factory-scope.test.ts. Live source quality and authenticated platform access unverified. |
| FAC-MKT-025 | Owner-authorised | IN_PROGRESS (implemented bounded subset) | Dated discovery/source routes, counterexample instructions, balanced reviewed synthesis, stronger producer views and video treatment carried into content and advert prompt packs. No continuous social feed or automated performance attribution. |
| FAC-VID-012 | Owner-authorised | IN_PROGRESS (implemented; live adapter unverified) | Gemini public YouTube input with time and sampling bounds; strict analysis validation; producer-only explicit paid action; unreviewed output and usage retention tested in factory-video-intelligence-api.test.ts. Actual Gemini model/video compatibility requires a configured live run. |
| FAC-CTX-009 | Owner-authorised | IN_PROGRESS (implemented bounded subset) | Full public research snapshot and hash, capability v2, changed channels/scope rejection and legacy continuation tests. This does not complete immutable master-client context or generic skill registry requirements. |

Local validation and limitations are recorded in docs/RESEARCH_INTELLIGENCE.md. No deployment or live provider success is implied by fixture tests.

| FAC-SKL-001 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): `skills.ts`; defaults for all 12 AI agents; skill appended after fixed rules via the metered call wrapper and provider boundary. |
| FAC-SKL-002 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): versioned saves in the database, latest runs on the next call, history with editor, time and note, admin-only route `admin/skills`. |
| FAC-SKL-003 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): Skill chip on every agent node on the map plus a Skill button on each agent card; popup with purpose, edit, history and default reload. |
| FAC-SKL-004 | Owner-requested 2026-11-16 (CHG-0078) | IMPLEMENTED | Built (CHG-0078): audience and three optional brief fields to researchers; graded sources, findings, profile and gaps to the insight writer. Strategy, copy and scoping inputs not yet reviewed for the same gaps. |
| FAC-SKL-005 | Owner-requested 2026-11-16 (CHG-0079) | IMPLEMENTED | Built (CHG-0079): redraft context for the direction writer; fuller brief, formats, ideas, grades and change requests for the copy writer. Copy types for UGC and long video are not built. |
| FAC-SKL-006 | Owner-requested 2026-11-16 (CHG-0081) | IMPLEMENTED | Built (CHG-0081): Skill writer admin tab, OpenAI only, model and effort selectable. Not live-tested against the OpenAI API; check cost and run time on the first real call. |
| FAC-FMT-001 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): seven formats in `formats.ts`; producer confirms in the Campaign plan panel on the Campaign direction tab. |
| FAC-FMT-002 | Owner-requested 2026-11-15 (CHG-0063, CHG-0065) | IMPLEMENTED | Built: rules-based suggestions (CHG-0063) and the AI format agent (CHG-0065, slot `synthesis:formats`, skill-backed, strict contract, metered). The producer always decides.
| FAC-FMT-003 | Owner-requested 2026-11-15 (CHG-0063) | PARTIAL | Built (CHG-0063): formats go into the direction prompt and the advert track requires a video format. Per-format production beyond the existing storyboard, copy and advert tracks is not built. |
| FAC-AUD-001 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): strapline stored on the project and forced as the direction message. |
| FAC-AUD-002 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): up to six segments; passed to direction and copy; AI copy items must name a segment and the pack shows it. |
| FAC-AUD-003 | Owner-requested 2026-11-15 (CHG-0069) | IMPLEMENTED | Built (CHG-0069): agent synthesis:audiences with its own skill, slot, cost line and map node; "Suggest strapline and audiences with AI" in the Strapline, audience segments and demographics panel; use-this buttons fill the form; demographics saved per segment. |
| FAC-IDE-001 | Owner-requested 2026-11-15 (CHG-0063) | IMPLEMENTED | Built (CHG-0063): `researchPack` computed for producers; performance metrics honestly absent. |
| FAC-IDE-002 | Owner-requested 2026-11-15 (CHG-0063, CHG-0065) | IMPLEMENTED | Built: rules-based ideas (CHG-0063) and the AI ideas agent (CHG-0065, slot `synthesis:ideas`, skill-backed, strict contract, metered); producer keeps, drops and prioritises.
| FAC-IDE-003 | Owner-requested 2026-11-15 (CHG-0063) | PLANNED | Not started: ad account metrics, creator sourcing and outreach need a tool adoption review first (section 23.1). Per-format production beyond storyboard, copy pack and advert is also not started.
| FAC-OBS-001 | Owner-requested 2026-11-15 (CHG-0064) | IMPLEMENTED | Run progress panel with approval links and orchestrator hold hover. Producers only. |
| FAC-OBS-002 | Owner-requested 2026-11-15 (CHG-0064) | PLANNED | Not started: more space between agent nodes on the AI agents map so lines and labels do not overlap; customer-safe tracker. |
| FAC-REV-001 | Owner-requested 2026-11-16 (CHG-0080) | IMPLEMENTED | Built (CHG-0080): review queue for sources and draft insights, launched from the Source review and Insight review rows and from the Research room. Direction and asset approvals keep their own screens. CHG-0085: stale holds ignored; waiting titles listed. |
| FAC-PRG-001 | Owner-requested 2026-11-18 (CHG-0086) | IMPLEMENTED | Built (CHG-0086): project dropdown, per-project map marks, Your turn banner and who-acts column; producers and admins approve customer gates by default. Not yet seen on live data: check the Harry Fraser marks after deploy. |
| FAC-OVR-001 | Owner-requested 2026-11-18 (CHG-0087) | IMPLEMENTED | Built (CHG-0087). Customer accounts are created when a customer first signs in; a producer cannot yet create an account for a customer who has not. Returns to the Overview after share, approve, format, audience and bulk review decisions; single source or insight reviews keep you in the queue. |
| FAC-OVR-002 | Owner-requested 2026-11-18 (CHG-0088) | IMPLEMENTED | Built (CHG-0088). Customers keep the channel picker on the Research tab. Not yet seen live. |
| FAC-OVR-003 | Owner-requested 2026-11-18 (CHG-0089) | IMPLEMENTED | Built (CHG-0089). Projects with a task plan show the plan's tasks; older projects show the fixed sequence. Not yet seen live. The legacy task table remains in the component for the existing UI test but is no longer shown on the Overview. |
| FAC-PRV-001 | Owner-reported 2026-11-18 (CHG-0090) | IMPLEMENTED | Built (CHG-0090): provider calls retry twice on 429/500/502/503/504 with 3 s and 8 s waits; other errors are not retried. Not yet seen against a live provider outage. |
| FAC-COST-001 | Owner-reported 2026-11-18 (CHG-0091) | IMPLEMENTED | Built (CHG-0091): a full cost ledger batch (150 calls) is archived automatically before the next paid call; totals include archives. Not yet seen live. |
| FAC-PRV-002 | Owner-reported 2026-11-19 (CHG-0092) | IMPLEMENTED | Built (CHG-0092): planner and medium validators resolve a channel by id or display name; output schema constrains channel to the chosen ids. Not yet seen against the live model. |
| FAC-STO-001 | Owner-requested 2026-11-16 (CHG-0077) | IMPLEMENTED | Built (CHG-0077): storage gauge in the producer Overview and diagnostics, automatic trimming of old run copies on save, manual Trim button. |
| FAC-STO-002 | Owner-requested 2026-11-16 (CHG-0077) | PLANNED | Not started. Split the project record into separate records; trigger is about 60 percent of the limit on the gauge or before several live customers. |
| FAC-PLN-008 | Owner-reported 2026-11-20 (CHG-0101) | IMPLEMENTED locally; not deployed | Format confirmation no longer needs a typed reason; blank reasons are recorded automatically; the panel explains why Confirm is unavailable. The AI agents map shows only holds that are still open (tests/factory-active-hold.test.ts). |
| FAC-HAR-013 | Owner-reported 2026-11-20 (CHG-0102) | IMPLEMENTED locally; not deployed | A direction held by the AI reviewer shows the producer's choices on the Direction page and stops blocking once shared or replaced (tests/factory-active-hold.test.ts). |
| FAC-CST-003 | Owner decision 2026-11-19 (CHG-0096) | IMPLEMENTED locally; enforcement is opt-in | Spend limits off by default; `PORT67_SPEND_LIMITS=on` restores blocking. Metering and the cost page are unchanged. Per-project run, planning, reviewer and pass limits raised to about 1000. Not deployed or seen live. |
| FAC-STO-003 | Owner-reported 2026-11-19 (CHG-0095) | IMPLEMENTED locally; not deployed or seen live | Built (CHG-0095): Firebase account saves are checked per project document (about 850 KB less 80 KB per running task) instead of across the whole account; per-project run limit default 500, maximum 5000 (`run-cap.ts`). Covered by tests/factory-storage.test.ts. The Firestore emulator test was not run. FAC-STO-002 (splitting the project record) is still planned. |


## CHG-0082 — task-based MVP evolution (16 November 2026)

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-TSK-001 | IMPLEMENTED locally; not deployed or live-verified | `factory-task-plan.test.ts`: narrow/video/research-only selection, explicit formats, reasons; free deterministic planning needs producer review for ambiguous intent. |
| FAC-TSK-002 | IMPLEMENTED locally; not deployed or live-verified | Planner DAG and UI tests; API test reconstructs completed status from a new local repository instance; existing Firestore adapter integration still requires environment acceptance. |
| FAC-TSK-003 | IMPLEMENTED locally; not deployed or live-verified | API tests: excluded agent zero provider calls, dependency guards, research-only completion, existing control regression suite. No durable queue or distributed orchestration lease added. |
| FAC-TSK-004 | IMPLEMENTED locally; not deployed or live-verified | Version/role checks, plan history, stale paid response usage retention and compatible-result preservation tests; existing post-direction scope locks remain. |
| FAC-TSK-005 | IMPLEMENTED locally; not deployed or live-verified | Static-only production and individual template-agent tasks; unsupported full outputs remain producer tasks with audited notes. External agent harness interfaces still have no runtime adapters. |

Supports FAC-WFL-001/002 and FAC-AGT-003 with a bounded project graph and persisted state. Does not promote full original workflow requirements to VERIFIED or implement FAC-WFL-003 Cloud Tasks dispatch. Final local unit/API/UI, full regression, browser, typecheck, lint, production build and structural governance checks passed; exact commands are recorded in CHG-0082 and HANDOVER. Firestore emulator assertions did not run because the emulator JAR download failed. No live acceptance or deployment is claimed.


## CHG-0083 — AI planning, stronger research and medium decisions

| Requirement | State | Working scope / evidence |
|---|---|---|
| FAC-PLN-001 | Implemented locally; deployment pending | Strict planner contracts, complete public context, catalogue/method validation and selected-agent execution tested in `factory-ai-planning*.test.ts`. |
| FAC-PLN-002 | Implemented locally; deployment pending | Metered planner/medium runs, cached derived/rules scopes, explicit retry/fallback, stale-result usage and separate model/skill attribution. |
| FAC-PLN-003 | Implemented locally; live quality acceptance pending | Original method catalogue injected into grounded research. Actual public source access and real campaign quality depend on configured providers. |
| FAC-PLN-004 | Implemented locally; live quality acceptance pending | Cited per-channel recommendation contracts, counterarguments/confidence/unknowns, separate customer request and UI. No measured campaign-history connector. |
| FAC-PLN-005 | Implemented locally; deployment pending | Expected recommendation/evidence version, rationale, explicit manual path, targeted video research and stale manual-decision reconfirmation regressions. |
| FAC-PLN-006 | Implemented locally; promotion remains manual | Proposed capability gaps are non-executable and use the existing backlog; no new researcher/tool permissions are granted. |

Independent review identified pending-planner scoping bypass, stale format confirmation, repeated rules-scope reviews and stale manual UI decisions. Reproductions and regression tests accompany fixes. Final verification and release references are recorded in HANDOVER/CHANGELOG; no paid live-provider quality acceptance is inferred from simulated transport tests.


## CHG-0097: Studio stages, piece A (20 November 2026)

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-STU-001 | IMPLEMENTED locally; not deployed or seen live | `STUDIO_OFFERS` and `OfferPicker`; parked offers refused by `selectableOffer`. Covered by factory-studio.test.ts and factory-studio-ui.test.tsx. |
| FAC-STU-002 | IMPLEMENTED locally; not deployed or seen live | `createStudioProject`, `POST projects` with `studio`, New brief dialog (`StudioNewBrief`). factory-studio-api.test.ts. |
| FAC-STU-003 | IMPLEMENTED locally; not deployed or seen live | `studioCompleteness`, `fieldRule`, `normaliseStudioBrief`, `StudioIntake`. factory-studio.test.ts and factory-studio-ui.test.tsx. Not checked visually in a browser. |
| FAC-STU-004 | IMPLEMENTED locally; not deployed or seen live | Upload and file routes in service.ts, studio-store.ts. API test checks type sniffing, limits, rights confirmation, document size, byte ranges and customer isolation. Firebase Storage path not exercised here. |
| FAC-STU-005 | IMPLEMENTED locally; not deployed or seen live | `approveStudioGate`, `reopenStudioGate`, `studio-commands.ts` role rules. factory-studio.test.ts. |
| FAC-STU-006 | IMPLEMENTED locally; not deployed or seen live | Piece operations in studio.ts; `PieceCard`. Pieces are created by producers by hand until pieces B and C add generators. |
| FAC-STU-007 | IMPLEMENTED locally; generators added by piece B (CHG-0098, FAC-STU-017) | Rerun requests and the `registerStudioRerun` hook; tested with a test generator. Real generation and its cost display are piece B. |
| FAC-STU-008 | IMPLEMENTED locally; not deployed or seen live | `bridgeStudioBrief`, `bridgeAtGate1`, studio branch in `planProject`, gate 1 guards. Stage 2 orchestration past the active gate is piece B. |
| FAC-STU-009 | IMPLEMENTED locally; not deployed or seen live | `StudioSidebar`, `StudioStagePage`, `GateBar`, `PieceCard`, portal.css. Server-render tests only; browser journeys not run. |
| FAC-STU-010 | IMPLEMENTED locally; not deployed or seen live | Account record `factory-brandkit-<account>`; saved at gate 1, copied at creation. API test. |
| FAC-STU-011 | IMPLEMENTED locally; not deployed or seen live | Audit entries in studio-commands.ts and the upload route; asserted in tests. |

## CHG-0098: Studio stages, piece B (20 November 2026)

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-STU-012 | IMPLEMENTED locally; not deployed or seen live | `studioCommandRefusal` and `studioStrategyClosed` (studio.ts), transition guard (engine.ts), route guards and `runResearchSegment` (service.ts), guards in runSynthesis, runAdvisory and runContent, studio guard in `planNext`, studio task plan without format or production tasks, formats fixed at the gate 1 bridge. factory-studio-strategy.test.ts and factory-studio-preproduction-api.test.ts. |
| FAC-STU-013 | IMPLEMENTED locally; not deployed or seen live | `thinResearchSegments` (producer-reviews.ts), warning in `evidenceWarnings` and run-tracker, `isThinResearchHold` ignored in planNext and syncTaskPlan and cleared on the next pass; the hold is no longer set. factory-studio-strategy.test.ts (legacy flow). No existing test asserted the old hold. |
| FAC-STU-014 | IMPLEMENTED locally; not checked in a browser | `StudioStrategy.tsx` reusing ResearchProgress, ReviewQueue, InsightEditor, CampaignPlan (new `fixedFormat` prop), Ideas and Direction; `studioDirectionFraming` in the strategy payload and `STUDIO_DIRECTION_RULE` for studio projects only. factory-studio-pages.test.tsx (server render) and factory-studio-strategy.test.ts. Quality of real model output with the framing not seen. |
| FAC-STU-015 | IMPLEMENTED locally; not deployed or seen live | `strategyGateBlockers` registered in studio-gates.ts; gate `gaps` recorded on approve with a note. factory-studio-strategy.test.ts. |
| FAC-STU-016 | IMPLEMENTED locally; no live model call made | studio-preproduction.ts (`preproductionContext`, `validateScenePack`, `validateHookPack`, `draftPreproduction`), slot `studio:preproduction`, default skill. Validators and the draft route tested with a stubbed provider only. |
| FAC-STU-017 | IMPLEMENTED locally; no live model call made | `createPreproductionPieces`, rerun handlers registered for moodboard, continuity, scene, script, narrative, hook, shotlist, voice_captions, test_frame and keyframe. API test reruns a text and an image piece with stubbed calls and checks stale marking. |
| FAC-STU-018 | IMPLEMENTED locally; no paid image call made | image-provider.ts (`openAiImageProvider`, `meteredImage`, `storeGeneratedImage`), `IMAGE_SLOT` resolution in ai-routing.ts, AI agents page group and system map band 10. Stubbed fetch tests: success, 429 retry, 5xx retries, error message with redaction, non-image bytes, edits endpoint for references, ledger rows. The edits (reference image) path has never been called against the real API. |
| FAC-STU-019 | IMPLEMENTED locally; not checked in a browser | Portal `draftPreproduction` and `drawImages` (client loop, one POST per image), `StudioPreproduction` buttons and error states. Server render tests only. |
| FAC-STU-020 | IMPLEMENTED locally; not deployed or seen live | `preproductionGateBlockers`, `setStudioReadyForClient`, `studioStageVisibleToClient` used in projectView, gate and piece commands and (through the view) the file route. factory-studio-preproduction-api.test.ts and factory-studio.test.ts. |
| FAC-STU-021 | IMPLEMENTED locally; not checked in a browser | `StudioPreproduction.tsx`, `StudioStagePage` `hidePieces`, GateBar share button, portal.css. factory-studio-pages.test.tsx (server render). |

## CHG-0099: Studio stages, piece C (20 November 2026)

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-STU-022 | IMPLEMENTED locally; not deployed or seen live | `planProduction`, `planLoops`, `applyProductionPlan` (studio-production.ts), commands `prepareStudioProduction`, `setStudioLoops`, `removeStudioPiece`, route `POST .../studio/production` (`prepare`, `loops`). factory-studio-production.test.ts (counts, quantity cap, skipped scenes, dependsOn) and factory-studio-production-api.test.ts. |
| FAC-STU-023 | IMPLEMENTED locally; no paid image call made | `generateStudioStill` and the `still` rerun generator (studio-production-run.ts), `buildStillPrompt`, `stillReferences`, `cropPngToRatio`; Portal `drawStills` (one request per still, Stop button). Stubbed fetch only: the edits endpoint with the test frame and packshot, 2:3 drawn and stored cropped to 4:5. The real OpenAI edits endpoint has never been called. |
| FAC-STU-024 | IMPLEMENTED locally; no video tool connected | `variantPromptPack`, `promptPackMarkdown`, `loopPrompt`, prompt pack and loop prompt downloads, upload slot with required AI disclosure and optional rights, `VideoProvider` interface with no provider (video-provider.ts). API and server-render tests. |
| FAC-STU-025 | IMPLEMENTED locally; best-effort MP4 reader | `mediaInfo` (studio-media.ts) for PNG, JPEG, WebP, MP4 and MOV (tkhd size, quarter-turn rotation, mvhd length); sizes stored on upload and generation. Tested on PNG, JPEG, WebP and minimal MP4 fixtures built in code, not on real phone or editor exports. |
| FAC-STU-026 | IMPLEMENTED locally; not deployed or seen live | `StudioGtm` (model.ts), `gtmChecks`, `claimFlags`, confirmation fingerprints (studio-gtm.ts), commands `confirmStudioGtm`, `addStudioRights`, `removeStudioRights`, `setStudioAssetRights`, `clearStudioClaimFlag`. factory-studio-production.test.ts. The claim word list and disclosure lines are a first cut, not legal advice. |
| FAC-STU-027 | IMPLEMENTED locally; not deployed or seen live | `specRule`, `specCheck`, `confirmStudioPieceCheck` (specs, safe zones, product accuracy). Safe-zone margins deliberately not coded; no AI vision check. |
| FAC-STU-028 | IMPLEMENTED locally; not checked in a browser | `fileBase`, `testMatrixCsv`, `deliveryManifest`, `manifestMarkdown`, `handoffMarkdown`, `studioDeliveryDocument` and `GET .../studio/delivery/:file`. No ZIP: per-file downloads plus the manifest. |
| FAC-STU-029 | IMPLEMENTED locally; not deployed or seen live | `productionGateBlockers` registered for the production gate, `studio_delivered` audit, `DeliveredView`, sidebar Delivered links, customer visibility of `gtm`. Domain, API and server-render tests. |
| FAC-STU-030 | IMPLEMENTED locally; not deployed or seen live | Optional `variant`, `views3s`, `thruplays`, `purchases` in performance.ts and PerformancePanel; `readback`, `readbackTemplateCsv`. Legacy rows unchanged (tested). No advertising platform is connected. |
| FAC-STU-031 | IMPLEMENTED locally; not deployed or seen live | `startNextCycle` (studio-production-run.ts), route action `nextCycle`, `setStudioWinner`. API test. |
| FAC-STU-032 | IMPLEMENTED locally; not deployed or seen live | `StudioRerunError` and `run` on rerun output (studio-rerun.ts), runs stored by `runStudioRerun` (service.ts) for text, image and still reruns; `resetProject` refused on studio projects (engine.ts). API and domain tests. |

## CHG-0100: Agent rerun (20 November 2026)

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-RRN-001 | IMPLEMENTED locally; not deployed or seen live | `classifyFailure`, `failureStatus`, `FAILURE_INFO` (failure-class.ts); quota rule first in error-help.ts. factory-agent-rerun.test.ts covers the exact Gemini quota text, OpenAI insufficient_quota, 402, Anthropic credit, rate limits, auth, model, timeout, 5xx, invalid output and other. |
| FAC-RRN-002 | IMPLEMENTED locally; not deployed or seen live | `failedAgents` (failed-agents.ts, client-safe), `GET .../agents/failed`, `failed` in `GET admin/ai-agents?projectId=`; Portal computes it from the producer's project view. Unit test: latest-run semantics, stale input and excluded agents ignored, supersession, guards, order. |
| FAC-RRN-003 | IMPLEMENTED locally; not deployed or seen live | `rerunAgent` (agent-rerun.ts), route in service.ts, `runReviewStep` and `producerAgentBusy` (producer-agent.ts). factory-agent-rerun-api.test.ts: research, scoping, insights, planner, studio draft and image reruns; customer, confirm, unknown, not failed, exclusion, running, consent and studio stage refusals; audit entries. |
| FAC-RRN-004 | IMPLEMENTED locally; not deployed or seen live | `setSlotRoute`, `saveRouting` note (ai-routing.ts). API test: producer refused (403), web-search, model ID and missing-key rules refused with no call, admin switch recorded in routing history and the audit. |
| FAC-RRN-005 | IMPLEMENTED locally; not deployed or seen live | `kickProducerAgent` after a successful rerun (service.ts); syncTaskPlan already lets a newer completed run supersede a failed one (verified, no change needed). API test: task done after rerun and an automatic producer pass that reaches the next review step. |
| FAC-RRN-006 | IMPLEMENTED locally; not deployed or seen live | `rerunFailedAgents` (agent-rerun.ts), `RERUN_ORDER`. API test: scoping then insights, stops at the insights failure and reports it. |
| FAC-RRN-007 | IMPLEMENTED locally; not deployed or seen live | SystemMap.tsx (`failed`, `onRerun`, `onRerunAll`), RerunDialog.tsx, AiAgents.tsx. Server renders in factory-agent-rerun-ui.test.tsx; not checked in a browser. |
| FAC-RRN-008 | IMPLEMENTED locally; not deployed or seen live | `providerQuota` (failed-agents.ts), `quota` in agentsOverview, `moveProviderSlots` and `admin/ai-routing` action `move`, `QuotaBanners`. API and render tests; not checked in a browser. |
| FAC-RRN-009 | IMPLEMENTED locally; not deployed or seen live | RunTracker.tsx (row Rerun and Your turn banner), TaskPlan.tsx, `FailedAgentsBar` on studio stage pages (Portal.tsx). Server renders; not checked in a browser. |
| FAC-RRN-010 | IMPLEMENTED locally; not deployed or seen live | `pieceId` and `rerunRequestId` on ResearchRun (model.ts), set in studio-preproduction.ts and studio-production-run.ts. API test reruns a failed first draft and a failed test frame. |

## CHG-0103 and CHG-0104: Video workspace, producer and admin only (25 November 2026)

CHG-0103 was documentation only (design spec, ADR-0004, PRODUCT-023, PRD section 30). CHG-0104 builds the new shell and the Customer account on branch feat/video-workspace-customer-account. Nothing is committed, merged, deployed or seen live. Intent is PROPOSED until the owner signs off docs/superpowers/specs/2026-11-25-video-workspace-design.md. Note that the older sections above for ARCHITECTURE, DATA_MODEL and TESTING stop at CHG-0084 and need catching up.

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-VWS-001 | IN PROGRESS (partial); built locally, not deployed or seen live | The new workspace and every customer route accept producers and admins only: `handleCustomers` refuses customers and the demo with 403 and `isStaff` (Workspace.tsx) turns them away. factory-customers-api.test.ts and factory-customers-ui.test.tsx. The customer role itself still exists in identity.ts and the old portal until the separate removal change. |
| FAC-VWS-002 | IMPLEMENTED locally; not deployed or seen live | `/workspace` (src/app/workspace, Workspace.tsx): Overview and Projects placeholders, Customer account, and an admin link for owner admins. A server render test asserts exactly three entries and none of the old tabs. The old portal at /portal is untouched. Not checked in a real browser. |
| FAC-VWS-003 | NOT STARTED; owner-directed, spec awaiting sign-off | No offer exists in the new workspace yet; it arrives with project inputs. |
| FAC-VWS-004 | IN PROGRESS (partial); built locally, not deployed or seen live | `CustomerAccount` (model.ts), customers-commands.ts, system workspace `factory-customers`: name, website, flat list, unique names, 200 account limit. The link from a project to its account is not built because projects are not specified yet. |
| FAC-VWS-005 | IMPLEMENTED locally; not deployed or seen live | customers.ts (`socialUrl`, `findSocialLinks`), site-links.ts (`isPublicAddress`, `fetchPublicPage`, `findSocialsOnWebsite`), route action find-socials, CustomerEditor. factory-customers.test.ts, factory-customers-site.test.ts (private ranges, redirects, mutation-checked), the API test and a scratch jsdom run of the interactions. Not tried against a real website or real DNS. |
| FAC-VWS-006 | IMPLEMENTED locally; not deployed or seen live | `sniffPurpose`, customer-store.ts, upload and download routes, `setPurposeAuthorisation`, `authorisedPurposeFiles`. Tests cover rights, real type, 25 MB, five files, private storage, headers and authorisation. No model reads these files yet, so authorisation is recorded and the single accessor enforces it. Firebase Storage path not run. |
| FAC-VWS-007 | IMPLEMENTED locally; not deployed or seen live | `RedLine` entries with category, text and reason; add, edit and remove audited; 100 limit. Covered by factory-customers.test.ts, the API test, the UI test and the jsdom run. No later step reads red lines yet. |
| FAC-VWS-008 | NOT STARTED; owner-directed, spec awaiting sign-off | Design only. Gates record `onBehalfOfClient` today. |
| FAC-VWS-009 | NOT STARTED; owner-directed, spec awaiting sign-off | Design only. No data has been exported or deleted. |
| FAC-VWS-010 | IMPLEMENTED locally; not deployed or seen live | `brandTextFields`, `authorisedBrandText` (customers.ts), `saveBrandText`, `setTextAuthorisation` (customers-commands.ts), route actions brand-text and brand-text-authorise, BrandText panel in CustomerEditor. Unit, API and render tests; no model reads the text yet. Not checked in a browser. |

## CHG-0106: Commission project and Inspiration baseline (25 November 2026)

Documentation only: design spec and PRD 1.35.0 section 31. No code. Intent PROPOSED until the owner signs off the spec.

| Requirement | State | Evidence / remaining limit |
|---|---|---|
| FAC-VWS-011 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Commission record. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-012 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Four guided primary inputs. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-013 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Brand expression lists and guardrail. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-014 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Evidence per input. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-015 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Secondary checks locked. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-016 | IMPLEMENTED LOCALLY (CHG-0107); uncommitted, no browser check | Inspiration baseline view. Evidence: tests/factory-commissions.test.ts, factory-commissions-api.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-017 | IMPLEMENTED LOCALLY (CHG-0108); stub-provider tests only, never run against a real provider, uncommitted | Submit and run. Evidence: tests/factory-brand-intel.test.ts and factory-brand-intel-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-018 | IMPLEMENTED LOCALLY (CHG-0108, section 7 added in CHG-0109); stub-provider tests only, never run against a real provider, uncommitted | Dossier content. Evidence: tests/factory-brand-intel.test.ts and factory-brand-intel-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-019 | IMPLEMENTED LOCALLY (CHG-0108); stub-provider tests only, never run against a real provider, uncommitted | Stored foundation. Evidence: tests/factory-brand-intel.test.ts and factory-brand-intel-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-020 | IMPLEMENTED LOCALLY (CHG-0109); no browser check, uncommitted | Customer account layout. Evidence: factory-customers-ui, factory-brand-intel-ui; tsc, lint and build pass. |
| FAC-VWS-021 | IMPLEMENTED LOCALLY (CHG-0110); stub-provider tests only, never run against a real provider, uncommitted | Generate from AI, intended audience. Evidence: tests/factory-audience-agent.test.ts, factory-commissions-ui.test.tsx; tsc, lint and build pass. |
| FAC-VWS-022 | IMPLEMENTED LOCALLY (CHG-0111); stub-provider tests only, uncommitted | Audience by age group. Evidence: factory-commissions, factory-commissions-api, factory-audience-agent, factory-commissions-ui; tsc, lint and build pass. |
| FAC-VWS-023 | IMPLEMENTED LOCALLY (CHG-0112); no browser check, uncommitted | Project inputs layout and flow. Evidence: factory-commissions, factory-commissions-ui; tsc, lint and build pass. |
| FAC-VWS-024 | IMPLEMENTED LOCALLY (CHG-0113); stub-provider tests only, uncommitted | Generate from AI, objective and product. Evidence: factory-commission-agents; tsc, lint and build pass. |
| FAC-VWS-025 | IMPLEMENTED LOCALLY (CHG-0113); stub-provider tests only, uncommitted | AI agent box. Evidence: factory-commission-agents, factory-agent-ui. |
| FAC-VWS-031 | IMPLEMENTED LOCALLY (CHG-0114); stub-provider tests only, uncommitted | Generate from AI, brand expression. Evidence: factory-commission-agents, factory-agent-ui; tsc, lint and build pass. |
| FAC-VWS-026 | IMPLEMENTED LOCALLY (CHG-0115); stub-provider tests only, uncommitted | Video steps entry. Evidence: factory-video-steps, factory-video-steps-ui; tsc, lint and build pass. Text only: no images, no ShotDeck pull, no video rendered. |
| FAC-VWS-027 | IMPLEMENTED LOCALLY (CHG-0115); stub-provider tests only, uncommitted | References. Evidence: factory-video-steps, factory-video-steps-ui; tsc, lint and build pass. Text only: no images, no ShotDeck pull, no video rendered. |
| FAC-VWS-028 | IMPLEMENTED LOCALLY (CHG-0115); stub-provider tests only, uncommitted | Scripting. Evidence: factory-video-steps, factory-video-steps-ui; tsc, lint and build pass. Text only: no images, no ShotDeck pull, no video rendered. |
| FAC-VWS-029 | IMPLEMENTED LOCALLY (CHG-0115, CHG-0116); stub-provider tests only, uncommitted | Characters, locations and props. Evidence: factory-video-steps, factory-video-steps-ui; tsc, lint and build pass. Text only: no images, no ShotDeck pull, no video rendered.  Image library: factory-video-images, factory-video-images-ui. |
| FAC-VWS-030 | IMPLEMENTED LOCALLY (CHG-0115); stub-provider tests only, uncommitted | Video generation prompts. Evidence: factory-video-steps, factory-video-steps-ui; tsc, lint and build pass. Text only: no images, no ShotDeck pull, no video rendered. |


## CHG-0117 — Workspace UX and classified image library (25 November 2026)
Owner requested image titles, categories and UX polish. FAC-VWS-029. PRD impact: 1.45.0. Image upload metadata queue, category filtering, title-derived unique @name, optional legacy fields, responsive review and illustrated agent control. Physical storage keys remain stable. Existing prompts are not rewritten on rename. Tests extended; execution pending GitHub CI. Reference screenshot unavailable; no production deployment or live browser verification claimed.


## CHG-0118 — API-listed workspace agents and classified prompt context
FAC-VWS-025, FAC-VWS-030. PRD impact: 1.45.0 clarification. Workspace model selector and route API reject unlisted IDs; current unavailable route stays visible as status, not an option. Provider listing is cached up to ten minutes and is not proof of successful generation. Agent settings refresh on opening. Prompt context includes asset titles/categories where present, not image bytes. Tests extended; pending CI. Legacy administrative routing editor remains unchanged.


## CHG-0119 — Reference-style asset browser
FAC-VWS-029. PRD impact: none, visual refinement of existing acceptance criteria. Owner supplied a style reference after initial implementation. Asset grid, upload drop zone, category navigation and selected-image inspector replace the horizontal-only carousel. Responsive stacking on narrower screens. Existing private storage and prompt references preserved. Automated render assertions adjusted; CI and visual acceptance pending.


## CHG-0120 — PR #85 whitespace correction (26 November 2026)
FAC-VWS-029. PRD impact: none; formatting only. Factory MVP workflow 45714098190 passed for 4d0b6ff; documentation structural checks passed but git diff --check failed on two whitespace-only lines in ImageLibrary.tsx. Removed trailing whitespace. Fresh CI pending; dedicated visual acceptance remains outstanding.


## CHG-0121 — Narrative-first scripting (26 November 2026)
Owner approved FAC-VWS-028 and FAC-VWS-030 changes; PRD impact: 1.46.0. Preserve raw creative brief and approved narrative separately; generation drafts are not approved automatically. Shot planning belongs to Video generation; legacy timed scripts remain compatible. Existing model routing, metering, access gates and red lines remain. Implementation on feat/narrative-first-scripting; tests and UI integration pending. No deployment or paid calls.


CHG-0121 UI integration: narrative editor, revision, manual approval and downstream shot display; unit assertions added; CI pending. Existing timed scripts remain stored until an explicit new narrative save. No deployment.
