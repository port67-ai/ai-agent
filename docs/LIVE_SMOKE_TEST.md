# Live research smoke test

Prepared 2026-11-12 (CHG-0015); script updated for the channel, claim-level research, richer direction, copy pack and video flow (CHG-0020 to CHG-0024). Purpose: prove, on Render with real accounts, that channel-led research, strategy, copy and an optional draft video work end to end, cheaply and under the $25 monthly cap. Nothing here is VERIFIED until the evidence section is filled in with dated results.

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

Roles: client jpell@me.com, producer producer@port67.ai, admin jed@port67.ai. Use a real, well-known public business or a fictional one described only with public information. No private customer data.

**A. Set up (admin)**

1. Render: set the variables above, save, deploy, wait for Live. Complete the AI models steps above. Workspace setup should show the research and synthesis checks ready (presence of configuration is not proof of connection).
2. Optional, for video: enable Firebase Storage for ai-agency-3671b and set PORT67_FIREBASE_STORAGE_BUCKET if the bucket is not the default.

**B. Brief and channels (client)**

3. Create a brief (business, objective, website, competitors, inspiration).
4. Open the Research room. Under "Where will this launch?" choose one to three channels (for example LinkedIn and YouTube for a B2B business, or Instagram and TikTok for a consumer one). Expect icon buttons that toggle with a tick, a counter, and a limit of five.
5. Click Request research. Expect "Research requested for ..." with the date. Confirm you cannot authorise AI or run research as the client.

**C. Research (producer)**

6. Sign in as the producer, select the client account, open the Research room. Expect a banner showing the channels the customer asked for.
7. Authorise public project data (exact-brief consent). Revoking later stops future calls only.
8. Click Start research. It runs the four segments in turn, one paid call each, and should finish with a confirmation. If a segment fails, note which and the message.
9. For each segment check: sources appear; each source shows its own claim and evidence (not the same pasted paragraph); a support rating; the "Not found or unverified" list where relevant. Open at least three URLs and note whether the cited page supports the claim. Note whether the answers focus on the chosen channels.
10. Review each source (supported or rejected).

**D. Strategy (producer, then client)**

11. Draft insights with AI, accept or reject. Draft the direction with AI.
12. Check the direction shows positioning, key messages each with proof and source count, audience segments, tone, claims to avoid, and plans only the chosen channels. Share it. As the client, approve it.

**E. Content (producer, then client)**

13. Production tab: Create production drafts, then Draft copy pack with AI. Open the Asset library and check the AI copy pack: every item names a chosen channel, a key message and its evidence; no number appears that is not in the sources.
14. Share the copy pack and the storyboard. As the client approve both.
15. Video is optional, so first try a content item that needs none: confirm the copy approval alone is enough to download. Then check the Render buttons stay disabled until BOTH the copy set and the storyboard are approved. Click Render 480p draft, download it and check it plays. Only then try Render HD (1080p) and compare file sizes.

**F. Costs and safety (admin)**

16. Private API costs: every call shows provider, model and an estimate, none unknown, month use is small, and the cap line is correct. Reconcile one call against the Google billing page if available. Note the cost of the whole run.
17. Redeploy and confirm the project, channels, sources, assets, videos and ledger persisted.
18. Negative checks: a second client cannot see the first client's project or videos; a guessed project or video ID fails; set PORT67_MONTHLY_BUDGET_USD to 0.01, try one more AI run, confirm it is refused with the cap message, then restore it. Change the channel choice after the direction exists and confirm it is refused.

## Evidence to record (do not mark VERIFIED without it)

Date, Render commit, model IDs, number of calls, total estimated and reconciled cost, citation quality notes (step 9), whether the model followed the finding format, direction and copy quality notes, video size and playback result, anything unknown or failed, results of steps 17 and 18, and who ran it.
