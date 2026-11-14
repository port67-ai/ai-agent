import type { Pricing } from "./costs";

/**
 * Built-in standard list prices (USD per 1M tokens), used when a model is chosen and the admin has not entered a price.
 * An admin price or PORT67_MODEL_PRICING_JSON always wins. Pure data: safe to import in the browser.
 *
 * DeepSeek, from its published price list (2026-11-14). DeepSeek charges half the rate off-peak (all hours except 01:00-04:00 and
 * 06:00-10:00 UTC Monday to Friday). A single rate is stored per model, so the PEAK rate is used: estimates and spend caps can
 * only overstate, never understate, the real bill. Search is $0.75 per 1,000 searches, stored as a per-call fee.
 *
 * Gemini, from ai.google.dev/gemini-api/docs/pricing (Standard paid tier, text/image/video, 2026-11-14). Models with a price step above
 * 200k-token prompts use the higher rate. Output includes thinking tokens. Grounding with Google Search is stored as a per-call fee:
 * $14 per 1,000 search queries on Gemini 3 models, $35 per 1,000 grounded prompts on 2.5 models. The monthly free allowance and the
 * per-query count are not tracked, so search cost can only be overstated per call, and a call that runs several queries can be understated.
 *
 * OpenAI, from the owner's copy of OpenAI's pricing page (Standard tier, short context, 2026-11-14). Where a model has cache-write
 * prices the higher 12h write rate is stored. No web search fee was supplied, so OpenAI search calls are priced on tokens only until a
 * per-call search price is entered on the model dialog.
 */
const AS_OF = "2026-11-14";
const FLASH: Pricing = { updatedAt: AS_OF, inputPerMillion: 0.3, outputPerMillion: 1.2, cachedInputPerMillion: 0.006, toolPerCall: 0.00075 };
const PRO: Pricing = { updatedAt: AS_OF, inputPerMillion: 1.32, outputPerMillion: 3.96, cachedInputPerMillion: 0.044, toolPerCall: 0.00075 };
const gemini = (inputPerMillion: number, outputPerMillion: number, cachedInputPerMillion: number, toolPerCall: number): Pricing => ({ updatedAt: AS_OF, inputPerMillion, outputPerMillion, cachedInputPerMillion, toolPerCall });
const openai = (inputPerMillion: number, outputPerMillion: number, cachedInputPerMillion?: number, cacheCreationPerMillion?: number): Pricing => ({
  updatedAt: AS_OF, inputPerMillion, outputPerMillion,
  ...(cachedInputPerMillion === undefined ? {} : { cachedInputPerMillion }),
  ...(cacheCreationPerMillion === undefined ? {} : { cacheCreationPerMillion }),
});
// Anthropic, from platform.claude.com/docs/en/about-claude/pricing (2026-11-14): standard rates, cache-read from the page, web search $10 per
// 1,000 (stored as a per-call fee). Cache writes use twice the input rate (the 1h write rate; the 5m rate is lower). Haiku 5.5 is priced
// by prompt length ($0.50 in / $2.50 out above 100k tokens); the rate up to 100k is stored because the app's prompts stay well below it.
// Batch (half price) and Fast mode (2x) are not modelled.
const claude = (input: number, output: number, cacheRead: number): Pricing => ({ updatedAt: AS_OF, inputPerMillion: input, outputPerMillion: output, cachedInputPerMillion: cacheRead, cacheCreationPerMillion: input * 2, toolPerCall: 0.01 });
const G3_PRO = gemini(4, 18, 0.4, 0.014);
export const STANDARD_PRICES: Record<string, Pricing> = {
  "deepseek:deepseek-flash": FLASH,
  // Retired names that DeepSeek still accepts and bills at the Flash price.
  "deepseek:deepseek-v4-flash": FLASH,
  "deepseek:deepseek-v4-flash-vision-exp": FLASH,
  "deepseek:deepseek-v4-pro": PRO,
  "anthropic:claude-fable-5-2": claude(8, 40, 0.2),
  "anthropic:claude-opus-5-5": claude(4, 20, 0.2),
  "anthropic:claude-sonnet-5-5": claude(2, 10, 0.1),
  "anthropic:claude-haiku-5-5": claude(0.1, 0.5, 0.01),
  "openai:gpt-6-astra": openai(10, 50, 1, 25),
  "openai:gpt-6.1-sol": openai(2, 10, 0.1, 5),
  "openai:gpt-6.1-terra": openai(1, 5, 0.05, 2.5),
  "openai:gpt-6-luna": openai(0.1, 0.5, 0.01, 0.25),
  "openai:gpt-6-sol": openai(2, 10, 0.2, 5),
  "openai:gpt-5.6-sol": openai(4, 20, 0.4, 10),
  "openai:gpt-5.6-terra": openai(2, 12, 0.2, 5),
  "openai:gpt-5.6-luna": openai(0.2, 1.2, 0.02, 0.5),
  "openai:gpt-5.5": openai(5, 30, 0.5),
  "openai:gpt-5.5-pro": openai(30, 180),
  "openai:gpt-5.4": openai(2.5, 15, 0.25),
  "openai:gpt-5.4-pro": openai(30, 180),
  "openai:gpt-5.4-mini": openai(0.75, 4.5, 0.075),
  "openai:gpt-5.4-nano": openai(0.2, 1.25, 0.02),
  "openai:gpt-5.2": openai(1.75, 14, 0.175),
  "openai:gpt-5.2-pro": openai(21, 168),
  "openai:gpt-5.1": openai(1.25, 10, 0.125),
  "openai:gpt-5": openai(1.25, 10, 0.125),
  "openai:gpt-5-mini": openai(0.25, 2, 0.025),
  "openai:gpt-5-nano": openai(0.05, 0.4, 0.005),
  "openai:gpt-5-pro": openai(15, 120),
  "openai:gpt-4.1": openai(2, 8, 0.5),
  "openai:gpt-4.1-mini": openai(0.4, 1.6, 0.1),
  "openai:gpt-4o": openai(2.5, 10, 1.25),
  "openai:gpt-4o-mini": openai(0.15, 0.6, 0.075),
  "openai:o3": openai(2, 8, 0.5),
  "openai:o3-pro": openai(20, 80),
  "gemini:gemini-3.5-flash": gemini(1.5, 9, 0.15, 0.014),
  "gemini:gemini-3-flash-preview": gemini(0.5, 3, 0.05, 0.014),
  "gemini:gemini-3.1-flash-lite": gemini(0.25, 1.5, 0.025, 0.014),
  "gemini:gemini-3.1-pro-preview": G3_PRO,
  "gemini:gemini-3.1-pro-preview-customtools": G3_PRO,
  "gemini:gemini-2.5-pro": gemini(2.5, 15, 0.25, 0.035),
  "gemini:gemini-2.5-flash": gemini(0.3, 2.5, 0.03, 0.035),
};
export const standardPrice = (provider: string, model: string): Pricing | undefined => {
  const key = `${provider}:${model}`;
  return Object.hasOwn(STANDARD_PRICES, key) ? { ...STANDARD_PRICES[key] } : undefined;
};
