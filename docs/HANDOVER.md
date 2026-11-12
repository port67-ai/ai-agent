# Latest handover — first managed creative MVP

Date: 2026-11-12. Harness: Codex. Branch: feat/explain-managed-mvp. Base: 6fa08f8. Change: CHG-0004. Commit/PR: resolve exact references through Git history and GitHub; do not infer merge from this file.

Owner requested autonomous implementation without approval pauses. Built /portal for **Research-led marketing content and creative production**: minimal brief/optional PNG logo, segmented sources, reviewed insights, campaign message/reasoning/design approval, specialist production tasks, SVG/HTML motion/copy drafts, customer asset review/approval and delivery lineage. Includes capability proposals and phase-two learning hypothesis scaffold. Shared AGENTS.md/PRD/changelog/status remain authoritative across harnesses.

Start: npm ci; npm run dev; open /portal; Explore the demo. Synthetic Fieldwork evidence is labelled; demo visitors are isolated and can switch producer/customer only within their own workspace. Real login/invites require server secrets; live provider requires explicitly enabled credentials. Configuration and limitations: FACTORY_MVP.md, config/factory.env.example. No authentication/secrets were available for Firebase provisioning (CLI failed to authenticate), and no live model call or cloud adapter verification is claimed.

Domain/model/auth/repository/service/research/registry: src/lib/factory. UI split by feature in src/components/factory. API: src/app/api/factory/[...path]. Lazy legacy Firebase services fix import-time build failure without dummy credentials. Local store uses private atomic snapshots and requires one process/durable disk. Dedicated Firebase adapter remains a bounded snapshot prototype; review separate project/client-deny rules/IAM before activation.

Checks: final execution results in MVP_VERIFICATION.md. Independent reviewer identified interrupted-run lock, lost usage on rejected paid output and global unauthenticated throttle; regression tests now cover their fixes. Also corrected context/run lineage, customer revision pause and replacement-logo consent. No full-PRD VERIFIED labels assigned.

Next actions: configure live auth secrets and persistent storage; configure/authenticate a dedicated Factory Firebase project and validate its edition/region/IAM/client-deny rules if selecting cloud mode; choose approved research model/provider budget and run a real cited-source smoke test; build actual media rendering/upload/rights and per-person auth; extend portable harness adapters with shared evaluations. Phase-two ad-account analytics/publication is not active. Do not silently claim Synapse reuse or full provider parity.

CHG-0005 / PR #4 follow-up: demo snapshots default to the OS temporary directory, avoiding read-only application-bundle writes; live records stay separate. Disposable serverless demo state may reset across instances. Default-path regression plus full checks repeated; production new-brief/PNG-consent/manual-source/insight/edit workflow passed.

CHG-0006: pin browser CI to Ubuntu 24.04 after remote Playwright OS-support failure on ubuntu-latest/26. First remote tests/lint/types/build passed; inspect the subsequent run for browser results.
