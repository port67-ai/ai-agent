# First MVP verification record

Date: 2026-11-12. Environment: managed Linux workspace, Node 24, Chromium headless. Base: 6fa08f8. Implementation branch: feat/explain-managed-mvp; exact verified content commit is resolved from `git log -- docs/MVP_VERIFICATION.md` and subsequent CI runs. This is local evidence, not a cloud-production certification.

## Executed checks
- `npm test`: existing enquiry/schema/route/render/retry tests plus seven Factory suites (domain, persistence/auth, API/invitations, portal rendering, legacy Firebase import, research accounting/recovery, visitor throttle).
- `npm run check:factory`: scoped ESLint for new Factory modules/components/routes/tests, no errors or warnings in the final run. Full legacy repository lint debt is outside that claim.
- `npx tsc --noEmit`: shared application TypeScript validation.
- `npm run build`: optimized Next.js production build, including /portal and /api/factory/[...path], without Firebase/model credentials or dummy keys.
- `npm run test:browser`: full desktop/mobile journey against a running development app; also executed with `PORT67_TEST_ORIGIN=http://localhost:3001` against `next start` production output. Synthetic research -> strategy draft/share -> customer approval -> three production drafts -> customer approval of all assets -> actual SVG download -> phase-two hypothesis view. Checks JavaScript errors, heading contrast and mobile horizontal overflow. Screenshots saved under ignored work/screenshots and in CI artifacts.
- `python3 scripts/check_docs_governance.py --base origin/main` and `git diff --check`: structural requirement/status/doc coverage and whitespace.

## Security/correctness evidence
Cross-workspace/project access denied; operator/customer actions separated; unshared drafts/internal audit hidden; version/hash approvals enforced; stale strategy dependencies cannot produce or deliver; replay idempotency cannot bypass role checks; concurrent local mutations serialize; new repository instance reads persistent state; expired/tampered sessions rejected; replacement invitations revoke existing customer sessions; foreign origins and non-public source URLs rejected; client assertions cannot become independently supported evidence; only reviewed project-local sources can back insights; shareable strategies require evidence plus interpreted insight. Logos are bounded PNGs and replacement consent is checked.

Independent read-only review found three Important issues. Added regression tests and fixed in one pass: interrupted research has an expiring lease and explicit operator recovery; returned usage/provider ID survive uncited or capacity-rejected findings; per-visitor signed throttle buckets isolate authentication allowance. Research runs freeze brief/context hashes and sources link to run IDs. Customer views show a safe delivery pause during unshared direction revisions. No independent second review is claimed; fixes are verified by tests.

## Not executed / not claimed
- Authenticated Firebase database provisioning or real cloud persistence/IAM/rules acceptance: CLI failed authentication; no cloud account/secrets configured.
- Actual paid OpenAI/web research: API credentials and model configuration absent. Research transport tests are explicit stubs, not live capability proof.
- Full provider/harness parity, complete monetary cost ledger, Cloud Tasks/Run resilience, production tenant administration or full PRD security certification.
- Premium rendered MP4/audio/live-action production, real marketing performance, customer email sending or automated posting.

The standalone local/demo MVP works within these boundaries. Consult FACTORY_MVP.md before accepting real customer data or enabling paid providers. GitHub Actions repeats unit/type/lint/build/browser checks on the PR; inspect that run for remote results.

CHG-0005 regression: default synthetic demo directory is writable OS temporary storage, not the application source bundle. A second production-browser journey created a new brief, uploaded a PNG with consent, reviewed a manual source, linked an insight and edited the brief successfully. No serverless cross-instance persistence verification is implied.

Remote first run 43131195215: clean install, all tests, lint, types and production build succeeded. Browser dependency install failed because Playwright 1.58.2 does not support the new Ubuntu 26 runner. CHG-0006 pins ubuntu-24.04; the subsequent run, not this failed run, establishes full remote acceptance.
