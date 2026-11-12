import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalRepository } from "../src/lib/factory/repository";
import { createProject, transition } from "../src/lib/factory/engine";
import { runSynthesis } from "../src/lib/factory/synthesis-run";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "port67-synthesis-"));
  const repo = new LocalRepository(dir);
  const op = {
    role: "operator" as const,
    workspaceId: "work",
    subject: "producer",
  };
  process.env.PORT67_SYNTHESIS_ENABLED = "true";
  process.env.PORT67_OPENAI_API_KEY = "test-only-key";
  process.env.PORT67_SYNTHESIS_MODEL = "contract-model";
  let p = createProject(
    { business: "Brand", objective: "Explain", contact: "a@example.com" },
    op,
    "synthesis-project",
  );
  p = transition(p, { type: "authoriseAI", confirm: true }, op);
  p = transition(
    p,
    {
      type: "addSource",
      segment: "brand",
      title: "Source",
      url: "https://example.com/source",
      excerpt: "A clear product description",
    },
    op,
  );
  p = transition(
    p,
    { type: "reviewSource", id: p.sources[0].id, status: "supported" },
    op,
  );
  await repo.mutate("work", (db) => {
    db.projects.push(p);
  });
  const original = globalThis.fetch;
  const response = (body: unknown) =>
    Response.json({
      id: "provider-test",
      usage: { input_tokens: 7, output_tokens: 9 },
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(body) }] },
      ],
    });
  try {
    globalThis.fetch = async () =>
      response({
        insights: [
          {
            title: "Clarity",
            interpretation: "Try a clear introduction",
            sourceIds: [p.sources[0].id],
            confidence: "limited",
          },
        ],
      });
    const result = await runSynthesis(repo, op, p.id, "insights");
    assert.equal(result.insights.at(-1)?.status, "draft");
    assert.ok(result.insights.at(-1)?.generatedByRunId);
    assert.equal(result.runs.at(-1)?.usage?.input_tokens, 7);
    const candidate = transition(result, { type: "draftStrategy" }, op);
    assert.throws(
      () => transition(candidate, { type: "shareStrategy" }, op),
      /reviewed.*insight/,
    );
    await repo.mutate("work", (db) => {
      db.projects[0] = transition(
        db.projects[0],
        {
          type: "reviewInsight",
          id: db.projects[0].insights[0].id,
          status: "reviewed",
        },
        op,
      );
    });
    const accepted = (await repo.read("work")).projects[0].insights[0];
    globalThis.fetch = async () =>
      response({
        audience: "Audience to validate",
        message: "A clearer introduction",
        rationale:
          "The reviewed source and accepted insight suggest explaining the product clearly; validate with customer research.",
        design: "Clear typography",
        channels: "To validate",
        format: "30-second concept",
        cta: "Learn more",
        hypothesis: "Clearer communication may improve understanding",
        uncertainties: "Limited evidence; no performance proof",
        positioning: "For buyers, a clear introduction",
        audienceSegments: "New buyers",
        keyMessages: [{ message: "Explain clearly", proof: "Source describes the product", sourceIds: [p.sources[0].id] }],
        tone: "Plain",
        doNotClaim: "No guarantees",
        evidenceIds: [p.sources[0].id],
        insightIds: [accepted.id],
      });
    const strategy = await runSynthesis(repo, op, p.id, "strategy");
    assert.equal(strategy.strategies.at(-1)?.positioning, "For buyers, a clear introduction");
    assert.equal(strategy.strategies.at(-1)?.keyMessages?.[0].sourceIds[0], p.sources[0].id);
    assert.equal(
      strategy.strategies.at(-1)?.status,
      "draft",
      "AI cannot share or approve its own direction",
    );
    assert.ok(strategy.strategies.at(-1)?.generatedByRunId);
    assert.deepEqual(strategy.strategies.at(-1)?.insightIds, [accepted.id]);
    globalThis.fetch = async () => {
      await repo.mutate("work", (db) => {
        db.projects[0] = transition(
          db.projects[0],
          { type: "draftStrategy", message: "Producer edit during generation" },
          op,
        );
      });
      return response({
        audience: "Audience to validate",
        message: "Must not replace concurrent edit",
        rationale: "A research-led proposal",
        design: "Clear typography",
        channels: "To validate",
        format: "30-second concept",
        cta: "Learn more",
        hypothesis: "A hypothesis",
        uncertainties: "Limited evidence",
        positioning: "Positioning",
        audienceSegments: "Segments",
        keyMessages: [{ message: "M", proof: "P", sourceIds: [p.sources[0].id] }],
        tone: "Tone",
        doNotClaim: "None",
        evidenceIds: [p.sources[0].id],
        insightIds: [accepted.id],
      });
    };
    await assert.rejects(
      () => runSynthesis(repo, op, p.id, "strategy"),
      /changed/,
    );
    const manual = (await repo.read("work")).projects[0];
    assert.equal(
      manual.strategies.at(-1)?.message,
      "Producer edit during generation",
    );
    assert.equal(manual.strategies.length, 2);
    globalThis.fetch = async () =>
      response({
        insights: [
          {
            title: "Unknown",
            interpretation: "No evidence",
            sourceIds: ["outside"],
            confidence: "strong",
          },
        ],
      });
    await assert.rejects(
      () => runSynthesis(repo, op, p.id, "insights"),
      /contract/,
    );
    let stored = (await repo.read("work")).projects[0];
    assert.equal(stored.insights.length, 1);
    assert.equal(stored.runs.at(-1)?.usage?.output_tokens, 9);
    globalThis.fetch = async () => {
      await repo.mutate("work", (db) => {
        db.projects[0] = transition(db.projects[0], { type: "revokeAI" }, op);
      });
      return response({
        insights: [
          {
            title: "Stale",
            interpretation: "Must not apply",
            sourceIds: [p.sources[0].id],
            confidence: "limited",
          },
        ],
      });
    };
    await assert.rejects(
      () => runSynthesis(repo, op, p.id, "insights"),
      /changed|authoris/i,
    );
    stored = (await repo.read("work")).projects[0];
    assert.equal(stored.insights.length, 1);
    assert.equal(stored.runs.at(-1)?.usage?.input_tokens, 7);
    await assert.rejects(
      () =>
        runSynthesis(
          repo,
          { ...op, role: "customer", projectId: p.id },
          p.id,
          "insights",
        ),
      /operator/,
    );
    console.log(
      "AI drafting runs: unreviewed output, immutable context, role guard and invalid/stale-output usage retention passed.",
    );
  } finally {
    globalThis.fetch = original;
    await rm(dir, { recursive: true, force: true });
  }
}
void main();
