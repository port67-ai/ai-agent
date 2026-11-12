import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalRepository } from "../src/lib/factory/repository";
import {
  signSession,
  readSession,
  secureEqual,
  sameOrigin,
} from "../src/lib/factory/auth";
import { createProject } from "../src/lib/factory/engine";
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-test-"));
  try {
    const repo = new LocalRepository(directory);
    const op = {
      subject: "operator",
      workspaceId: "workspace",
      role: "operator" as const,
    };
    await repo.mutate("workspace", (db) => {
      db.projects.push(
        createProject(
          { business: "Acme", contact: "a@example.com", objective: "Launch" },
          op,
          "one",
        ),
      );
    });
    await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.mutate("workspace", (db) => {
          db.projects[0].revision++;
        }),
      ),
    );
    const reread = await new LocalRepository(directory).read("workspace");
    assert.equal(reread.projects[0].revision, 11);
    assert.equal((await repo.read("different")).projects.length, 0);
    await assert.rejects(() => repo.read("../escape"), /workspace/);
    const token = signSession(
      { ...op, expires: Date.now() + 10000 },
      "a".repeat(40),
    );
    assert.equal(readSession(token, "a".repeat(40))?.subject, "operator");
    assert.equal(readSession(token + "x", "a".repeat(40)), null);
    assert.equal(readSession(token, "b".repeat(40)), null);
    assert.equal(
      readSession(
        signSession({ ...op, expires: 1 }, "a".repeat(40)),
        "a".repeat(40),
      ),
      null,
    );
    assert.equal(secureEqual("short", "long-value"), false);
    assert.equal(
      sameOrigin("https://evil.test", "https://port67.test/api/factory"),
      false,
    );
    assert.equal(
      sameOrigin("https://port67.test", "https://port67.test/api/factory"),
      true,
    );
    console.log(
      "Factory server: persistence, concurrency, isolation, signed sessions and origin checks passed.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
void main();
assert.equal(
  secureEqual("é", "a"),
  false,
  "Unicode and ASCII byte lengths must not throw",
);
