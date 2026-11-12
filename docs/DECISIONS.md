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
