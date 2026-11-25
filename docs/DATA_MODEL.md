# Data model

Status: NOT_VERIFIED — 2026-11-11.

Existing Firebase files and src/lib/services/firebase-db.ts need a source-backed audit. Factory schema in PRD section 9 is proposed; no migrations or tenant-isolation acceptance evidence exists.

## CHG-0004 actual MVP records
Workspace snapshot schemaVersion 1: `projects[]` and hashed `invitations[]`. A project owns `brief`, `sources`, `insights`, `strategies`, `tasks`, `assets`, `capabilities`, `runs`, `audit`, revision and idempotency keys. Explicit limits: 700KB/workspace, 20 projects, 150 sources/project, 80 insights, 50 direction versions and 30 capability proposals. Source links are project-local; strategy hashes include insight/source IDs and all creative fields. Asset content/hash are immutable; a new direction creates new tasks/assets rather than mutating old content. Customer approvals store actor/time/hash. Delivery rejects superseded direction dependencies.

Local files: private `.factory-data/<workspace>.json`; demo uses a separate `PORT67_DEMO_DATA_DIR/demo-<uuid>.json` (default: OS temporary directory / port67-factory-demo). Atomic rename and serialized same-process writes prevent partial updates; revision checks prevent stale edits. Dedicated Firebase adapter uses `factory_workspaces_v1/<workspace>` server-only snapshots with transactions. No root legacy rules or indexes were changed, no migration deployed. Split to project/artifact collections before scaling; evaluate database edition/region and client-deny rules with actual authenticated access first.

CHG-0008 optional fields: Project.aiConsent binds PUBLIC authorisation to brief hash; aiAuthorised is a derived producer projection. Insight status gates generated drafts; strategies retain generatedByRunId. ResearchRun records stage, inputHash, source IDs and capability version. Existing undefined insight status is treated as reviewed. No destructive snapshot migration.

CHG-0009: Principal adds verified Firebase identity/accountId/admin/issuedAt; Account directory stores ownerUid/contact privately. Project adds accountId/createdBy; all research/build/assets components have accountId/projectId. New Firestore account metadata indexes project documents; component arrays remain bounded. System ledger holds per-invocation units/pricing/request IDs and archive references, never prompts/keys. See detailed paths and bounds in ACCOUNTS_PROVIDERS_COSTS.md.


CHG-0062: Segment adds adjacent/trends/video. Source.videoAnalysis optionally stores bounded native-video observations (basis, sampledFps=2, maxAnalysedSeconds=120, duration, nine craft/limitation strings and at most six timecodes). ResearchRun.contextBundle stores the frozen public research inputs; contextHash/inputHash cover those inputs and skill v2. Old records remain readable; old direction hashes are not rewritten. Advert treatment optionally carries creativeDirection from the approved strategy and includes it in its existing plan hash. No raw video/transcript storage or generic client-context collections added.


## CHG-0082 task plans

Optional `Project.taskPlan` is stored inside the existing project record. No destructive migration occurs. It includes monotonic version, timestamps/actor/reason, exact public-input freshness key, selected research/overrides, campaign or research-only mode, clarifications and tasks. Each task has stable ID, capability, dependencies, state, selection reason, acceptance criteria, run IDs and blocker detail. Manual producer-only tasks may hold completion actor/time/note. Plan history retains the last ten superseded version summaries and completed-task IDs; run/cost/audit records remain separate authoritative history.

`Brief.workRequest` and `Brief.requestedFormats` capture customer intent; producer-approved `formats` remains the production gate. New paid runs carry `taskInputKey` when planned. These keys contain public input context and are freshness metadata, never authority. A changed brief or channel invalidates automatic reuse of old sources/insights without removing them or paid usage. Customer projections remove `taskPlan` and expose only `taskProgress` entries `{id,title,status}`. Plans use the existing account/project repository and storage limits. Workspace size limits and FAC-STO-002 remain in force.


## CHG-0083 planning records

Optional `Project.researchPlanning` stores enabled/status, input key, proposal version, validated role decisions, medium hypotheses, unknowns/gaps, run/provider/model and ten prior summaries. `mediumSelection` separately stores status/version, evidence key, cited recommendations, uncertainty and prior summaries. `mediumDecision` stores confirmed formats, unchanged requested formats, actor/time/rationale and the recommendation version used. `mediumContextHash` is an operator-only computed optimistic token; it is never customer authority. Customer projections strip all four records and retain the existing safe task-progress view.

`ResearchRun.planningContextKey` pins planning/evidence context; `researchTaskKey` pins per-researcher questions/methods/source scope. `ResearchScope.planningVersion/planningKey` prevent stale or redundant scope regeneration. Task records expose assigned questions/methods and scope identity. Rejected late output retains run usage. New planned scope changes invalidate only affected researcher results and dependent insights. Existing project/workspace size limits and FAC-STO-002 remain unchanged; no destructive migration or cross-account history store is introduced.

## Campaign observations (CHG-0084)
Project.performance holds at most 100 immutable observations: campaign/channel/format, objective/audience/offer, ISO period, report provenance/attribution/currency, optional nonnegative counts/spend/revenue, PUBLIC authorisation and pending/accepted/rejected review lineage. CSV is limited to 25,000 characters and 30 rows. Counts must be safe whole numbers. Missing denominators produce null derived ratios. Only accepted authorised last 30 records enter model context; no currency aggregation. ResearchProposal.performanceIds and medium recommendation performanceIds reference available records. Medium observed_performance citations must match channel and format. Performance is removed from customer projections.

Freshness keys use a compact browser-safe observation fingerprint; actual provider payloads are independently SHA-256 hashed by the server. After direction work begins, only performance changes are ignored by the existing direction’s planning gates; brief and source/insight freshness is still checked. New reports inform explicitly carried future-campaign history.


## Customer accounts (CHG-0104)
`Database.customers` is used only in the system workspace `factory-customers` (Firestore collection factory_system_v1, or a local file of that name). `CustomerAccount`: id `cust_` plus 32 hex characters, name, website (public https), `socials` (X, Instagram, Facebook, TikTok, YouTube, LinkedIn, Pinterest, each on the platform's own domain), `redLines` (id, category topic, competitor, person_or_brand, phrase or visual, text up to 300, optional reason up to 500), `brandPurpose` (file references with name, real type, size, storage key, uploader, rights confirmation and optional `modelAuthorisation`), created and updated attribution, and the latest 100 audit entries. Limits: 200 accounts, 100 red lines, five files of at most 25 MB. Files are stored outside the record under `customers/<account>/<file>.<ext>`. The only way later steps should obtain file content for a model is `authorisedPurposeFiles`. Accounts are never deleted by any command; the reset is a separate confirmed step (FAC-VWS-009).

## Projects, evidence and lists (CHG-0107)
One workspace per customer account, `factory-commissions-<customerId>`, holding `commissions`. A Commission has answers per input, `preserve` and `change` lists, `wentTooFar`, `evidence`, `confirmed` (objective, audience) and a capped audit. Limits: 50 projects per account, 30 evidence items per input, 30 entries per list, 2000-character answers, 500-character list entries.

## Brand Intelligence versions (CHG-0108)
Workspace `factory-brandintel-<customerId>` holds `brandIntel`: versions with status, sections 0 to 6, the client red lines copied verbatim at run time, what the agent was given (intake), sources, search queries, warnings, call count and error. The newest 4 versions are kept, plus the current one. Each section is capped at 30,000 characters. Ledger rows use the customer id as account and project id and the version id as run id.

## Audience by age group (CHG-0111)
A Commission has optional `audience` (per age group: answers, savedAt, savedBy, ai) and `directionGenerations` (selected, saved groups, in age order). Groups: gen_x 46–61, gen_y 30–45, gen_z 14–29, gen_alpha 2–13. `answers.audience` is the legacy single set.

## Project input agents (CHG-0113)
A Commission has optional `brief` (product, market, timing) and `aiNotes` (per input 1 and 3: sections, sources, model, when). Workspace `factory-agent-prompts` holds `agentPrompts` per AI job: current version and up to 20 earlier versions (body, version, by, at).

## Brand expression agent (CHG-0114)
`brief` also holds `productUrl`, `subBrand` and `format`. `aiNotes.brand` holds the sources and confidence paragraph and links. Brand answers `recognisable` and `recurring` allow up to 12,000 characters.
