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
