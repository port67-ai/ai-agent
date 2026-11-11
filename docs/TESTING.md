# Verification

## Documentation baseline
Run `python3 scripts/check_docs_governance.py --base <base-commit>` and `git diff --check`. Python 3 and Git suffice; no package installation or service credentials required. The baseline PRD hash can be compared with docs/reference/PROVENANCE.md.

## Application
Existing scripts: `npm run lint`, `npm run build`, `npm run dev`. Inspect required environment variables before running. No application tests, build, deployment or security certification are implied by documentation checks. Future code changes require checks matched to affected behaviour; implement Factory acceptance suites from PRD section 18 incrementally.

## Evidence rule
Record command, result, date, environment and tested commit/CI run before marking VERIFIED. Structural checks cannot prove truthful narrative, runtime correctness or harness compliance.
