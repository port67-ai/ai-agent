import type { VideoTarget } from "./model";
// Adapted from owner-supplied GenHQ skills: seedance-25 and magi-2-video-prompting Lite.
// Prompt profiles, not executable uploaded skills or verified vendor API capabilities.
export const SEEDANCE_OPENING = "Arricam LT, Cooke S4/i primes, 35mm Kodak Vision3 500T, 1.85:1 spherical, T2.8, shallow depth of field, halation on highlights, fine organic grain, lifted milky blacks, low contrast, no sharpening, no HDR.";
export const VIDEO_SKILLS: Record<VideoTarget,{version:string; instructions:string}> = {
  "seedance-2.5": { version:"seedance-25-multishot-v1", instructions: `Use the supplied GenHQ Seedance 2.5 multishot omni-reference methodology. Output only the mandatory opening, timed shots and closing Audio block. Start verbatim: ${SEEDANCE_OPENING}
Second paragraph: a named grade with hero tone, dominant field, base, shadows and atmosphere; end with Handheld with micro-drift, never locked off. Naturalistic performance, real dialogue sync, no music.
No second camera/film stock, no locked-off/static/tripod-stable shots. Follow approved shot order and timing, use approximately 10–15 words per second of shot duration, at least one second per shot. Use inline numbered @Image references only where relevant, matching the supplied attachment map; filler shots need no reference. Keep consistent identity, light, grade and transition energy, preserve approved dialogue. Closing Audio block 1–3 lines, natural diegetic sound only, no music. The technical opening is a look signature; the approved delivery aspect ratio is separate. Use approved narrative for any industry, not a fashion template.` },
  "magi-3": { version:"magi-2-lite-compat-v1", instructions: `Use the supplied GenHQ MAGI-2 Lite methodology as an unverified MAGI-3 compatibility profile. One concise ready-to-paste prompt, approximately 60–120 words, one look line, timed shots and Audio line, then No text, no subtitles, no logos. Aim for one shot per 3–5 seconds, one action and one camera move per shot, vary shot size, state camera position plainly. Merge adjacent approved beats if necessary without losing key actions or dialogue; preserve total duration. Repeat consistent subject descriptions; when reference images already show details, name the image by role instead of redundant description. Use exact selected @names if referencing assets. Dialogue short and quoted, identify speaker and delivery. Name two or three relevant sounds and music or none as approved. Plain visual words, no quality buzzwords; give the hero moment greatest specificity. Return only the prompt text, not a second-take suggestion or commentary.` },
};
export const videoTargetOf = (v: unknown): VideoTarget => {
  if (v === undefined || v === "seedance-2.5") return "seedance-2.5";
  if (v === "magi-3") return v;
  throw new Error("Choose a supported video target");
};
