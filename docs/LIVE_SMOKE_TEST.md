# Live research smoke test

Prepared 2026-11-12 (CHG-0015). Purpose: prove, on Render with real accounts, that cited research and AI drafting work end to end, cheaply and under the $25 monthly cap. Nothing here is VERIFIED until the evidence section is filled in with dated results.

## Chosen test configuration

One provider for both stages keeps setup and pricing to a single model. Models and prices are now set in the app (CHG-0016), not in Render.

In Render, set only: PORT67_GEMINI_API_KEY (already exists), PORT67_RESEARCH_ENABLED=true and PORT67_SYNTHESIS_ENABLED=true. The older PORT67_*_PROVIDER, PORT67_*_MODEL and PORT67_MODEL_PRICING_JSON variables are optional fallbacks and can stay unset.

In the app, as admin, open AI models:

1. Under Stage defaults choose Google Gemini and model gemini-3.5-flash for both Research and Drafting.
2. In Prices, click Fetch public prices, then check the values. Enter Search per call as 0.014 (search is $14 per 1,000 queries after 5,000 free per month; 0.014 deliberately overstates cost inside the free allowance, the safe direction for caps).
3. Click Save AI settings. Each job row should read "Runs on gemini:gemini-3.5-flash (default)" with a price set.

Public list prices come from a third-party catalogue and can lag the provider, so confirm input and output in Google AI Studio (ai.google.dev/gemini-api/docs/pricing; the page was stamped "Last updated 2026-06-02 UTC" when read on 2026-11-12) and edit before relying on them. Output price includes thinking tokens, which the adapter counts. The ledger counts one tool call per search query returned in groundingMetadata. The Google project must have billing enabled: Grounding with Google Search is not available on the free tier for Gemini 3 models, so an unbilled key makes research calls fail.

OpenAI was considered and not chosen for the first test: web search is $10 per 1,000 calls plus search content tokens at the model rate, and the scraped page showed an unexplained model-name inconsistency and a promotion ending 2026-11-30, so its table needs a manual check first.

## Cost expectation

A research call is roughly a few thousand input tokens and one to two thousand output tokens plus a handful of search queries: on the order of a few cents. Four research segments, insight drafting and direction drafting should total well under $1 of real cost. With prices saved on the AI models page, estimated spend counts instead of the $1 hold per call. Without them, each call holds $1, so a failed or unpriced test can spend 10 to 20 dollars of the $25 cap in holds. Save prices first. A call that fails before returning usage stays held at $1 until you reconcile it in Private API costs.

## Steps (public data only)

1. Render: set the variables above, save, deploy, wait for Live, then complete the AI models steps above. Admin, Workspace setup: the research and synthesis checks should read ready. Configuration presence is not connection verification.
2. As the client (jpell@me.com) create a brief for a public-data business, for example a real, well-known public company or a fictional one using only public information. No private customer data.
3. Client: authorise the current brief for AI use (exact-brief consent). Revoking later stops future calls only.
4. Producer (producer@port67.ai): select the client account, open Research room, run research for one segment first. Check cited sources appear, review each URL and claim, and note whether citations support the text.
5. Run the other three segments only if the first was sound.
6. Draft insights, accept or reject, draft direction, review, share.
7. Client approves the direction. Producer creates production drafts. Client reviews assets.
8. Admin: open Private API costs. Confirm every call shows provider, model and an estimate, none unknown, month use is small, and the cap line reads correctly. Reconcile one call against the Google billing page if available.
9. Restart or redeploy and confirm the project, sources and ledger persisted.
10. Negative checks: a second client cannot see the first client's project; a guessed project ID fails; set PORT67_MONTHLY_BUDGET_USD to 0.01, try one more run, confirm it is refused with the cap message, then restore it.

## Evidence to record (do not mark VERIFIED without it)

Date, Render commit, model ID, number of calls, total estimated and reconciled cost, citations quality notes, anything unknown or failed, results of steps 9 and 10, and who ran it.
