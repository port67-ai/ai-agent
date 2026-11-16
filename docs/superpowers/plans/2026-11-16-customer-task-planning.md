# Customer task planning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Select relevant agents from customer requirements and execute through persistent project tasks.

**Architecture:** Add a pure planner and task reconciliation layer to the existing repository/engine. Existing paid runners remain responsible for authorisation, validation and metering. The orchestrator and project UI consume the same plan.

**Tech Stack:** TypeScript, Next.js, React, existing local/Firestore repositories; no dependencies added.

**Spec:** docs/superpowers/specs/2026-11-16-customer-task-planning-design.md

## Global Constraints

- Preserve approval, isolation, evidence and budget controls; no paid live calls in verification.
- Persist bounded plan history and keep run/cost/audit records.
- Existing projects retain legacy behaviour until replanned; new projects receive a plan.

## Review Focus

- Changed inputs during a paid call must reject late results while retaining usage.
- Narrow briefs must not trigger every specialist or unrelated production output.
- Customer commands must not edit agent assignments or see internal plans.
- Legacy fixtures and old campaigns must continue without forced paid reruns.
- Failed calls and unsupported outputs must remain actionable rather than silently complete.

### Task 1: Planner and persistent contracts

Files: new src/lib/factory/task-plan.ts and tests/factory-task-plan.test.ts; model.ts, engine.ts.
Interfaces: planProject(p, actor, reason), syncTaskPlan(p), selectedResearch(p), validateTaskGraph(tasks).
- [x] Add failing tests for narrow/video/research-only plans, DAG validation, overrides, versioned reconciliation and legacy selection.
- [x] Implement typed plan/task contracts, deterministic relevance decisions, bounded history and persisted task state.
- [x] Wire project creation, brief/channel/format changes and producer plan revision into audited transitions.
- [x] Verify planner and existing engine/skills tests.

### Task 2: Execution integration

Files: producer-agent.ts, service.ts, research-catalog.ts, research-plan.ts, run-tracker.ts, engine.ts; API/orchestrator tests.
- [x] Add failing tests for unselected-agent denial, dependency gates, stale results and research-only completion.
- [x] Route research and producer steps through selected tasks; synchronize state at reservations/completion and preserve existing runners.
- [x] Limit production to selected supported formats and expose unsupported work as manual tasks.
- [x] Verify orchestrator, API, evidence, metering and legacy tests.

### Task 3: Project management view and intake

Files: new TaskPlan.tsx, brief input components, Portal.tsx, ResearchProgress.tsx, ResearchPrep.tsx, SystemMap.tsx; component tests.
- [x] Add failing render tests for task assignments, reasons, dependencies, revisions and customer-safe progress.
- [x] Show project plan with producer selection controls and work requested at intake; run only selected research from UI.
- [x] Update map description to distinguish capability catalogue from project execution plan.
- [x] Verify UI tests, full npm test, tsc, eslint and build.

### Task 4: Documentation and review

- [x] Update PRD, architecture, data model, decisions, status, handover and changelog with actual scope/evidence.
- [x] Review changed code against the spec and test adverse inputs.
- [x] Run documentation governance and git diff checks; commit implementation and docs together.
