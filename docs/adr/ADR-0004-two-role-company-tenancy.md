# ADR-0004: Two roles and company-record tenancy

Date 2026-11-25. Status: PROPOSED, pending owner sign-off of the design spec. CHG-0103; FAC-VWS-001, FAC-VWS-004, FAC-VWS-008, FAC-VWS-009. Supersedes the per-user tenant derivation in ADR-0003 once implemented; ADR-0003 stays in force until then. Approval evidence: owner instructions in session, 25 November 2026 (decisions D1, D2, D7, D8 in docs/superpowers/specs/2026-11-25-video-workspace-design.md).

## Context

ADR-0003 derives an account ID from the verified sign-in (UID hash) and gives each signed-in person a `customer` or `operator` role. The owner now wants a producer-and-admin-only creative workspace, focused on video, where customers never sign in. A "customer account" becomes a record about a company, which is also the brand.

## Decision

1. Only two roles exist: producer (`operator`) and admin (owner flag). A verified identity that is on neither allowlist has no access.
2. A customer account is a producer-managed company record with a server-generated ID, not a per-user tenant. One company is one brand, in a flat list. Every project belongs to exactly one customer account.
3. Ownership stays server-derived. Clients never post roles or account IDs as authority; a posted account ID is only a reference that the server validates against an existing record the caller's role may use.
4. Approvals that used to belong to the customer are performed by producers and recorded with the producer as actor. The existing gates stay.
5. The customer role is removed in its own change, after the new workspace no longer depends on it. Existing customer accounts, projects and files are then deleted after a verified export and explicit owner confirmation. The owner cost ledger is kept unless the owner says otherwise.

## Alternatives considered

- Keep the customer role dormant in code: rejected by the owner, who chose full removal.
- Read-only customer share links: rejected for now; it would need its own security design.
- Keep per-user tenants and add companies underneath: rejected as unnecessary once customers do not sign in.
- Delete non-video features now: rejected; they are hidden, not deleted (D3).

## Consequences

- Touches identity, account scoping, repositories, Firestore rules and indexes, the customer projection, approval gates and a large part of the test suite. It must be staged so the suite is green at each step.
- Legacy per-user account documents and the v2 layout need a migration or a clean start; the owner chose a clean start.
- Cost ledger rows keep old account and project IDs and become historical only.
- Producer and admin allowlists become the only way in, so they must be verified before the customer role is removed.
- Nothing here is implemented, deployed or verified. It does not approve the remaining imported baseline architecture.
