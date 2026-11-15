import assert from "node:assert/strict";
import { prepareFormats, validateFormats, prepareIdeas, validateIdeas, formatsSchema, ideasSchema } from "../src/lib/factory/advisory";
import { digest } from "../src/lib/factory/engine";
import type { Project } from "../src/lib/factory/model";

const km = [{ message: "Save 20% on setup", proof: "Vendor page says 20%", sourceIds: ["a"] }, { message: "Easy to start", proof: "p", sourceIds: ["b"] }];
const p = {
  aiConsent: { briefHash: "h", dataClass: "PUBLIC", by: "x", at: "" },
  brief: { business: "Foymore", objective: "Launch to parents", audience: "Parents" },
  channels: ["tiktok"],
  insights: [{ id: "i1", title: "Parents want speed", interpretation: "Fast setup matters", confidence: "moderate", status: "reviewed" }],
  strategies: [{ message: "S", keyMessages: km, tone: "Warm" }],
  formats: { suggested: [], suggestedAt: "", selected: ["static", "video_ugc"] },
  audiences: { strapline: "Made easy", segments: [{ id: "a1", name: "Parents", description: "d", angle: "Speed" }], updatedAt: "", updatedBy: "" },
  sources: [{ id: "a", status: "supported", title: "A", excerpt: "x" }, { id: "b", status: "supported", title: "B", excerpt: "y" }],
  ideas: [],
} as unknown as Project;
p.aiConsent = { briefHash: digest(JSON.stringify(p.brief)), dataClass: "PUBLIC", by: "x", at: "" };

// consent is required
assert.throws(() => prepareFormats({ ...p, aiConsent: undefined } as unknown as Project), /Authorise/);
const f = prepareFormats(p);
assert.equal(f.payload.formats.length, 7);
assert.ok(f.payload.rulesBaseline.length > 0);
const ok = { suggestions: [{ id: "video_ugc", score: 9, reason: "Creator content suits TikTok parents" }, { id: "static", score: 6, reason: "Fast to test" }] };
assert.deepEqual(validateFormats(ok, f).map((x) => x.id), ["video_ugc", "static"], "best first");
assert.throws(() => validateFormats({ suggestions: [ok.suggestions[0]] }, f), /two to seven/);
assert.throws(() => validateFormats({ suggestions: [ok.suggestions[0], { ...ok.suggestions[0] }] }, f), /Duplicate/);
assert.throws(() => validateFormats({ suggestions: [ok.suggestions[0], { id: "hologram", score: 5, reason: "x" }] }, f), /Unknown/);
assert.throws(() => validateFormats({ suggestions: [ok.suggestions[0], { id: "static", score: 11, reason: "x" }] }, f), /Score/);
assert.throws(() => validateFormats({ suggestions: [ok.suggestions[0], { id: "static", score: 5, reason: "Converts 73% better" }] }, f), /figure/);
assert.throws(() => validateFormats({ suggestions: ok.suggestions, extra: 1 }, f), /two to seven/);
assert.deepEqual((formatsSchema().properties.suggestions.items.properties.id as { enum: string[] }).enum.length, 7);

// ideas
assert.throws(() => prepareIdeas({ ...p, formats: undefined } as unknown as Project), /Choose the ad formats/);
const c = prepareIdeas(p);
const idea = (o: Record<string, unknown> = {}) => ({ title: "The Honest Review", format: "video_ugc", keyMessage: 0, segment: "Parents", hook: "A parent explains the 20% saving", angle: "Speed", criteria: ["Feels native", "Stays on message", "Discloses partnership"], productionNotes: "Vertical, handheld", sourceIds: ["a"], ...o });
const good = validateIdeas({ ideas: [idea(), idea({ title: "Proof Point", format: "static", keyMessage: 1, sourceIds: ["b"] }), idea({ title: "Third", format: "static" })] }, c);
assert.equal(good.length, 3);
assert.ok(good.every((x) => x.sourceIds.length && x.criteria.length >= 3));
assert.throws(() => validateIdeas({ ideas: [idea()] }, c), /three to ten/);
const three = (o: Record<string, unknown>) => ({ ideas: [idea(o), idea({ title: "B", format: "static" }), idea({ title: "C", format: "static", keyMessage: 1, sourceIds: ["b"] })] });
assert.throws(() => validateIdeas(three({ format: "video_long" }), c), /not chosen/);
assert.throws(() => validateIdeas(three({ keyMessage: 5 }), c), /not in the direction/);
assert.throws(() => validateIdeas(three({ segment: "Pirates" }), c), /audience segments/);
assert.throws(() => validateIdeas(three({ sourceIds: ["b"] }), c), /does not support/, "cites only its own message's sources");
assert.throws(() => validateIdeas(three({ criteria: ["one"] }), c), /criteria/);
assert.throws(() => validateIdeas(three({ hook: "Cuts setup by 45%" }), c), /figure/);
assert.throws(() => validateIdeas({ ideas: [idea(), idea(), idea({ title: "C", format: "static" })] }, c), /Duplicate/);
assert.equal((ideasSchema(c).properties.ideas.items.properties.segment as { enum: string[] }).enum[0], "Parents");
console.log("AI format suggester and ideas drafter: strict contracts, evidence-only figures, own-message sources, no duplicates");
