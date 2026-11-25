# PORT67 FACTORY — MASTER PRODUCT REQUIREMENTS DOCUMENT

**Document ID:** P67-FAC-PRD  
**Version:** 1.39.0  
**Date:** 12 November 2026  
**Status:** Owner-confirmed creative direction (CHG-0003); underlying architecture/baseline proposals and Synapse audit remain pending  
**Owner:** Port67.ai — Product & Architecture  
**Repository target:** `port67-factory/PRD.md`  
**Governing commercial reference:** `Port67_ai_Master_Business_Plan_v1_1.pdf` (9 November 2026)  
**Audience:** Product owner, Codex, Claude Code, Gemini CLI, contractors and future engineering/operations staff  
**Tagline:** **Listen First. Build What Matters.**

> **READ THIS FIRST:** This document is the canonical statement of intended product behaviour. It is NOT evidence that any feature has been implemented. Do not claim an item is operational until its code, tests and deployment evidence are recorded in `docs/IMPLEMENTATION_STATUS.md`. A new AI coding session MUST inspect the repository and current documentation before changing code. The Synapse/Synapsys backend has not yet been inspected for this PRD; reuse details are proposals subject to the architecture audit. No production infrastructure or code is created by this document.

---

## 0. Document authority, status and change-control rules

### 0.1 Authority hierarchy

1. **Law, contracts, client instructions and safety obligations** override implementation preferences.
2. **Port67 Master Business Plan v1.1** governs commercial positioning, three service pillars, ethical boundaries, target ticket, public brand and financial hypotheses. The business plan is a *working baseline*: it distinguishes LOCKED decisions, HYPOTHESES and DECISIONS REQUIRED.
3. **This PRD** governs intended functional and non-functional behaviour for Port67 Factory.
4. **Approved architecture decision records (ADRs)** document the current technical approach consistent with the PRD.
5. **Code, tests, migrations and infrastructure declarations** show the actual implemented system; discrepancies must be flagged, not silently interpreted as changes to the PRD.
6. **Implementation status and handover** record verified completion and immediate next work.

If artifacts contradict, stop the affected work and create a discrepancy entry with a proposed resolution; do not silently choose one.

### 0.2 Requirement states

- `LOCKED`: owner-approved product/business guardrail; cannot be changed silently.
- `PROPOSED`: architecture/product recommendation awaiting owner approval or source-code audit.
- `HYPOTHESIS`: commercial/operational outcome requiring empirical measurement.
- `PLANNED`: approved intent not implemented.
- `IN_PROGRESS`: assigned and actively being developed.
- `IMPLEMENTED`: merged code and relevant tests passed.
- `VERIFIED`: integrated acceptance criteria passed in a specified environment and recorded with commit/CI evidence.
- `DEFERRED`: explicitly outside the current milestone.
- `REJECTED`: not to be built absent a new decision.

Every requirement has a stable identifier and should be managed through a requirements register or headings below. Never recycle IDs.

### 0.3 Permanent documentation standard — mandatory

The repository MUST maintain at least:

```text
/PRD.md                            # this canonical product specification
/AGENTS.md                         # universal developer/LLM working rules
/CLAUDE.md                         # short pointer to AGENTS.md and PRD.md
/GEMINI.md                         # short pointer to AGENTS.md and PRD.md
/docs/ARCHITECTURE.md              # current, implementation-aligned architecture
/docs/DATA_MODEL.md                # Firestore and Storage model, indexes, rules
/docs/DECISIONS.md                 # links/index of ADRs and owner decisions
/docs/adr/                         # one immutable ADR per material decision
/docs/CHANGELOG.md                 # user/product behaviour changes
/docs/IMPLEMENTATION_STATUS.md     # requirement-by-requirement reality
/docs/HANDOVER.md                  # latest verified developer handover
/docs/TESTING.md                   # test strategy, commands, evidence
/docs/SECURITY.md                  # threat model and operational controls
/docs/COST_MODEL.md                # pricing assumptions and ledger method
/docs/RUNBOOK.md                   # deployment, operations, incidents, recovery
/docs/SYNAPSE_AUDIT.md             # source-code-backed reuse assessment
```

`AGENTS.md` MUST specify the read-before-edit and update-after-edit protocol for *all* coding assistants; provider-specific files must point to it rather than fork policy. A feature pull request cannot be considered complete without accompanying updates to affected docs, acceptance criteria and tests. CI can check the presence of modifications and required references, but cannot guarantee semantic accuracy; code review must check consistency.

### 0.4 Initial decisions

| ID | Decision | State | Rationale / outstanding validation |
|---|---|---|---|
| FAC-D-001 | Three equal business pillars: UNDERSTAND, AUTOMATE, EXPLAIN | LOCKED (master plan) | EXPLAIN first as *implementation* sequencing, not commercial reprioritisation |
| FAC-D-002 | Brand-led agency and initially £5,000–£12,000 projects excluding VAT | LOCKED (master plan) | Specific prices are hypotheses |
| FAC-D-003 | Firebase-first backend and separate Port67 application | PROPOSED (user direction) | Confirm compatible Synapse code patterns and rights |
| FAC-D-004 | Google Cloud Run + Cloud Tasks for on-demand agent execution | PROPOSED | Validate against real workflow needs and limits |
| FAC-D-005 | TypeScript + Genkit default adapter, provider-neutral execution contract | PROPOSED | Validate SDK/plugin support for required capabilities |
| FAC-D-006 | Support OpenAI, Anthropic, DeepSeek and xAI/Grok via adapters | LOCKED product requirement | Model/harness compatibility verified per task, not assumed |
| FAC-D-007 | No custom generic workflow engine, no always-on model process | PROPOSED | Small, explicit state coordinator with clear escape hatch |
| FAC-D-008 | GitHub-based PRD and handover updated with every change | LOCKED product requirement | Cross-LLM development portability |
| FAC-D-009 | Approvals before consequential or external actions | LOCKED (master plan) | Policy enforcement must be server-side |
| FAC-D-010 | Independent Synapse and Port67 production data, secrets and deploy | PROPOSED | Prevent cross-product coupling/data leakage |

Do not mark any `PROPOSED` item `LOCKED` without an owner-approved ADR or decision log entry.

---

## 1. Executive product definition

### 1.1 What Port67.ai is

Port67.ai is a UK-based, premium, founder-independent public-facing B2B AI agency that delivers clearly scoped practical outcomes—not a generic chatbot agency, a pure content studio or speculative proprietary model company. Its service pillars are:

1. **UNDERSTAND — Executive Intelligence Dashboards.** Transform fragmented business data into validated KPIs, executive views and reviewed narrative insight.
2. **AUTOMATE — AI Process Transformation.** Transform a contained business process using safe integrations, human checkpoints, exception management and measured outcomes.
3. **EXPLAIN — Research-led Marketing Content, Advertising & Animation.** Turn business, brand and customer insight into evidence-informed campaign direction and customer-approved advertising, animation, explainers and social content. Port67 manages research and production; customers submit a minimal brief and approve direction and final assets. Supports B2B, B2C and mixed audiences.

The business plan initially targets unrelated UK and English-speaking B2B SaaS/software, AI/cloud/cybersecurity, professional/specialist services, technical firms and white-label creative agency partners, excluding direct telecom conflicts. Founder marketing remains brand-led, with truthful legal/customer disclosures. No fictional staff, fabricated results, unlicensed media, unapproved outbound communication or employer-owned material.

The business plan’s initial B2B sales focus remains historical commercial context, not a platform audience restriction. Owner direction on 12 November 2026 broadens EXPLAIN campaign capability to B2C and mixed audiences (CHG-0003); this does not silently revise other commercial guardrails, price hypotheses or the other two pillars.

### 1.2 What Port67 Factory is

Port67 Factory is **the internal reusable production and operations platform** behind the agency. It is not initially a customer-facing SaaS product or an unsupervised autonomous team. It coordinates project context, specialist AI agents and skills, permitted tools, multiple model providers, workflow dependencies, human review, QA, artifacts, source evidence, execution traces and costs, across many client engagements and the three factories.

### 1.3 North-star outcomes

- Repeatable delivery of appropriately scoped £5,000–£12,000 projects with measured quality and sustainable contribution margin.
- Lower founder and contractor hours per approved deliverable without eroding creative or technical standards.
- Source-backed client output with transparent uncertainty and revision history.
- All customer/workflow activity traceable to project, tenant, person/agent and cost event.
- Ability to shift development between Codex, Claude and Gemini via repository state alone.
- Ability to select OpenAI, Anthropic, DeepSeek or xAI/Grok when provider capabilities and client data policies permit.
- Incremental expansion from EXPLAIN to UNDERSTAND and AUTOMATE without rebuilding foundational controls.
- Ability to productise limited managed services/retainers once actual sales and delivery economics are validated.

### 1.4 Commercial baseline and guardrails

| Pillar | Initial offer hypothesis | Indicative launch price | Recurring extension hypothesis |
|---|---|---:|---|
| UNDERSTAND | KPI dashboard using up to 2–3 supported clean sources; 3–5 views | £8,000 | Managed reporting £750–£2,000/month |
| AUTOMATE | One contained workflow with 1–3 manageable integrations and human controls | £10,000 | Monitoring/optimisation £1,000–£2,500/month |
| EXPLAIN | 60–90s premium technology explainer, capped rounds and master deliverable | £6,000 | Content/cutdown packages £1,500–£3,000/month |

These are proposed pricing experiments from the master plan, **not market-verified prices**. Target initial gross contribution margin is **60–70% before fixed overheads and founder time** (hypothesis). Count founder time separately. The master plan suggests a £1,500–£2,500 45-day validation spend cap, excluding required legal/compliance setup and material project costs; avoid a speculative platform build that displaces sales validation.

### 1.5 Scope boundaries

**In scope for the long-term product:** tenancy, client/project management, versioned context, shared registries, multi-provider AI, execution orchestration, approvals, evidence and rights, QA, artifact production, analytics, cost/margin reporting, contractor access, integrations, client-safe review/delivery.

**Not in initial MVP:** full animation rendering; a general-purpose self-service creation SaaS portal (a restricted managed-service brief/approval portal is in scope); elaborate visual workflow designers; unlimited integrations; autonomous sales outreach; unsupervised payments or legally consequential decisions; end-to-end dashboard production; production-grade client process automation; custom vector infrastructure; model training; distributed agent swarms; self-modifying agent policies; complex microservices unless evidenced by workload.

### 1.6 Bounded first MVP — implementation boundary (CHG-0004)

Owner authorised autonomous MVP construction on 12 November 2026 without further approval pauses. The managed creative workspace is at `/portal`; scope and activation instructions are in `docs/FACTORY_MVP.md`. This patch documents implementation choices rather than approving the remaining proposed architecture or claiming all P0 acceptance gates pass.

The first slice uses typed source/insight/direction/task/asset contracts, deterministic approval/version checks, scoped producer/customer sessions, a persistent single-process local repository, and a separate configurable Firebase Admin adapter. A public synthetic demo is isolated per visitor and never calls paid providers. Live access fails closed without configured operator and session secrets. A dedicated authenticated Firebase project and real research-provider credentials were unavailable in the build environment; no cloud provisioning or live provider compatibility is claimed.

Manual segmented research, interpreted source-linked insights and human-edited strategy work immediately. Sharing direction requires reviewed evidence and an insight; production requires customer approval of the exact strategy. The bounded production studio creates original SVG artwork, HTML motion storyboards and Markdown copy/script concepts with task/evidence/version lineage. It does not claim MP4 rendering, autonomous strategic judgement or the full premium agency deliverable. Customer revision/final approval and approved-version delivery are implemented for these formats. Capability proposals cannot grant tools or activate new code. Performance learning records hypotheses and intended context; measured channel results and publishing remain phase two.

This is an owner-authorised new standalone slice inside the existing repository, with no Synapse code reuse. Synapse audit remains required before any future reuse, not fabricated as completed. The local adapter and shared producer login are bounded MVP choices, not the eventual scale architecture. Cloud rules, full RBAC, provider parity, a complete money ledger, deployment resilience and remaining P0 security tests stay open in implementation status.

---

## 2. Users, tenants and jobs to be done

### 2.1 Actors

- **Platform Owner / Factory Admin:** settings, trusted providers, agents/skills, budgets, deployment and tenant administration.
- **Producer / Project Manager:** discovery, client context, plans, launches, QA coordination and delivery.
- **Specialist Reviewer:** approved quality checks, claims reviews, content revisions and explicit approvals.
- **Contractor:** only assigned projects/artifacts/actions; time, deliverables and rights evidence.
- **Finance Operator:** cost ledger, time, contractor cost, revenue, margin, invoicing status; cannot create payments autonomously.
- **Client Submitter / Reviewer:** restricted managed-service portal for briefs, authorised assets, clarification requests, campaign-direction review and version-specific asset approval within assigned projects; no access to internal agent controls or other clients.
- **Agent Execution Identity:** service principal bound to an approved task and least-privilege tools.
- **Coding Assistant (Codex, Claude, Gemini):** development actor reading repository policy and contributing through Git; never a business/client actor by default.

### 2.2 Tenant model

A **tenant** is the hard data and administration boundary. Initially Port67 will operate one agency tenant with multiple client accounts. Design for additional tenants/white-label operations later, but do not assume client companies automatically require independent tenancy. A **client** is a commercial account within an agency tenant; a **project** is an engagement under a client, assigned to one factory. Client separation within a tenant is enforced through project membership/role and service-side policy, not only tenant checks.

Cross-tenant access is never permitted. Cross-client reuse requires explicit consent, ownership and authorised scope. Shared templates and synthetic demonstrations are platform assets with separate rights classification.

### 2.3 Representative jobs

- Producer: “Create an EXPLAIN project for a SaaS product and reuse its approved, current client brand/technical context.”
- Reviewer: “See every factual script claim and the source or client sign-off behind it.”
- Project manager: “See which research tasks completed, which failed, which are awaiting approval and how much they cost.”
- Admin: “Disable a compromised skill or provider without deleting historical execution evidence.”
- Finance: “Calculate direct project cost and founder hours before agreeing the next similar quote.”
- Future product lead: “Use UNDERSTAND or AUTOMATE without reimplementing approvals, cost ledger or tenancy.”
- Coding assistant: “Understand verified current state and next task without access to previous chat sessions.”

---

## 3. Product principles and non-negotiables

1. **Listen first.** Every delivery begins with verified needs, client context, scope and constraints.
2. **Human accountability.** Agents create drafts and recommendations; humans approve external delivery, commitments, sensitive modifications, quotes, payments and actions with material impact.
3. **Evidence over polish.** Facts must be source-linked; unsupported claims remain clearly flagged.
4. **One immutable history.** Context snapshots, agent/skill versions, models, artifacts and approvals are identifiable and reproducible to the extent providers allow.
5. **Ephemeral compute, durable work.** Agent executions start on demand and terminate; state, decisions and outcomes persist.
6. **Replaceable intelligence.** Provider, model and harness are replaceable policies—not embedded into business workflows.
7. **Principle of least privilege.** Tools, files, model context and outbound actions are explicitly scoped.
8. **Measure actual value.** Instrument reliability, cost, approval/rework, task latency, time saved and commercial margin.
9. **Standardise without flattening quality.** Repeatable workflow with creative/technical human judgement at defined gates.
10. **Git is the engineering memory.** PRD and handover stay in sync with verified code, not assistant conversation history.
11. **Prove one vertical slice.** Add complexity only after testable demand and actual engineering need.
12. **No undisclosed fabrication.** No fake client cases, AI staff, testimonials, rights or results.

---

## 4. System context and target architecture

### 4.1 Logical architecture

```text
                         PORT67 FACTORY WEB CONSOLE
                Authentication • Projects • Production • QA
                           Approvals • Costs • Audit
                                        |
                               Authenticated API
                                        |
                   +--------------------+-------------------+
                   |    FACTORY CONTROL PLANE (TypeScript)    |
                   | tenancy/authz | context | agent registry|
                   | skill registry| workflow | artifacts     |
                   | approval      | cost     | audit         |
                   +--------------------+-------------------+
                                        |
                              Workflow coordinator
                          Firestore state + Cloud Tasks
                                        |
                           on-demand Cloud Run workers
                                        |
           +----------------------------+---------------------+
           |           UNIFIED EXECUTION CONTRACT              |
           |    Agent + skill + context + model/harness policy  |
           +----------------------------+---------------------+
                                        |
         +------------------------------+-----------------------+
         | Genkit adapter | OpenAI SDK | Claude SDK | other adapters |
         +------------------------------+-----------------------+
                                        |
         +-------------------------+----------------------------+
         | OpenAI | Anthropic | DeepSeek | xAI/Grok | future      |
         +-------------------------+----------------------------+
                                        |
           EXPLAIN factory   UNDERSTAND factory   AUTOMATE factory
                                        |
         +------------------------------+-----------------------+
         |   Firebase Auth / Firestore / Cloud Storage          |
         |   Secret Manager / Google Cloud Logging & Telemetry  |
         +------------------------------------------------------+
```

### 4.2 Technical platform — provisional recommendations

| Concern | Baseline recommendation | Validation / exit conditions |
|---|---|---|
| Web UI | TypeScript React or Next.js, aligned to Synapse if appropriate | Audit existing conventions first |
| API | Firebase Functions v2 for light triggers + Cloud Run for worker-heavy services | Keep controllers thin, reuse domain libraries |
| Identity | Firebase Authentication | MFA for privileged users; roles via server-side policy |
| State | Cloud Firestore | Document sizing, index cost, transactional limits reviewed |
| Files | Cloud Storage for Firebase | Signed/authorised access, media retention and region choices |
| Async dispatch | Cloud Tasks | At-least-once; idempotent handlers, bounded retries |
| Coordination | Versioned Firestore-backed task state machine | Evaluate Cloud Workflows/Temporal when workflow demands justify |
| Agent framework | Genkit (TypeScript) default model adapter | Not mandatory for all harnesses |
| Alternate harnesses | Dedicated sandboxed adapters to provider-native SDKs | Must meet common contract and policy gates |
| Hosting | Cloud Run, scale-to-zero where workable | Concurrency, timeouts, cold starts and regional availability |
| Secrets | Google Secret Manager | Never in browser, Git or agent prompt |
| Observability | Structured logs + OpenTelemetry/Cloud Monitoring | Redact content, tie all traces to IDs |
| CI/CD | GitHub Actions + environment-specific Firebase/GCP deployment | Protect main, approvals, workload identity federation |
| IaC | Terraform or reproducible scripts selected after audit | Version cloud resources and IAM permissions |
| Tests | Vitest/Jest, Firebase Emulator, Playwright, integration/evaluation tests | Pin actual choices after Synapse audit |

Do not use hidden dependence on Synapse database, secrets, public hostnames, billing or deployments. Code reuse must be audited for IP ownership and dependency safety.

### 4.3 Separation of planes

- **Control plane:** durable project definition, client context, workflow/task metadata, agent policy, RBAC, budgets, approvals, audit and billing attribution.
- **Execution plane:** stateless, on-demand task workers using an approved agent/harness configuration and scoped tools.
- **Evidence/artifact plane:** source records, claims, immutable output versions, asset manifests and rights/licences.
- **Observability plane:** operational traces and business event ledger correlated by stable IDs.

The workflow coordinator—not the LLM—decides task readiness, retries, approval requirements, budget policy, and allowable external operations.

---

## 5. Functional requirements — shared platform

### 5.1 Tenants, users, clients and projects

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-TEN-001 | P0 | Create tenant and membership entities with independent access boundaries | Attempted cross-tenant reads/writes/storage access blocked by automated tests |
| FAC-TEN-002 | P0 | Client accounts exist under tenant; projects exist under client | Project cannot reference client outside authorised tenant |
| FAC-TEN-003 | P0 | Define server-enforced RBAC for Admin, Producer, Reviewer, Contractor, Finance | Restricted action returns 403 and audit event |
| FAC-TEN-004 | P0 | Every project has owner, factory, status, budget and approved scope | Cannot launch workflow missing required fields |
| FAC-TEN-005 | P1 | Restrict within-tenant clients/projects by assignments | Contractor can only access explicitly assigned resources |
| FAC-TEN-006 | P0 | Client submitter/reviewer for managed creative service | Assigned customer can submit brief/assets and review explicitly shared direction/deliverables; internal drafts and other client data remain inaccessible |
| FAC-TEN-007 | P0 | Use separate dev/staging/prod Firebase projects | Automated check prevents accidental cross-environment deployment |

### 5.2 Client context and reusable knowledge

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-CTX-001 | P0 | Structured client profile: legal/brand name, offerings, ICP, audience, brand voice, terminology, constraints | Read/write schema validation |
| FAC-CTX-002 | P0 | Immutable versioned context bundles with content hashes | Run always references exact snapshot version |
| FAC-CTX-003 | P0 | Project-specific brief/requirements overlay client context | Project overlay cannot mutate client master automatically |
| FAC-CTX-004 | P0 | Source/permission classification at context item level | Restricted input excluded unless explicit policy allows |
| FAC-CTX-005 | P1 | Human-reviewed claim library: approved, conditional, prohibited, expired | Expired/prohibited claims not supplied as approved facts |
| FAC-CTX-006 | P1 | Context change proposal and promotion workflow | Proposed agent edits require producer approval |
| FAC-CTX-007 | P2 | Keyword/full-text retrieval, later optional embeddings | Retrieval respects client/project scope |
| FAC-CTX-008 | P0 | Ability to export/delete client data according to retention and rights policy | Test deletion/export under approved role with audit record |

### 5.3 Registry: agents, skills, tools and harnesses

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-AGT-001 | P0 | Versioned agent definition registry, enabled/disabled status | Run locks `agent_id` and immutable version |
| FAC-AGT-002 | P0 | Agent declaration includes role, schemas, skills, tools, data ceiling, budget, model policy | Invalid configuration blocked at registration |
| FAC-AGT-003 | P0 | On-demand execution with durable task state | No permanent LLM loops; worker can stop between tasks |
| FAC-AGT-004 | P1 | Independent parallel tasks | Sibling researchers cannot see one another's generated results |
| FAC-AGT-005 | P0 | Kill switch for agent, skill, provider or tool | New tasks blocked; in-flight cancellation subject to task safety |
| FAC-AGT-006 | P1 | Compare alternative agent/model configurations with evaluation fixtures | Comparison preserves prompts, costs, versions and results |
| FAC-SKL-001 | P0 | Versioned reusable skill definitions | Skill version hash stored with every execution |
| FAC-SKL-002 | P0 | Skill can declare permissions, compatible harnesses and tool requirements | Unsupported skill/harness combination fails before model invocation |
| FAC-SKL-003 | P1 | Skill unit/evaluation tests; approval before promotion | Failed evaluation version cannot be marked approved |
| FAC-TOL-001 | P0 | Central typed tool registry and allowlist policy | Unregistered/unapproved tool call denied and audited |
| FAC-HAR-001 | P0 | Provider-neutral AgentExecutionRequest/Result | One workflow consumes any conforming adapter result |
| FAC-HAR-002 | P1 | Adapters for four named model providers | All four pass compatibility smoke tests or gap is clearly documented |
| FAC-HAR-003 | P1 | Optional provider-native agent harnesses | Native adapter obeys permissions, traces and standardized outputs |

### 5.4 Workflow, dependency, run and approvals

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-WFL-001 | P0 | Versioned declarative workflow/task DAG definition | Invalid cycle rejected before start |
| FAC-WFL-002 | P0 | Persist workflow/task states in Firestore | Coordinator reconstructs status after restart |
| FAC-WFL-003 | P0 | Dispatch ready tasks through Cloud Tasks | Dependency-locked tasks never start early |
| FAC-WFL-004 | P0 | At-least-once-safe retries and idempotent artifact/events | Repeated delivery cannot duplicate logical artifact or approval |
| FAC-WFL-005 | P0 | Retry classification: transient, schema, policy, source, budget | Policy/budget failures not retried blindly |
| FAC-WFL-006 | P0 | Timeouts, cancellation, manual override and dead-letter/exception queue | Blocked task is visible, actionable and audited |
| FAC-WFL-007 | P0 | Durable human approval gates with reviewer, version, time and reason | No follow-on task fires before approval |
| FAC-WFL-008 | P1 | Human rejection and targeted rework without overwriting past version | New artifact version linked to rejected version |
| FAC-WFL-009 | P1 | Partial rerun of failed tasks using frozen inputs | Previously approved unrelated stages remain intact |
| FAC-WFL-010 | P1 | Concurrency per tenant/provider/queue and circuit-breakers | Excess workloads queue; provider outage doesn't fan out |
| FAC-WFL-011 | P1 | Separate preview/dry-run from external side effects | Dry-run cannot perform external writes |

### 5.5 Sources, claims, artifacts, QA and delivery

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-EVD-001 | P0 | SourceRecord with URL/object pointer, title, provenance, time and classification | Every accepted research citation resolves to source record |
| FAC-EVD-002 | P0 | ClaimRecord distinguishes fact, client assertion, inference and creative proposition | Unsupported claims visibly marked |
| FAC-EVD-003 | P0 | Claim support statuses SUPPORTED/PARTIAL/UNSUPPORTED/CONFLICTED | Evidence verifier cannot fabricate evidence IDs |
| FAC-EVD-004 | P1 | Source freshness, conflicting sources and unverifiable content | Outdated/missing evidence flagged to reviewer |
| FAC-ART-001 | P0 | ArtifactVersion immutable content plus metadata and content hash | New revision creates a new version; old remains addressable |
| FAC-ART-002 | P0 | Artifact tied to context, workflow, task, agents, skills and model versions | Reviewer can trace origin of any output |
| FAC-ART-003 | P1 | Structured output validators and explicit QA reports | Invalid schema cannot be approved for delivery |
| FAC-ART-004 | P1 | Rights/licensing metadata for imagery, narration, music, fonts and software | Missing rights evidence blocks final media release |
| FAC-ART-005 | P2 | Client-safe download/acceptance package and manifest | Delivery includes only approved artifacts and authorised links |

### 5.6 Observability, costs and commercial reporting

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-OBS-001 | P0 | Correlation IDs across project, workflow, task, provider and logs | Operator follows one request end-to-end |
| FAC-OBS-002 | P0 | Task timing, attempts, model/tool usage and error classification | Run detail displays consistent timeline |
| FAC-OBS-003 | P0 | Structured audit events separate from technical logs | Actor and authorisation decision stored for sensitive action |
| FAC-OBS-004 | P0 | Sensitive model inputs/outputs excluded from default cloud telemetry | Automated log-redaction checks |
| FAC-OBS-005 | P1 | Alerts for failure, stuck approvals, budget exhaustion and unusual retries | Synthetic fault triggers expected notification |
| FAC-CST-001 | P0 | Every paid model/tool invocation creates usage event and cost estimate | Cost event links to task, workflow, project, client and tenant |
| FAC-CST-002 | P0 | Versioned pricing tables, currency, raw units and provider request IDs | Historical cost does not change silently with new prices |
| FAC-CST-003 | P0 | Budget caps at task, workflow and project levels | Preflight denies calls beyond allowed estimate; reconciliation flags overrun |
| FAC-CST-004 | P1 | Separate estimated provider spend from actual billed/adjusted spend | Ledger explains estimation vs reconciliation |
| FAC-CST-005 | P1 | Contractor time, founder time, licences and other direct project cost | Project cost report shows all categories |
| FAC-CST-006 | P1 | Revenue booked, recognised and cash collected separately | Reporting doesn't mistake deposits for revenue/profit |
| FAC-CST-007 | P1 | Direct contribution and target margin reporting | Calculation reconcilable to cost/revenue records |
| FAC-CST-008 | P2 | Trend by model/provider/skill/agent with quality and cost | Model routing decisions supported by evidence |

### 5.7 Multi-LLM development governance

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-DEV-001 | P0 | `PRD.md` is the living canonical requirements document | Exists before feature development; reviewed by owner |
| FAC-DEV-002 | P0 | `AGENTS.md` applies to Codex, Claude and Gemini with identical policy | Each tool reads same instructions and project status |
| FAC-DEV-003 | P0 | Every substantive change updates docs, tests and handover in same PR | PR checks require documented impact or reviewed exemption |
| FAC-DEV-004 | P0 | Implementation status separates planned/implemented/verified | No feature marked verified without CI/test evidence |
| FAC-DEV-005 | P0 | Significant design decisions use ADR and owner review | ADR linked in PRD and decisions index |
| FAC-DEV-006 | P1 | Protected main, PR templates, CI and release tags | New tool can reproduce project from fresh checkout |
| FAC-DEV-007 | P0 | Synapse audit before copying/reusing modules | File-level evidence, permissions/rights and migration approach documented |

---

## 6. Agent/skill/tool/model/harness design

### 6.1 Terminology

- **Agent:** versioned role + instructions + task goals + input/output contracts + allowed skills/tools + execution policy.
- **Skill:** reusable, versioned instructions/procedure with optional helper code and tests. A skill does not need its own model invocation.
- **Tool:** constrained executable API capability, e.g. read authorised context, search licensed source, save an evidence record.
- **Model:** provider-specific reasoning/generation capability; e.g. current OpenAI, Claude, DeepSeek and Grok models.
- **Provider:** company/API endpoint that serves models and reports usage.
- **Harness:** code/runtime controlling turns, tool calls, tool-loop behaviour, state and instrumentation (e.g. Genkit or provider-native agent SDK).
- **Workflow:** deterministic controller of task dependencies, retries and review gates, independent of model prompts.

### 6.2 Shared registry fields

`agent_id`, `semantic_version`, `status`, `factory`, `role`, `description`, `instruction_uri`, `instruction_hash`, `input_schema_id`, `output_schema_id`, `skill_versions[]`, `allowed_tools[]`, `permitted_data_classes[]`, `model_policy_id`, `harness_policy_id`, `execution_budget`, `retry_policy`, `timeout_policy`, `approval_policy`, `evaluation_suite_id`, `owner`, `updated_at`.

Skill definitions must declare `skill_id`, `version`, `description`, `content_hash`, compatible tasks/harnesses, required tools, maximum data class, evaluation tests, licence/provenance and approval status. Load only the selected version into a run. Do not let untrusted documents silently install skills or redefine tools.

### 6.3 Common execution contract (normative conceptual shape)

```typescript
export type DataClass =
  | 'PUBLIC' | 'PORT67_INTERNAL' | 'CLIENT_CONFIDENTIAL' | 'RESTRICTED';

export interface AgentExecutionRequest {
  schemaVersion: '1.0';
  tenantId: string;
  clientId: string;
  projectId: string;
  workflowRunId: string;
  taskRunId: string;
  idempotencyKey: string;
  agent: { id: string; version: string };
  harness: { id: string; version: string };
  model: { provider: string; modelId: string; policyVersion: string };
  contextSnapshotId: string;
  inputArtifactVersionIds: string[];
  skills: Array<{ id: string; version: string; hash: string }>;
  allowedToolIds: string[];
  outputSchemaId: string;
  dataClass: DataClass;
  input: unknown;
  limits: {
    maxCostMinorUnits: number;
    currency: 'GBP' | 'USD';
    maxToolCalls: number;
    maxDurationSeconds: number;
    maxAttempts: number;
  };
  traceId: string;
}

export interface AgentExecutionResult {
  schemaVersion: '1.0';
  taskRunId: string;
  status: 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'CANCELLED';
  outputSchemaId: string;
  output?: unknown;
  sourceIds: string[];
  claimIds: string[];
  warnings: string[];
  failure?: { category: string; code: string; safeMessage: string };
  usageEventIds: string[];
  traceId: string;
  agentVersion: string;
  harnessVersion: string;
  provider: string;
  modelId: string;
  startedAt: string;
  finishedAt: string;
}
```

Use runtime schema validation (e.g. Zod) in addition to static TypeScript types. Field formats, error enum, provider metadata and price accounting get refined in ADRs without violating the shared contract. Convert provider-specific output into these schemas inside each adapter. Reject incompatible capability requests before spending money.

### 6.4 Provider matrix and evaluation

Required supported model providers: **OpenAI, Anthropic, DeepSeek, xAI/Grok**. Optional Gemini runtime model support may be useful, distinct from using Gemini as a coding assistant. Genkit documentation lists integration routes for the four named providers, but compatibility must be verified in real tests and SDK/package versions pinned at implementation.

Per provider/model, track: supported modalities, tool calling, structured output reliability, web/search interfaces, context limit, caching, regions/data policy, price unit, timeout, rate limits, reasoning modes, version/availability and observed acceptance quality. Do not assume one provider's native agent harness is interchangeable with another merely because text generation APIs look similar.

Routing order: (1) data policy and approval; (2) required capabilities; (3) reliability and quality minimum; (4) budget; (5) latency; (6) preference. Fallback must repeat policy/capability checks. Model decisions and fallback reason recorded for audit. Initially use explicit routing rules; no AI routing agent.

### 6.5 On-demand lifecycle

1. Workflow coordinator creates durable `TaskRun` and reserves a budget estimate.
2. Cloud Tasks dispatches a scoped worker invocation; no raw secrets or large client content in the queue payload.
3. Worker verifies service identity, task authenticity, status, lease/idempotency and tenant/project policy.
4. Worker resolves immutable agent, skill, model and context versions.
5. Harness runs approved model/tool calls; each paid call emits usage and cost event even if the overall task later fails.
6. Worker validates output, stores evidence and artifact versions, updates task status transactionally.
7. Coordinator atomically detects dependency completion, schedules newly ready tasks and gates approvals.
8. Worker request ends; no AI runtime needed while waiting for humans.

Cloud Tasks may deliver more than once; handlers **MUST** be idempotent. Cloud Run scales instances, not individual conceptual agents, and may reuse containers. Isolation, concurrency and provider quotas must be handled intentionally.

### 6.6 Shared agent catalogue — target

| ID | Agent/function | Primary output | Initial phase |
|---|---|---|---|
| SHR-001 | Intake Normaliser | Typed brief, missing-information list | M2 |
| SHR-002 | Context Curator | Scoped context snapshot | M1 deterministic + optional agent later |
| SHR-003 | Public Research Worker | Research output with source records | M2 |
| SHR-004 | Evidence Verifier | Claim support/contradictions | M4 |
| SHR-005 | QA Reviewer | Structured test/quality report | M5 |
| SHR-006 | Artifact Packager | Delivery manifest | Later |
| SHR-007 | Policy Guard | Authorisation/policy decision | M1 deterministic, not an LLM |
| SHR-008 | Cost Controller | Usage/cost/budget events | M1 deterministic, not an LLM |
| SHR-009 | Scope/Discovery Assistant | Scope risks and draft SOW | Later |
| SHR-010 | Delivery Coordinator | Status and scheduling proposals | Later |

### 6.7 EXPLAIN agent catalogue — target

| ID | Specialist | Output | Phase |
|---|---|---|---|
| EXP-001 | Technical Researcher | Technical evidence bundle | M2 / M4 |
| EXP-002 | Audience Researcher | Buyer problems and terminology | M4 |
| EXP-003 | Market/Claims Researcher | Category research and claim checks | M4 |
| EXP-004 | Message Strategist | Positioning, core promise, narrative structure | M5 |
| EXP-005 | Scriptwriter | Timed script and scene intent | M5 |
| EXP-006 | Script Critic | Clarity/accuracy/claim critique | M5 |
| EXP-007 | Storyboard Planner | Scene plan and transitions | Later |
| EXP-008 | Visual Direction Agent | Design/styleframes specification | Later |
| EXP-009 | Narration Planner | VO directions, pronunciation, pacing | Later |
| EXP-010 | Render Coordinator | Approved media job manifest | Later |
| EXP-011 | Explainer QA | QA/rights/technical review | Later |

### 6.8 UNDERSTAND catalogue — future (not MVP)

`UND-001 Data Source Auditor`, `UND-002 KPI Architect`, `UND-003 Reconciliation Worker`, `UND-004 Dashboard Designer`, `UND-005 Insight Narrator`, `UND-006 Dashboard QA`. Core controls: figures reconcile; source freshness; refresh failures alert; role tests; uncertainty in narrative.

### 6.9 AUTOMATE catalogue — future (not MVP)

`AUT-001 Process Analyst`, `AUT-002 Opportunity Analyst`, `AUT-003 Integration Architect`, `AUT-004 Control Designer`, `AUT-005 Workflow Builder`, `AUT-006 Test Designer`, `AUT-007 Runtime Analyst`. Core controls: human approval for external communications/commitments/sensitive changes, idempotency, retry and manual fallback, explicit kill switch, least-privilege integrations and audit.

---

## 7. Data architecture: Firestore, Storage and isolation

### 7.1 Canonical entities

**Identity/commercial:** `Tenant`, `TenantMembership`, `UserProfile`, `Client`, `Project`, `ProjectAssignment`, `ProjectBudget`, `ProjectRevenueEvent`, `HumanTimeEntry`, `ContractorCost`.

**Context/evidence:** `ContextVersion`, `ContextItem`, `SourceRecord`, `ClaimRecord`, `AssetRecord`, `RightsRecord`.

**Agent control:** `AgentDefinition`, `AgentVersion`, `SkillDefinition`, `SkillVersion`, `ToolDefinition`, `HarnessDefinition`, `ModelPolicy`, `ProviderPolicy`.

**Execution:** `WorkflowDefinition`, `WorkflowVersion`, `WorkflowRun`, `TaskRun`, `TaskAttempt`, `Dependency`, `ToolCall`, `ApprovalRequest`, `ApprovalDecision`.

**Output/observability:** `Artifact`, `ArtifactVersion`, `UsageEvent`, `CostEvent`, `AuditEvent`, `QualityEvaluation`, `Incident`.

Every customer-owned entity must have `tenantId`; client and project objects must also have `clientId`/`projectId` as appropriate, even when nested beneath tenant paths. IDs are immutable, generated server-side or verified on receipt, and cross-resource ownership is checked server-side.

### 7.2 Provisional document hierarchy

```text
tenants/{tenantId}
  memberships/{userId}
  clients/{clientId}
    contextVersions/{versionId}
  projects/{projectId}
    assignments/{assignmentId}
    briefs/{briefId}
    workflowRuns/{workflowRunId}
      taskRuns/{taskRunId}
      approvals/{approvalId}
    artifacts/{artifactId}
      versions/{artifactVersionId}
    sources/{sourceId}
    claims/{claimId}
    assets/{assetId}
    usageEvents/{usageEventId}
    costEvents/{costEventId}
    auditEvents/{auditEventId}

platform/agentRegistry/versions/{versionId}    # conceptual; final path after audit
platform/skillRegistry/versions/{versionId}
platform/toolRegistry/versions/{versionId}
platform/harnessRegistry/versions/{versionId}
platform/modelPolicies/versions/{versionId}
```

The global registry path is indicative, not a mandate to force document data into an invalid Firestore alternating collection/document path. Codex must formalise valid collection paths and index requirements. Prefer small immutable reference documents; use Cloud Storage for large JSON/content, thumbnails, media, logs and uploaded files. Firestore is not a large binary/trace archive. Avoid unbounded arrays and overly hot rollup documents; use append-only events and derived/cached aggregates where needed.

### 7.3 Storage paths

```text
tenants/{tenantId}/clients/{clientId}/projects/{projectId}/
  source/{objectId}
  context/{objectId}
  artifacts/{artifactId}/{artifactVersionId}/{objectId}
  media/{assetId}/{versionId}/{objectId}
  deliveries/{deliveryId}/{objectId}
```

Use opaque object IDs rather than supplied filenames in physical keys; persist filename, type, size, hash, classification, uploader, licence, rights and retention attributes in metadata. Signed URLs must be short-lived and authorised. Do not expose arbitrary bucket paths or service keys to clients.

### 7.4 Security rules versus backend policy

Firebase Security Rules protect browser/mobile SDK access. **Server/Admin SDKs bypass Firestore Security Rules**, so all backend reads/writes require independent server-side authorisation and scoped service IAM. Never use `tenantId` or `clientId` from a request body as sufficient authority; derive membership and validate against the requested resource. Prefer secure backend services for all critical state transitions.

### 7.5 Snapshot and artifact semantics

- ContextVersion is immutable, keyed by version and content hash, and tied to the workflow at creation.
- ArtifactVersion never overwrites prior bytes; contains parentVersion, creator/task, input artifact references, prompt/skill/harness/model version and checksum.
- Approval explicitly references a version hash; editing/reworking requires new version and invalidates applicable approvals.
- Source and claim records remain traceable even if source is later retired or access restricted (subject to lawful deletion).
- Audit events are append-only to ordinary users; production immutability/retention must be enforced by server policy and operational controls, not simply UI behaviour.
- Backups, export, deletion, retention and restore tests required before handling live client data.

---

## 8. Canonical structured I/O contracts

### 8.1 ProjectBrief

```json
{
  "schemaVersion": "1.0",
  "factory": "EXPLAIN",
  "clientId": "uuid-or-opaque-id",
  "projectId": "uuid-or-opaque-id",
  "projectName": "FlowPilot concept demonstration",
  "businessProblem": "Explain an approvals workflow platform clearly",
  "deliverable": {"type": "technology_explainer", "durationSeconds": 60, "masterAspectRatio": "16:9"},
  "targetAudience": ["SaaS operations directors"],
  "coreClaimsToVerify": ["Automated routing removes manual handoffs"],
  "constraints": ["Concept demonstration only; fictional client"],
  "sourceAssetIds": [],
  "approvalOwnerUserId": "user-id",
  "budgetCurrency": "GBP"
}
```

The example above is a completed synthetic production brief, not the minimum customer intake form. Under FAC-MKT-001–006, audience and deliverable may initially be unknown and are proposed through research; production requires the approved enriched strategy and task brief. Runtime schema evolution is pending implementation design.

### 8.2 ClientContextSnapshot

```json
{
  "schemaVersion": "1.0",
  "tenantId": "tenant-id",
  "clientId": "client-id",
  "contextVersionId": "version-id",
  "contentHash": "sha256:...",
  "profile": {},
  "brand": {},
  "products": [],
  "audiences": [],
  "terminology": [],
  "approvedClaims": [],
  "restrictedClaims": [],
  "sourceIds": [],
  "assetIds": [],
  "accessClassification": "CLIENT_CONFIDENTIAL",
  "approvedBy": "user-id",
  "createdAt": "ISO-8601"
}
```

### 8.3 SourceRecord

```json
{
  "sourceId": "source-id",
  "sourceType": "CLIENT_DOCUMENT",
  "title": "Approved product brief",
  "canonicalUrl": null,
  "storageObjectId": "object-id",
  "publisher": "Client supplied",
  "publishedAt": null,
  "retrievedAt": "ISO-8601",
  "contentHash": "sha256:...",
  "dataClass": "CLIENT_CONFIDENTIAL",
  "trustTier": "CLIENT_ASSERTION",
  "licenceNotes": "Internal permitted use",
  "accessibleToTaskIds": ["task-id"]
}
```

### 8.4 ClaimRecord

```json
{
  "claimId": "claim-id",
  "text": "Example factual assertion",
  "kind": "EXTERNAL_FACT",
  "supportStatus": "PARTIALLY_SUPPORTED",
  "sourceIds": ["source-id"],
  "evidenceExcerptRefs": [],
  "uncertainties": ["Source lacks measurement methodology"],
  "humanReviewStatus": "PENDING",
  "producedByTaskId": "task-id"
}
```

### 8.5 ResearchPack

```json
{
  "schemaVersion": "1.0",
  "projectId": "project-id",
  "contextVersionId": "context-version-id",
  "executiveSummary": "",
  "productSummary": "",
  "problemDefinition": "",
  "audienceFindings": [],
  "technicalFindings": [],
  "marketFindings": [],
  "supportedClaimIds": [],
  "unsupportedClaimIds": [],
  "conflictedClaimIds": [],
  "unknowns": [],
  "messagingOpportunities": [],
  "terminology": [],
  "sourceIds": [],
  "qaStatus": "NEEDS_REVIEW"
}
```

### 8.6 AuditEvent and CostEvent

```json
{
  "eventId": "idempotent-event-id",
  "eventType": "AGENT_TASK_COMPLETED",
  "tenantId": "tenant-id",
  "clientId": "client-id",
  "projectId": "project-id",
  "workflowRunId": "run-id",
  "taskRunId": "task-id",
  "actor": {"type": "SERVICE", "id": "service-principal"},
  "timestamp": "ISO-8601",
  "traceId": "trace-id",
  "metadata": {"outcome": "COMPLETED"}
}
```

```json
{
  "costEventId": "idempotent-cost-event-id",
  "tenantId": "tenant-id",
  "projectId": "project-id",
  "workflowRunId": "run-id",
  "taskRunId": "task-id",
  "provider": "openai",
  "modelId": "resolved-model-id",
  "usage": {"inputTokens": 0, "cachedInputTokens": 0, "outputTokens": 0, "toolCalls": 0},
  "priceVersion": "rate-card-version",
  "estimatedAmountMinor": 0,
  "billingAmountMinor": null,
  "currency": "GBP",
  "fxRateRef": null,
  "providerRequestId": "provider-id-if-available",
  "status": "ESTIMATED"
}
```

Money uses integer minor units and explicit currency; provider costs may originate in USD, requiring a recorded conversion basis. Real provider usage and estimated usage must never be silently conflated.

---

## 9. Orchestration, state machine and failure handling

### 9.1 Workflow run state

`CREATED -> VALIDATING -> READY -> RUNNING -> WAITING_FOR_APPROVAL -> RUNNING -> COMPLETED`.

Alternative states: `NEEDS_INPUT`, `BLOCKED`, `FAILED`, `CANCEL_REQUESTED`, `CANCELLED`, `BUDGET_EXCEEDED`. State transition rules are deterministic, versioned and tested; no LLM is allowed to update workflow state directly.

### 9.2 Task run state

`PENDING -> READY -> QUEUED -> RUNNING -> VALIDATING_OUTPUT -> COMPLETED`; alternative `RETRY_SCHEDULED`, `NEEDS_REVIEW`, `FAILED`, `CANCELLED`, `POLICY_BLOCKED`. Keep `TaskAttempt` separately so retry history persists.

### 9.3 Dependency model

Each task references an immutable workflow definition/version, a dependency list and optional approval gate. The coordinator atomically checks prerequisites; on completion it attempts to enqueue newly ready tasks using stable task/queue IDs. Duplicate event deliveries must not cause duplicated ready-task dispatch or billable agent call where avoidable. Provider-side retries can still incur costs; record every actual billable attempt.

### 9.4 Failure classes

| Category | Response |
|---|---|
| Transient network/rate limit | bounded exponential backoff + jitter, honour provider retry hints |
| Provider unavailable | candidate fallback after data/capability revalidation |
| Schema invalid | at most one bounded repair pass, then manual review |
| Missing/conflicting sources | persist uncertainty, request human input, no false completion |
| Budget threshold | block new paid calls, alert owner |
| Policy/security violation | hard stop, audit, alert; never fallback around policy |
| Stale context or invalid approval | new review/version; never reuse outdated approval |
| Duplicate Cloud Tasks delivery | idempotency/lease/transaction; no double artifact promotion |
| Worker crash | lease expiry/reconciliation and safe retry |
| Long-held approval | durable wait + reminder/escalation; no running LLM |
| Partial failure in fan-out | workflow policy decides partial pack vs hold; never silently omit |

### 9.5 Manual recovery

A Producer/Admin can inspect failure category, task inputs/outputs allowed by classification, provider errors, charged cost and safe actions: retry, reassign model, request more client info, cancel, skip *only if workflow policy explicitly permits* or restore from approved version. Every intervention is audited.

---

## 10. EXPLAIN factory — target workflow and creative production

### 10.1 Product offer and boundaries

The historical initial commercial explainer package is a **60–90 second premium B2B SaaS/technology explainer** with discovery, up to two script rounds, storyboard/styleframes, animation, commercially licensed narration/music, one master aspect ratio, two consolidated revision rounds and final video delivery. Extra aspect ratios, extensive 3D, languages, live-action, character animation and voice cloning are separately scoped. The platform must enforce scope limits and variation/change control; these are proposals, not guarantees of automated cinematic quality.

The expanded offer supports B2B, B2C and mixed campaigns, including short advertisements, animation, static/social content and technology explainers. Durations such as 5 or 30 seconds and channels such as Instagram, LinkedIn and X are campaign specifications, not fixed templates or promises of universal adapter support. The historical package and pricing remain examples; new packages, production budgets and revision limits require explicit scope agreement.

### 10.2 Workflow stages

```text
Minimal customer portal brief + Port67 scope validation
       |
Versioned approved client context snapshot
       |
       +---------- parallel independent research -----------+
       |                    |                                |
Product/brand        Customer/audience               Competitor/market
       |                    |                                |
       +---------- additional scoped creative/niche research --+
       |                    |                                |
       +--------------------+--------------------------------+
                             |
                     Evidence verification
                             |
                   Research Pack + QA report
                             |
                       HUMAN GATE 1
                             |
                    EXP-004 Campaign strategy + messaging + design rationale
                             |
             PORT67 REVIEW + CUSTOMER DIRECTION APPROVAL
                             |
              Versioned specialist production task briefs
                             |
              EXP-005 Script -> EXP-006 Critique/QA
                             |
                       HUMAN GATE 3
                             |
                      Storyboard/Styleframes
                             |
                       HUMAN GATE 4
                             |
                      Animatic/First Cut
                             |
              Technical + legal + rights QA
                             |
                       HUMAN GATE 5
                             |
                 Customer-approved asset package / delivery
```

The first technical research milestone still ends at an approved **Research Pack**. The first managed-service release must additionally support minimal portal intake, customer direction approval and final asset review/delivery; these product-phase requirements are not claims that all production automation ships in that technical milestone. See section 10.6.

### 10.3 Key creative data structures

- `MessageStrategy` (within versioned `CampaignStrategy`): audience, desired change in belief, single core promise, substantiating evidence, objections, emotional tone, prohibited claims, CTA and approval.
- `Script`: scene/beat ID, voiceover text, screen text, timing, technical claim references, intended visuals, total estimated duration and revision number.
- `Storyboard`: ordered scene IDs, duration, visual description, animation intent, reference assets, brand tokens and rights status.
- `MediaAsset`: type, generation or source, ownership/licence, permitted uses, model/provider metadata, review status, storage object and version.
- `RenderJob`: composition/version, source assets, settings, provider/renderer, estimated cost, actual cost, output and QC result.
- `DeliveryManifest`: master format, aspect ratio, files/hashes, rights references, acceptances, exclusions and handover.

### 10.4 Research requirements

Technical, Audience and Market research must be truly independent inputs to the verifier. Each returns structured findings, source refs, unknowns and conflicting claims. External facts without support are visibly marked, not passed as proven marketing claims. Research must preserve client-provided statements as *client assertions*, not independent verification.

### 10.5 Quality gates

- Research pack factual audit.
- Message strategy commercial/technical sign-off.
- Script clarity and claims review, including pronunciation/terminology.
- Storyboard coherence/brand review.
- Render review, rights/asset licence check, technical accuracy and export QC.
- Final human approval before external release; export manifest/acceptance tracked.

### 10.6 Managed creative service and adaptive capability requirements

Owner-confirmed product direction: 12 November 2026. Implementation design and acceptance tests remain to be built. These requirements supersede narrower EXPLAIN audience/format assumptions and the previous deferral of the restricted customer portal. They do not approve automatic publishing or unreviewed agent deployment.

**Service phases:** Phase one is managed intake, research, strategy, asset creation, revisions, approval and download/delivery. Phase two adds measured performance feedback and optionally authorised publishing. These are service phases, distinct from technical milestones M0–M8. A customer receives Port67-managed work, not responsibility for configuring agents.

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-MKT-001 | P0 | Minimal adaptive intake | Customer supplies business identity/website (or alternative description), campaign objective and approval contact; logo/assets, competitors, inspirations and existing research are optional inputs. Missing information is discovered where possible or requested as a targeted clarification; never invented or required as a large upfront questionnaire. |
| FAC-MKT-002 | P0 | Audience-flexible research and strategy | B2B, B2C, mixed and unknown audience briefs are supported. Research proposes audience, buying context, motivations, objections, channels and formats with evidence and confidence; unknowns are visible and material assumptions require confirmation. No B2B default silently restricts the plan. |
| FAC-MKT-003 | P0 | Segmented, extensible evidence collection | Separate product/brand, customer voice, competitor/market and creative-reference research outputs carry source/date, collection method, access/use permission, client scope, confidence, gaps and contradictions. Methods include supplied files, authorised first-party exports/interviews/surveys, public web/reviews/discussion and permitted APIs/ad libraries. Inaccessible sources and sampling bias are reported; advertised competitor activity is not treated as proof of performance. |
| FAC-MKT-004 | P0 | Evidence-backed campaign direction | CampaignStrategy recommends messaging focus, value proposition, supporting claims, audience, creative angles, design direction, channels and asset specifications. Each material recommendation links research findings and reasoning, alternatives, uncertainty and intended outcome. Customer assertions remain distinct from independently supported facts. |
| FAC-MKT-005 | P0 | Customer approval before asset production | Port67 reviews strategy; customer approves or requests changes to an exact strategy version before paid asset production/rendering. Strategy previews may illustrate the proposal but do not imply final production approval. Material strategy changes invalidate dependent approvals and trigger impact/reapproval review. |
| FAC-MKT-006 | P0 | Strategy translated into specialist task contracts | Each production task identifies approved strategy/context versions, evidence/claims, brand constraints, role-specific instructions, inputs, output schema, dependencies, channel/duration/aspect ratio where applicable, rights, budget and acceptance checks. Prevent production from unapproved or superseded dependencies. |
| FAC-MKT-007 | P0 | Managed multi-format delivery | Port67 coordinates scripts/copy, static design, storyboards, animation/video and channel variants as scoped. Customer can comment, request scoped revisions and approve immutable final versions; only approved licensed assets enter the delivery manifest. No automatic posting in phase one. |
| FAC-MKT-008 | P0 | Discover and propose new capabilities | Research, strategy or production agents can flag missing niche knowledge, methods, skills, tools or specialist roles and create a CapabilityProposal with evidence of need, expected value, alternatives/reuse, input/output contracts, permissions/data classes, provider needs, cost, risks and evaluation plan. Unsupported requirements pause or route to a qualified human rather than fabricating capability. |
| FAC-MKT-009 | P0 | Controlled agent/skill expansion | Agents may draft new specialist agent/skill definitions and evaluations in a sandbox. Authorised Port67 review, permission/rights/security checks, budget approval, runtime schema validation and relevant evaluation results are required before registry promotion and production use. No self-granted tools, credentials, policy changes or automatic production deployment. New versions are traceable, disableable and rollbackable. |
| FAC-MKT-010 | P0 | Preserve reusable core and niche flexibility | New specialist definitions use existing tenancy, evidence, execution, approval, cost and artifact contracts. Workflows support reviewed optional research/production branches and new artifact schemas without duplicating the platform. A synthetic unfamiliar-niche brief must demonstrate capability-gap detection, reviewed specialist addition and safe workflow integration; failed evaluations block promotion. |
| FAC-MKT-011 | P1 | Prepare measurement lineage in phase one | Persist campaign/asset/version IDs, source-to-insight-to-strategy-to-task lineage, creative hypothesis, intended audience/channel/objective and proposed success measures. Do not report performance without observed results. |
| FAC-MKT-012 | P2 | Phase-two measurement and optional publishing | With separate customer authorisation, connect channel/analytics results to actual published asset versions, spend, time window and attribution limitations. Use results to propose strategy changes and future variants; distinguish correlation from causal evidence. Publishing requires explicit account scope and approved content/version, timing and destination. |

**Conceptual records:** `ResearchFinding` links evidence to a scoped insight. `CampaignStrategy` contains recommendations, detailed reasoning, design direction, asset plan, hypotheses and approval state. `ProductionTaskBrief` carries the approved role-specific contract. `CapabilityProposal` records a gap, proposed specialist and promotion evidence. Their runtime schemas and migrations require design review; this PRD update does not claim deployed contracts.

**Quality ambition:** improve first-draft relevance, reduce avoidable revisions and learn from results. Research does not guarantee first-time approval, audience response or commercial success. Inspiration is analysed for principles; assets, testimonials, claims and likenesses are not copied without appropriate rights.

### 10.7 Demo project

`FlowPilot` is a **fictional product / concept demonstration**, never presented as a paid client. The demo depicts complex approvals and handoffs becoming a unified workflow with visibility, ultimately aiming for a polished 60-second master, a 15-second cutdown and a documented storyboard/behind-the-scenes process. The first technical demo only needs to produce an approved, evidence-labelled Research Pack from synthetic context; later creative demos must remain labelled fictional.

---

## 11. UNDERSTAND factory — future capability specification

**Purpose:** Turn fragmented, permitted, quality-assessed client data into executive decision-making interfaces and reviewed commentary. Launch scope hypothesis: up to 2–3 clean supported sources, KPI dictionary, 3–5 core dashboard views, scheduled refresh, basic access controls, validation and handover.

Target workflow: discovery -> data inventory -> source permissions -> data quality -> KPI contract -> architecture decision -> view design -> connector implementation -> reconciliation -> human acceptance -> deployment -> managed refresh support.

Data must not be exposed to third-party models without source-specific client authorisation. Metric definitions have owner, business meaning, SQL/transformation logic or reference, time window, rounding, freshness and reconciliation tests. Narrative summaries explicitly distinguish data findings from AI interpretation. Never fabricate revenue, churn, margin or forecast precision. Critical quality criteria: reconciling totals, freshness/alerts, missing-data warnings, effective permissions and correct exports.

Reuse all shared modules; introduce specialised source connectors, governed metrics, data quality and dashboard rendering abstractions only when this factory is implemented.

---

## 12. AUTOMATE factory — future capability specification

**Purpose:** Implement one contained approved business process using up to 1–3 manageable integrations in the initial commercial hypothesis. Workflow must include business trigger, scoped source data, approved integrations, AI interpretation where justified, human approval, exception handling, idempotency and operational health.

Target workflow: discovery/baseline -> process map -> ROI assumptions -> input/output schemas -> system inventory -> integration permissions -> control/approval design -> implementation -> test in sandbox -> human acceptance -> bounded production rollout -> support monitoring.

Never autonomously initiate payments, approve contracts/quotes, send external customer communications, make regulated legal/medical decisions, or perform destructive/sensitive changes without explicit approved policy and human confirmation. Maintain manual fallback and kill switch. Maintain verified savings metrics rather than invented automation ROI. Reuse the same task and audit primitives; isolate live integration credentials from general research agents.

---

## 13. Security, compliance and operations

### 13.1 Tenant and client isolation

Authentication by Firebase Auth; membership, resource access and action permissions validated server-side. Browser Firestore/Storage rules provide defence in depth. Service/Admin SDK calls are privileged and must explicitly authorise operations. Distinct GCP/Firebase projects for development, staging and production with separate IAM, API keys, buckets and billing alerts. Tenant/client scoped queries and storage lookups use trusted derived identity, never user-supplied identifiers without verification.

### 13.2 Model data routing

Maintain an approved model/provider registry with region, logging/training/data retention terms, confidentiality class ceiling and tool support. Client-confidential and restricted data cannot be routed to an unapproved provider or to third-party research/search tools. External research pages are untrusted; prompt injection must not alter agent instructions, tool permissions or destination addresses. Redact/minimise personal data. No hard-coded API secrets or service account keys in prompts or code.

### 13.3 Rights and quality

Maintain rights metadata and client licence permission for external images, video, narration and music. Label AI avatars/virtual presenters truthfully. Claims of certifications, client outcomes and staff size must be verified. Commercial review must not be delegated to language-model self-assurance alone.

### 13.4 Operational baseline

- MFA for privileged identities.
- Audit and least-privilege IAM, secrets rotation and ability to revoke providers.
- Encryption at rest/in transit via approved cloud services; minimise content in logs.
- Backup/export/restore plan with quarterly dry-run once live clients exist; RPO/RTO to be set through risk assessment.
- Documented incident response, notification decision path and service disable/cancel switch.
- Data retention and client deletion policy established before real customer data ingestion.
- Supplier contracts/DPAs and UK GDPR/transfer assessment where applicable, with qualified advice rather than claiming compliance based on an LLM.
- Separate project/client access for subcontractors with explicit offboarding.
- No use of employer-owned assets, contacts or confidential information; external launch subject to employment/legal review from business plan.

### 13.5 Audit invariants

Every sensitive event records ID, actor type and ID, authorised tenant/client/project, target resource, action, outcome, timestamp, correlation ID, policy version and safe metadata. No ordinary user may alter prior approval/audit records; corrections are subsequent events. Retention and tamper-evidence measures to be decided in a security ADR.

---

## 14. Observability and production support

### 14.1 The three views

1. **Technical:** Cloud Logging/OpenTelemetry spans, trace IDs, request duration, worker state, task attempts, failure codes, queue backlog, provider rate limits and alerts.
2. **Production:** active projects, blocked tasks, approval ageing, versions, QA pass/rework, throughput and delivery lead time.
3. **Financial:** metered provider cost, software/render spend, contractor/founder time, per-project cost and contribution.

### 14.2 Mandatory event metadata

`traceId`, `tenantId`, `clientId`, `projectId`, `workflowRunId`, `taskRunId`, `agentId`, `agentVersion`, `skillVersions`, `harnessId`, `provider`, `modelId`, `attempt`, `durationMs`, `outcome`, `safeErrorCode`; suppress sensitive raw inputs and outputs from central logs by default. Do not place customer text, credentials or document body in log labels.

### 14.3 Initial operating dashboards

- Workflow task success/failure/retry counts and latency.
- Tasks waiting for approval, exception queues and budget threshold breaches.
- Model spend by client/project/task/provider and date.
- Research claims supported/unsupported/conflicted.
- Time from intake to approved Research Pack, and human correction/approval rate.

### 14.4 Initial operational target hypotheses

These are targets for validation, **not promised performance**: synthetic tasks recover correctly after worker restarts; 100% successful paid calls have cost events; 100% approved factual claims link to evidence or explicit authorised client assertions; all consequential actions require approval; tenant isolation test suite has zero known exceptions. Establish realistic latency and availability SLOs only after workload measurements.

---

## 15. Cost accounting and commercial benefits

### 15.1 Ledger scopes

Record resource consumption for **provider + model + tool call + task attempt + workflow run + project + client + tenant**. Usage events store raw reported units; CostEvents store an immutable estimate calculated from versioned price cards and foreign-exchange basis. Separate actual bill reconciliation, refunds and platform fees.

### 15.2 Budgets

Budget scopes: `per_model_call`, `per_task`, `per_workflow`, `per_project`, `per_tenant/day`. Preflight reserve a conservative estimate before new work. Owner decision 19 November 2026 (CHG-0096): spend limits are OFF by default. Every call is still metered and the owner cost page shows spend against the configured amounts, but nothing is refused unless `PORT67_SPEND_LIMITS=on`; approvals, not caps, stop a project. When enforcement is on: stop the *next* paid task once the ceiling is reached; an in-flight model call may cost more than estimate, so report overruns rather than promise mathematically impossible hard spend guarantees. Rate-limit and concurrency guard at queue and provider levels.

**Initial EXPLAIN text-agent budget hypothesis:** £50 maximum targeted per project for combined research, message strategy, script and text QA, excluding video rendering, licensed media, human/contractor time and project-specific paid services. Overall AI/software production target hypothesis: below 5% of project revenue unless explicitly justified. Test and revise against real usage.

### 15.3 Project economics

`Direct contribution = recognised project revenue - attributable variable delivery costs`.

Report: provider tokens/tools, rendering, licences, contractors and time by activity; show founder time separately and optionally imputed at a transparent assumed hourly value. Distinguish booked sales, recognised revenue and cash received. Reflect that the master plan targets 60–70% project gross contribution before fixed overheads and founder time and that the £6,000 explainer/£1,500 variable-cost illustration is not a verified benchmark.

### 15.4 Outcome measurement

Track project turnaround, human approval time, rework per artifact, first-pass accuracy, percentage of agent output approved unchanged, defects post-delivery, token/media cost, founder hours per project, contractor effort, margin, repeat bookings and retainer adoption. Only claim time saved versus measured manual baseline.

---

## 16. User interfaces and user journeys

### 16.1 MVP pages

1. **Sign-in:** Firebase Auth, enforced role.
2. **Clients:** browse/create client and versioned context.
3. **Projects:** create EXPLAIN project, select client, owner, brief and budget.
4. **Project Detail:** scope, context version, workflow status, task graph, outputs and cost summary.
5. **Run Detail:** task attempts, provider, model, selected agent/skill versions, events, timings and source links.
6. **Evidence Review:** research findings, supported/unsupported/conflicted claims, citations and missing evidence.
7. **Approval Queue:** approve/reject a specific immutable artifact version with audit reason.
8. **Factory Operations:** active/blocked workflows, failures, cost and alert summaries.
9. **Customer Portal:** minimal brief/assets, targeted clarifications, research-backed direction review, version-specific feedback/approval and approved downloads.
10. **Registry Admin (basic):** view approved agent/skill/model policy definitions; enable/disable with permission.

### 16.2 Primary EXPLAIN user journey

Producer signs in -> creates fictional/demo or real authorised client -> enters discovery brief -> attaches authorised context -> reviews snapshot -> selects workflow version and budget -> starts work -> watches parallel tasks -> receives verified Research Pack -> reviewer inspects provenance and uncertainties -> approves or rejects specific version -> status and cost history persist -> later stage proceeds only after approval.

Customer service journey: minimal brief -> segmented research -> Port67-reviewed strategy with messaging/design rationale -> customer direction approval -> scoped specialist production -> customer revisions/final approval -> delivery. Phase-two reporting/publication remains separately authorised.

### 16.3 Usability requirements

Design for a small internal team: compact information hierarchy, status clarity, one obvious pending decision, no fabricated “agent thoughts,” accessible basic keyboard navigation, explicit cost warnings, clear draft/approved/superseded labels. Prioritise functionality over design polish for M1/M2, but avoid workflow UX that hides source evidence or budget state.

---

## 17. Implementation strategy and milestone gates

### Milestone 0 — Audit and documentation governance (before feature coding)

**Deliverables:** Synapse architecture audit, reuse-vs-rebuild matrix, initial PRD approved by owner, AGENTS.md, provider-specific pointers, ADR system, initial threat model, repository structure, CI docs governance checks, milestone backlog and architecture diagrams. No production deployment or live client data.

**Acceptance:** a fresh Codex/Claude/Gemini session can read the repository and correctly explain scope, current implementation state, decisions and next step; audit references actual Synapse file paths; no undocumented Synapse dependencies.

### Milestone 1 — Shared Firebase foundation

**Implement:** separate Firebase dev environment, auth, tenant/client/project records, server-side authz, storage isolation patterns, context snapshots, versioned registry definitions, workflow/task/cost/audit record schemas, basic React UI, Firebase Emulator rules tests, CI. Stub adapters are permitted; no full production agents required.

**Acceptance:** multi-tenant isolation tested; immutable snapshot/artifact version contracts; API denies wrong permissions; usage and audit primitives tested; complete project handover and docs.

### Milestone 2 — On-demand single-agent vertical slice

**Implement:** Cloud Tasks dispatch, Cloud Run worker, one EXPLAIN technical researcher using one approved reusable research skill, first provider adapter, source/claim ingestion, typed Research Pack draft, trace/cost logging, approval pause, retry/idempotency/failure handling, visual run view.

**Acceptance:** FlowPilot synthetic project runs from intake to approved or rejected Research Pack; task retries and worker restart do not corrupt state; every paid call attributed; no input leak; one gated artifact.

### Milestone 3 — Provider/harness portability

**Implement:** run same bounded research test suite against OpenAI, Anthropic, DeepSeek and xAI/Grok; map outputs to common contract; capability policy and rate/price registry; fallback constraints. Use native harnesses only for demonstrated needs.

**Acceptance:** each provider either passes structured output, cost accounting, tool policy and provenance tests or is explicitly labelled unsupported for that capability; no production exposure of an unverified adapter.

### Milestone 4 — Parallel EXPLAIN research

**Implement:** three isolated specialist research tasks fan out, Evidence Verifier joins outputs, contradiction handling, Research Pack QA, human gate and partial rework.

**Acceptance:** genuine parallel scheduling, no sibling output in agent input, no unsupported claim silently promoted, failed branch/approval recoverable, provenance consistent.

### Milestone 5 — Messaging and script production

**Implement:** Message Strategy, Scriptwriter, Critic, QA, timed/script schemas, approvals, revision rounds, diff and cost reporting.

**Acceptance:** campaign-specific duration/format checks (60–90s remains a demo example), customer-approved strategy dependency, claim-linked factual lines, production task contracts, approved artifact packaging and review history.

### Milestone 6 — Storyboard, asset rights and media adapters

**Implement:** structured storyboard, visual direction, selected image/voice/media adapters, rights manifest and render-job tracking. Test output and real art direction remain human-supervised. The cinematic video advert track (section 25.5, FAC-VID-001 to FAC-VID-011) extends this milestone and is phased: treatment, continuity profile and prompt compiler first, then approved image and video adapters, then timeline export.

**Acceptance:** all release assets licensed/authorised, render sources/version manifest complete, final technical/legal/human QA gate.

### Milestone 7 — Shared factory extension

**Implement:** one small UNDERSTAND dashboard demo and one bounded AUTOMATE synthetic workflow using shared base, only after EXPLAIN unit economics and reliable operations are evidenced.

**Acceptance:** both reuse tenancy/context/registry/execution/cost/audit/approval contracts; no unnecessary rewrite.

### Milestone 8 — Client scale and retainers

Contractor assignment, expanded client self-service beyond the phase-one brief/approval portal, scheduled managed reporting/content production, invoicing integration, measured service SLAs and stronger monitoring. Scope based on paid demand and risk.

---

## 18. Mandatory automated tests and acceptance gates

### 18.1 Foundation security

- SEC-01: tenant A cannot read or write tenant B data via UI SDK, API or worker.
- SEC-02: same-tenant contractor denied non-assigned client/project.
- SEC-03: wrong tenant/client storage object access denied including signed URL path tampering.
- SEC-04: Firestore Admin SDK path still checks application authorisation.
- SEC-05: secrets never exposed to browser bundles, standard logs or tool outputs.
- SEC-06: compromised/unapproved provider or skill rejected before model call.
- SEC-07: prompt injection in source material cannot grant tool permissions or trigger external writes.

### 18.2 Versioning and provenance

- VER-01: active run uses frozen context despite later client updates.
- VER-02: approval references immutable artifact hash and invalidates after revision.
- VER-03: same task idempotency key cannot create duplicate approved artifacts.
- EVD-01: referenced sources exist and belong to permitted project/client scope.
- EVD-02: no unsupported claim marked SUPPORTED without acceptable evidence.
- EVD-03: client assertion not automatically treated as independently verified.
- EVD-04: missing/conflicting evidence appears in output and reviewer UI.

### 18.3 Agent execution and orchestration

- AGT-01: malformed output schema fails closed.
- AGT-02: task dispatched twice does not double-transition state or create duplicate artifact.
- AGT-03: worker crash/restart safely recovers or signals human intervention.
- AGT-04: downstream task never starts while dependency incomplete or approval pending.
- AGT-05: three research agents do not receive sibling results before aggregation.
- AGT-06: max tool calls, attempts and configured time bounds enforced.
- AGT-07: fallback provider obeys data classification and capability policy.
- AGT-08: cancellation/kill switch blocks future paid invocations.

### 18.4 Cost and observability

- CST-01: all actual paid calls have linked usage records (including failed attempts where provider billed).
- CST-02: project estimated cost equals ledger totals by included event types.
- CST-03: price-version change does not rewrite historical estimates.
- CST-04: in-flight overspend shown separately; new paid calls blocked after cap.
- OBS-01: run trace ties task/agent/model to audit record.
- OBS-02: standard logs do not contain raw client-confidential inputs/outputs.
- OBS-03: synthetic failure and stuck approval trigger visible operations warnings.

### 18.5 Development process

- DEV-01: protected branch tests/format/type checking pass.
- DEV-02: PR links requirement IDs, tests, documentation and risk/rollout notes.
- DEV-03: changes affecting behaviour update PRD or explicitly state why no requirement change is necessary.
- DEV-04: implementation status not marked VERIFIED without test environment, date and commit evidence.
- DEV-05: fresh session can follow documented setup with no prior chat context.

### 18.6 Milestone release checklist

Every milestone release must record: tag, commit SHA, PRD version/hash, ADR set, DB/rules/index migration version, deployed environment, test commands and outcomes, known limitations, spend-to-date, open incidents and next gated milestone. No release claim based solely on generated code or model assertions.

---

## 19. Initial repository structure

```text
port67-factory/
  PRD.md
  AGENTS.md
  CLAUDE.md
  GEMINI.md
  README.md
  package.json
  pnpm-workspace.yaml                 # choose package manager after audit
  .github/
    workflows/ci.yml
    workflows/docs-governance.yml
    PULL_REQUEST_TEMPLATE.md
  docs/
    ARCHITECTURE.md
    DATA_MODEL.md
    DECISIONS.md
    CHANGELOG.md
    IMPLEMENTATION_STATUS.md
    HANDOVER.md
    TESTING.md
    SECURITY.md
    COST_MODEL.md
    RUNBOOK.md
    SYNAPSE_AUDIT.md
    adr/
  apps/
    web/                              # internal admin console
    api/                              # thin authorised API
    worker/                           # Cloud Run agent task workers
  packages/
    domain/                           # shared runtime schemas/types
    authz/                            # tenant/client/project policy
    context/                          # snapshots and retrieval
    registry/                         # agents, skills, tools, harnesses
    orchestration/                    # task state machine and dispatch
    agent-runtime/                    # unified request/result protocol
    provider-adapters/                # Genkit and approved native adapters
    evidence/                         # sources, claims and verification
    artifacts/                        # immutable versioning
    approvals/                        # human gates
    cost-ledger/                      # usage, pricing, attribution
    observability/                    # safe tracing and structured events
    factories/
      explain/
      understand/                     # schemas only until authorised
      automate/                       # schemas only until authorised
  skills/                             # source-controlled reviewed skills
    research/
    communication/
    quality/
  infra/
    firebase/
    firestore/
    storage/
    gcp/
  tests/
    unit/
    integration/
    tenancy/
    workflows/
    evals/
    e2e/
  fixtures/
    flowpilot-synthetic/
  scripts/
```

This is a target logical layout. Codex should adapt the package manager, Next/React choice and Firebase conventions after inspecting Synapse. Do not create empty scaffolding merely to look complete; create actual packages as milestones require.

---

## 20. Synapse reference integration protocol

The exact Synapse/Synapsys repository, framework, data model and code ownership are **NOT VERIFIED** by this PRD. Codex, with authorised GitHub access, MUST:

1. Identify canonical repository, branches and development environment.
2. Review package manifests, Firebase config, Functions, Cloud Run deployment, auth, Firestore rules, storage, UI components, CI, testing, secrets patterns and agent integrations.
3. Cite actual files/line references in `docs/SYNAPSE_AUDIT.md` for all reuse claims.
4. Classify modules as `REUSE_AS_PACKAGE`, `ADAPT`, `REFERENCE_ONLY`, `REBUILD`, or `DO_NOT_COPY`.
5. Review IP/rights and environment-specific dependencies before extracting code.
6. Keep Port67 Firebase projects, storage, IAM, billing and production state separate.
7. Make new Port67 development reproducible from repository + documented environment variables; no hidden Synapse runtime reliance.
8. Propose exact delta to PRD/ADRs if Synapse audit materially changes stack choices; owner approves before foundational implementation.

No Codex coding task should claim to have completed this audit without actual repository inspection.

---

## 21. Permanent multi-LLM development protocol

### 21.1 Starting any session

Every coding assistant (Codex, Claude, Gemini or contractor) must:

1. Pull latest authorised repository branch and inspect status/dirty changes.
2. Read `AGENTS.md`, `PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/HANDOVER.md`, relevant runbooks and tests.
3. Read relevant source and migrations; trust code/tests for implementation facts, PRD for intended requirements.
4. List targeted requirement IDs, assumptions, open decisions and constraints.
5. Work on a named branch/PR; don't overwrite uncommitted changes from other sessions.
6. For ambiguous material scope, request approval or record a proposed decision; never silently modify business guardrails.

### 21.2 Ending any session

1. Report actual code changes and files, test commands and results.
2. Update `PRD.md` when requirements or intended behaviour changed, preserving history.
3. Update architecture/data/ADR docs for approved design changes.
4. Update `docs/IMPLEMENTATION_STATUS.md` per requirement and evidence.
5. Update `docs/CHANGELOG.md` for substantive behaviour changes.
6. Update `docs/HANDOVER.md` with branch, commit, milestone, tests, blockers and exact next actions.
7. Link relevant PR, test evidence, security implications and migrations.
8. Commit code/docs/tests together and request review; don't mark merged/verified until true.

A bug fix may not change PRD requirements; it still requires testing, changelog/status/handover updates where relevant. Prevent meaningless PRD churn by explicitly recording `PRD impact: none` with rationale when appropriate.

### 21.3 Automated governance

Protect `main`; use PR templates and CI checks for formatting, types, tests, Firestore rules, documentation files and change impact statement. For key domain folders, require PRD requirement IDs or accepted exemption, documentation diff and security review where applicable. CI cannot detect all semantic drift; reviewer must inspect final code/doc consistency. Use release tags with commit and PRD version.

### 21.4 Handover template

```markdown
# HANDOVER — YYYY-MM-DD
Developer tool: Codex | Claude | Gemini | Human
Branch / commit / PR:
Milestone / requirement IDs:
Scope completed (verified):
Files changed:
Tests executed and exact outcomes:
Schema/rules/index/deployment effects:
Provider usage and costs (if applicable):
Open defects/blockers:
PRD/ADR decisions requested:
Next recommended task, exact entry point:
```

### 21.5 PRD versioning

Use semver for PRD: **major** for structural/contract changes requiring migration, **minor** for new approved capabilities, **patch** for clarifications/corrections without changed product behaviour. Maintain `PRD CHANGE LOG` below and tag milestone commits. Dates and statuses must be truthful.

---

## 22. Initial operational metrics and decision gates

| Category | Measure | Baseline/decision treatment |
|---|---|---|
| Sales | paid £5k–£12k projects, proposals, enquiries | business-plan targets, validate externally |
| Delivery | project duration, revision count, acceptance time | instrument from first projects |
| Agent QA | first-pass approval %, unsupported claims, defects | start with synthetic evaluation fixture |
| Cost | model/tool cost, total direct cost, founder hours | record from first invocation/project |
| Reliability | task failures, retry, recovery time, stuck queue | instrument from MVP |
| Security | unauthorised access attempts, exceptions | fail closed and investigate |
| Knowledge | context reuse with approved version | measure cross-project reuse |
| Recurring | retained services, support load, gross contribution | introduce after paid demand |

**Scale gating:** Do not expand the agent catalogue or adopt costly new orchestration infrastructure until the first end-to-end workflow reliably passes acceptance and the current bottleneck is measurable. Retire or redesign unreliable agents that cost more to maintain than their value.

---

## 23. Open decisions, assumptions and risks

### 23.1 Decisions requiring confirmation after Synapse audit

- Exact source repository and owned/reusable IP boundaries.
- Frontend Next.js vs React/Vite, package manager, code style and shared auth conventions.
- Whether Genkit is the best default model adapter once capability tests are run.
- Whether Cloud Tasks + Firestore coordinator is sufficient for approval waits, fan-out/fan-in and long media jobs.
- Cloud region, disaster recovery, client data residency commitments and retention schedule.
- Direct Firebase client SDK access versus entirely backend-mediated sensitive operations.
- Pricing and FX method for provider cost ledger, budgets and reconciliation.
- Internal operations UX and role assignment model.
- Provider allowlist and model terms for confidential projects.
- Integration and rights policy for media services.
- Which data pipeline and warehouse (if any) to adopt for FAC-BAS-002, and which tool vendors (image and video generation, transcription, model routing, contact data) to evaluate for FAC-BAS-003 and FAC-BAS-005; candidates named in section 25.4 are unverified.

### 23.2 Main risks

- **Platform overbuild before paid demand:** implement vertical slice and measure commercial return.
- **Cross-tenant/client data exposure:** server authz, least privilege, isolation tests and independent deployments.
- **Provider lock-in:** agent/harness contract and exported artifacts, but compatibility tested rather than assumed.
- **Workflow complexity:** clear transition engine, idempotency and a documented escalation/migration path.
- **Hallucinated research/marketing claims:** first-class claims and sources, human evidence gate.
- **Hidden AI/API spend:** preflight budgets, every attempt metered, price versioning and alerts.
- **Misleading AI-generated visuals or rights gaps:** rights records, factual review and human release approval.
- **Stale AI coding-session memory:** repository PRD, status, ADRs, CI and handover as mandatory system.
- **Founder bottleneck:** measure review time and reject workflows that merely shift all production to founder corrections.
- **Employment/legal/IP conflicts:** outside business and public launch gates remain governed by business plan/legal advice.

---

## 24. Immediate instructions to Codex

**Your FIRST task is Milestone 0 — architecture audit and documentation governance, NOT implementing the entire platform.**

1. Read this full PRD and the Port67 Master Business Plan v1.1, if provided.
2. Audit Synapse with actual read-only repository evidence.
3. Create separate Port67 Factory repository or work in provided repo; do not modify Synapse production code.
4. Commit this PRD as `/PRD.md` unchanged until an owner-approved change is proposed; explicitly mark it unapproved/proposed baseline until approval.
5. Build universal `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, initial docs, decision register and CI doc checks.
6. Produce architecture comparison, reuse-vs-rebuild matrix, threat model, Firestore design, SDK/provider proof plan, milestones and specific `Task 002` implementation prompt.
7. Highlight contradictory requirements, unsafe assumptions or missing credentials WITHOUT trying to bypass permissions.
8. Return a decision report for owner approval. Do not provision paid infrastructure or start full feature development without authorisation.

**Acceptance for Task 001:** complete source-backed Synapse audit; owner-readable PRD and architecture delta; independent Firebase plan; typed first agent execution contract; realistic M1 backlog; documentation governance working in CI; no production or customer-data impact.

---

## 25. Reference materials and provenance

### Internal governing source

- **Port67.ai Master Business Plan v1.1 (9 November 2026)** — business purpose, three equal pillars, price hypotheses, target customers, boundaries, quality gates, agent human oversight, commercial economics and sales/launch plan. Incorporated as commercial basis, not as proof of technical implementation or validated pricing.

### Technical references (checked 11 November 2026)

- Genkit model-provider interface: <https://genkit.dev/docs/js/integrations/model-providers/> — lists OpenAI, Anthropic, DeepSeek and xAI, among others; actual model/harness capability varies.
- Cloud Tasks delivery semantics: <https://docs.cloud.google.com/tasks/docs/dual-overview> — at-least-once delivery; idempotent handlers required.
- Firebase privileged server libraries: <https://firebase.google.com/docs/firestore/client/libraries> — server SDK operations not evaluated against Firebase Security Rules; enforce IAM/service-side authorisation.
- Cloud Run minimum instances: <https://docs.cloud.google.com/run/docs/configuring/min-instances> — zero min instances and autoscaling patterns, subject to configuration/latency/billing.

These URLs are technical references, not acceptance-test evidence. Recheck at implementation and pin packages/providers against current supported versions.

---

## 25.1 Live-foundation requirements — owner-requested next stage

These requirements extend the authorised managed-service MVP; they do not approve the unresolved baseline architecture.

| ID | Requirement |
|---|---|
| FAC-MKT-013 | Before a paid provider invocation, a producer explicitly authorises the exact current brief as PUBLIC. Brief changes revoke that authorisation; revocation or changed context prevents accepting late results. Structured contact/logo fields are excluded from synthesis. Free-text data must be reviewed by the producer. |
| FAC-MKT-014 | Optional bounded AI insight and direction drafting uses reviewed public sources and accepted insights with validated reference IDs. Generated insights require producer acceptance; generated direction remains unshared until producer review, then customer approval. Record model/capability versions, input lineage, usage and failures. Preserve concurrent human edits. |
| FAC-MKT-015 | Provide a producer-only setup/readiness view with variable names and safe status, never secret values. Production live access requires canonical HTTPS origin, durable-storage confirmation, strong session credentials and an explicit launch switch. Render remains the selected host. Configuration presence is not connection verification. |
| FAC-MKT-016 | Grounded research returns claim-level findings: each finding is a single claim tied to the page it cites, with a short quote, so a reviewer approves or rejects claims through their own source rather than a pasted answer. A finding counts only if its page was a real citation. Research also records what it could not find (gaps) and a confidence rating, shown to producers. Research prompts are specific per segment and require the business website as a source for the business segment. |
| FAC-MKT-017 | The campaign direction carries a positioning statement, audience segments with needs, key messages each with proof and the reviewed source IDs that support it, a tone of voice, and claims to avoid, in addition to the earlier fields. AI drafting must supply all of them and is rejected if a key message cites a source outside the direction's evidence. Earlier directions without these fields remain valid and keep their fingerprints. |
| FAC-MKT-018 | A producer can draft an AI copy pack for an approved direction that has key messages and production drafts. Copy is written only from the approved direction and its reviewed sources; each item must express one of the direction's key messages, cite only that message's sources and contain no number absent from the supplied material, or the output is rejected with usage retained. The pack is a draft asset that follows the normal producer and customer approval; it is metered, capped and routed through the AI models page. Image, video and audio generation by a model are not implemented. |
| FAC-MKT-019 | In the Research room a customer or producer chooses up to five launch channels from nine core social channels (LinkedIn, Facebook, Instagram, TikTok, YouTube, Pinterest, Reddit, WhatsApp, X and Threads), shown as logo buttons. The choice steers research prompts, direction drafting and the channels copy may target. A customer can request research on the chosen channels; only a producer can authorise AI use and start the paid research, which runs the four research segments in turn. Channels and requests are locked once direction work begins. |
| FAC-MKT-020 | The Research room shows, to customers and producers alike, what the research is and how far each of the four research agents has got: not started, queued (a request exists), researching now, done with the number of sources found, or needing attention. It explains in plain language what each researcher looks for and which launch channels they focus on, refreshes itself while work is pending, and lets a producer see gaps and the run history. Customers see status and counts only, never run internals, provider details or error text. |
| FAC-MKT-021 | When research is triggered, the Research room shows an animated flow of its progress to producers and account owners: brief and channels, the four researchers, source review, then insights and direction, with moving connectors while data is flowing and a per-researcher state. Producers also see a live activity feed with the provider and model used, elapsed time, sources found, token counts and errors. Account owners see the same flow and states without provider, model, token or error detail. Animation respects the reduced-motion preference and the layout stacks on narrow screens. |
| FAC-DEV-008 | Gate CI on dependency audits with no high or critical findings. Document remaining findings and compatibility constraints; do not force unreviewed major migrations. |

## 25.2 Account-owned production and private costs — owner-requested extension

| ID | Requirement |
|---|---|
| FAC-TEN-008 | Verified individual sign-up/sign-in maps to a server-derived account ID used consistently across briefs, research, insights, builds, tasks, assets and exports. Customers cannot change ownership or access other accounts; agency producers use server-authorised account selection. One account per user initially; team membership is extensible scope, not implemented parity. |
| FAC-CST-009 | Every managed model/tool API dispatch records a durable private admin ledger event before invocation, with provider/model/account/project/run linkage, usage, versioned prices and failures. Owner-only reports distinguish estimated, unknown and reconciled actual costs; customers/producers cannot read costs. Archive without losing history. Infrastructure invoices remain separately reconciled; no absent usage/rate is treated as free. |
| FAC-HAR-004 | Explicit stage routing supports OpenAI, Anthropic Claude, DeepSeek and Gemini for reviewed-context drafting. Research uses only implemented grounded adapters (OpenAI/Gemini initially). Unsupported model/task combinations fail visibly. All adapters obey shared authorisation, metering, evidence validation and human approval gates; no hidden paid retries/fallbacks. |
| FAC-HAR-005 | The owner chooses, on an admin-only page, which provider and exact model handles each job (research per segment, drafting per stage), with stage defaults and a fallback to deployment settings. Research is offered only OpenAI and Gemini; a provider is selectable only when its API key is set in deployment settings, and keys are never stored or shown by the app. Model prices are first suggested from a public price list and may be edited by the owner; owner prices take precedence over the environment price list in spend caps and cost records. A saved route whose key is later removed fails visibly and never silently switches provider. Every change is recorded. Image and video model routing is future scope, not implemented. |
| FAC-HAR-006 | An administrator-only AI agents page lists every agent (research, drafting and template production), what each does, its capability contract and permissions, which model currently runs it and why, and what it has done: calls, completed, failed or unknown, whether one is running now, tokens, estimated cost and last activity, plus a recent-calls list. Calls are attributed to the agent that made them in the cost ledger; earlier calls recorded before attribution are counted separately. The page never shows API key values. |
| FAC-HAR-007 | The administrator AI agents page is where models are chosen, and the system map is the control surface: clicking an AI agent on the map opens an overlay in which the owner picks the provider and exact model (only providers with a key in deployment settings are enabled; research agents are limited to OpenAI and Gemini), edits or fetches the public prices, and accepts, after which the overlay closes. An Apply suggested setup action saves suggested stage defaults with public prices. There is no separate models page and no per-card or advanced model editor. Agents with no model are marked on the map with a prompt to choose one. Keys are never shown. |
| FAC-HAR-008 | The AI agents page opens with one system map that replaces the earlier separate journey and data-flow diagrams. It shows, in a single diagram, the input forms, the producer start step, every research and drafting agent with the provider and model it uses, Firestore stores with live counts, Firebase Storage for video, the LLM providers, the human gates (source review, insight acceptance, direction approval, copy and storyboard review, copy set approval), the template production agents, outputs, and monitoring leading to dashboards, alerts and troubleshooting. Each connector from an agent to a provider is one metered API call path, coloured by provider and labelled with calls and estimated cost. Hovering or keyboard-focusing a connector shows that path's API calls, outcome, tokens, estimated cost, average time and any earlier models; the cost and call count are also printed on the line. Running agents and in-flight calls animate, idle paths are faint, failed or unknown calls are red, and gates that are blocking are amber with a waiting count. The product does not publish to channels; publishing is the customer's action outside the product. |
| FAC-HAR-009 | A deployment switch, off by default, auto-approves the producer start step for build and testing: when a customer requests research, public-data authorisation is recorded under a named automatic approver, an audit entry is written, and the four research agents run in the background without a producer. It runs once per project. Source review, insight acceptance, direction approval and every later approval remain human, and the AI agents page states clearly when the switch is on. Removing the switch restores the producer in the loop. |
| FAC-HAR-010 | The administrator can observe where data flows, where it is blocked and where it does not flow. A written list derives, from stored counts and the call ledger across all accounts, which projects wait on a producer start or a human gate, which agents have failing or unknown calls, which agents have no model, and which agents have never made a call. When a research call returns no usable citations the recorded error states, from counts only, the response status or finish reason, any truncation, the number of output items, characters of text and citations seen, pages the search tool reports consulting, and findings parsed. A research finding counts as evidence only if its URL is either an inline citation or a page the search tool itself reported consulting; a URL the tool never returned is never accepted. For every failing agent the page shows the most recent failure message, which includes the provider's own explanation (for example the HTTP status and reason) with any credential-like text removed, and says when a call timed out; it appears on the agent card, in the blocker list and in the connector hover. Cost by model lists calls, failures, tokens, average time, estimated cost and share of spend, most expensive first, with unpriced calls shown separately and never treated as free. |
| FAC-MKT-022 | Before research runs, the Research room shows a research preparation panel: brief readiness (required and recommended items with how to fix each), the assumptions the researchers will make where the brief is thin, the questions each research agent will be asked and what it starts from, what the research will produce, and a rough input-size estimate for producers. The same questions are sent to the research agents. After research a downloadable research dossier groups findings by agent with sources, confidence and gaps; producers see every source and customers only sources a producer has accepted. Both exist before any drafting or rendering and cost nothing to produce. |
| FAC-HAR-011 | A scoping agent sits between the brief and the four research agents. It reads the brief and launch channels only (no web search), classifies the business (category, size band, reach, audience model, regulated sector) and writes for each researcher 3 to 5 questions matched to that type and size, preferred source types, out-of-scope items and a page budget. The result is validated, saved on the project record in Firestore with a version history and an audit entry, tied to the brief so a changed brief is redone, and readable at any time through GET projects/{id}/scope. A free deterministic template scope is saved when the agent is off, has no model, the brief is not authorised, or its output is invalid, so research never waits on it. The scoping output is visible to producers and admins only, never to customers. A producer and admin Diagnostics panel lists every failure and a UTC timeline with models, durations, request IDs and full error text, copyable for support. |
| FAC-HAR-012 | A producer orchestrator runs the producer steps between approvals using four walled-garden reviewers: scope, source, insight and direction. Each reviewer sees only the inputs its own decision needs (the source reviewer never sees insights or the direction; the direction reviewer never sees raw sources), has its own model slot and answer format, runs free rule checks first (a rule rejection is final) and then at most one metered model call, and its verdict is applied through audited commands and stored with its reasons. Reviewers can send work back for one redraft per gate, with notes passed to the drafting agent, after which a person decides. The orchestrator is rules only, audited as port67-producer-agent, hidden from account owners, creates the production drafts and AI copy pack after the account owner approves the direction, shares the assets, and never approves for the account owner. Loop protection: step, pass and reviewer-call limits, one pass at a time, no automatic pass when nothing changed. Automatic running needs PORT67_PRODUCER_AGENT=true; a producer can always run it by button. |
| FAC-MKT-023 | Each research agent receives its own scope (business profile, questions, preferred sources, out-of-scope, page budget) as data, not as instructions. A producer can read, re-classify and edit the scope in the Research room; edits are validated and versioned. When a researcher returns no citable findings, the start of what it wrote is kept as a producer-only run note and is never used as evidence. |

## 25.3 Owner-managed staff access — owner-requested extension

| ID | Requirement |
|---|---|
| FAC-TEN-009 | Three server-enforced access tiers, each requiring a verified individual sign-in: admin (the owner), producer (Port67 staff) and client (any verified sign-up, limited to their own account). Admins are set only through deployment configuration and can never be granted by the application. The admin adds and removes producers inside the app by verified email, with no redeploy. The role is re-evaluated on every request, so removing a producer, disabling a user or losing email verification takes effect immediately, and an unreadable staff registry never promotes anyone. Producers cannot read costs or manage the team. Team changes are recorded in an audit trail. Staff multi-factor authentication and approval of client sign-ups are future scope, not implemented. |
| FAC-ART-006 | A producer can render an approved motion storyboard to an MP4 from the current approved direction. The render is a deterministic template render (brand colour, logo, direction text; no AI model and no third-party media) of three scenes totalling 15 seconds, so it has no model cost. Video is optional: not every campaign needs it. A render requires both an approved storyboard and an approved copy set (the AI copy pack if one exists, otherwise the template copy) for the current approved direction. Renders default to a 480 by 480 draft; a 1080 by 1080 HD render happens only when the producer asks for it. the render is audited, one render runs at a time, and a project holds at most ten videos. The file is stored outside the workspace document (Firebase Storage in production) and is downloadable only through the authorised API: producers always, customers only for approved assets while delivery is not paused. Photographic or AI-generated video, audio and captions are future scope, not implemented. |

## 25.4 Baseline operating principles - owner-adopted

Adopted 2026-11-12 on the owner's instruction, from a summary of a creator's talk on running marketing with agents (Cody Schneider, "Digital Gravity"). These are product principles written vendor-neutrally. Vendor names and figures in the source (Airbyte, ClickHouse, Graft, Kai AI, FAL, OpenRouter, Apollo, roughly five dollars per UGC avatar ad, auditing 5,000 search terms in 20 seconds) are the speaker's claims and evaluation candidates only: none is adopted, verified or committed, and any adoption needs an entry under section 23.1 and the cost, rights and data-class review that every provider already requires. Every principle below operates inside the existing authorisation, metering, spend-cap, evidence and human-approval gates; none permits autonomous publishing or autonomous spend.

| ID | Requirement |
|---|---|
| FAC-BAS-001 | Agents do the middle work of marketing (research, analysis, drafting, production) once they have three things: governed data, platform access and approved tools. Humans own strategy, approval and the design of the system around the agents. The product is built as that system: a producer coordinates agents and reviews their work rather than doing the middle steps by hand. |
| FAC-BAS-002 | Warehouse-first data for agents (phase two). Agents read full-funnel data (ad platforms, web analytics, CRM, payments) from a governed, per-client scoped analytics store fed by a data pipeline, not by calling rate-limited platform APIs directly. Agents have read-only access, never keep their own duplicate local copies, and results trace an ad through to revenue and customer lifetime value. Pipeline and warehouse products are chosen later and remain replaceable. |
| FAC-BAS-003 | Approved tool layer for agents. Image and video generation, transcription, model routing and contact or person data are offered to agents only as reviewed tools in the capability registry, each with declared permissions, data class, cost metering through the ledger and owner approval. Tools are never added at runtime, and personal data tools need an explicit lawful-basis decision. |
| FAC-BAS-004 | One platform turns a brand URL into several researched, on-brand static ads. The flow runs through the existing research, direction and copy steps and the brand's own colours and logo, produces multiple variants each tied to evidence and a key message, and stays draft until producer and customer approval. Today's single artwork template is a partial start; multi-variant ad generation is not implemented. |
| FAC-BAS-005 | Optional UGC-style avatar ads with motion graphics, owner-enabled per account. A unit cost estimate is shown before generation and counts against the spend cap. Any avatar likeness or voice needs recorded rights and consent, output is labelled as synthetic where required, and impersonating a real person is refused. The roughly five-dollar cost in the source is a target to validate, not a quoted price. Not implemented. |
| FAC-BAS-006 | Creative velocity. The system supports producing and tracking high volumes of creative variants per campaign (variant limits, naming and lineage), because ad platforms match good creative to the right buyer. In phase two, variant performance is measured and winners are identified; putting paid spend behind winners always needs customer authorisation and respects spend caps. Not implemented. |

Provenance: the principles come from a summary pasted by the owner, not from a primary source the team has verified. Treat figures as unverified until tested in this product.

## 25.5 Video advert production (cinematic commercial) - owner-requested next stage

Added 2026-11-15 on the owner's instruction. This is a **separate product track from the animated explainer** (section 10, the EXP catalogue, and the template motion storyboard and MP4 of FAC-ART-006). A video advert is a short cinematic commercial (typically 15 to 60 seconds) made of generated shots with characters, locations, dialogue and music, held together by visual continuity. The owner supplied a template named "AI Commercial Production OS" (a Creative Director agent, a Cinematographer agent, an Art Department agent and a Technical Prompt Engineer agent, using a mood board, a reference-frame library, an image tool, a video model and a timeline export). Port67 adopts its **structure and principles, vendor-neutrally**. Every vendor and figure in it (Milanote, Shot Deck, Higgsfield, Seedance 2.5, Adobe Premiere, "a five-hour workflow", "4K") is a claim and an evaluation candidate only, not adopted or verified. The template's named core model ("Claude 3.5 Sonnet") is superseded: all agents use the admin model routing and metering already built. Everything below runs inside the existing evidence, authorisation, spend-cap and human-approval gates; none permits autonomous publishing or autonomous spend.

**How the template maps onto Port67**

| Template element | Port67 equivalent |
|---|---|
| Orchestrator delegating to four sub-agents | The producer orchestrator gains a video advert branch, with the same walled-garden AI reviewers, relevance scores, evidence checks, one rework per gate and holds for a person (CHG-0045, CHG-0055, CHG-0058). |
| Creative Director agent (story, characters, dialogue, music cue timestamps, board layout) | Advert Treatment drafter. Starts from the approved campaign direction, its key messages and reviewed evidence, so the story expresses researched messages and adds no unsupported claims. Produces treatment, character sheets, dialogue, music cues with timestamps and a shot list. |
| Cinematographer agent (Continuity Engine) | Continuity Profile: one typed, versioned JSON contract (colour palette as hex codes, lighting, camera body, lens, aspect ratio, grade, per-shot overrides) built from reference images the customer supplies or a library Port67 is licensed to use. Extracted values are model estimates shown with confidence and are editable by a producer, never presented as measured fact. |
| Art Department agent | Reference asset generator through an approved image tool in the capability registry: locations, props and character sheets matched to the Continuity Profile, each with rights metadata and a synthetic label. |
| Technical Prompt Engineer agent | Shot prompt compiler. **Deterministic code, not a model**: it orders reference tags exactly as the chosen video provider requires, injects the Continuity Profile, applies the maximum shot length and the resolution tier, and rejects anything outside the rules. It is covered by golden tests per provider. |
| Mood board (Milanote) | In-app Advert board first: character sheets, music references and scene-by-scene breakdown, reusing the static storyboard grid (CHG-0054). An external board adapter is optional and later, behind the approved tool layer. |
| Seedance and Higgsfield | A provider-neutral video generation adapter and an image adapter. One provider is wired first behind that interface and every other is swappable. |
| Premiere timeline script | Timeline export (EDL or editor XML) that places approved clips against the music timestamps, plus the clips themselves. Scene-cut detection is optional. |

**Phasing**
1. **No external vendor needed:** treatment, shot list, Continuity Profile, deterministic prompt compiler, in-app Advert board and a downloadable prompt pack a producer can run in any video tool. Clips made outside can be uploaded and attached to shots.
2. **Approved image and video adapters:** reference asset generation and clip generation with cost estimate, caps and rights gates.
3. **Assembly:** timeline export, optional scene-cut detection and, if justified, an external board adapter.

| ID | Requirement |
|---|---|
| FAC-VID-001 | Video advert is its own track with its own artifact kinds (treatment, continuity profile, reference asset, shot prompt, clip, timeline). The animated explainer track and the existing template storyboard and MP4 render are unchanged by it. |
| FAC-VID-002 | Advert treatment and shot list. Built from the current approved direction, its key messages and reviewed evidence. Each shot names the key message and evidence it expresses; spoken and on-screen claims come only from approved key messages. Includes story, characters, dialogue and music cues with timestamps. The customer approves the treatment before any generation spend. |
| FAC-VID-003 | Continuity Profile as a typed, versioned, hashed contract applied to every shot: colour palette as hex codes, lighting, camera body, lens, aspect ratio and grade, with per-shot overrides. Inputs are reference images supplied by the customer or from a licensed library only; scraping a library against its terms is refused. Extracted values are labelled as estimates with a confidence and are editable. A shot cannot be compiled without an approved profile. |
| FAC-VID-004 | Reference asset generation through an approved image tool only, matched to the Continuity Profile, each asset carrying rights metadata and a synthetic label, staying draft until a producer approves it. A character or voice that resembles a real person needs recorded consent; impersonation is refused. |
| FAC-VID-005 | Shot prompt compiler is deterministic. It orders reference tags exactly as the selected provider's rules require, injects the Continuity Profile, applies the shot length limit and resolution tier, validates that every referenced asset exists and is approved, and rejects a shot that breaks a rule. Provider rule sets are versioned and covered by golden tests. |
| FAC-VID-006 | Cost control. A maximum generation length per shot (default 10 seconds) and per advert; two resolution tiers, a low-cost draft tier used by default for testing and a final tier used only when a producer asks after the draft is approved. A cost estimate is shown before every generation and counts against the monthly, project, per-run and per-model limits; calls are metered in the ledger with run lineage; one generation runs at a time with a retry limit; no spend happens without a producer action. Real unit costs are measured and recorded, not assumed. |
| FAC-VID-007 | Gates. Customer approves the treatment; a producer approves the Continuity Profile and reference assets; a producer then the customer review draft clips; the customer approves the final render. Rework makes a new version linked to the rejected one. AI producer reviewers (treatment, continuity, prompts and rights) score relevance, list unsupported claims and send work back once, as for the other gates, and never approve the final advert on the customer's behalf. |
| FAC-VID-008 | Assembly and export. Approved clips are placed on a timeline against the music timestamps and exported as an editor-friendly package (EDL or editor XML) with the clips, a manifest and the prompt pack. Scene-cut detection of multi-cut generations is optional. All steps are audited. |
| FAC-VID-009 | Rights and claims. Music, voices, likeness, logos, fonts and third-party reference imagery each need recorded rights; missing rights block final release (FAC-ART-004). Output is labelled as synthetic where required. A claims check confirms spoken and on-screen claims trace to approved key messages and evidence. |
| FAC-VID-010 | Tool adoption gate. The template's vendors are evaluation candidates only. Each adopted tool needs an entry under section 23.1, a licence and terms review, a data-class decision, a cost model, a capability registry entry and owner approval. Model Context Protocol may be used as an implementation detail of a tool adapter but is not a requirement. |
| FAC-VID-011 | Measure the claim. Time and cost per advert (treatment to approved final) are measured per project so the template's "five hour" figure and any unit cost are tested rather than assumed. |

Provenance: the structure comes from a template pasted by the owner, not a primary source the team has verified. Implementation status: phase 1 (planning, Continuity Profile, prompt compiler, no vendor) is built under CHG-0061; later phases are planned. See docs/IMPLEMENTATION_STATUS.md.

## 25.6 Research-led adjacent and social/video intelligence — owner-authorised 15 November 2026

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FAC-MKT-024 | P0 | Research the client, customers, direct competitors, creative conventions, adjacent businesses, current social patterns and video language | Seven bounded roles are scoped to the business and chosen channels, independently routed and metered; adjacent research explains shared audience/occasion and transfer limits |
| FAC-MKT-025 | P0 | Source-led trend and creative learning feeds campaign and commercial production | Research records dated examples, uncertainty and counterexamples; synthesis includes all research areas and reviews evidence before proposing original adaptations; popularity is not conversion proof |
| FAC-VID-012 | P0 | Explicit direct-video craft analysis with provenance | Producer can submit an existing public YouTube reference for a metered Gemini analysis of style, apparent lighting, motion, graphics, pacing, duration, hook and audio with timecodes; first 120 seconds sampled at 2 fps; unavailable video produces no visual evidence |
| FAC-CTX-009 | P0 | Freeze complete public research context and reject stale results | Runs pin public brief fields, channels, scope and skill version; changed inputs or withdrawn authority reject late results while paid usage is retained |

Existing customer gates, owner-only cost access and monetary limits remain authoritative. Additional research increases potential calls; defaults allow 500 research/drafting runs per project (CHG-0095; PORT67_MAX_RESEARCH_RUNS adjusts it, maximum 5000), explicit configured caps still win. Existing four-role campaigns can finish without forced paid reruns; a new/expanded scope opts into all seven roles. Public search is not a live social firehose. Platform discovery endpoints do not imply authenticated connectors or access to blocked posts. Page budgets remain provider instructions, not a deterministic per-page cap. Private customer upload, generic skill promotion, a durable workflow queue and the rest of the integration design remain separate work.

## 25.7 Creative pipeline: skills, ad formats, strapline, audiences, ideas bank - owner-requested

Inspired by a public talk on an AI creative research pipeline (research feeds a weekly pack, a human selects the best ideas into an ideas bank, then execution). The source is a video the owner shared, not a primary source the team has verified; its tools (Parker, Frame.io), its creator-sourcing automation (Apify, outreach and negotiation) and its numbers are evaluation candidates only and are not adopted. The principle adopted is that AI presents the data and ranked options and a human decides.

**Flow:** research, source review, insight review, then **ad format decision**, then direction (written for the chosen formats, with the strapline and audience segments), then ideas bank, then production per format. The video track (25.5) applies only when a video format was chosen. UGC video is a creator-style format: native vertical, handheld, casual captions, testimonial or demo, with a brief for a real customer or hired creator; synthetic generation of UGC must be labelled and never impersonate a real person.

| ID | Requirement |
|---|---|
| FAC-SKL-001 | Every AI agent has one skill: editable guidance on method and quality, seeded with a built-in default. The fixed rules (untrusted input, no invented figures, cited sources only, output schema) stay in code and a skill is appended after them and cannot remove them. |
| FAC-SKL-002 | The agent always runs the latest saved skill. Every save creates a new version kept in the database with who saved it, when and an optional note; history is reviewable. Only the owner admin can edit. |
| FAC-SKL-003 | Each agent on the system map has a clickable Skill control beside the model control. It opens a popup with the agent's purpose, the skill now running, an Edit button, version history and a way to reload the built-in default. |
| FAC-SKL-004 | Agents receive the context they need to search and write precisely. Every research agent gets the full audience and, when the customer fills them in, where the business operates, what makes it different and the proof it already has. The insight writer gets the best graded sources first (not three per research agent), each with its grade and claim-level findings, plus the scoping profile and what the researchers could not confirm. The optional brief fields are only stored when filled in, so existing briefs keep their fingerprint and AI authorisation. They are available to skills as {{market}}, {{differentiators}} and {{proof}}. |
| FAC-SKL-005 | The campaign direction writer receives the previous direction and the customer's feedback on a redraft, the ideas a producer kept, and the launch channel playbooks. The copy writer receives the full brief including optional fields, segment demographics, the chosen ad formats, the channel playbooks, kept ideas, graded sources with claim-level findings, and any change requests on earlier copy. Person-typed text is collapsed to one line, clipped and passed as data, never in the instructions. |
| FAC-SKL-006 | An owner admin tab, Skill writer, lets the owner choose any agent, optionally paste a skill written for a different system, state what to change and add notes, and get back a skill produced by a strong OpenAI reasoning model (selectable, with reasoning effort) following the adaptation method. The model receives the agent's job, current skill, allowed variables and data fields; owner text is passed as data and never in the instructions. Output is validated (length, allowed variables, strict fields) and shown with what was removed or kept, conflicts and test questions. Nothing is saved until the owner saves it as a new version through the normal skills route. Calls are metered under admin:skill-writer and obey the spend caps. |
| FAC-FMT-001 | After the insight review a producer chooses the ad formats to make: static, short-form video, long-form video, UGC video, motion graphics, written ad, blog or white paper. The destination channels come from the customer. |
| FAC-FMT-002 | The system suggests formats from the chosen channels, the objective and the accepted insights, each with a reason. Two sources exist: a free rules-based suggestion and an AI format agent (own skill, model slot, metering and strict contract: known formats only, a whole-number score from 1 to 10, reasons with no invented figures). The producer always decides, and the producer agent stops for the decision before drafting the direction.
| FAC-FMT-003 | The chosen formats are passed to the direction drafter. The video advert track requires a chosen video format. |
| FAC-AUD-001 | A project holds one strapline: the single message every ad carries. When set, it is the direction's message and cannot be altered by the drafter. |
| FAC-AUD-002 | A project holds up to six audience segments (name, who, angle). The direction is written with an angle per segment; every AI copy item names exactly one segment; the strapline is unchanged across segments. |
| FAC-AUD-003 | A producer can ask the AI audiences agent (skill-backed, metered, capped) for two to five strapline options and two to six audience segments with demographics, built only from accepted insights and supported sources. Segments cite supplied sources, figures not in the supplied material are rejected, nothing is applied until a producer uses a suggestion and saves, and customers never see the suggestion. Segments carry a demographics field passed to the direction, copy and ideas. |
| FAC-IDE-001 | A research pack summarises what the project holds: evidence rating per segment, customer voice roundup, competitor and creative findings, accepted insights, and ranked next actions. It states plainly when no performance metrics exist. It is computed, never stored, and shown to producers only. |
| FAC-IDE-002 | An ideas bank proposes up to ten ideas from key messages, chosen formats and segments, each with hook, angle, judging criteria and production notes. Two sources exist: free rules-based ideas and an AI ideas agent (own skill, model slot, metering and strict contract: chosen formats and named segments only, one key message by index, sources only from that message, no invented figures, no duplicates; it needs chosen formats). A producer keeps or drops each idea and sets its priority; AI ideas are labelled as AI.
| FAC-OBS-001 | A run progress view shows every stage as done, running, paused (with the reason), waiting for approval or not started; waiting and paused steps link to the page where the person acts. The orchestrator on the AI agents map shows on hover which project is held, where and why. |
| FAC-OBS-002 | The AI agents map gives agent nodes more space so lines and labels do not overlap, and a customer-safe version of the run view is offered. Not built. |
| FAC-REV-001 | A producer can review pending sources and draft insights one at a time from Run progress or the Research room: read the item, then Accept, Reject or Skip (keys A, R, S), with the count left and an Accept-all-remaining option that is logged as a bulk acceptance. The pending-source banner sits at the top of the Research room. |
| FAC-PRG-001 | The AI agents page has a project dropdown. With a project chosen, the page shows that project's Run progress and marks the system map: orange YOUR TURN where a producer must press something, blue RUNNING for the AI, green DONE, other steps greyed. With none chosen it lists every project with its next step and who acts. Run progress opens with a Your turn / AI is working / Nothing needs pressing line. The account level is paused: producers and admins press the customer approval gates by default, recorded as given on the customer's behalf; PORT67_ACCOUNT_APPROVALS=required restores customer-only approvals. |
| FAC-OVR-001 | The producer Overview is one sheet, "Campaign deliverables": every step top to bottom, each marked AI agent or Review, with its state and the button or link that does it. Review steps jump to the exact section (source or insight queue, formats, audiences, direction approval, assets) and the producer returns to the Overview when the decision is saved, or with Back to overview. A producer creating a brief first picks the customer account the project belongs to; on creation the Overview opens with the deliverables. |
| FAC-OVR-002 | For producers the Overview holds the whole flow on one page: Research setup (what is researched and the launch channels, with Start research) above Campaign deliverables, with one Re-run automatic checks button. The Brief tab shows the brief with an Edit brief button; saving returns to the Overview. The Research tab no longer repeats the channel picker or the producer orchestrator for producers (the log is under an advanced fold) and Restart from the brief lives on the Brief tab. |
| FAC-OVR-003 | The producer Overview has one Task planner: every active task of the project in order, numbered 1, 2, 3 with letters (3A, 3B) for parallel research agents and for production items under their parent. Each row shows AI agent or Review, its status (done, running, ready, needs you, waiting for approval, not started), what is needed, and the button that does it or a jump link that returns to the Overview afterwards. One Run ready tasks button starts every ready agent task. Why-this-task, dependencies and manual completion sit under each row; AI research planning, agent selection and plan history are under Plan settings. The separate Performance feedback panel and task table are removed from the Overview (Performance learning stays in the menu). |
| FAC-PRV-001 | Model provider calls that fail because the provider is briefly overloaded or unavailable (HTTP 429, 500, 502, 503, 504) are retried twice with a short wait before the failure is recorded; a failed call returns no output and is not billed. Authentication, validation and other errors are never retried. |
| FAC-COST-001 | When the active API cost ledger batch is full, it is archived automatically before the next paid call so paid work is never blocked by ledger housekeeping; archived batches stay in history and in every spend total. PORT67_LEDGER_AUTO_ARCHIVE=off requires the admin to archive manually. |
| FAC-PRV-002 | AI plans that name a launch channel are accepted when the model writes the channel's id or its display name (any case or punctuation), mapped back to one of the channels the customer chose; a channel that was not chosen is still refused, and the model's output schema is limited to the chosen channel ids. |
| FAC-STO-001 | An operator can see how much stored space a project and its account use, and which lists are biggest. When a save would pass the workspace limit, bulky copies of the brief and context held on old finished runs are removed first; run records, hashes, usage, cost and the audit trail are never removed. Firebase accounts store one document per project, so the limit is checked per project document (about 850 KB, less 80 KB for each running task), not as a total across the account (CHG-0095). |
| FAC-STO-002 | PLANNED, not started. Split the single project record into a small project record (brief, status, approvals, indexes) plus separate records for sources (tagged by research agent), insights, runs, audit and assets, so there is no per-project size ceiling, research agents do not queue behind one record, and an agent view is assembled from only the records it needs. Must keep atomic spend-cap checks, approval gates and the audit trail, include a migration with rollback, and not change what any AI agent receives. Trigger: a project or account reaches about 60 percent of the workspace limit on the storage gauge, or before several live customers are onboarded. Agent skills and their variables are written against the agent views, not the storage layout, so they are unaffected. |
| FAC-IDE-003 | Ad account metrics, creator sourcing and outreach are not built. Each needs a tool adoption review first (section 23.1: licence and terms, data-class decision, cost model, capability registry entry, owner approval), because they touch personal data of creators, third-party platform terms and automated outreach on the owner's behalf. Per-format production beyond the existing storyboard, copy pack and video advert tracks is also not built and will be specified separately.

## 26. PRD change log

Ongoing version history: see `docs/CHANGELOG.md`, CHG-0003 for 1.1.0 and CHG-0004 for 1.1.1, CHG-0008 for 1.2.0, CHG-0009 for 1.3.0, CHG-0014 for 1.4.0, CHG-0016 for 1.5.0, CHG-0019 for 1.6.0, CHG-0020 to CHG-0022 for 1.7.0, CHG-0023 for 1.8.0, CHG-0024 for 1.9.0, CHG-0025 for 1.10.0, CHG-0026 for 1.11.0, CHG-0027 for 1.12.0, CHG-0028 for 1.13.0, CHG-0029 for 1.14.0, CHG-0030 for 1.15.0, CHG-0031 for 1.16.0, CHG-0034 for 1.17.0, CHG-0035 for 1.18.0, CHG-0036 for 1.19.0, CHG-0037 for 1.20.0, CHG-0038 for 1.21.0, CHG-0039 for 1.22.0, CHG-0040 for 1.23.0, CHG-0060 for 1.24.0, CHG-0062 for 1.25.0, and CHG-0063 to CHG-0065 for 1.26.0. The table below preserves the imported 1.0.0 baseline record.

| Version | Date | Author | Change | Status |
|---|---|---|---|---|
| 1.0.0 | 2026-11-11 | Port67.ai architecture draft | Initial full product PRD combining business-plan constraints, Firebase-first multi-factory design, dynamic multi-agent execution, skills, multi-provider harnesses, observability, costs, security, tests, phased roadmap and permanent multi-LLM development governance | Proposed; owner review + Synapse audit pending |

---

**Final operating rule:** **Port67 Factory has one durable project memory: versioned GitHub documents and verified implementation evidence.** The latest AI conversation is never a substitute. **Listen First. Build What Matters.**


## 25.8 Customer-driven project task plans — owner-authorised 16 November 2026 (CHG-0082)

This evolution replaces the mandatory seven-researcher path for new project intake with a customer-driven selection. It supersedes section 25.6's seven-role default for planned projects while retaining all seven available capabilities and legacy continuation. It does not adopt the proposed Cloud Tasks stack or install an external agent framework.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-TSK-001 | Generate a free, versioned task plan from customer input | Initial intake records campaign versus research-and-insights-only work and optional requested formats; objective, channels and confirmed formats select relevant research roles with inclusion/exclusion reasons. Explicit outputs override incidental industry wording. Brand and customer evidence remain foundational. |
| FAC-TSK-002 | Persist tasks, dependencies, assignments, acceptance criteria and progress | Project stores a validated acyclic graph; existing repository transactions reconcile running/completed/blocked states from run, evidence and approval records. Project management view shows tasks, assigned capabilities, dependencies, blockers, exclusions and bounded plan history. Customer projection shows titles/status only. |
| FAC-TSK-003 | Execute only relevant, dependency-ready work | Server denies excluded research before scoping/provider invocation and enforces dependencies for research, insight/direction drafting, copy packs and production. Orchestrator reads the plan and retains existing bounded reviewer rework, consent, identity, budget and approval controls. Research-only plans finish after reviewed insights. Paid failed tasks require deliberate producer retry. |
| FAC-TSK-004 | Revise plans without erasing execution history | Brief/channel/format changes before direction work replan; producer can override known research agents with a reason and expected plan version. Changed public inputs reject late outputs with usage retained and invalidate prior evidence for automatic use. Compatible selection/format changes retain completed work; old plans and execution lineage remain traceable. Existing post-direction scope locks remain authoritative. |
| FAC-TSK-005 | Match production agents to confirmed formats | Static-only work does not trigger motion or copy generation. Selected template agents have their own tracked tasks. Finished videos and long-form deliverables beyond current generators remain explicit producer tasks, completed only with a recorded handoff note; this cannot approve customer assets. No generic bot installation or live external side effects are introduced. |

Optional AI format, audience and idea suggestions remain deliberate producer actions. An available agent on the global map is not automatically scheduled for each project. Legacy projects keep existing behaviour until a producer explicitly adopts a task plan. Planner selection uses transparent deterministic heuristics, not semantic understanding or a paid planning model; producer review and overrides address ambiguous requests. Durable queue delivery, multi-worker orchestration leases, external-agent adapters and the storage split remain separate work.


## 25.9 AI research planning and evidence-backed medium decisions — 16 November 2026 (CHG-0083)

Owner authorises implementation and deployment without further approval pauses. Runtime customer approvals, authorisation and budgets remain authoritative. This extends the task architecture, not a new autonomous business policy.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-PLN-001 | LLM proposes research from the full authorised customer brief and channels | New explicit work-type intake enables AI planning. The task manager validates exactly one decision per existing research role, compatible methods, bounded questions and page instructions, reasons and limited-confidence medium hypotheses. Unknown agents/tools and malformed proposals cannot execute. Contact and raw logo bytes are excluded; URLs are leads, not browsed evidence. |
| FAC-PLN-002 | Planning executes through the existing metered, versioned task manager | Separate planner/medium model and skill slots; calls reserve costs and retain failed/stale usage. Planner precedes paid scoping/research; failed jobs require explicit retry or an audited rules fallback. Scope derives from accepted planner questions without a redundant paid classification pass. Current rules scope is cached. |
| FAC-PLN-003 | Research uses stronger, explicit methods | Brand claims/proof and product/offer; customer journey, dated review mining and denominators; category/competitor and public ad-library limitations; creative/organic examples; adjacent transfer limits; dated trends; honest video provenance. Method IDs must match the selected role. Page limits remain provider instructions, not independently enforced retrieval counts. |
| FAC-PLN-004 | Recommend media from reviewed evidence before confirming production formats | Show per-channel options, accepted source/insight references, counterarguments, uncertainty and requested-output differences. Channel knowledge is an unvalidated prior, not measured campaign history. Evidence supports suitability, not causal performance. Research-only projects omit this task. |
| FAC-PLN-005 | Producer confirmation preserves the customer request and current evidence version | Customer requested outputs remain unchanged. Confirmed formats need the expected recommendation version/evidence hash; the producer's reason is optional and, when blank, the app records the chosen formats and whether they followed the AI suggestion (CHG-0101). Stale or concurrent confirmation is rejected. New video/motion choices add targeted craft research without discarding compatible prior work. New evidence requires a current recommendation or explicit manual rationale before production. |
| FAC-PLN-006 | Expand the catalogue selectively through evidence-backed proposals | Planner records missing capability, why existing roles are inadequate and required inputs in the existing proposed-capability backlog. Proposals cannot install agents, grant tools, call vendors or activate workflows. Product/market depth is initially delivered by methods within existing brand/competitor roles. |

Legacy clients/projects retain their existing workflow until AI planning is enabled. New planner slots use explicit route, stage default, inherited configured scoping/format route, then environment; removed keys still fail visibly. No paid model fallback after invocation failure is introduced. No private ad-account connector, fabricated performance history, cross-customer learning, automatic model training, new research vendor or unreviewed agent promotion is introduced. Commercial third-party skill source text was not copied into runtime skills.


## 27. Selective specialists and measured feedback — owner requested 16 November 2026

| ID | Requirement | Acceptance |
|---|---|---|
| FAC-PLN-007 | Select channel/audience behaviour, product/offer and measurement specialists | Catalogue has three independently routed, metered research agents with distinct approved methods, scoped questions and inclusion/exclusion decisions. Existing seven-role projects continue without compulsory extra calls; new AI plans cover all ten roles. |
| FAC-FBK-001 | Capture auditable observed campaign results | Producer entry and bounded CSV import record campaign, channel, format, objective, audience, offer, dates, provenance, attribution, currency and optional observed metrics. Pending results need producer review; PUBLIC authorisation is separate. Unknown and zero metrics remain distinct; ratios require positive denominators. |
| FAC-FBK-002 | Use reviewed history in planning and medium selection | Only accepted, explicitly authorised observations enter metered planning prompts. Research plans cite available record IDs and explain transfer limits. Medium recommendations may cite matching channel/format history as observed_performance, with at most moderate confidence. Observations never establish causal winners or incremental results. New/rejected history invalidates old planning/recommendation context and stale derived hypotheses. |
| FAC-FBK-003 | Carry history into later campaigns within the same account | Producer explicitly selects a source project. Only accepted authorised records are copied with source provenance; copies start pending and need a new review. Repeated carry cannot duplicate source observations. No account joins by business name and no cross-customer training. Customer views exclude performance records. |

This supersedes the initial FAC-PLN-006 limitation of delivering offer depth only inside brand research. Other catalogue additions remain reviewed proposals. Direct advertising-platform ingestion and cross-project automatic matching are not implemented; the feedback loop uses supplied reports, manual entry and CSV. It improves model context, not model weights. Existing consent, spend limits, customer deliverable requests and approval gates remain.


## 28. Studio stages and two offers

Owner-approved direction, 20 November 2026 (CHG-0097). Design and data contract: `docs/superpowers/specs/2026-11-20-studio-stages-design.md`. Port67 sells two offers to e-commerce and DTC brands: the Product Scene Pack (`scene_pack`, static) and the Hook-Test Video Pack (`hook_pack`, short video). Every studio project moves through four gated stages, one active at a time: Client intake and brand memory, Creative strategy, Pre-production and Production, then delivered. Legacy projects (no `studio` field) keep today's flow and sidebar. This section covers build pieces A (CHG-0097), B (CHG-0098, PRD 1.31.0: Stage 2, Stage 3, the image adapter and thin research as a warning) and C (CHG-0099, PRD 1.32.0: Stage 4 Production, go-to-market checks, gate 4, delivery, performance read-back and the next cycle).

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-STU-001 | Offer catalogue and picker | Five offer cards: Product Scene Pack and Hook-Test Video Pack are selectable, each with its inputs, outputs and channels; Impossible B-roll hero commercial, Multi-language creator and demo ads and B2B tech launch trailer are greyed out, not clickable and marked Parked. The server refuses a parked offer. One offer per project. |
| FAC-STU-002 | New brief starts a studio project | "New brief" opens the studio intake (offer first). A producer picks the customer account as before; the account owner may also start one. The project is created with `studio`, the intake stage active and the other stages locked; no task plan and no paid work until gate 1. The classic campaign brief stays available from the same dialog. |
| FAC-STU-003 | Stage 1 intake with offer-specific completeness | Field groups for client and project, Brand Kit, references and mood, product and assets, social accounts and themes. Required and recommended markers follow the chosen offer (for example mood images are required for the Scene Pack and recommended for the Hook pack; the Hook pack needs a product URL, offer, call to action and at least three clips or photos). Social links, website and product URL must be public https addresses; the approver email must be valid. A live completeness panel lists missing required items and recommendations. |
| FAC-STU-004 | Uploads kept out of the project document | Logo, packshots and mood images (PNG, JPEG, WebP) and clips (MP4, MOV) are typed from their first bytes, not the declared type, and limited per file (logo 2 MB, packshots 15 MB, mood 10 MB, clips and piece files 100 MB) and per slot. The uploader confirms the right to use intake files. Bytes go to the private file store (Firebase Storage in production, a private local folder otherwise); the project stores only a `StudioAssetRef`. Files are served only through the authorised project route (producers always, customers only for their own project), inline with no-sniff and sandbox headers and byte ranges for video. |
| FAC-STU-005 | Gate state machine | Stages are approved in order; a locked stage cannot be approved. Plain approval of gate 1 requires a complete intake; approve with a note is always possible and needs a non-empty note, which later stages show. Reopening an approved stage makes it active, moves the project back to it and marks every later reached stage out of date (work kept); an out-of-date stage must be approved again. Intake and strategy gates are producer gates; pre-production and production are client gates that a producer may approve on the client's behalf under the existing PORT67_ACCOUNT_APPROVALS rule, recorded as such. |
| FAC-STU-006 | Per-piece review | A piece holds versions (AI, human edit or upload; old versions kept), comments (on images optionally a box or pin as fractions 0 to 1 of width and height, validated inside the image), resolve, approve and request changes. A new version marks every piece that depends on it, directly or indirectly, out of date. Each piece carries an AI disclosure tag that follows its current version. Pieces change only while their stage is open. |
| FAC-STU-007 | Rerun request and generator hook | Before a rerun the app lists the dependent pieces. Confirming records a rerun request whose brief is the piece's open comments plus an optional instruction. A generator registered for the piece kind (piece B) runs after the AI authorisation check; its output becomes a new AI version and dependants become out of date. Without a generator the request stays pending. No rerun limit. |
| FAC-STU-008 | Bridge to the research engine at gate 1 | Approving the intake maps the studio brief onto the existing brief (business, website, approval contact, objective from the offer, products, offer and call to action), launch channels (the offer's channels first, then channels from the social accounts supplied, at most five) and requested formats (static for the Scene Pack, short-form video for the Hook pack). A changed mapped brief revokes the AI authorisation. The task plan researches brand, customer, competitor, creative and channel only. Research, planning, drafting and the producer orchestrator are refused for a studio project until gate 1 is approved. |
| FAC-STU-009 | Studio sidebar, stage pages and reusable review components | For a studio project the left sidebar shows the four stages in order with a badge (locked, in progress, waiting for approval, approved, out of date), the active stage expanded with its steps, then Brand Kit, Project settings and admin-only Costs and Diagnostics; the classic pages sit in a folded group. Stages 2 to 4 say what will appear there, list their pieces and end with the gate bar. The gate bar and piece card are reusable components; controls are labelled and keyboard reachable, and image areas can also be entered as numbers. |
| FAC-STU-010 | One Brand Kit per account | Approving gate 1 saves the project's Brand Kit as the account's Brand Kit (its own small record). A new studio project in the same account copies it into any empty Brand Kit fields at intake; the copy is what the project uses. A shared logo is served only inside its own account. |
| FAC-STU-011 | Audited studio actions | Every intake save, offer change, upload, removal, gate approval (with note and on-behalf flag), reopen, bridge, piece addition, edit, comment, resolve, approval, change request and rerun writes an audit entry with the actor and role. |
| FAC-STU-012 | Stage gating of the existing engine (piece B) | On a studio project, research, scoping, source and insight review, insights, strapline and audiences, ideas and the campaign direction run (by command, paid route or the producer orchestrator) only while Creative strategy is the open stage; after gate 2 they are refused with a message to reopen Creative strategy. The classic flow after direction approval (production drafts, copy pack, assets, video advert and render, manual production tasks) is refused on studio projects at all times, the studio task plan ends at the direction approval and the orchestrator stops there. The offer fixes the format: the format choice, format suggestions, AI research planning and medium selection are not used. Legacy projects are unchanged. |
| FAC-STU-013 | Thin research is a warning (spec rule 7) | Fewer than two accepted sources in a research area that has run and been reviewed no longer holds the producer orchestrator, on legacy and studio projects. Producers see it as a warning in the producer agent warnings, on the Source review progress row and on the Stage 2 page. A thin-research hold saved by an earlier version is ignored and cleared on the next pass. |
| FAC-STU-014 | Stage 2 Creative strategy page | One page walks the producer through research (authorise and start in one step, research progress), source review (review queue or accept all), insights (AI draft, review queue, by hand), strapline and audiences, ideas and the campaign direction with its existing sharing and approval; no format or medium choice. The direction writer receives code-written offer framing on studio projects only: Scene Pack, 3 to 5 scene themes each with the message it carries; Hook pack, 3 narratives and the opening hooks to test with key messages and proof (in the design field; the output contract is unchanged). Clients see progress and the direction, not producer controls. |
| FAC-STU-015 | Gate 2 | A plain "Approve research and strategy" needs at least one accepted insight and the latest direction approved (by the client or a producer on the client's behalf through the existing direction approval). Approve with a note is always available to the producer and records what was outstanding (gate `gaps`, audit and later stage pages). |
| FAC-STU-016 | Stage 3 pre-production writer | With Pre-production open, the brief authorised and an approved direction with key messages, "Draft pre-production" makes one metered call (job Studio: pre-production writer, its own skill) using only the approved direction, numbered key messages, accepted insights and the studio brief, as data. Strict JSON is validated: Scene Pack mood board (palette including every brand colour), continuity profile (4:5 and 1:1), 3 to 5 themes and exactly one scene per product and theme (at most 25); Hook pack 20-second body script of contiguous timed beats with claims, exactly 3 narratives with 4 hooks of different styles, shot list, voice and captions. A wrong count, an unknown key message number or a figure in a message, voiceover, on-screen text, claim or proof that is not in the approved material rejects the draft (usage kept, nothing saved). It runs once; pieces are rerun singly. |
| FAC-STU-017 | Piece graph and reruns | Pieces are created with dependsOn links: scenes depend on the mood board and continuity, each test frame on its scene; narratives, shot list and voice notes on the script, hooks on their narrative, each keyframe on its hook. Every kind has a rerun generator: text kinds through the pre-production writer with the open comments, instruction and the pieces they depend on; image kinds through the image adapter with comments, image areas described in words (for example "top-left area: lighting too cold"). A rerun adds an AI version and marks dependants out of date; the card shows the cost note before a rerun. |
| FAC-STU-018 | Image adapter | A provider-neutral `generateImage({prompt, size, references?})` returns bytes, type and usage. The first implementation is OpenAI Images (generations, or edits when references are supplied), model from the Studio: image generation job, else PORT67_IMAGE_MODEL, else gpt-image-1, never inherited from the drafting default and OpenAI only. 429 and 5xx are retried twice; errors carry the provider's message with credentials redacted; the returned bytes must be a PNG, JPEG or WebP. Every call is metered in the ledger (unknown price allowed, usage recorded); bytes go to the private studio file store tagged AI generated. Prompts are built by code from the mood board, continuity, scene or hook text and brand colours, never from the client's raw brief text. The job appears on the AI agents page and map. |
| FAC-STU-019 | Test frames and keyframes on demand | After the draft the first five test frames or keyframes are drawn one call at a time; "Generate remaining test frames" (or keyframes) draws the rest, so cost stays visible. Errors (no model chosen, AI not authorised, provider error with its message) are shown on the page. |
| FAC-STU-020 | Gate 3 and client review | A plain approval of pre-production is blocked while any pre-production piece is a draft, has changes requested or is out of date, or any test frame or keyframe is missing; approve with a note is always available and records the gap. Clients see a client stage's pieces and files only after a producer marks it "Ready for client review" (or it is approved); producers may withdraw it, and may approve on the client's behalf (recorded) under PORT67_ACCOUNT_APPROVALS. Reopening clears the share. |
| FAC-STU-021 | Stage 3 page | Pieces are grouped (mood board and continuity, then each scene beside its test frame; or the script, each narrative with its hooks beside their keyframes, then the shot list and voice notes), each a piece card with Edit, Comment (areas on images), Rerun (impact first, cost note), Approve and Request changes, with a progress line (x of y approved) and the buttons Draft pre-production, Generate remaining test frames and Ready for client review. |
| FAC-STU-022 | Stage 4 preparation (piece C) | With Production open, a producer's "Prepare production" creates, for the Scene Pack, one still per approved scene at 4:5 and at 1:1 (scene by scene) until the intake quantity is reached (default 25, at most 50), each depending on its scene and the scene's test frame; for the Hook pack, one variant per approved hook (3 narratives x 4 hooks = 12), each depending on its hook, its keyframe and the body script. Unapproved scenes or hooks and stills over the quantity are skipped and listed. Preparing again only adds missing pieces. Optional motion loops (0 to 10) are upload pieces spread over the scenes with stills. A producer may remove a production piece; its stored files are kept. |
| FAC-STU-023 | Scene Pack stills | Each still is one metered call to the image adapter (job Studio: image generation) with the approved test frame (when drawn) and up to four client packshots as reference images, and a prompt built by code from the scene, mood board and continuity text, the brand colours and the ratio. 4:5 is drawn at 1024x1536 and stored cropped to 4:5 (PNG); 1:1 at 1024x1024. Stills are drawn one per request by the page with progress and a Stop button; a still rerun uses the same references plus the open comments and instruction. Output is stored privately, tagged AI generated, with its rights and real pixel size. |
| FAC-STU-024 | Hook pack variants and the video adapter | Each variant shows and downloads a prompt pack: shot-by-shot prompts for any video tool (the hook's first 3 seconds, then the body beats), voice-over lines, on-screen text, captions, voice and the music cue, all from approved pieces. The producer uploads the finished 9:16 MP4 on the variant and must choose its AI disclosure (AI generated, AI edited, no AI); rights may be given with the upload. A provider-neutral `VideoProvider.generateClip` interface exists with no provider configured; the page states "No video tool connected; upload the clip". Loops work the same way from a loop prompt. |
| FAC-STU-025 | Real file sizes | Uploads and generated images record their width and height (and length for video) read from the file's own header: PNG, JPEG, WebP, and MP4 or MOV (track header size with quarter-turn rotation, movie length). The MP4 reader is best-effort and does not decode the video stream; files it cannot read show "size unknown" and need a confirmed exception. |
| FAC-STU-026 | Go-to-market checks: scope, rights, claims and disclosure | Computed where possible and recorded where a person decides (`StudioState.gtm`), each shown as pass, needs you or blocked with its action. Scope: the pack's quantities, ratios and channels from the offer, confirmed by the producer with the revision rounds agreed. Rights: every input file (logo, packshots, mood, clips) and every delivered file has a source and licence (missing rights block delivery); music, voice, font and other rights records are added by the producer; the Hook pack needs a music or voice record and a record for each brand font. Claims: every scene message, script beat and claim, narrative proof and hook line links to an approved key message (hooks through their narrative); absolute or superlative words, before-and-after framing (and split-screen comparison hooks) and any price or discount figure not in the brief's offer are flagged and cleared one by one with a reason. AI disclosure: each delivered file's tag and the per-channel lines (TikTok AIGC label or clear disclaimer; Meta "AI info"; YouTube altered or synthetic content; EU AI Act Article 50 deepfake disclosure from 2 August 2026, fantastical content excluded), confirmed by the producer. Every confirmation is tied to a fingerprint of what it confirms and lapses when that changes. |
| FAC-STU-027 | Specs, safe zones and product accuracy | Stills must match their ratio (4:5 or 1:1) and be at least 600 px wide (1080 px recommended, shown as a note); variants 9:16 MP4 of at least 1080 x 1920 and 5 to 60 seconds; loops 4:5, 1:1 or 9:16 MP4 of at least 1080 px on the short side and 3 to 8 seconds. A file outside spec needs a new file or a confirmed exception with a reason. Safe zones (video) are a producer check against each platform's own overlay template; no margins are coded. Product accuracy is a producer spot check per still, loop or variant; an AI vision check is out of scope. |
| FAC-STU-028 | Naming, test plan, delivery pack and handoff | File names are deterministic: `<client>_<offer>_<narrative or scene>_<hook or ratio>_v<version>`, slugified. The test matrix CSV states which variants compare which hook (per narrative) and which narratives compare at the same hook position (Hook pack), or which scenes compare per product and ratio (Scene Pack). The delivery manifest (JSON and readable Markdown) lists approved final versions only, per channel folder, with suggested captions and ad copy from approved material, disclosure notes, rights, gate notes and the gaps recorded by approvals with a note, and download links through the authorised file route. The launch handoff gives the media buyer upload notes per channel, the disclosure lines, the test plan and how to send results back. Producers download everything at any time; the client downloads the manifest, test plan and handoff once delivered. No ZIP is built. |
| FAC-STU-029 | Gate 4 and delivery | A plain "Approve final work" is blocked until every production piece has a file and is approved, every blocking go-to-market check passes (scope, rights, claims, disclosure, specs, safe zones, product accuracy) and the delivery pack builds; approve with a note is always available and records the gaps. The client approves once Production is shared, or a producer on the client's behalf (recorded). The project becomes Delivered: the sidebar shows Delivered with links to the delivery pack and the read-back, and production records are frozen until Production is reopened. |
| FAC-STU-030 | Performance read-back | The delivered project uses the existing campaign results entry and CSV import (FAC-FBK-001), which gain optional `variant`, `views3s` (3-second plays), `thruplays` and `purchases`; legacy records and CSVs are unchanged. The Delivered view shows per variant the results count, hook rate (3-second plays / impressions), hold rate (ThruPlays / 3-second plays), click-through and cost per purchase, using only records where both numbers are known and never adding different currencies; unknown stays unknown and rejected results are left out. A results template CSV with the variant names filled in is available to producers. |
| FAC-STU-031 | Next cycle | After delivery a producer marks winners and presses "Start next cycle": a new studio project in the same account with the same offer, the Brand Kit and brief copied (file references, not files), the winners attached as liked references (image winners also as mood images), the intake stage active and nothing paid run. It can be started once per project. |
| FAC-STU-032 | Run records and restart rule | Every studio rerun (text, image, still) stores its project run with usage or error, so it appears in project diagnostics like other paid calls. "Restart from the brief" is refused on studio projects; reopening Stage 1 is the way back (later stages are marked out of date, work kept). |

### 28.1 How to run your first client (owner, spec step 7)

Before the first client: choose models on the AI agents page for Studio: pre-production writer and Studio: image generation (or set PORT67_IMAGE_MODEL; default gpt-image-1), make sure the OpenAI key has image access including the edits endpoint, enter the image model's price on Private API costs, set PORT67_SYNTHESIS_ENABLED=true, and check that Firebase Storage accepts the studio/ files (uploads up to 100 MB).

1. **Create the brief.** New brief, choose the offer (Product Scene Pack or Hook-Test Video Pack), fill the intake and upload the logo, packshots, mood images or clips, confirming the right to use them.
2. **Approve gate 1.** When the completeness panel is clear, Approve brief (or approve with a note saying what is missing). Authorise AI for the brief in Project settings.
3. **Start research.** Stage 2: authorise and start research; it reads public pages only. Thin research is a warning.
4. **Review.** Accept or reject sources, then insights; set the strapline and audiences; keep the best ideas.
5. **Approve the strategy.** Draft the campaign direction, share it, have it approved (by the client or on their behalf), then Approve research and strategy.
6. **Draft pre-production.** Stage 3: Draft pre-production, check the first test frames or keyframes, generate the rest, and edit, comment, rerun or approve each piece.
7. **Review and share.** Ready for client review; the client approves concepts (or you approve on their behalf, recorded).
8. **Production.** Stage 4: Prepare production. Scene Pack: Generate stills (watch the cost) and add motion loops if sold. Hook pack: download each prompt pack, make the clip in your video tool and upload the MP4 with its AI disclosure.
9. **Go-to-market checks.** Work down the checklist: confirm scope and revision rounds, add missing rights (music, voice, fonts), clear claim flags with reasons, confirm disclosure, fix or confirm specs, check safe zones and product accuracy, approve each piece.
10. **Delivery.** Ready for client review, then Approve final work. Download the delivery pack, the test plan and the launch handoff for the media buyer.
11. **Read-back.** When the ads have run, import the results (the template has the variant names), review them, mark the winners and Start next cycle.

## 29. Agent rerun

Owner request, 20 November 2026 (CHG-0100), PRD 1.33.0. When one AI agent fails for a project (for example research on a Gemini key with no quota left: "AI provider returned 429: You exceeded your current quota"), the failed task blocks the project and Run ready tasks skips it. A producer must be able to rerun exactly that agent, switching its model first when the same provider will fail again, and the project then carries on without a reset. This is the deliberate producer retry; every other control stays in force.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-RRN-001 | Failure classification | A failed run's stored error (and HTTP status when known) is classed as quota (429 with quota, billing or credit wording, or 402), rate_limit (other 429), auth (401, 403, invalid or missing key), model (404, unknown or unsupported model), timeout, provider_down (5xx, unreachable), invalid_output (the model's answer failed validation, had no citable sources or broke the schema) or other. Each class has a plain-English title, what happened and a recommendation: quota, auth and model say "Switch this agent to another provider or model, then rerun"; rate_limit, provider_down, timeout and invalid_output say rerun. The planning error help explains a quota failure as needing a change, not a wait. |
| FAC-RRN-002 | Failed agents per project | For one project, every agent whose latest run for the current inputs failed is listed with its error, class, the provider and model the run used, when, and whether it can be rerun now (with the reason when not). Runs for old inputs (another brief, plan, planning context or task key) are ignored and a newer completed run supersedes a failed one. Studio jobs are listed per piece (each piece's latest generation), plus a failed first pre-production draft. Shown on the AI agents page when a project is chosen (FAC-PRG-001) and to producers in the project (GET `projects/:id/agents/failed` and the project view). |
| FAC-RRN-003 | Rerun one agent | `POST /api/factory/projects/:id/agents/rerun` with `{slot, switchTo?, confirm: true}`, producers and admins only, reruns exactly that agent through its existing runner: research segment runner, forced scoping, planner and medium selection with their deliberate retry, insights and direction drafting (with the reviewer's pending redraft notes), copy pack, format, audience and ideas agents, the producer reviewer step for its gate, the first pre-production draft, or a studio rerun request per failed piece. It only bypasses "a failed paid task needs a deliberate retry"; provider consent, studio stage gating, task-plan exclusion, dependencies and one run at a time still refuse, with a clear 400 that says why. An agent that has not failed for the project, or cannot be rerun on its own, is refused. Every attempt that passes the guards is audited on the project with actor, slot, old and new model and outcome. A rerun that runs and fails returns the new error and class and keeps the task blocked with that new error. |
| FAC-RRN-004 | Switch and rerun | `switchTo: {provider, model}` is owner admin only (routing is admin only) and is validated exactly like the AI models page (research jobs need OpenAI or Gemini, the provider's key must be set, exact model ID, the image job is OpenAI only). It changes the agent's route for every project and is recorded in the routing history with the reason, then the agent reruns on the new model. A refused switch runs nothing. |
| FAC-RRN-005 | The project carries on | After a successful rerun the task is no longer blocked (a newer completed run supersedes the failed one) and the normal producer agent continuation starts, as after other successful runs (automatic pass when PORT67_PRODUCER_AGENT=true; otherwise Run ready tasks continues). No reset is needed. |
| FAC-RRN-006 | Rerun failed agents | `POST /api/factory/projects/:id/agents/rerun-failed` with `{confirm: true}` reruns, in dependency order (planning and scoping, research, reviews and drafting in flow order, then studio), every agent whose latest run failed, stopping at the first new failure and reporting it. Agents that still cannot run (for example waiting for dependencies) are reported as not run. |
| FAC-RRN-007 | Rerun on the AI agents map | With a project chosen, FAILED badges show that project's failed agents (not system-wide health), each failed agent node has a Rerun button, and "Rerun failed agents (n)" sits above the map. Rerun opens a dialog: the failure in plain English with the raw message in a fold, the class and recommendation, the current provider and model, a model picker prefilled for quota, auth and model failures with a configured provider that is not the failing one (research jobs only OpenAI or Gemini, the image job only OpenAI), and two buttons: "Rerun with <current model>" and "Switch to <model> and rerun" (admin only; the main action for quota, auth and model failures). It shows progress and the result; on success the node turns healthy and the map marks move on. |
| FAC-RRN-008 | Provider quota warning and bulk move | When an agent's latest call to a provider failed on quota and no call to that provider has succeeded since, the AI agents page shows "<Provider> has no quota left. <n> agents still use it." with an admin button "Move these agents to <other provider>" that sets each affected job's own route (research jobs only to the other web-search provider; the image job is never moved) in one validated, recorded save, then offers Rerun failed agents. |
| FAC-RRN-009 | Rerun where the work is blocked | On the Overview task planner a blocked AI agent row shows the failure in plain English and a Rerun button (same dialog); the Your turn banner, when the blocking step is a failed agent, offers "Rerun <agent>" instead of Run ready tasks. Studio stage pages list the failed agents that belong to that stage with the same Rerun entry. Producers who are not admins can rerun but not switch models. |
| FAC-RRN-010 | Studio runs name their piece | Every studio image, still and piece rerun run records the piece (and the rerun request when there is one), so a failed generation can be rerun piece by piece through the studio rerun path, keeping the producer's last instruction. Failures recorded before this change cannot be matched to a piece and say so. |

## 30. Video workspace: producer and admin only

Owner direction, 25 November 2026 (CHG-0103), PRD 1.34.0. Design: `docs/superpowers/specs/2026-11-25-video-workspace-design.md`; decision ADR-0004 and PRODUCT-023. The creative workspace is rebuilt as a minimal, video-first tool for producers and admins only, starting with a three-entry sidebar (Overview, Customer account, Projects) and adding workflow pieces back one at a time. Intent is PROPOSED until the owner signs off the design spec. The owner told the build to start on 25 November 2026 (CHG-0104), which builds FAC-VWS-002 and FAC-VWS-005 to FAC-VWS-007 and part of FAC-VWS-001 and FAC-VWS-004; the rest has not started. Project (commission) inputs and Overview contents are deliberately not specified yet and carry no requirement IDs. The existing portal and studio stage code is parked, not deleted, except the customer role, which is removed in its own change.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-VWS-001 | Two roles only | The only roles are producer (`operator`) and admin (owner flag). A verified identity on neither allowlist can read or write no account, project or file. There is no customer role in the types, API or UI once the removal change is delivered. |
| FAC-VWS-002 | Minimal workspace shell | A new workspace shows only Overview (placeholder), Customer account and Projects, plus an Admin group visible to admins only. The previous portal tabs and studio stage pages are not reachable from it and their code is retained. |
| FAC-VWS-003 | Video is the only offer | In the new workspace the video offer is the only selectable offer. Static Scene Pack, copy packs, the ten research roles and parked offers are hidden, not deleted, and re-enabling one does not need a rebuild. |
| FAC-VWS-004 | Customer account is the brand | A customer account is a producer-managed company record with a server-generated ID, a required business name and an optional public https website. One company is one brand, in a flat list. Every project belongs to exactly one customer account and relates to its brand. The workspace holds at most 200 customer accounts and refuses a second account with the same name in any letter case. |
| FAC-VWS-005 | Social links and Find from website | One optional URL per platform (X, Instagram, Facebook, TikTok, YouTube, LinkedIn, Pinterest, others as added); each must be a public https address on that platform's domain. Find from website fetches only the account's own website under the existing public-URL safety rules, reads links to known platforms, pre-fills empty fields only, shows what was found and saves nothing until the producer confirms. It makes no model or paid call. It resolves the address itself, refuses any address not on the public internet, connects only to the address it checked, follows redirects only within the same site, and reads at most 1.5 MB within eight seconds. |
| FAC-VWS-006 | Brand purpose upload | A producer uploads a brand purpose file (PDF, DOCX, TXT, PNG or JPG, at most 25 MB per file and five files per account, held as settings) into the private studio file store with file-type sniffing and a rights confirmation. The file is never passed to a model until a producer records an explicit authorisation for that file; unauthorised content is not sent in any model payload. |
| FAC-VWS-007 | Client red lines | Red lines are a list of separate entries, each with a category (topic, competitor, person or brand, word or phrase, visual), text and an optional reason. Add, edit and remove are audited with who, when and what. Later steps can read each entry individually. At most 100 red lines per account, and the account keeps its latest 100 history entries. |
| FAC-VWS-008 | Producer approvals | Approvals previously held by the customer are performed by producers and recorded with the producer as actor. The existing gates and their blocking rules are unchanged. |
| FAC-VWS-009 | Reset to a clean start | Existing customer accounts, projects and stored files are deleted only after the customer role is removed, a verified export of the local store and the Firestore project has been taken, and the owner confirms the deletion naming what is deleted. The deletion is audited. The owner cost ledger is kept unless the owner says otherwise. No build step deletes data. |
| FAC-VWS-010 | Typed brand purpose and what the brand is known for | A customer account has two text boxes, "Brand purpose" and "What is the brand known for?", each up to 4000 characters, saved by a producer. They are private. Models may read them only after a producer ticks one authorisation for the pair; changing either text withdraws that authorisation until it is ticked again. Saving and authorising are audited. Customers and the demo are refused. |

## 31. Commission project and Inspiration baseline

Owner direction, 25 November 2026 (CHG-0106), PRD 1.35.0. Design: `docs/superpowers/specs/2026-11-25-commission-inspiration-baseline-design.md`. A commission is one piece of work for a customer account. Its first output is the Inspiration baseline: who the commission must reach, what it must achieve, what the audience should recognise (preserve), where there is room for a fresh idea, and the evidence behind that judgement. This step captures four primary inputs (numbered 1, 3, 4 and 5 as the owner listed them) with their evidence and shows the baseline assembled from them. It makes no AI call. Intent is PROPOSED until the owner signs off the spec; delivery has not started.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-VWS-011 | Commission record | A commission belongs to exactly one customer account, has a name, and is created, listed and opened by producers and admins only. It is stored per account (`factory-commissions-<customer id>`), at most 50 per account, every change audited (latest 100 entries). Customers and the demo are refused. The Projects entry in the workspace shows the list. |
| FAC-VWS-012 | Four guided primary inputs | Input 1 Commission objective, Input 3 Product or service, Input 4 Current and intended audience and Input 5 Brand expression and boundaries each show their role and their questions as separate prompts of up to 2000 characters, saved by a producer. There is no Input 2. |
| FAC-VWS-013 | Brand expression lists and guardrail | Input 5 holds a Preserve list, a Can change or out of character list (each entry with text and whether it recurs across years or belonged to a single campaign) and one field for the client's example that went too far. The customer account's red lines are shown beside them and not copied. |
| FAC-VWS-014 | Evidence per input | Each input has an evidence list, at most 30 items, each with a source (public https link or note), where it was looked for, a short note and a required basis: announced by the client, client confirmed, or producer inference. Inputs 1 and 4 carry a confirmed-with-client tick. |
| FAC-VWS-015 | Secondary checks locked | Company story and values, Competition and alternatives, and Parallels and creative inspiration appear greyed out with their question and where to look, and cannot be edited or opened. |
| FAC-VWS-016 | Inspiration baseline view | A read-only page assembled from the inputs with no AI call: who to reach, what to achieve, what to preserve, room for a fresh idea, the guardrail, proof, evidence grouped by input with its basis, and a gaps list (input not started, no evidence, empty Preserve or Can change list, objective or audience not confirmed with the client). Each input shows Not started, In progress or Complete (every prompt answered and at least one evidence item). The baseline shows even when incomplete. |

## 32. Brand Intelligence foundation

Owner direction, 25 November 2026 (CHG-0108), PRD 1.36.0. A Brand Intelligence agent researches a customer account once its inputs are in and stores a Brand Foundation Dossier that later agents read as the brand reference. It is run by a submit button at the bottom of the customer account.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FAC-VWS-017 | Submit and run | A producer or admin presses a submit button on the customer account. The run happens in the background, one at a time per account, shows progress, and records each model call on the admin cost ledger against the account. It does not start, and is not charged, when live research is not configured. |
| FAC-VWS-018 | Dossier content | The dossier has sections 0 to 6 (strategic assumption, reality gap, offering and operational truth, audience and cultural footprint, visual and channel DNA, verbal identity, guardrails and seed cues) with bracketed source tags and the public sources found. Sections 1 to 7 come from four web-searching calls (section 7 is the researched red lines: cultural and aesthetic taboos, commercial and pricing boundaries, reputational and regulatory risks, the anti-persona, each tagged as stated by the brand or inference), section 0 from a final call with no search. The client's red lines are copied verbatim from the account and never written by the model. Typed brand text is read only when the producer has authorised it; uploaded files are not read in this version. |
| FAC-VWS-019 | Stored foundation | Each run is saved as a version in Firebase (latest 4 kept plus the current one). The latest completed version is the current foundation. A failed or interrupted run is kept, shown as failed and never becomes current. Later agents read the current foundation through one function. |
| FAC-VWS-020 | Customer account layout | Social links, Brand purpose and reputation, and Client red lines are collapsible like History, with a count in the title; a section starts open only while it is empty. Brand purpose files live inside the Brand purpose and reputation section: an Add button and one small chip per file (type icon, type, file name) that opens the file in a new tab (images and PDFs show in the tab, other types download). The Brand Intelligence dossier shows below the red lines: a verify-first callout, the researched red lines as four cards labelled as not client-confirmed, then sections 1 to 6 as collapsible cards with source tags as chips. |
| FAC-VWS-021 | Generate from AI, intended audience | Input 4 has a Generate from AI button. It needs a completed Brand Intelligence dossier for the customer account and refuses without one. One metered call with no web search reads the dossier and the project's answers and returns, for one chosen age group at a time, a draft of the five audience answers (who buys, uses and influences; motivations; words they use; what puts them off; intended commission reach). The draft fills the form only; nothing is stored until a producer presses Save answers, and replacing existing answers asks for confirmation. The generation is recorded in the project history. |
| FAC-VWS-022 | Audience by age group | Input 4 is answered per age group: Gen X 46–61, Gen Y 30–45, Gen Z / Zoomers 14–29, Gen Alpha 2–13. Each group has the same five answers with different content for that age. Generate from AI works per group or for all four (one call each), and the content must be age-appropriate: groups that include under 18s treat parents or guardians as buyers and avoid tactics that exploit age. Each group is saved separately. A producer must select at least one saved group before the project can move on to direction; the baseline shows the selection and a gap while none is chosen. Other age groups can be saved and selected later to start a new direction. |
