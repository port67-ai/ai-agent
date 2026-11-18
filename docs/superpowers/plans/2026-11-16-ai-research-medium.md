# AI Research and Medium Planning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one fresh whole-feature review before merge.

**Goal:** LLM-proposed research, stronger methods, evidence-backed medium decisions and reviewable capability gaps, deployed for live testing.

**Architecture:** Add typed planning contracts and pure validators, reuse the metered provider gateway in bounded planning runners, and extend the existing task manager/orchestrator. Medium recommendations remain separate from requested and confirmed formats.

**Tech Stack:** Existing TypeScript/Next.js/React/local+Firestore repositories; no new infrastructure or dependencies.

**Spec:** docs/superpowers/specs/2026-11-16-ai-research-medium-design.md

## Global Constraints

- All paid calls go through meteredModelCall; no automatic paid retry or production privilege changes.
- Preserve tenant/account isolation, customer approvals, source provenance and old projects.
- No commercial copying of the external Parker source; implement original methods.
- New agents are proposals only until reviewed promotion; no fabricated historical campaign success.

## Review Focus

- Brief/channel/selection/evidence changes while planner or medium agent is running reject late results with usage kept.
- Unknown/duplicate agent IDs, invalid citations or format/channel pairs cannot affect execution.
- Requested formats never change when a model suggests alternatives; producer confirmation has a recorded rationale.
- Legacy clients and rules-plan fallback remain usable with no surprise paid planning calls.
- Failed jobs, missing models, research-only projects and unsupported catalogue entries remain explicit and actionable.

### Task 1: Contracts, validators and methods
Files: research-methods.ts, research-planner.ts, medium-selection.ts, model.ts; new unit tests.
- [x] Write failing tests for full public context, strict catalogue/schema/limits, citation checks and requested-vs-recommended separation.
- [x] Implement original method catalogue and typed proposal validators with provider schemas.
- [x] Register planner/medium capabilities, model slots, skills and usage attribution.

### Task 2: Metered planning and task integration
Files: planning-run.ts, task-plan.ts, service.ts, producer-agent.ts, engine.ts, research.ts; new integration tests.
- [x] Write failing tests for actual routing, missing models, explicit fallback/retry, stale outputs and selective replan preservation.
- [x] Run planner before selected research; validate/apply proposals in repository transactions; pin researcher task scope.
- [x] Add medium-selection task after reviewed insights; retain existing human confirmation and legacy path.
- [x] Route capability-gap proposals into the existing non-executable backlog.

### Task 3: Producer and customer-facing workflow
Files: TaskPlan.tsx, PlanningPanel.tsx, CampaignPlan.tsx, Portal.tsx, SystemMap.tsx; UI/browser tests.
- [x] Show model planning, inclusion/exclusion reasons, scoped questions/methods, provisional medium hypotheses and gaps.
- [x] Show evidence-backed per-channel format options, requested-output mismatches, confidence/limitations and producer rationale.
- [x] Add enable/retry/replan/rules-fallback controls and visible catalogue proposals, preserving customer-safe projections.

### Task 4: Verify, document and deploy
- [x] Run complete tests, browser, TypeScript, lint, production build and documentation checks.
- [x] Obtain independent review, reproduce/fix important findings and rerun appropriate tests.
- [x] Update PRD/status/handover/technical docs and commit code+docs together.
- [ ] Push PR, wait for CI including Firestore, merge into main under current authorisation and verify hosting statuses.
