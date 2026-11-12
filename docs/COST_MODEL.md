# Cost model

Status: NOT_VERIFIED — 2026-11-11.

Commercial figures are hypotheses from the business plan. Provider ledger, pricing versions, budget enforcement and reconciliation are not verified. No provider calls or paid infrastructure are required for this documentation baseline.

## CHG-0004 invocation metering
Template draft generation has no provider charge. Live OpenAI research is explicit/configured/operator-only, limited to one active reservation/project, bounded timeout/output and a configurable 1–50 invocation cap (default 12). Usage and provider response IDs are retained even if findings are uncited or source capacity rejects them; transport failures are marked usage unknown. Failed reservations count toward the cap; operator recovery does not retry automatically. This is invocation control and raw usage metering, not the complete versioned GBP cost/reservation/reconciliation ledger required by FAC-CST. Configure actual monetary budgets at the provider before enabling paid calls.

CHG-0008: research and synthesis share bounded per-project invocation count (default12). Capture raw provider usage even on invalid/stale output; reserve snapshot capacity for completion. This is not pricing, currency accounting or provider-side spend enforcement; configure account budgets before live use.

CHG-0009: all current managed AI dispatches reserve durable admin-only ledger rows before transport, with unknowns retained on missing usage/rates/tools. Frozen USD rates separate regular/cache-read/cache-creation/output/tool units; reasoning tokens counted. Reconciliation is actual microUSD with reference, not inferred invoice data. Durable archives retain history and restore active capacity. No currency hard-budget enforcement or automatic infrastructure invoice ingestion. Setup/format: ACCOUNTS_PROVIDERS_COSTS.md.
