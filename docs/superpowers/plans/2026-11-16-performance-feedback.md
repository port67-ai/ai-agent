# Specialist research and performance feedback implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three selectively planned specialists and an auditable feedback loop.
**Architecture:** Extend existing catalogue and task graph; validated project observations feed existing metered planner/medium calls.
**Tech Stack:** Next.js, TypeScript, existing repository and provider gateway.
**Spec:** docs/superpowers/specs/2026-11-16-performance-feedback-design.md

## Global Constraints
Tenant isolation, public-data consent, bounded calls, producer review and customer approvals remain. Legacy campaigns retain seven roles. No credentials or automatic platform integration.

## Review Focus
Invalid metric denominators; concurrent feedback edits; CSV malformed/oversized input; older seven-role LLM plans; rejected or unauthorised results leaking into prompts/customer views.

### Task 1: Catalogue
- [x] Test new role/method availability and legacy selection before implementation.
- [x] Extend model, catalogue, scopes, registry/routing, skills and map; assert full new-plan decisions.
- [x] Run catalogue/planning tests and typecheck.

### Task 2: Feedback domain and integration
- [x] Test validation, review/authorisation exclusion, ratios, CSV, freshness and historical citations RED.
- [x] Create performance.ts with record validation, metrics and CSV parsing. Add operator transitions and private projection.
- [x] Feed authorised reviewed observations into planner/medium and freshness keys; validate historical IDs and prohibit causal conclusions.
- [x] Run tests GREEN.

### Task 3: Producer interface and verification
- [x] Add results entry/import/review UI using existing command flow and orange actions.
- [x] Test rendered controls and privacy, then run full suite, lint, types, build and browser checks.
- [x] Independent whole-branch review; reproduce/fix important findings; update PRD/governance docs.
- [ ] Push PR, await CI, merge main and verify deployment status within existing owner authorisation.
