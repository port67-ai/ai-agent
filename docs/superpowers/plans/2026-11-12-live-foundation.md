# Live research foundation implementation plan

Goal: prepare the next managed-service stage on Render: patched dependencies, explicit live-readiness checks and bounded research-led AI synthesis while preserving customer approvals.
Spec: PRD 1.1.1 FAC-MKT-001–006, FAC-DEV-003–006, existing security/activation requirements; owner authorised continuing setup. No provider secrets or cloud account are configured in this execution environment; ask only for account/project identifiers and use settings for credentials.
Architecture: preserve Next.js, server API and typed approval/version contracts. Render stays the host; dedicated Firebase is an optional persistent backend. No changes to live hosting credentials, account billing or legacy cloud state without actual authenticated access.

## Tasks
1. Reproduce known dependency findings using registry bulk advisory metadata against package-lock; save evidence. Upgrade direct dependencies within supported major versions and constrain vulnerable nested versions only when compatibility warrants it. Re-run audit, tests, types, lint, build and browser. Never run blind force upgrades.
2. Add tested configuration/readiness module and safe workspace status UI: storage/origin/session/provider readiness; list configuration names and actionable setup guidance, never secrets. Refuse unsafe live settings; keep synthetic demo available independently. Document exact Render environment and durable-disk/Firebase activation path.
3. Add tested bounded AI insight and direction drafting adapters behind configured provider/operator action, retaining reviewed-source IDs and validated typed output. No fabricated citations, automatic support promotion, customer approvals, tool permissions or external publishing. Record invocation/context/usage/failures; absence of credentials remains honest and recoverable. Human/manual paths still work.
4. Restore overwritten implementation-gap descriptions, update PRD/status/changelog/architecture/handover; run complete acceptance and independent code review, commit/push through a reviewed PR. Activate cloud/provider only if authorised configuration becomes available; otherwise leave exact setup requirements.

Review focus: secrets in status responses; unsafe storage fallback; cross-project evidence IDs in model output; stale strategy/context changes during synthesis; discarded usage on invalid provider output; dependency compatibility with legacy pages and the portal.
