# EXPLAIN MVP Implementation Plan

Goal: working managed creative portal with persistent research-to-delivery lineage.
Architecture: typed deterministic domain; authorised API; atomic local persistence/Firebase adapter; responsive Next.js workspace.
Spec: docs/superpowers/specs/2026-11-12-explain-mvp-design.md and PRD 1.1.0.
Execution: inline, autonomously authorised by owner; no approval pauses.

## Global constraints
Research-led marketing content and creative production. No fabricated evidence, no production without direction approval, no public real-client data, no automated publishing. Phase-two learning remains a scaffold. No existing Firebase/production mutation.

## Review focus
Cross-project data leakage; stale approvals; duplicate/concurrent mutations; untrusted source/asset URLs; persistence failure and expired invitation/session.

## Tasks
1. Domain contracts and transition tests: create tests/factory.test.ts first (expect missing module), then src/lib/factory/model.ts and engine.ts. Exercise research review, customer approval, immutable versions, task/asset lineage, capability proposal controls, role violations and stale hashes.
2. Persistence/auth/API: tests/factory-server.test.ts first; implement repository.ts, auth.ts, service.ts and API route. Test persistence/restart, concurrent writes, permissions, expiry, unsafe origins/URLs, and configuration fail-closed.
3. Portal: create /portal UI and CSS with brief intake, segmented research, direction review, production tasks, generated SVG/HTML/copy and downloads, capability registry and phase-two learning view. Connect every action to API. Isolated synthetic demo, live operator/customer sessions, accessible responsive controls.
4. Integrations: bounded research provider and Firebase repository adapter; record actual configuration/credential limitations. Default manual research works without AI credentials. Server produces actual downloadable artifacts and export manifest.
5. Verification/docs: full tests, TypeScript, targeted lint/build and browser desktop/mobile workflow; update PRD/status/changelog/handover with measured implementation boundaries. Commit, push and create reviewable PR.

Each task uses failing behaviour tests before implementation and records results in work/mvp-progress.md. A final whole-branch review follows integration.
