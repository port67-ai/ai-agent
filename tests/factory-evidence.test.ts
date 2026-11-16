import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalRepository } from "../src/lib/factory/repository";
import { createProject, projectView } from "../src/lib/factory/engine";
import { gradeSource, segmentEvidence, insightEvidence, researchGuidance, ratingOf, siteOf, type GradeContext } from "../src/lib/factory/evidence";
import { evidenceWarnings, planNext, registerResearchRunner, runProducerAgent } from "../src/lib/factory/producer-agent";
import { segments, type Project, type Source } from "../src/lib/factory/model";

const op = { role: "operator" as const, workspaceId: "w", subject: "producer" };
const at = "2026-11-13T10:00:00Z";
const now = new Date("2026-11-14T00:00:00Z");
let n = 0;
const src = (segment: (typeof segments)[number], url: string, claim: string, quote: string, status: Source["status"] = "supported", excerpt = "A reasonably detailed excerpt about local customers and the way they choose a provider in 2025."): Source => ({ id: "s" + n++, segment, title: "Page " + String.fromCharCode(97 + (n % 26)), url, excerpt, kind: "public_source", status, collectedAt: at, method: "m", findings: claim ? [{ claim, quote }] : [] });
const ctx: GradeContext = { website: "https://www.foymore.co.uk", now };

// ---- Admiralty reliability by origin
assert.equal(gradeSource(src("brand", "https://www.ons.gov.uk/x", "c", ""), ctx).reliability, "A");
assert.equal(gradeSource(src("brand", "https://www.reuters.com/x", "c", ""), ctx).reliability, "B");
assert.equal(gradeSource(src("brand", "https://shop.foymore.co.uk/about", "c", ""), ctx).reliability, "B", "the business's own site is reliable for its own offer");
assert.equal(gradeSource(src("customer", "https://www.trustpilot.com/review/foymore", "c", ""), ctx).reliability, "C");
assert.equal(gradeSource(src("customer", "https://www.reddit.com/r/x", "c", ""), ctx).reliability, "D");
assert.equal(gradeSource(src("customer", "https://random-blog.example/post", "c", ""), ctx).reliability, "E");
assert.equal(gradeSource(src("customer", "not a url", "c", ""), ctx).reliability, "F");
assert.equal(siteOf("https://shop.example.co.uk/a"), "example.co.uk");
assert.equal(siteOf("https://www.example.com/a"), "example.com");

// ---- Admiralty credibility: corroboration, specificity, promotion, thinness
const claimA = "Local customers in Leeds prefer family run garden centres with free parking and expert advice 2025";
const a = src("customer", "https://www.ons.gov.uk/survey", claimA, "Local customers in Leeds prefer family run garden centres with free parking and expert advice 2025");
const b = src("customer", "https://www.which.co.uk/report", claimA + " according to the survey", "Local customers in Leeds prefer family run garden centres with expert advice");
const peers = [a, b];
const graded = gradeSource(a, { ...ctx, peers });
assert.equal(graded.credibility, 1, "confirmed by an independent organisation");
assert.ok(graded.notes.some((x) => /Confirmed by 1 independent/.test(x)));
assert.equal(gradeSource(a, { ...ctx, peers: [a] }).credibility, 2, "specific, quoted and quantified but not corroborated");
assert.equal(gradeSource(src("brand", "https://x.example/a", "Open daily", "Open daily from nine until five for every customer who visits", "supported", "A reasonably detailed excerpt about how local customers choose a provider."), ctx).credibility, 3, "quoted, not quantified");
assert.equal(gradeSource(src("brand", "https://x.example/a", "", ""), ctx).credibility, 4, "no quote to check against");
const promo = src("brand", "https://x.example/p", "", "", "supported", "The best, leading, award-winning, unbeatable, world-class garden centre. Book now for a free quote.");
assert.equal(gradeSource(promo, ctx).credibility, 5, "heavily promotional wording is improbable");
assert.equal(gradeSource(src("brand", "https://x.example/t", "", "", "supported", "tiny"), ctx).credibility, 6, "too thin to judge");

// ---- CRAAP: currency
const fresh = gradeSource(src("brand", "https://www.ons.gov.uk/2025/report", "c", ""), ctx).craap.currency;
const old = gradeSource(src("brand", "https://www.ons.gov.uk/2016/report", "c", "", "supported", "Report published in 2016 about local customers and how they choose a provider across the region."), ctx).craap.currency;
assert.equal(fresh, 2);
assert.equal(old, 0);
assert.ok(gradeSource(a, { ...ctx, peers }).score > gradeSource(promo, ctx).score, "a corroborated official source outscores promotional copy");

// ---- GRADE-style rating per segment
assert.equal(ratingOf(80), "high");
assert.equal(ratingOf(65), "moderate");
assert.equal(ratingOf(45), "low");
assert.equal(ratingOf(10), "very low");
const weak = createProject({ business: "Foymore", objective: "Grow the business", website: "https://www.foymore.co.uk", contact: "a@example.com" }, op, "weak");
weak.sources.push(src("brand", "https://www.foymore.co.uk/about", "We are open daily", "We are open daily"), src("brand", "https://www.foymore.co.uk/team", "", ""));
const wk = segmentEvidence(weak, "brand");
assert.equal(wk.weak, true);
assert.ok(wk.reasons.some((r) => /one organisation only/.test(r)));
assert.ok(wk.reasons.some((r) => /too few to triangulate/.test(r)));
assert.equal(segmentEvidence(weak, "competitor").rating, "very low", "no sources at all is very low");
const strong = createProject({ business: "Foymore", objective: "Grow", website: "https://www.foymore.co.uk", contact: "a@example.com" }, op, "strong");
strong.sources.push(
  src("customer", "https://www.ons.gov.uk/survey", claimA, "Local customers in Leeds prefer family run garden centres with free parking and expert advice 2025"),
  src("customer", "https://www.which.co.uk/report", claimA + " according to the survey", "Local customers in Leeds prefer family run garden centres with expert advice"),
  src("customer", "https://www.reuters.com/uk", "Garden centre visits rose 18% in 2025 as families spent more on plants", "Garden centre visits rose 18% in 2025 as families spent more on plants and advice"),
);
const sg = segmentEvidence(strong, "customer");
assert.ok(!sg.weak && sg.independentSites === 3, `independent, official, quantified evidence is not weak (got ${sg.rating} ${sg.score})`);

// ---- insight evidence and guidance
const good = insightEvidence(strong, { title: "Families prefer expert garden centres", interpretation: "Local customers prefer family run garden centres with free parking and expert advice.", sourceIds: strong.sources.map((s) => s.id) });
assert.ok(!good.weak);
const thin = insightEvidence(strong, { title: "Everyone loves discounts", interpretation: "Shoppers always chase discounts and loyalty schemes above anything else.", sourceIds: [strong.sources[0].id] });
assert.ok(thin.weak && thin.reasons.length >= 1, "a single-organisation insight that strays from its source is weak");
assert.equal(insightEvidence(strong, { title: "x", interpretation: "y", sourceIds: [] }).rating, "very low");
const guidance = researchGuidance(wk);
assert.match(guidance, /at least three different organisations/);
assert.match(guidance, /one organisation only/);
assert.ok(guidance.length <= 900);

// ---- producers see grades and ratings; customers never do
const view = projectView(weak, op);
assert.ok(view.sources[0].grade && view.evidence?.segments.length === 10);
const cust = projectView(weak, { role: "customer", workspaceId: "w", subject: "c", identity: "firebase", accountId: "w" });
assert.ok(cust.sources.every((s) => !s.grade) && cust.evidence === undefined);
assert.ok(evidenceWarnings(weak, at).some((x) => x.gate === "research" && /brand research evidence is/.test(x.text)));

// ---- the orchestrator re-runs a weak researcher once, with guidance, then warns instead of looping or blocking
function reviewed(id: string): Project {
  const p = createProject({ business: "Foymore", objective: "Grow", website: "https://www.foymore.co.uk", contact: "a@example.com" }, op, id);
  for (const k of segments) {
    p.runs.push({ id: "r-" + k, stage: "research", segment: k, at, finishedAt: at, status: "completed" } as never);
    for (let i = 0; i < 3; i++) p.sources.push(src(k, `https://www.foymore.co.uk/${k}/${i}`, "", "", "supported"));
  }
  return p;
}
async function main() {
  const p0 = reviewed("loop");
  assert.deepEqual(planNext(p0, true), { step: "draftInsights" } as never, "with no runner registered the old behaviour is unchanged");
  const calls: { segment: string; guidance: string }[] = [];
  registerResearchRunner(async (_a, _id, segment, guidance) => { calls.push({ segment, guidance }); });
  assert.deepEqual(planNext(p0, true), { step: "reResearch" });
  // A person who bulk-accepted the sources has decided: the agent must not send segments back behind them.
  const human = structuredClone(p0);
  human.audit.push({ id: "b", at: "2999-01-01T00:00:00.000Z", actor: "producer", role: "operator", action: "sources_bulk_accepted", detail: "2 sources accepted" });
  assert.notDeepEqual(planNext(human, true), { step: "reResearch" }, "no re-run after a person accepted the sources");
  const dir = await mkdtemp(join(tmpdir(), "port67-evidence-"));
  try {
    const repo = new LocalRepository(join(dir, "db.json"));
    await repo.mutate("w", (s) => void s.projects.push(structuredClone(p0)));
    const out = await runProducerAgent(repo, op, "loop", { force: true });
    assert.equal(calls.length, 7, "each weak segment is sent back exactly once");
    assert.ok(calls.every((c) => /Rules for this attempt/.test(c.guidance)), "the researcher gets clear rules");
    assert.deepEqual(Object.values(out.producerAgent!.researchRetries || {}), [1, 1, 1, 1, 1, 1, 1]);
    assert.ok(out.producerAgent!.log.filter((l) => l.step === "reResearch").length === 7);
    assert.ok((out.producerAgent!.warnings || []).some((w) => w.gate === "research" && /after one re-run/.test(w.text)), "still weak afterwards: a warning for people, not a block");
    assert.notEqual(out.producerAgent!.status, "blocked", "weak evidence warns; it does not block");
    const again = await runProducerAgent(repo, op, "loop", { force: true });
    assert.equal(calls.length, 7, "a second pass does not re-run again");
    assert.ok(again.producerAgent!.warnings!.length >= 4);
  } finally {
    registerResearchRunner(undefined);
    await rm(dir, { recursive: true, force: true });
  }
  console.log("Evidence quality: Admiralty reliability and credibility, CRAAP, GRADE-style ratings, producer-only grades, weak research re-run once with guidance then warned");
}
void main().catch((e) => { console.error(e); process.exit(1); });
