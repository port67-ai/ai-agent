# Operations runbook

Status: NOT_VERIFIED — 2026-11-11.

Deployment and recovery procedures for Factory are not established. Do not use existing Firebase configuration as an approved Factory deployment target. Existing package commands include destructive database-cleanup scripts; they are not setup or verification commands.

## CHG-0004 MVP operation
See FACTORY_MVP.md and config/factory.env.example. Demo/manual workflow: npm ci, npm run dev, /portal. Use a persistent private disk for local live mode; keep one Node process. Set a long session secret, long operator password and canonical public origin through hosting settings. Disable demo with PORT67_DEMO_ENABLED=false if desired. Customer links expire after seven days and can be revoked from Business brief. Back up private workspace files securely; test restore in an isolated environment. Existing deployment may expose the isolated demo after merge, but live access stays unavailable without configuration.

Interrupted research: after its two-minute lease expires, use Research activity -> Recover interrupted research. This marks it failed with usage unknown if no response arrived; inspect provider billing before starting another call. No automatic retry. If local disk is ephemeral, records can disappear on restart; do not accept real client briefs under that configuration. Firebase CLI authentication failed during this build, so cloud setup remains blocked on account/environment configuration. No secrets, Firebase projects, IAM, production databases or ad accounts were modified.

Live activation/restart/provider smoke-test procedure: RENDER_ACTIVATION.md. Disable PORT67_LIVE_ENABLED to close production access; disable provider flags to prevent new calls. Revocation cannot cancel costs already incurred. Recover expired runs before retry; late recovered responses remain rejected.
