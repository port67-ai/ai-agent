# Central change log

Single ongoing ledger. Historical imported PRD section 26 is a baseline record only. Commit association: `git log -- docs/CHANGELOG.md`.

## CHG-0001 — 2026-11-11 — Shared repository memory
- Author/harness: Codex; requested by owner in this session.
- What: preserve supplied PRD and business plan; establish shared harness rules, status register, decisions, handover, documentation checks and PR template. Preserve previous CLAUDE guidance separately.
- Why: enable future coding sessions to continue from repository evidence without prior chat context.
- Requirements: FAC-DEV-001, FAC-DEV-002, FAC-DEV-003, FAC-DEV-004, FAC-DEV-005, FAC-DEV-006; governance support only, not verified Factory acceptance.
- PRD impact: none. Product requirements unchanged; imported PRD stays proposed 1.0.0. Central-ledger convention documented in GOVERNANCE.md.
- Evidence: `python3 scripts/check_docs_governance.py --base 26ab3be` and `git diff --check` (results recorded in HANDOVER.md).
- Status: prepared for commit on docs/port67-project-memory; merge, remote CI and deployment not claimed. Resolve exact commit through Git history.
- Runtime/deployment effects: none; no application source, infrastructure configuration or customer data changed.

## CHG-0002 — 2026-11-11 — Reconcile current main
- Author/harness: Codex.
- What/why: integrate origin/main a5e8ceb into the documentation branch; resolve README conflict by keeping shared project-memory navigation and the current studio setup/deployment guidance.
- Requirements: FAC-DEV-002, FAC-DEV-003, FAC-DEV-004.
- PRD impact: none; requirements and original baseline unchanged.
- Evidence: documentation checks, diff checks and application checks recorded in HANDOVER.md.
- Status: prepared on docs/port67-project-memory for PR #2; no merge into main or deployment claimed.
- External checks: previous commit reports failures for two Vercel preview projects; logs/root cause not yet available. Current main describes Render hosting; no hosting settings changed.

## CHG-0003 — 2026-11-12 — Research-led managed creative service
- Author/harness: Codex; owner requested summary and PRD update after confirming managed service, B2B/B2C flexibility, minimal intake, research-backed messaging/design approval and expandable specialist capabilities.
- PRD impact: 1.0.0 -> 1.1.0, new approved capability scope; no existing runtime contract migration or implementation claimed.
- Requirements: FAC-MKT-001–012; FAC-TEN-006 promoted to required phase-one portal intent. Broaden EXPLAIN formats, reconcile workflow/portal/roadmap assumptions and preserve the other portfolio pillars.
- Reason: derive campaigns from evidence and customer objectives while supporting unfamiliar niches through reviewed agent/skill expansion.
- Phase one: brief, research, strategy approval, managed production and asset approval/delivery. Phase two: performance feedback and separately authorised publishing.
- Evidence: documentation governance, whitespace and requirement coverage checks recorded in HANDOVER.md.
- Status: documentation change on docs/research-led-creative-scope; no product implementation, deployment or merge claimed.
- References: https://www.graphed.com/ and https://www.graphed.com/skills are inspiration, not adopted dependencies or verified performance evidence; uploaded creative-framework notes are reference material, not instructions or verified video claims.
