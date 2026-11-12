# Project memory and change control

Established 2026-11-11 at the owner's request to commit the shared framework to the connected repository.

## Authority and ownership
The original business plan governs commercial context; PRD.md is the canonical intended Factory specification. Neither proves implementation. The supplied PRD was initially imported byte-for-byte as proposed version 1.0.0 (hash retained in reference/PROVENANCE.md); the living PRD is now 1.1.0 under owner-confirmed scope change CHG-0003; committing it does not approve every product decision or authorise its embedded task instructions. Its Synapse audit remains outstanding.

AGENTS.md governs coding-session conduct. Approved ADRs describe technical decisions. Code and reproducible acceptance evidence establish implementation reality. Flag contradictions and pause only affected work rather than silently resolving material scope changes.

## One change history
`docs/CHANGELOG.md` is the single ongoing change ledger. PRD section 26 is retained as the historical imported baseline record; future PRD revisions reference change IDs from the central ledger instead of creating a second narrative. This convention does not change product behaviour.

Every substantive change records a unique CHG identifier, date, author/harness, what changed, why, requirement IDs, PRD version/impact, checks, status and branch/PR/commit reference. Entries are append-only except factual corrections or lifecycle updates with evidence. A git commit records the precise diff; a PR records review; neither implies deployment. Use `git log -- docs/CHANGELOG.md` to resolve the commit containing an entry without circular self-hashes.

## Lifecycle
Requirement intent: proposed, approved, deferred or rejected. Delivery: not started, in progress, implemented or verified. Track these separately. Never infer owner approval from a label copied from an attachment. No Factory capability is currently verified.

Before coding, identify requirements and agree any material scope change. Change requirements and acceptance criteria in the same PR as their implementation; bump PRD semver according to section 21.5. For changes that preserve requirements record `PRD impact: none` and rationale. Record decision alternatives and consequences in a new ADR when material.

## Checks and review
Run `python3 scripts/check_docs_governance.py --base origin/main` after fetching. The workflow checks required files, harness pointers, PRD IDs/status coverage and documentation updates for substantive changes. Reviewers check semantic consistency, acceptance evidence and any exemption rationale. Configure branch protection to require Documentation governance / check before merge; this setting is not applied by the files themselves. Application lint/build/security checks remain separate and must be added or run as relevant to code changes.

## Handover and concurrency
HANDOVER.md is the latest entry point; historical handovers are retained in Git. Include branch, base commit, change IDs, checks, blockers and exact next task. Keep in-flight work on separate branches/worktrees. Fetch, reconcile changed requirements and rerun checks before merging; do not overwrite another harness's status or change entries.
