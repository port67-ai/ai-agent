import assert from "node:assert/strict";
import { proposeIdeas, researchPack, MAX_IDEAS } from "../src/lib/factory/ideas";
import type { Project } from "../src/lib/factory/model";

const km = [1, 2, 3].map((n) => ({ message: `Message ${n}`, proof: "p", sourceIds: ["a" + n] }));
const p = {
  brief: { business: "Foymore", objective: "Launch" },
  strategies: [{ keyMessages: km }],
  formats: { suggested: [], suggestedAt: "", selected: ["static", "video_ugc", "video_short"] },
  audiences: { strapline: "S", segments: [{ id: "a1", name: "Parents", description: "d", angle: "Speed" }, { id: "a2", name: "Students", description: "d", angle: "Value" }], updatedAt: "", updatedBy: "" },
  sources: [{ kind: "public_source", status: "supported", segment: "customer", title: "Reviews", excerpt: "People say it is easy" }],
  insights: [{ title: "Easy wins", status: "reviewed", confidence: "moderate" }],
} as unknown as Project;
let n = 0;
const make = () => "i" + ++n;
const ideas = proposeIdeas(p, make, "t");
assert.ok(ideas.length > 0 && ideas.length <= MAX_IDEAS);
assert.ok(ideas.every((i) => i.status === "proposed" && i.criteria.length >= 3 && i.hook.length > 0 && i.sourceIds.length));
assert.ok(ideas.some((i) => i.format === "video_ugc" && /Honest Review/.test(i.title)));
assert.ok(ideas.some((i) => i.segment === "Parents") && ideas.some((i) => i.segment === "Students"), "tailored per demographic");
assert.equal(new Set(ideas.map((i) => `${i.format}|${i.keyMessage}|${i.segment}`)).size, ideas.length, "no duplicates");
p.ideas = ideas.map((i) => ({ ...i, status: "kept" as const }));
const more = proposeIdeas(p, make, "t");
assert.ok(more.every((m) => !ideas.some((i) => i.format === m.format && i.keyMessage === m.keyMessage && i.segment === m.segment)), "kept ideas are not repeated");
assert.throws(() => proposeIdeas({ ...p, strategies: [{}] } as unknown as Project, make, "t"), /key messages/);
const pack = researchPack(p, [{ segment: "customer", score: 40, rating: "low", weak: true, sources: 1, independentSites: 1, quantifiedShare: 0, reasons: ["one site"] } as never]);
assert.ok(pack.sections.find((s) => s.title === "Customer voice roundup")!.items[0].includes("easy"));
assert.match(pack.sections.find((s) => s.title === "Performance metrics")!.items[0], /No ad account/);
assert.match(pack.actions[0].text, /Strengthen customer insight/);
console.log("Ideas bank and research pack: tailored per format and demographic, no repeats, honest about missing metrics");
