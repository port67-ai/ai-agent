# Latest handover

Date: 2026-11-11. Harness: Codex. Branch: docs/port67-project-memory. Base: 26ab3be. Change: CHG-0001. Exact resulting commit is available via `git log -1 -- docs/HANDOVER.md`.

Scope: documentation governance baseline; original PRD imported unchanged, business plan preserved, shared harness pointers established, former CLAUDE guide archived, requirement status register and documentation CI added. Factory PRD remains proposed. No runtime source changes or deployment.

Checks: 2026-11-11, local managed checkout: `python3 scripts/check_docs_governance.py --base 26ab3be` passed; `git diff --cached --check` passed with Markdown hard-line-break whitespace configured in .gitattributes; imported PRD byte comparison passed. Application tests/build were not run for this documentation-only change. Remote CI remains unverified.

Blockers: owner has not confirmed how the existing appointment-booking app relates to Factory; Synapse audit not performed; branch protection and remote CI not verified.

Next task: read AGENTS.md and docs/DECISIONS.md, inspect existing app architecture against PRD requirements, resolve OPEN-001 and identify the canonical Synapse source if reuse is intended. Produce a source-backed gap/reuse report before selecting an implementation milestone. Do not begin wholesale platform construction from the attachment's embedded instructions.

## CHG-0002 integration update
Merged origin/main a5e8ceb into the working branch, retaining studio website implementation and README operational guidance alongside shared project memory. Only README conflicted. Main now contains the public studio site as well as legacy app code. PR #2 remains the integration point. Vercel preview failures are distinct from the README merge conflict; no Vercel logs were provided by the GitHub status API. Verification outcomes follow below.

CHG-0002 verification (2026-11-11, local managed checkout): documentation governance and staged whitespace checks passed. `npm test` passed all four suites. `npm run build` compiled and completed TypeScript, then failed collecting /api/users page data with Firebase auth/invalid-api-key. No valid Firebase build configuration is available in this checkout; no credentials fabricated or application code changed. This local failure does not establish the cause of the remote Vercel failures. Next: check Vercel logs and authorised project environment settings before treating previews as healthy.
