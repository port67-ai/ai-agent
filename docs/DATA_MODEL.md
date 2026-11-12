# Data model

Status: NOT_VERIFIED — 2026-11-11.

Existing Firebase files and src/lib/services/firebase-db.ts need a source-backed audit. Factory schema in PRD section 9 is proposed; no migrations or tenant-isolation acceptance evidence exists.

## CHG-0004 actual MVP records
Workspace snapshot schemaVersion 1: `projects[]` and hashed `invitations[]`. A project owns `brief`, `sources`, `insights`, `strategies`, `tasks`, `assets`, `capabilities`, `runs`, `audit`, revision and idempotency keys. Explicit limits: 700KB/workspace, 20 projects, 150 sources/project, 80 insights, 50 direction versions and 30 capability proposals. Source links are project-local; strategy hashes include insight/source IDs and all creative fields. Asset content/hash are immutable; a new direction creates new tasks/assets rather than mutating old content. Customer approvals store actor/time/hash. Delivery rejects superseded direction dependencies.

Local files: private `.factory-data/<workspace>.json`; demo uses separate `.factory-demo/demo-<uuid>.json`. Atomic rename and serialized same-process writes prevent partial updates; revision checks prevent stale edits. Dedicated Firebase adapter uses `factory_workspaces_v1/<workspace>` server-only snapshots with transactions. No root legacy rules or indexes were changed, no migration deployed. Split to project/artifact collections before scaling; evaluate database edition/region and client-deny rules with actual authenticated access first.
