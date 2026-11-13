# PORT67 FACTORY — MASTER PRODUCT REQUIREMENTS DOCUMENT

**Document ID:** P67-FAC-PRD  
**Version:** 1.23.0  
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

Budget scopes: `per_model_call`, `per_task`, `per_workflow`, `per_project`, `per_tenant/day`. Preflight reserve a conservative estimate before new work. Stop the *next* paid task once the ceiling is reached; an in-flight model call may cost more than estimate, so report overruns rather than promise mathematically impossible hard spend guarantees. Rate-limit and concurrency guard at queue and provider levels.

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

**Implement:** structured storyboard, visual direction, selected image/voice/media adapters, rights manifest and render-job tracking. Test output and real art direction remain human-supervised.

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

## 26. PRD change log

Ongoing version history: see `docs/CHANGELOG.md`, CHG-0003 for 1.1.0 and CHG-0004 for 1.1.1, CHG-0008 for 1.2.0, CHG-0009 for 1.3.0, CHG-0014 for 1.4.0, CHG-0016 for 1.5.0, CHG-0019 for 1.6.0, CHG-0020 to CHG-0022 for 1.7.0, CHG-0023 for 1.8.0, CHG-0024 for 1.9.0, CHG-0025 for 1.10.0, CHG-0026 for 1.11.0, CHG-0027 for 1.12.0, CHG-0028 for 1.13.0, CHG-0029 for 1.14.0, CHG-0030 for 1.15.0, CHG-0031 for 1.16.0, CHG-0034 for 1.17.0, CHG-0035 for 1.18.0, CHG-0036 for 1.19.0, CHG-0037 for 1.20.0, CHG-0038 for 1.21.0, CHG-0039 for 1.22.0, and CHG-0040 for 1.23.0. The table below preserves the imported 1.0.0 baseline record.

| Version | Date | Author | Change | Status |
|---|---|---|---|---|
| 1.0.0 | 2026-11-11 | Port67.ai architecture draft | Initial full product PRD combining business-plan constraints, Firebase-first multi-factory design, dynamic multi-agent execution, skills, multi-provider harnesses, observability, costs, security, tests, phased roadmap and permanent multi-LLM development governance | Proposed; owner review + Synapse audit pending |

---

**Final operating rule:** **Port67 Factory has one durable project memory: versioned GitHub documents and verified implementation evidence.** The latest AI conversation is never a substitute. **Listen First. Build What Matters.**
