// Ad formats a campaign can produce. Client-safe: no server imports. The system suggests, a producer decides.
export type AdFormat = { id: string; name: string; group: "static" | "video" | "motion" | "written"; summary: string; video: boolean };
export const FORMATS: readonly AdFormat[] = [
  { id: "static", name: "Static ad", group: "static", video: false, summary: "A single image or carousel with a headline: fast to make, easy to test many hooks." },
  { id: "video_short", name: "Short-form video", group: "video", video: true, summary: "Vertical video up to about 30 seconds for Reels, Shorts and TikTok: a hook in the first seconds, one message." },
  { id: "video_long", name: "Long-form video", group: "video", video: true, summary: "Explainer, demo, review or story over one to several minutes, for trust and consideration." },
  { id: "video_ugc", name: "UGC video", group: "video", video: true, summary: "Creator-style testimonial, unboxing or demo shot like a native post by a real customer or hired creator: authentic, low production, many hook variants." },
  { id: "motion", name: "Motion graphics ad", group: "motion", video: false, summary: "Animated type, shapes and product visuals with no live action: clear, brand-controlled and quick to revise." },
  { id: "written_ad", name: "Written ad", group: "written", video: false, summary: "Headline and body copy for feeds, search, email or messaging." },
  { id: "written_long", name: "Blog or white paper", group: "written", video: false, summary: "Long written authority content that earns trust, search and AI recommendation, often with a gated download." },
];
export const formatById = (id: string) => FORMATS.find((f) => f.id === id);
export const formatNames = (ids: readonly string[] | undefined) => (ids || []).map((i) => formatById(i)?.name).filter((n): n is string => !!n);
export const hasVideoFormat = (ids: readonly string[] | undefined) => (ids || []).some((i) => formatById(i)?.video);
export function validFormats(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > FORMATS.length || value.some((v) => typeof v !== "string")) throw new Error("Choose at least one ad format");
  const set = new Set(value as string[]);
  if ([...set].some((i) => !formatById(i))) throw new Error("Unknown ad format");
  return FORMATS.filter((f) => set.has(f.id)).map((f) => f.id);
}

const FIT: Record<string, { id: string; why: string }[]> = {
  tiktok: [{ id: "video_short", why: "native vertical short video" }, { id: "video_ugc", why: "creator-style content outperforms polished ads on the feed" }],
  instagram: [{ id: "video_short", why: "Reels" }, { id: "video_ugc", why: "creator content" }, { id: "static", why: "visual storefront and carousels" }, { id: "motion", why: "scroll-stopping animated visuals" }],
  facebook: [{ id: "static", why: "high-converting paid image ads" }, { id: "video_short", why: "Reels and feed video" }, { id: "video_ugc", why: "testimonial proof" }, { id: "written_ad", why: "longer feed copy works for 30+ audiences" }],
  linkedin: [{ id: "static", why: "document and image posts" }, { id: "written_ad", why: "thought-leadership copy" }, { id: "written_long", why: "authority content and white papers" }, { id: "video_long", why: "founder and explainer video" }, { id: "motion", why: "clear animated explainers" }],
  youtube: [{ id: "video_long", why: "long-form builds trust and search" }, { id: "video_short", why: "Shorts" }],
  pinterest: [{ id: "static", why: "purchase-intent visual search" }, { id: "motion", why: "animated pins" }],
  reddit: [{ id: "written_ad", why: "community-native text" }, { id: "written_long", why: "threads reward substance" }, { id: "video_ugc", why: "authentic voices" }],
  whatsapp: [{ id: "static", why: "shareable image" }, { id: "written_ad", why: "direct message copy" }],
  x_threads: [{ id: "written_ad", why: "short real-time copy" }, { id: "static", why: "image posts" }],
};
export type FormatSuggestion = { id: string; score: number; reason: string };
/** Rule-based suggestions from the chosen channels and the objective, best first. A producer always makes the choice. */
export function suggestFormats(channels: readonly string[] | undefined, objective: string): FormatSuggestion[] {
  const score = new Map<string, number>();
  const why = new Map<string, string[]>();
  const add = (id: string, n: number, w: string) => { score.set(id, (score.get(id) || 0) + n); why.set(id, [...(why.get(id) || []), w]); };
  for (const c of channels || []) for (const f of FIT[c] || []) add(f.id, 2, `${f.why} (${c})`);
  const o = objective.toLowerCase();
  if (/authority|thought|b2b|lead|white ?paper|enterprise/.test(o)) { add("written_long", 2, "the objective is authority or leads"); add("written_ad", 1, "the objective is authority or leads"); }
  if (/aware|launch|reach|new/.test(o)) { add("video_short", 1, "the objective is awareness or launch"); add("static", 1, "the objective is awareness or launch"); }
  if (/sale|convert|purchase|e-?commerce|buy/.test(o)) { add("video_ugc", 1, "the objective is sales"); add("static", 1, "the objective is sales"); }
  if (!score.size) for (const id of ["static", "video_short", "written_ad"]) add(id, 1, "a sensible starting set when no channel is chosen");
  return [...score.entries()].sort((a, b) => b[1] - a[1] || FORMATS.findIndex((f) => f.id === a[0]) - FORMATS.findIndex((f) => f.id === b[0]))
    .map(([id, s]) => ({ id, score: s, reason: [...new Set(why.get(id))].slice(0, 3).join("; ") }));
}
