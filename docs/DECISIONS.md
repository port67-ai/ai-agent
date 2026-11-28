# Decisions and discrepancies

| ID | Status | Decision / outstanding issue |
|---|---|---|
| GOV-001 | Authorised by owner, 2026-11-11 | Store shared project memory in port67-ai/ai-agent and commit it. |
| GOV-002 | Working convention | docs/CHANGELOG.md is the ongoing change ledger; PRD section 26 retains imported history. See GOVERNANCE.md. |
| OPEN-001 | Unresolved | Existing repository serves appointment booking; confirm whether to adapt it or keep Factory as a separate app/package before changing product code. |
| OPEN-002 | Unresolved | Exact Synapse repository, rights and reuse claims require a source-backed audit; no canonical source has been established. |
| OPEN-003 | Pending owner review | Supplied Factory PRD 1.0.0 remains proposed; imported LOCKED labels are source claims, not approval supplied by this commit. |

Material technical decisions use docs/adr/ADR-NNNN-title.md with status, date, context, alternatives, decision, consequences, requirement/change IDs and approval evidence. No architecture ADR is approved by this bootstrap.

## PRODUCT-001 — 2026-11-12 — Owner-confirmed EXPLAIN expansion
Customer supplies a minimal brief; Port67 manages segmented research, recommends messaging/design with detailed evidence-based reasoning, obtains customer direction approval and manages production/final asset approval. Supports B2B/B2C/mixed audiences. New needs can trigger proposed specialist agents/skills, with reviewed promotion rather than autonomous production permissions. See PRD 1.1.0 section 10.6 and CHG-0003. This decision does not approve the remaining baseline architecture or revise the other commercial guardrails.

## PRODUCT-002 — 2026-11-12 — Autonomous MVP execution
Owner explicitly requested building now without further questions/approvals, including GitHub/Firebase setup where accessible. Implement a standalone managed-service slice in this repository without Synapse reuse. Agent-selected implementation choices: retain Next.js; isolate /portal; use bounded local persistence until a dedicated cloud account is available; provide explicit demo/manual/provider boundaries; deliver SVG/HTML/copy concepts rather than claim finished rendered video. See adr/ADR-0001-bounded-creative-mvp.md and CHG-0004. These choices do not approve all outstanding platform architecture.

PRODUCT-003 — 2026-11-12: continue the owner-authorised MVP on Render with explicit launch readiness and reviewed, bounded AI drafting. No cloud activation without working credentials/connection tests. See adr/ADR-0002-live-foundation.md and CHG-0007/0008.

PRODUCT-004 — 2026-11-12: owner explicitly requests individual user accounts and common account IDs across research/build/assets, four API providers and owner-only cost tracking as part of items1–4 implementation. Retain Render, Firebase project ai-agency-3671b, server-derived ownership, explicit provider routing and pre-dispatch private ledger. Live provisioning awaits authenticated access. See ADR-0003 and CHG-0009.


## PRODUCT-005 — 2026-11-16 — Owner-authorised task-based MVP evolution

Owner requests customer-input-driven agent selection, persistent task management and project-style progress while retaining existing controls. CHG-0082 implements an embedded deterministic coordinator using the current stack and runners, rather than introducing a workflow framework or paid planner. New intake plans the requested journey; legacy projects explicitly opt in. Producer overrides are audited/version-checked. Existing post-direction scope locks stay; finished unsupported deliverables remain producer work. Cloud Tasks, a separate service and external-agent adapters are not implicitly approved or claimed implemented. Design and plan: `docs/superpowers/specs/2026-11-16-customer-task-planning-design.md` and corresponding implementation plan.


## PRODUCT-006 — 2026-11-16 — Owner-authorised AI planning and live delivery

Owner requests AI planning → stronger research methods → evidence-backed medium selection → selective catalogue expansion, authorising execution/deployment without pauses while away. Implement the hybrid within the existing task manager: validated LLM proposals, fixed policy and approval dependencies, metered calls and producer decisions. Runtime approval remains separate from development approval. Preserve the requested medium and require evidence/rationale before producing alternatives. Expand capabilities through reviewed gap proposals, not automatic registration. General channel knowledge is labelled as a prior; no campaign performance or private connectors are invented. See CHG-0083 and the 2026-11-16 AI research/medium design and plan.

## PRODUCT-021 — 16 November 2026 — Specialist research and supplied-report feedback
Owner explicitly requested autonomous implementation of channel/audience, product/offer, measurement research and performance feedback while away. Retain existing stack/gates; extend fixed catalogue to ten roles while preserving legacy seven-role execution. Use producer-entered/CSV observations and deliberate same-account project carry because no advertising-account credentials are available. Each carry is reviewed anew; no business-name joins, automatic cross-client memory, retraining or causal-performance claims. Direct platform adapters remain future integrations. Agent-selected first-release choice within the authorised scope. See FAC-PLN-007, FAC-FBK-001..003 and CHG-0084.

PRODUCT-022 — 2026-11-19 — Owner instruction: no spend or run caps, approvals only. Spend limits are off by default (PORT67_SPEND_LIMITS=on restores them); run, planning, reviewer and pass limits are raised to about 1000. Human approval gates and the skip-when-nothing-changed rule stay as the loop control. Consumption stays visible on the Private API costs page. See CHG-0095 and CHG-0096.

## PRODUCT-023: 25 November 2026: Video workspace, producer and admin only
Owner instruction: rebuild the creative workspace for producers and admins only, video first, starting from a minimal sidebar (Overview, Customer account, Projects) and adding workflow pieces back one at a time. Decisions D1 to D9 in docs/superpowers/specs/2026-11-25-video-workspace-design.md: new shell with old code parked; customer role removed entirely; non-video features hidden not deleted; social links manual plus a free Find from website; brand purpose stored privately and model-read only on producer authorisation; red lines as a structured list; the company is the brand (flat list); existing customer accounts removed for a clean start, as a separate exported-and-confirmed step; business side before project inputs, Overview later. See ADR-0004, PRD 1.34.0 section 30 and CHG-0103. Intent PROPOSED until the owner signs off the spec; nothing implemented.


Implementation choices for CHG-0104 (agent-selected, inside PRODUCT-023): the new workspace is the route `/workspace` and the old `/portal` is untouched until the customer role is removed; customer accounts live in one system document `factory-customers` with limits of 200 accounts, 100 red lines, five brand purpose files and 100 history entries each; a second account with the same name (any letter case) is refused; Find from website reads only the saved website and saves nothing; brand purpose files other than images are always served as downloads.

## PRODUCT-024: 25 November 2026: Commission project and Inspiration baseline
Owner instruction: each commission belongs to a customer account and starts with an Inspiration baseline built from four primary inputs (numbered 1, 3, 4, 5) and their evidence, with three secondary checks shown greyed out. First step captures inputs and evidence and shows the baseline with no AI call. Brand expression uses Preserve and Can change lists plus the client example that went too far. See the spec and PRD section 31. Intent PROPOSED until sign-off; nothing implemented.

Addendum to PRODUCT-024 (25 November 2026): sidebar label stays "Projects" and a project may start with only a name. Built as CHG-0107 with limits of 50 projects, 30 evidence items per input and 30 entries per list.

## PRODUCT-025: 25 November 2026: Brand Intelligence foundation
Owner instruction: run a Brand Intelligence agent from the customer account on a submit button and store its dossier as the foundation for later agents. Decisions: versioned re-runs, three searching calls plus one synthesis call, typed brand text only (and only if authorised), client red lines copied verbatim and never model written, failed runs never become the foundation.

Addendum to PRODUCT-025 (25 November 2026): researched red lines are a separate section (7), labelled as inferred and not client-confirmed, and never merged into the client's verbatim red lines.

## PRODUCT-026: 25 November 2026: AI drafts are never saved automatically
Owner supplied the Intended Audience agent prompt. Decision: Generate from AI returns a draft that only fills the form; a producer must press Save answers. The agent reads the Brand Intelligence dossier as its account research and refuses without one.

## PRODUCT-027: 25 November 2026: Audience is answered per age group
Owner definitions: Gen X 46-61, Gen Y 30-45, Gen Z / Zoomers 14-29, Gen Alpha 2-13. Same five answers per group with different content. A producer must select at least one saved group to go to direction; others can be added later for new workflows. Content for groups including under 18s must be age-appropriate, with parents or guardians as buyers.

## PRODUCT-028: 25 November 2026: Evidence and the change list are parked
Owner direction: keep the project flow clear. Evidence per input and the Can change or out of character list stay in the product but are greyed out and outside the flow until needed. They are switched off by two constants, not removed.

## PRODUCT-029: 25 November 2026: Input agent model and prompt are shared, editable by producers
Owner chose one model and prompt per input agent, shared by every project and editable by any producer or admin, with versions and a reset. The output rules, client red lines and age-appropriateness rules are fixed text outside the editable prompt.

## PRODUCT-030: 25 November 2026: Video steps
Owner described four sections after Projects: references, scripting, characters, locations and props, and video generation prompts. Design recorded; build waits for sign-off and answers to five questions.

Addendum to PRODUCT-029 (25 November 2026): Input 5 gets the same managed agent. Its two answers are long prose, so they allow 12,000 characters while all other answers stay at 2,000.

Addendum to PRODUCT-030 (25 November 2026): built as CHG-0115 with defaults, because the five design questions were not answered. References are producer-added text metadata (no image vision, no ShotDeck integration). Scripts use 15, 30 and 60 second templates with AI draft and revise. Sheets are written descriptions only. Video generation produces prompts to copy for Seedance (version unconfirmed); no video is rendered. Plans exist per project and per age group selected for direction. Any of these can be changed by the owner.

## PRODUCT-031: 25 November 2026: Project image library and @names
Images for video prompts live in a per-project library on the Characters, locations and props page. Each image has a unique name per project and prompts refer to it as @name. Library is per project, not per age group. PNG, JPEG and WebP only (no SVG), 8 MB each, 60 per project. The AI receives names and descriptions as text and may only use listed names; invented names are stripped. Owner can change the limits.


## CHG-0121 — Narrative-first scripting (26 November 2026)
Owner approved FAC-VWS-028 and FAC-VWS-030 changes; PRD impact: 1.46.0. Preserve raw creative brief and approved narrative separately; generation drafts are not approved automatically. Shot planning belongs to Video generation; legacy timed scripts remain compatible. Existing model routing, metering, access gates and red lines remain. Implementation on feat/narrative-first-scripting; tests and UI integration pending. No deployment or paid calls.


## CHG-0122 — Three-stage video generation pipeline (26 November 2026)
FAC-VWS-030 and FAC-VWS-025. PRD impact: 1.47.0. Owner supplied project information, director beat and technical prompt templates. Three separately metered/configurable agents; editable output and explicit approval gates; producer duration/aspect ratio; multiple selected image IDs resolved server-side. Industry-neutral prompts. Legacy prompts retained. Target label Seedance 2.5 supplied by owner, model/API capability not verified; copy-only output and image metadata, no media upload to external tool. Branch feat/video-prompt-pipeline. Implementation/CI pending.


## CHG-0124 — Curated model selection and video target skills (26 November 2026)
FAC-VWS-025, FAC-VWS-030; PRD impact 1.48.0. Owner approved compact model families, separate target radio controls, versioned adapted GenHQ skill profiles. Source files supplied: seedance-25 multishot and magi-2-video-prompting Lite. MAGI-3 compatibility unverified; prompt-only. Selected asset mapping, skill provenance and regeneration gates; existing routes unchanged. Workspace managed agent selectors only; legacy administrative free-text routing and image renderer unchanged. CI pending; no live calls or deployment. Branch feat/curated-models-video-skills.


## CHG-0126 — Project workflow overview canvas (26 November 2026)
FAC-VWS-001/002/026/030. PRD impact 1.49.0. Owner requested node canvas and telemetry. Derived from saved customer/project/cohort plans, asset catalogue and archived+active ledger. Preserve owner-only amounts, unknown cost counts and shared-vs-project attribution. Run uses existing gated routes; input/review steps open editor, no automatic approvals. No external rendering. Branch feat/workflow-overview-canvas; UI/tests pending; no deployment.


## CHG-0128 — Hierarchical overview (27 November 2026)
FAC-VWS-001/002. PRD impact 1.50.0. Owner requested larger parent nodes, smaller children below, collapse/expand, status connectors. Preserve existing telemetry and access. Native canvas. CI pending; no deployment. Branch feat/overview-hierarchy.


## CHG-0129 — Project style reference (27 November 2026)
FAC-VWS-026/030. PRD impact 1.51.0. ShotDeck screenshot via existing project assets, editable metadata and recreation prompt, explicit save, metered multimodal extraction using References route, style context and pipeline invalidation. One active baseline per project; no Artlist integration. Branch feat/project-style-reference. CI pending; no deployment/live AI.


## CHG-0130 — Character and reference sheet generator (27 November 2026)
FAC-VWS-025/029. PRD impact 1.52.0. Expandable generator in project assets, private source/output drafts, category-specific skill profiles adapted from owner supplied SKILL/AGENTS, preferred gpt-image-2 (unverified provider access), selectable configured image model, metered explicit generation, preview/download, approve then title/category/description save; preserve project ownership. Source examples represented by textual layout guidance, binary style sheets not yet attached. PNG crop to 16:9 when supported. Unit tests added; CI pending; no live generation/deployment. Branch feat/reference-sheet-generator.
