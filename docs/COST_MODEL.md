# Cost model

Status: NOT_VERIFIED — 2026-11-11.

Commercial figures are hypotheses from the business plan. Provider ledger, pricing versions, budget enforcement and reconciliation are not verified. No provider calls or paid infrastructure are required for this documentation baseline.

## CHG-0004 invocation metering
Template draft generation has no provider charge. Live OpenAI research is explicit/configured/operator-only, limited to one active reservation/project, bounded timeout/output and a configurable 1–50 invocation cap (default 12). Usage and provider response IDs are retained even if findings are uncited or source capacity rejects them; transport failures are marked usage unknown. Failed reservations count toward the cap; operator recovery does not retry automatically. This is invocation control and raw usage metering, not the complete versioned GBP cost/reservation/reconciliation ledger required by FAC-CST. Configure actual monetary budgets at the provider before enabling paid calls.
