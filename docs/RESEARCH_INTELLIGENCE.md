# Research intelligence — testing CHG-0062

The research bus studies the client, customers, competitors, creative conventions, adjacent businesses, current social patterns and video language. These are independently scoped, paid model jobs using the existing account/project ledger, prices and spend caps. Native web-search results are still model-mediated observations and need review.

## Test when you return

1. Open a test project in the Research room. Choose the campaign channels and check the business brief. Use a fresh test project or deliberately reclassify the scope; do not reset real customer work merely to see the new roles.
2. As admin, open the system map/AI agents: adjacent, trends and video must appear. Existing research defaults apply; choose explicit models if wanted. For direct video, choose a Gemini model supporting video input on Video language. Verify the existing Gemini key/readiness without exposing it.
3. Authorise the public project data and start research. Seven areas should run: brand, customer, competitor, creative, adjacent, trends, video. New jobs spend credits; existing monetary caps and configured invocation limits still apply. The default invocation cap is 20, allowing seven initial calls plus bounded retries/drafting, not unlimited depth.
4. In Adjacent businesses, look for businesses connected through the audience, purchase occasion or journey, with examples, transferable principles and limits. In Social trends, look for actual dated posts, sampling caveats and corroboration; no access or no verified dates means a gap, not a fabricated trend.
5. In Video language, find or manually add a public YouTube video/Short with title and an honest reference description. On its source card choose **Analyse video with Gemini · paid**. This is explicit paid native-video input, not another search. The first 120 seconds are sampled at 2 fps; very fast cuts may be missed. Private/deleted/unsupported video must return an actionable error rather than a visual report.
6. Expand the resulting new video evidence card: style, lighting, motion, graphics/captions, pacing, length, hook, audio, proposed adaptation, limitations and timecodes. It starts unreviewed. Watch the source yourself and accept/reject the observations. Interpretation is not ground truth, and one clip is not proof of a trend or conversion.
7. Run the producer. Review supported insights, then the campaign direction. A video-led design should explain lighting, motion, graphics, pacing, duration, hook and audio; adaptations must fit the brand and be presented as choices/hypotheses rather than borrowed performance claims.
8. After the existing direction approval, create production/copy and plan the video advert. The approved treatment should reach script instructions and compiled advert prompts. The producer must still approve continuity; its camera/lighting/format values and shot overrides take precedence. Final asset approval remains unchanged.
9. As owner, inspect costs by agent/provider. Gemini analysis is research:video with its own run/request/usage. Producers/customers must not gain private ledger access.

## Research destinations and access

The payload routes discovery toward the client's/adjacent brands' sites, individual social posts, Meta Ad Library, TikTok Creative Center, YouTube/Google Ads Transparency, LinkedIn Ad Library, Pinterest Trends and Reddit where relevant to chosen channels. These are discovery suggestions for the existing grounded web tool, not installed authenticated APIs. JS/login/region restrictions may prevent access. No new Supadata, Apify, X or paid scraping subscription is assumed. Native TikTok/Instagram video ingestion and a continuous social feed are not built.

## Context, compatibility and limits

Runs pin a capability/skill version and full public research snapshot including channels and stored scope. A changed scope/channel/brief or revoked authorization rejects late evidence while preserving usage. Old four-role campaigns may finish without forced paid reruns; expanding/reclassifying their scope introduces all seven roles. Existing approved strategy hashes stay intact.

Research calls remain bounded provider invocations. Page budgets are instructions to the provider's hosted search tool, not independently enforced retrieval counts. No durable multi-stage research queue or generic self-updating skill registry is claimed. Source scoring retains the latest evidence grading; shared-origin and relevance judgments still need producer scrutiny. Trend dates/metrics and source quotes are not independently scraped/validated by this change.

## Local verification

- `npm test`: full suite, including seven-role auto-start/scoping/UI contracts, legacy continuation, native-video validation, producer-only action, wrong-source denial, ledger attribution, inaccessible-video rejection, changed-channel rejection with retained usage, source balancing and distinct YouTube video-ID citation matching. Independent review found an ordinary-retry scope replacement regression; its reproduction failed before the fix and now passes, preserving legacy manual questions.
- `npm run check:factory`, `npx tsc --noEmit`, `npm run build`.
- `npm run test:browser`: demo production/approval flow and account/admin fixtures; test fixtures are explicit, not live Firebase/provider evidence.
- `npm run audit:security`: no high/critical; 19 existing moderate dependency findings. No dependencies added.
- `python3 scripts/check_docs_governance.py --base 3bfa110`: passed.
- `npm run test:firestore`: blocked locally because the emulator JAR could not be downloaded from storage.googleapis.com; no emulator assertions ran. The existing remote CI runs this separately.

Actual selected Gemini model/video compatibility, the quality of research against a real brief and live platform access require the configured acceptance run above. No live provider calls were made during implementation. Existing build tracing warnings in video-store.ts remain unrelated to this research change.
