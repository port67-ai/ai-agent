import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "port67-skills-"));
  Object.assign(process.env, { PORT67_DATA_DIR: dir, PORT67_SESSION_SECRET: "s".repeat(48) });
  try {
    const { getSkill, saveSkill, skillsOverview, withSkill, applySkill, DEFAULT_SKILLS, MAX_SKILL_CHARS } = await import("../src/lib/factory/skills");
    const { LocalRepository } = await import("../src/lib/factory/repository");
    const repo = new LocalRepository(dir);
    const all = await skillsOverview(repo);
    assert.equal(all.length, Object.keys(DEFAULT_SKILLS).length, "every AI agent has a skill");
    assert.ok(all.every((s) => s.latest.version === 0 && s.latest.body.length > 40));
    assert.equal(await getSkill(repo, "not:an:agent"), null);
    const v1 = await saveSkill(repo, "research:customer", "Always quote customers exactly.", "owner", "tighten");
    assert.equal(v1.version, 1);
    assert.equal((await getSkill(repo, "research:customer"))!.body, "Always quote customers exactly.", "latest runs");
    await assert.rejects(() => saveSkill(repo, "research:customer", "Always quote customers exactly.", "owner"), /No change/);
    const v2 = await saveSkill(repo, "research:customer", "Quote exactly. Flag single voices.", "owner");
    assert.equal(v2.version, 2);
    const row = (await skillsOverview(repo)).find((s) => s.agent === "research:customer")!;
    assert.deepEqual(row.history.map((h) => h.version), [2, 1], "all versions are kept, newest first");
    await assert.rejects(() => saveSkill(repo, "research:customer", "", "owner"), /empty/);
    await assert.rejects(() => saveSkill(repo, "research:customer", "x".repeat(MAX_SKILL_CHARS + 1), "owner"), /limited/);
    await assert.rejects(() => saveSkill(repo, "nope", "x", "owner"), /Unknown agent/);
    assert.equal(applySkill("RULES"), "RULES", "no skill outside a metered call");
    const out = await withSkill({ agent: "a", version: 2, body: "BODY" }, async () => applySkill("RULES"));
    assert.match(out, /^RULES\n\nSKILL \(a, version 2\)\. .*never overrides the rules above[\s\S]*BODY$/);
    console.log("Agent skills: defaults for every agent, versioned saves, latest runs, history kept, rules stay above the skill");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
void main();
