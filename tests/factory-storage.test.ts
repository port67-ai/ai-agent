import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { accountUsage, projectParts, trimRunSnapshots, STORAGE_LIMIT_BYTES } from "../src/lib/factory/storage-gauge";
import type { Database, Project } from "../src/lib/factory/model";

let PAD = 3000;
const run = (i: number, status: "completed" | "running" = "completed", big = true) => ({ id: "r" + i, at: "2026-11-0" + (1 + (i % 9)), status, provider: "x", model: "m", contextHash: "h", ...(big ? { contextSnapshot: { business: "B".repeat(3000) }, contextBundle: { pad: "x".repeat(PAD) } } : {}) });
const project = (n: number) => ({ id: "p", brief: { business: "B" }, runs: Array.from({ length: n }, (_, i) => run(i)), sources: [], insights: [], strategies: [], tasks: [], assets: [], capabilities: [], audit: [] }) as unknown as Project;

async function main() {
  // gauge names the biggest parts
  const p = project(30);
  const g = projectParts(p);
  assert.equal(g.parts[0].name, "runs");
  assert.equal(g.parts[0].count, 30);
  assert.ok(g.bytes > 150_000);
  // trimming keeps the newest runs' copies, drops old bulky copies only, and never touches running or the run record itself
  p.runs.push(run(99, "running") as never);
  const before = p.runs.length;
  const n = trimRunSnapshots(p);
  assert.equal(n, 20, "30 finished runs, newest 10 keep their copies");
  assert.equal(p.runs.length, before, "no run record is removed");
  assert.ok(p.runs.slice(0, 20).every((r) => !r.contextSnapshot && !r.contextBundle && r.contextHash === "h"));
  assert.ok(p.runs.slice(20, 30).every((r) => r.contextSnapshot));
  assert.ok(p.runs.at(-1)!.contextSnapshot, "a running task keeps its context");
  assert.equal(trimRunSnapshots(p), 0, "nothing more to trim");
  // account usage
  const u = accountUsage({ schemaVersion: 1, projects: [p], invitations: [] } as Database);
  assert.equal(u.limit, STORAGE_LIMIT_BYTES - 80_000);
  assert.ok(u.percent > 0);

  // a save that would pass the limit is rescued by trimming old copies, and still refused when trimming cannot help
  const dir = await mkdtemp(join(tmpdir(), "port67-storage-"));
  try {
    const { LocalRepository } = await import("../src/lib/factory/repository");
    const repo = new LocalRepository(dir);
    PAD = 14000;
    await repo.mutate("ws", (db) => { db.projects.push(project(60)); });
    const stored = await repo.read("ws");
    assert.ok(stored.projects[0].runs.filter((r) => r.contextSnapshot).length <= 10, "old copies were trimmed to fit instead of failing");
    assert.equal(stored.projects[0].runs.length, 60);
    await assert.rejects(repo.mutate("ws", (db) => { db.projects[0].audit.push({ id: "a", at: "", actor: "x", role: "operator", action: "pad", detail: "z".repeat(800_000) } as never); }), /storage limit/);
  } finally { await rm(dir, { recursive: true, force: true }); }
  console.log("Storage gauge and safe trimming passed");
}
void main().catch((e) => { console.error(e); process.exit(1); });
