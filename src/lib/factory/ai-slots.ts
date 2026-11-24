import type { Provider, ProviderStage } from "./providers";
// The AI jobs (slots) and providers, as plain data. Client-safe: no server imports, so pages can name agents and check which
// providers fit a job (CHG-0100 moved these here from ai-routing.ts, which re-exports them unchanged).
export const PROVIDERS: { id: Provider; label: string; research: boolean }[] = [
  { id: "openai", label: "OpenAI", research: true },
  { id: "gemini", label: "Google Gemini", research: true },
  { id: "anthropic", label: "Anthropic Claude", research: false },
  { id: "deepseek", label: "DeepSeek", research: false },
];
export const SLOTS = [
  { id: "synthesis:planner", stage: "synthesis", label: "Planning: research plan", hint: "Interprets the full authorised brief and proposes relevant researchers, questions and medium hypotheses." },
  { id: "synthesis:medium", stage: "synthesis", label: "Planning: evidence-backed medium selection", hint: "Recommends format-channel pairs from reviewed evidence; never substitutes the customer request." },
  { id: "scope:business", stage: "synthesis", label: "Scoping: classify the business", hint: "Reads the brief and decides what each research agent should ask and skip." },
  { id: "research:brand", stage: "research", label: "Research: business and brand", hint: "Product, offer and facts the business can stand behind." },
  { id: "research:customer", stage: "research", label: "Research: customer insight", hint: "Customer language, motivations, objections and reviews." },
  { id: "research:competitor", stage: "research", label: "Research: competitor intelligence", hint: "Competitor positioning and public customer reactions." },
  { id: "research:creative", stage: "research", label: "Research: creative conventions", hint: "Creative and channel conventions in the category." },
  ...(["adjacent", "trends", "video", "channel", "offer", "measurement"] as const).map(segment => ({ id: `research:${segment}` as const, stage: "research" as const, label: `Research: ${segment}`, hint: segment === "channel" ? "Dated channel audience behaviour and medium suitability." : segment === "offer" ? "Product, proposition, proof and purchase friction." : segment === "measurement" ? "KPIs, attribution limits and experiments." : segment === "video" ? "Video craft discovery; Gemini supports explicit public YouTube analysis." : "Adjacent businesses and current channel-specific evidence." })),
  { id: "research:brand-intel", stage: "research", label: "Brand Intelligence: research", hint: "Researches a customer account's brand from its website, socials and the public web, and writes the Brand Foundation Dossier sections 1 to 6." },
  { id: "synthesis:brand-intel", stage: "synthesis", label: "Brand Intelligence: strategic assumption", hint: "Reads the finished dossier sections and flags the single most consequential assumption to verify (section 0). No web search." },
  { id: "synthesis:insights", stage: "synthesis", label: "Drafting: insights", hint: "Turns reviewed sources into draft insights." },
  { id: "synthesis:strategy", stage: "synthesis", label: "Drafting: campaign direction", hint: "Drafts message, reasoning and creative direction." },
  { id: "synthesis:content", stage: "synthesis", label: "Drafting: copy pack", hint: "Writes channel copy from the approved direction and its evidence." },
  { id: "synthesis:formats", stage: "synthesis", label: "Drafting: ad format suggestions", hint: "Suggests which ad formats fit the channels, objective and insights, with reasons. A producer decides." },
  { id: "synthesis:audiences", stage: "synthesis", label: "Drafting: strapline, segments and demographics", hint: "Suggests strapline options and audience segments with demographics from the accepted insights and customer research. A producer decides." },
  { id: "synthesis:ideas", stage: "synthesis", label: "Drafting: ad ideas", hint: "Proposes ad ideas from the direction, chosen formats and audience segments. A producer keeps or drops each." },
  { id: "review:scope", stage: "synthesis", label: "Producer: scope review", hint: "Checks the classification and each researcher's questions against the brief. Sees nothing else." },
  { id: "review:sources", stage: "synthesis", label: "Producer: source review", hint: "Accepts or rejects each source. Sees only the sources, the business and its questions." },
  { id: "review:insights", stage: "synthesis", label: "Producer: insight review", hint: "Accepts or rejects each draft insight against its own evidence. Sees no direction." },
  { id: "review:direction", stage: "synthesis", label: "Producer: direction review", hint: "Decides whether the direction is ready for the account owner. Sees no raw sources." },
  { id: "studio:preproduction", stage: "synthesis", label: "Studio: pre-production writer", hint: "Writes the mood board, continuity profile, scenes, script, narratives, hooks, shot list and voice notes from the approved direction only." },
  { id: "studio:image", stage: "synthesis", label: "Studio: image generation", hint: "Draws studio test frames, keyframes and Scene Pack stills. OpenAI Images only; without a route it uses PORT67_IMAGE_MODEL or gpt-image-1." },
] as const satisfies readonly { id: string; stage: ProviderStage; label: string; hint: string }[];
export type SlotId = (typeof SLOTS)[number]["id"];
export const researchSlot = (segment: string) => `research:${segment}` as SlotId;
export const synthesisSlot = (stage: string) => (stage === "insights" ? "synthesis:insights" : stage === "content" ? "synthesis:content" : stage === "formats" ? "synthesis:formats" : stage === "ideas" ? "synthesis:ideas" : stage === "audiences" ? "synthesis:audiences" : "synthesis:strategy") as SlotId;
/** The studio image slot (CHG-0098) is OpenAI Images only and never inherits the drafting default (a text model cannot draw). */
export const IMAGE_SLOT = "studio:image";
export const isSlotId = (v: unknown): v is SlotId => typeof v === "string" && SLOTS.some((s) => s.id === v);
export const slotLabel = (id: string) => SLOTS.find((s) => s.id === id)?.label || id;
export const providerLabel = (id: string) => PROVIDERS.find((p) => p.id === id)?.label || id;
