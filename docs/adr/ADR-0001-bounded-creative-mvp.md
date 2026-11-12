# ADR-0001 — Bounded managed creative MVP

Date: 2026-11-12. Status: implementation decision under owner's autonomous-build authorisation. Change: CHG-0004. Requirements: FAC-MKT-001–011, FAC-TEN-006, FAC-DEV-001–006.

Context: existing Next.js studio/legacy app; no authenticated Firebase account, model API keys or canonical Synapse source. Owner requests an immediately runnable first MVP without further input.

Decision: separate /portal and server-only API with typed domain transitions. Atomic local persistence is the default bounded single-process backend; dedicated Firebase Admin is a configurable, unverified adapter. Synthetic per-visitor demos cannot access live records/providers. Human-managed research/strategy and reviewed template production provide the first complete workflow. Source-linked insight/direction/task/asset approval lineage is foundational. Shared registry/contract seams support future harnesses. Research usage survives rejected findings; expiring leases enable explicit recovery without silent retry.

Alternatives: wait for cloud credentials (no runnable result), reuse legacy Firebase blindly (unknown tenancy/security), or implement a full workflow/media platform (overbuild before one validated slice). Chosen approach makes a real testable workflow available with explicit activation limits.

Consequences: live launch still needs credentials, durable disk or reviewed cloud setup, privacy/retention, individual RBAC and provider-budget review. Local snapshots must be migrated before scale. No claim of production-ready all-PRD implementation, live provider verification or premium video rendering.
