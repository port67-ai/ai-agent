# ADR-0002 — Live foundation on Render

Date: 2026-11-12. Status: implementation decision within owner-authorised next-stage scope. Requirements FAC-MKT-013–015/FAC-DEV-008; CHG-0007/0008.

Context: owner confirms the synthetic MVP and requests next sections; Render is the selected host. Cloud credentials are unavailable. Alternative: silently enable live calls on ephemeral storage or replace hosting; rejected because it cannot establish durable operation.

Decision: retain Render, add explicit safe readiness/launch gates and reviewed optional AI synthesis. Exact-brief PUBLIC authorisation, bounded reviewed references, human gates, frozen context and raw usage apply across provider stages. Dedicated Firebase remains optional and unverified; local persistence requires one process and a confirmed disk. Source-controlled capabilities expand through review, not autonomous code promotion.

Consequences: useful manual/synthetic workflows continue without keys; actual activation needs persistence/provider smoke tests. No claim of full auth, monetary accounting, media rendering, multi-provider parity or production certification. Approval evidence: owner's continuing autonomous build request and explicit Render preference, not approval of unresolved baseline architecture.
