# Universal development instructions

GitHub is the authoritative record for Port67 Factory. This repository currently contains the Port67 Business Assistant; do not infer a wider Factory product specification from its name or from chat history. [PRD.md](PRD.md) is the sole canonical requirements document. Claude and Gemini entry points must reference this file rather than duplicate requirements.

## Before every development task

1. Read this file and PRD.md.
2. Read docs/ARCHITECTURE.md and docs/DECISIONS.md.
3. Read docs/IMPLEMENTATION_STATUS.md and the latest docs/HANDOVER.md.
4. Inspect relevant source, tests and docs/DATA_MODEL.md for data changes.
5. Check the current branch, commit and working tree. Never overwrite another developer's uncommitted work.
6. Identify exact PRD requirement IDs, dependencies, known issues and acceptance criteria. Record newly approved requirements in PRD.md before implementation. Do not treat previous AI chat history as evidence.

## During development

- Work on a feature branch with small reviewable commits. Cloud tasks already have an isolated checkout; do not create a Git worktree unless the user explicitly requests one.
- Stay within approved scope and canonical requirements. Escalate product decisions rather than inventing requirements.
- Add or update meaningful tests for behavior changes. Preserve tenant isolation, auditability, cost tracking and security controls. The current implementation has documented gaps; never describe those controls as verified until tested.
- Never run clear-users or clear-db as setup or testing, deploy rules, contact the live Make webhook, or exercise real payments without explicit authorization for that action.
- Keep secrets out of code, logs, documentation and chat. Use secure environment settings. Do not disable TLS, signature or checksum verification.
- Record significant decisions in docs/DECISIONS.md. Update architecture and data documentation when affected.

## Before declaring completion

1. Run relevant tests, formatting, type checking, lint and required build/smoke checks. Report actual passed, failed, skipped and unrun results. Missing credentials or an unexecuted test is not a pass.
2. Update PRD.md where approved product requirements or behavior changed.
3. Update docs/IMPLEMENTATION_STATUS.md, docs/CHANGELOG.md, docs/TESTING.md and docs/HANDOVER.md.
4. Update docs/ARCHITECTURE.md, docs/DATA_MODEL.md and docs/DECISIONS.md where applicable; explain documentation impact in the PR.
5. Record relevant existing commit IDs and available PR links. A commit cannot contain its own SHA: handover names the verified parent/base and identifies the containing commit through Git history. Never invent a PR URL.
6. Commit code, tests and applicable documentation together. Do not claim the task complete if required checks fail or remain unverified.
7. Final review compares documentation against actual implementation; automation cannot establish semantic accuracy.

Every handover must include these exact level-two headings with concrete content: Date and developer environment; Current branch and latest commit; Milestone and PRD requirement IDs; Summary of implemented changes; Files/modules changed; Tests executed and results; Database migrations or deployment actions; Known problems and risks; Outstanding decisions; Exact next recommended task.

## Commands and review

Use `npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` and `npm run governance:check` from the repository root. See docs/TESTING.md for scope and limitations. For PR checks, pass the actual base SHA and optional PR-body file to `node scripts/check-governance.mjs <base-sha> <pr-body-file>`.

Required GitHub branch protections and stable check names are documented in docs/TESTING.md. Do not confuse a committed workflow with active remote enforcement.
