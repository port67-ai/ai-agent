import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "port67-research-"));
  process.env.PORT67_DATA_DIR = dir;
  process.env.PORT67_OPERATOR_PASSWORD = "test-operator-password";
  process.env.PORT67_SESSION_SECRET =
    "test-session-secret-which-is-at-least-32";
  process.env.PORT67_RESEARCH_ENABLED = "true";
  process.env.PORT67_OPENAI_API_KEY = "test-only-no-network";
  process.env.PORT67_RESEARCH_MODEL = "contract-test-model";
  const { repository } = await import("../src/lib/factory/repository");
  const { createProject, digest, transition } = await import(
    "../src/lib/factory/engine"
  );
  const { signSession } = await import("../src/lib/factory/auth");
  const { handleFactory } = await import("../src/lib/factory/service");
  const principal = {
    subject: "operator",
    workspaceId: "port67",
    role: "operator" as const,
    expires: Date.now() + 100000,
  };
  let p = createProject(
    {
      business: "Research boundary",
      objective: "Explain",
      contact: "a@example.com",
    },
    principal,
    "research-project",
  );
  p = transition(p, { type: "authoriseAI", confirm: true }, principal);
  await repository.mutate("port67", (db) => {
    db.projects.push(p);
  });
  async function call(route: string, body: unknown) {
    return handleFactory(
      new Request("http://localhost:3000/api/factory/" + route, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie:
            "port67_factory=" +
            signSession(principal, process.env.PORT67_SESSION_SECRET!),
        },
        body: JSON.stringify(body),
      }),
      route.split("/"),
    );
  }
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        id: "provider-uncited",
        usage: { input_tokens: 9, output_tokens: 7 },
        output: [
          {
            content: [
              { type: "output_text", text: "Uncited claim", annotations: [] },
            ],
          },
        ],
      });
    assert.equal(
      (await call("projects/research-project/research", { segment: "brand" }))
        .status,
      400,
    );
    let project = (await repository.read("port67")).projects[0];
    assert.equal(project.runs[0].status, "failed");
    assert.equal(
      project.runs[0].usage?.input_tokens,
      9,
      "paid uncited output retains usage",
    );
    assert.equal(
      project.runs[0].contextHash,
      digest(JSON.stringify(p.brief)),
      "research locks the input context",
    );
    await repository.mutate("port67", (db) => {
      db.projects[0].runs.push({
        ...db.projects[0].runs[0],
        id: "interrupted",
        status: "running",
        leaseExpiresAt: new Date(Date.now() - 1000).toISOString(),
      });
    });
    assert.equal(
      (
        await call("projects/research-project/recover-research", {
          id: "interrupted",
        })
      ).status,
      200,
    );
    project = (await repository.read("port67")).projects[0];
    assert.equal(
      project.runs.find((r) => r.id === "interrupted")?.status,
      "failed",
    );
    globalThis.fetch = async () => {
      await repository.mutate("port67", (db) => {
        const q = db.projects[0];
        q.sources = Array.from({ length: 150 }, (_, i) => ({
          id: "source-" + i,
          segment: "brand",
          title: "Capacity test",
          url: "https://example.com",
          excerpt: "Fixture",
          kind: "public_source",
          status: "unreviewed",
          collectedAt: new Date().toISOString(),
          method: "Contract fixture",
        }));
      });
      return Response.json({
        id: "provider-capacity",
        usage: { input_tokens: 13, output_tokens: 11 },
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "A cited finding",
                annotations: [
                  {
                    type: "url_citation",
                    url: "https://example.com/finding",
                    title: "Finding",
                  },
                ],
              },
            ],
          },
        ],
      });
    };
    assert.equal(
      (
        await call("projects/research-project/research", {
          segment: "customer",
        })
      ).status,
      400,
    );
    project = (await repository.read("port67")).projects[0];
    assert.equal(
      project.runs.at(-1)?.usage?.input_tokens,
      13,
      "capacity rejection retains paid usage",
    );
    assert.equal(project.runs.at(-1)?.status, "failed");
    const cited = () =>
      Response.json({
        id: "provider-late",
        usage: { input_tokens: 17, output_tokens: 5 },
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "Cited public finding",
                annotations: [
                  {
                    type: "url_citation",
                    url: "https://example.com/late",
                    title: "Late finding",
                  },
                ],
              },
            ],
          },
        ],
      });
    await repository.mutate("port67", (db) => {
      db.projects[0].sources = [];
    });
    globalThis.fetch = async () => {
      await repository.mutate("port67", (db) => {
        delete db.projects[0].aiConsent;
      });
      return cited();
    };
    assert.equal(
      (await call("projects/research-project/research", { segment: "brand" }))
        .status,
      400,
      "revoked consent blocks findings after a billed call",
    );
    project = (await repository.read("port67")).projects[0];
    assert.equal(project.sources.length, 0);
    assert.equal(project.runs.at(-1)?.usage?.input_tokens, 17);
    await repository.mutate("port67", (db) => {
      db.projects[0] = transition(
        db.projects[0],
        { type: "authoriseAI", confirm: true },
        principal,
      );
    });
    globalThis.fetch = async () => {
      let runId = "";
      await repository.mutate("port67", (db) => {
        const run = db.projects[0].runs.at(-1)!;
        runId = run.id;
        run.leaseExpiresAt = new Date(Date.now() - 1).toISOString();
      });
      assert.equal(
        (
          await call("projects/research-project/recover-research", {
            id: runId,
          })
        ).status,
        200,
      );
      return cited();
    };
    assert.equal(
      (await call("projects/research-project/research", { segment: "brand" }))
        .status,
      400,
      "recovered research cannot accept a late provider response",
    );
    project = (await repository.read("port67")).projects[0];
    assert.equal(project.sources.length, 0);
    assert.equal(project.runs.at(-1)?.status, "failed");
    assert.equal(project.runs.at(-1)?.usage?.input_tokens, 17);
    const originalRead = repository.read.bind(repository);
    let revokeBeforeReservation = true;
    let calls = 0;
    repository.read = async (workspace) => {
      const snapshot = await originalRead(workspace);
      if (revokeBeforeReservation) {
        revokeBeforeReservation = false;
        await repository.mutate(workspace, (db) => {
          delete db.projects[0].aiConsent;
        });
      }
      return snapshot;
    };
    globalThis.fetch = async () => {
      calls++;
      return cited();
    };
    try {
      assert.equal(
        (await call("projects/research-project/research", { segment: "brand" }))
          .status,
        400,
      );
      assert.equal(
        calls,
        0,
        "reservation must check current consent before sending data",
      );
    } finally {
      repository.read = originalRead;
    }
    console.log(
      "Research recovery, context snapshots and failed-output usage retention passed (stub transport; no paid calls).",
    );
  } finally {
    globalThis.fetch = original;
    await rm(dir, { recursive: true, force: true });
  }
}
void main();
