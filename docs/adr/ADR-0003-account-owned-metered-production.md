# ADR-0003 — Account-owned metered production

Date2026-11-12. Status: implementation decision within explicit owner scope. CHG-0009; FAC-TEN-008/FAC-CST-009/FAC-HAR-004. Approval evidence: owner asks to implement items1–4 with individual accounts, account IDs and admin-only any-model API cost tracking.

Retain Render/Next server API. Use Firebase verified email identities in dedicated ai-agency-3671b, server UID role allowlists and deterministic initial account IDs. New account/project documents preserve transactional changes; bounded component arrays carry common lineage. Legacy snapshots are not silently reassigned. A direct browser Firestore design was rejected to keep private draft/cost boundaries server-controlled.

Provider adapters support four drafting providers and grounded research only where implemented. No retries/fallbacks hide additional charges. Reserve cost rows before every managed AI dispatch, preserve unknowns, freeze configured prices, reconcile actual invoices explicitly. Separate owner access excludes producer/customer data projections. Active batches archive durably before removal and remain queryable; current bounds require eventual ledger/document expansion.

Consequences: cloud authentication, model compatibility and real campaign remain unverified until access is configured. Firebase/Render/Stripe invoice costs, team accounts, currency budgets and full media production are separate future capabilities. This decision does not approve all outstanding imported baseline architecture.
