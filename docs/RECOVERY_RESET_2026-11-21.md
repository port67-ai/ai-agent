# Reset to last confirmed Render-live baseline — 2026-11-21

## Decision
Return development to the source tree of `bebcdecc1af47b2b2a68f037263eca7faf9fbe42` (`bebcdec`), the last commit reported Live by Render. Keep history; do not force-push or delete later commits.

## Scope and proof
GitHub comparison of `bebcdec` to the failed `main` head `f5b47d1361e5b3597234e9f0e8c7164c5d6990cd` found **17 commits and nine modified files**. Each of these nine files has been restored byte-for-byte from `bebcdec`:
- `package.json`
- `src/app/portal/portal.css`
- `src/components/factory/Advert.tsx`
- `src/components/factory/AiAgents.tsx`
- `src/components/factory/CampaignPlan.tsx`
- `src/components/factory/Direction.tsx`
- `src/components/factory/RunTracker.tsx`
- `src/lib/factory/engine.ts`
- `tests/factory-task-plan-ui.test.tsx`

After restoring those files, GitHub compare `bebcdec...reset/restore-bebcdec-reviewed` returned **zero changed files**. The subsequent documentation updates deliberately add this reset record and status notices, so the final candidate differs from `bebcdec` only in documentation.

## What is and is not verified
- **Verified historically:** owner-provided Render log reported `bebcdec` successfully built and was Live. This establishes a deployable source baseline, not end-to-end runtime correctness.
- **Not yet verified:** fresh CI lint, TypeScript, production build, Firestore and browser acceptance of the final candidate; Render deployment of the reset commit.
- The prior PR #74 verification checks tested a synthetic merge against failed `main` and were contaminated by post-baseline code. Their failures must not be attributed to `bebcdec`.
- The existing docs contain historical records of locally implemented but undeployed functionality; those records are not proof the features exist in the reset candidate.

## Release process
1. Review reset PR against current `main`. Confirm nine restored source files and documentation-only changes.
2. Require CI tests, lint, TypeScript, build and browser acceptance. Address failures on this branch without adding unrelated features.
3. Merge only with approval. A normal merge creates a new commit whose source matches `bebcdec` plus these documentation updates, preserving history.
4. Confirm Render reports Live on that exact new commit and complete smoke tests.
5. Close obsolete draft PR #74 after the reset is merged; keep its history for reference.
6. Start new feature work from this verified `main` baseline using small PRs with passing checks.

## Deferred features
Post-baseline workflow navigation, explicit producer override and evidence caveats, AI map, cost breakdown, agent rerun and related improvements remain backlog candidates, not part of the reset. Re-specify and implement them only after the baseline release is green.
