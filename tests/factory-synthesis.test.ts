import assert from "node:assert/strict";
import { createProject, transition, digest } from "../src/lib/factory/engine";
import {
  prepareSynthesis,
  validateInsights,
  validateDirection,
} from "../src/lib/factory/synthesis";
const op = {
  role: "operator" as const,
  workspaceId: "synthesis-test",
  subject: "producer",
};
let p = createProject(
  {
    business: "Brand",
    objective: "Introduce a consumer product",
    contact: "a@example.com",
  },
  op,
);
assert.throws(() => prepareSynthesis(p, "insights"), /authoris/i);
p = transition(p, { type: "authoriseAI", confirm: true }, op);
assert.equal(p.aiConsent?.briefHash, digest(JSON.stringify(p.brief)));
assert.throws(() => prepareSynthesis(p, "insights"), /reviewed public/);
p = transition(
  p,
  {
    type: "addSource",
    segment: "customer",
    title: "Review source",
    url: "https://example.com/review",
    excerpt: "The onboarding was confusing.",
  },
  op,
);
p = transition(
  p,
  { type: "reviewSource", id: p.sources[0].id, status: "supported" },
  op,
);
const context = prepareSynthesis(p, "insights");
assert.ok(
  !JSON.stringify(context.payload).includes("a@example.com"),
  "approval email is not sent to model",
);
assert.throws(
  () =>
    validateInsights(
      {
        insights: [
          {
            title: "Invented",
            interpretation: "Unsupported",
            sourceIds: ["outside"],
            confidence: "strong",
          },
        ],
      },
      context,
    ),
  /source/,
);
const findings = validateInsights(
  {
    insights: [
      {
        title: "Clarity",
        interpretation: "Explore a clearer introduction",
        sourceIds: [p.sources[0].id],
        confidence: "strong",
      },
    ],
  },
  context,
);
assert.equal(
  findings[0].confidence,
  "limited",
  "one source cannot silently become strong evidence",
);
p = transition(p, { type: "addInsight", ...findings[0] }, op);
p.insights[0].status = "draft";
assert.throws(() => prepareSynthesis(p, "strategy"), /reviewed insight/);
p = transition(
  p,
  { type: "reviewInsight", id: p.insights[0].id, status: "reviewed" },
  op,
);
const directionContext = prepareSynthesis(p, "strategy");
const proposed = {
  audience: "B2C customers",
  message: "A clearer beginning",
  rationale:
    "The reviewed source describes confusion; test simpler onboarding messaging.",
  design: "Warm, clear typography",
  channels: "To validate",
  format: "30-second concept",
  cta: "Learn more",
  hypothesis: "Clarity may improve understanding",
  uncertainties: "Limited sample; no performance proof",
  positioning: "For new customers, a clear starting point",
  audienceSegments: "First-time buyers who feel lost",
  keyMessages: [{ message: "Start simply", proof: "Reviewed source reports confusion", sourceIds: [p.sources[0].id] }],
  tone: "Warm and plain",
  doNotClaim: "No performance or ranking claims",
  evidenceIds: [p.sources[0].id],
  insightIds: [p.insights[0].id],
};
for (const bad of [
  { ...proposed, keyMessages: [] },
  { ...proposed, keyMessages: [{ message: "x", proof: "y", sourceIds: ["not-a-source"] }] },
  { ...proposed, keyMessages: [{ message: "x", proof: "y", sourceIds: [] }] },
  { ...proposed, keyMessages: [{ message: "x", proof: "y" }] },
  { ...proposed, tone: undefined },
])
  assert.throws(() => validateDirection(bad as never, directionContext), "key messages need cited reviewed proof");
assert.equal(
  validateDirection(proposed, directionContext).message,
  proposed.message,
);
// A model that runs a little over a field limit is clipped, not rejected; evidence behind a selected insight it forgot is added.
const long = validateDirection({ ...proposed, cta: "Book your first clay pigeon session today and bring the whole family along for a full day outdoors with expert instructors", message: "word ".repeat(200) }, directionContext);
assert.ok(long.cta.length <= 100 && long.cta.endsWith("…"), "an over-long call to action is clipped at a word boundary");
assert.ok(long.message.length <= 600);
const twoSources = { ...directionContext, sourceIds: [...directionContext.sourceIds, "extra-source"], insights: directionContext.insights.map((i) => ({ ...i, sourceIds: [...i.sourceIds, "extra-source"] })) };
assert.ok(validateDirection(proposed, twoSources).evidenceIds.includes("extra-source"), "evidence behind a selected insight that the model left out is added");
assert.throws(() => validateDirection({ ...proposed, cta: undefined }, directionContext), /cta is required/, "missing fields are still rejected");
assert.throws(
  () =>
    validateDirection(
      { ...proposed, insightIds: ["outside"] },
      directionContext,
    ),
  /insight/,
);
p = transition(p, { type: "revokeAI" }, op);
assert.throws(() => prepareSynthesis(p, "strategy"), /authoris/i);
console.log(
  "AI synthesis: public-context consent, reviewed evidence/insights, ID validation and cautious confidence passed.",
);

// Richer inputs: optional brief fields keep the fingerprint when empty; the insight writer sees grade, findings, profile and gaps, best evidence first
{
  const bare = createProject({ business: "Brand", objective: "Introduce a consumer product", contact: "a@example.com" }, op);
  assert.ok(!("market" in bare.brief) && !("proof" in bare.brief) && !("differentiators" in bare.brief), "empty optional fields are not stored, so existing authorisations stay valid");
  const rich = createProject({ business: "Brand", objective: "Introduce a consumer product", contact: "a@example.com", market: "Kent", differentiators: "Hand finished", proof: "400 five-star reviews" }, op);
  assert.equal(rich.brief.market, "Kent");
  let q = transition(rich, { type: "authoriseAI", confirm: true }, op);
  const add = (title: string, url: string, excerpt: string) => { q = transition(q, { type: "addSource", segment: "customer", title, url, excerpt }, op); q = transition(q, { type: "reviewSource", id: q.sources.at(-1)!.id, status: "supported" }, op); };
  add("Thin forum post", "https://forum.example.net/t/1", "ok");
  add("Detailed review study", "https://www.reviewsite.example.org/study", "Customers said the finish lasted years. 62% repeat purchase across 400 reviews in 2025. ".repeat(4));
  q.sources[1].findings = [{ claim: "Customers praise finish durability", quote: "lasted years" }];
  q.runs.push({ id: "r1", at: "2026-11-01T00:00:00Z", status: "completed", provider: "x", model: "m", stage: "research", segment: "customer", gaps: ["No pricing data found"] } as never);
  const s = prepareSynthesis(q, "insights").payload as { brief: Record<string, unknown>; sources: { id: string; grade?: { score: number }; findings?: unknown[] }[]; researchGaps: { segment: string; gaps: string[] }[] };
  assert.equal(s.brief.market, "Kent");
  assert.equal(s.brief.proofTheBusinessHas, "400 five-star reviews");
  assert.ok(s.sources.every((x) => typeof x.grade?.score === "number"), "every source carries its grade");
  assert.ok(s.sources[0].grade!.score >= s.sources[1].grade!.score, "best graded evidence first");
  assert.ok(s.sources.some((x) => x.findings?.length), "claim-level findings are passed");
  assert.deepEqual(s.researchGaps, [{ segment: "customer", gaps: ["No pricing data found"] }]);
  console.log("Richer agent inputs passed");
}
