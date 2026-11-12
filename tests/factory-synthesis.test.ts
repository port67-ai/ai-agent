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
  evidenceIds: [p.sources[0].id],
  insightIds: [p.insights[0].id],
};
assert.equal(
  validateDirection(proposed, directionContext).message,
  proposed.message,
);
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
