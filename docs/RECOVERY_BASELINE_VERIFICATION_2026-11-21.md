# Recovery baseline verification record — 2026-11-21

## Scope and baseline
- Production reference: `bebcdecc1af47b2b2a68f037263eca7faf9fbe42`.
- Render log provided by owner shows that commit compiled, passed TypeScript, completed static page generation, started and was marked Live on 2026-11-20.
- Render used Node 24.22.1, `npm install && npm run build`, Next.js 16.4.6 Turbopack. Four dynamic filesystem-tracing warnings were **not fatal**.
- This is a release/build baseline, not evidence that every production workflow has been acceptance-tested.

## Isolation and execution
- Recovery branch: `recovery/verified-baseline-2026-11-21`, created from the exact production reference.
- `.github/workflows/isolated-baseline-verification.yml` explicitly checks out `bebcdecc1af47b2b2a68f037263eca7faf9fbe42` even when triggered from the recovery branch. It uses Node 24.22.1 and runs npm ci, security audit, unit/API tests, Firestore emulator tests, factory lint, TypeScript, production build, and browser acceptance.
- The workflow was added in commit `502bb5593457de97e09634b89a6c367b4f6a8b28`. **Isolated CI outcome is pending verification**; do not interpret this record as a passing run.
- Existing Factory MVP PR checks operate on GitHub's synthetic merge commit with `main`, so those results are **not** an isolated baseline test.

## Observed PR #74 check results (not isolated)
- Factory MVP job: `npm ci`, `npm run audit:security`, `npm test` and `npm run test:firestore` passed. `npm run check:factory` failed at `src/components/factory/AiAgents.tsx:86`, `react-hooks/set-state-in-effect`. That line was added after `bebcdec`; it is not a proven baseline defect. TypeScript, production build and browser acceptance were skipped.
- Documentation governance: requires changes to `docs/HANDOVER.md`, `docs/IMPLEMENTATION_STATUS.md` and `docs/CHANGELOG.md` for the proposed substantive PR diff against current `main`. This is a recovery-PR comparison issue, not evidence that the baseline itself cannot build.
- Two Vercel deployment statuses succeeded, but neither establishes Render release readiness.

## Release decision and follow-up
1. **Do not merge PR #74** or deploy recovery code until isolated verification has an observed outcome.
2. If isolated checks fail, repair genuine defects on a separate candidate branch and rerun the same suite on the candidate SHA (not a hardcoded baseline SHA).
3. If isolated checks pass, selectively recover later features into a candidate branch and validate its exact commit.
4. Ensure documentation governance and PR merge checks pass before merging to `main`; then confirm Render Live and smoke tests.
5. Do not force-fix dependency audit warnings without reviewing the resulting changes.

## Results
- Historical Render build/start: **PASS (owner-provided deployment log)**.
- Isolated baseline verification workflow: **NOT YET VERIFIED**.
- PR #74 synthetic-merge lint and documentation checks: **FAIL (not baseline defects)**.
- Current Render production: **no deployment initiated by recovery work**.
