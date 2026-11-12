# Latest handover — live foundation

2026-11-12; Codex; feat/live-research-foundation; base ee6523a. CHG-0007/0008. Exact commit/merge/CI status: Git/GitHub. Owner requested next sections after the synthetic MVP; Render remains the host.

New: producer Workspace setup, production launch/origin/durable-storage gates, PUBLIC exact-brief provider authorisation, reviewed AI insight/direction drafts and concurrency/usage safeguards. Read PRD 1.2.0, RENDER_ACTIVATION.md and FOUNDATION_VERIFICATION.md before activation. Shared cross-harness protocol remains AGENTS.md. Configuration example contains names only, never credentials.

Passed: npm test; npm run check:factory; npx tsc --noEmit; npm run build; production browser at port3010; native audit 0 critical/high,15 moderate. Independent read-only review fixes have regression coverage. All provider calls in tests were stubbed. No live Firebase/OpenAI credentials or cloud identities were available; no paid calls/resources or Render settings were changed. Optional request for project ID/account availability remains unanswered; never request secret values in chat.

Next: configure existing Render service durable disk and stable secrets (or validate dedicated Firebase server adapter), restart-test persistence, then test approved live model/citations/schema and record evidence before customers. Provider configuration presence is not connection verification. Do not use legacy booking Firebase project. Preserve Stripe 20.3.1 API version and review grpc override during cloud smoke test. Remaining work includes per-person auth/MFA, currency budgets, full media rendering/rights, multi-harness evaluation and phase-two publishing/measurement.
