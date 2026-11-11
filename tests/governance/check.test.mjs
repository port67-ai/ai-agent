import assert from "node:assert/strict";
import test from "node:test";
import { validate, requiredDocs } from "../../scripts/check-governance.mjs";

const docs = () =>
  Object.fromEntries(
    requiredDocs.map((p) => [p, "# Document\nVerified baseline."]),
  );
function fixture() {
  const files = docs();
  files["PRD.md"] = "### GOV-001 — Governance\nAcceptance: documented changes.";
  files["docs/HANDOVER.md"] = [
    "Date and developer environment",
    "Current branch and latest commit",
    "Milestone and PRD requirement IDs",
    "Summary of implemented changes",
    "Files/modules changed",
    "Tests executed and results",
    "Database migrations or deployment actions",
    "Known problems and risks",
    "Outstanding decisions",
    "Exact next recommended task",
  ]
    .map((h) => `## ${h}\nRecorded evidence.`)
    .join("\n");
  return { files, changed: [], prBody: "" };
}
const body =
  "## PRD requirements\nGOV-001\n## Documentation impact\nUpdated handover and status.\n## Testing evidence\nExecuted tests.\n## Acceptance criteria\nChecks reject incomplete changes.";
const feature = () => ({
  ...fixture(),
  changed: [
    "src/components/Widget.tsx",
    "tests/widget.test.mjs",
    "docs/HANDOVER.md",
    "docs/IMPLEMENTATION_STATUS.md",
    "docs/CHANGELOG.md",
    "docs/TESTING.md",
  ],
  prBody: body,
});

test("accepts complete baseline and valid feature change", () => {
  assert.deepEqual(validate(fixture()), []);
  assert.deepEqual(validate(feature()), []);
});
test("rejects every missing or empty required document", () => {
  for (const path of requiredDocs) {
    const f = fixture();
    delete f.files[path];
    assert.ok(
      validate(f).some((e) => e.includes(path)),
      path,
    );
    f.files[path] = "  ";
    assert.ok(
      validate(f).some((e) => e.includes(path)),
      path,
    );
  }
});
test("requires all mandatory handover headings with content", () => {
  const f = fixture();
  f.files["docs/HANDOVER.md"] = "# Handover";
  assert.ok(
    validate(f).some((e) => e.includes("Date and developer environment")),
  );
  f.files["docs/HANDOVER.md"] += "\n## Date and developer environment\n";
  assert.ok(
    validate(f).some((e) => e.includes("Date and developer environment")),
  );
});
test("requires status, changelog, testing and handover updates for source changes", () => {
  for (const path of [
    "docs/HANDOVER.md",
    "docs/IMPLEMENTATION_STATUS.md",
    "docs/CHANGELOG.md",
    "docs/TESTING.md",
  ]) {
    const f = feature();
    f.changed = f.changed.filter((p) => p !== path);
    assert.ok(
      validate(f).some((e) => e.includes(path)),
      path,
    );
  }
});
test("rejects missing, unknown and mixed valid/unknown PRD references", () => {
  for (const refs of ["", "APP-999", "GOV-001 APP-999"]) {
    const f = feature();
    f.prBody = body.replace("GOV-001", refs);
    assert.ok(validate(f).some((e) => e.includes("PRD")));
  }
});
test("rejects unchecked template placeholders and missing evidence sections", () => {
  for (const value of [
    "## PRD requirements\nGOV-001",
    body.replace("Executed tests.", "<!-- evidence -->"),
    body.replace("Checks reject incomplete changes.", "TBD"),
  ]) {
    const f = feature();
    f.prBody = value;
    assert.ok(validate(f).length > 0);
  }
});
test("requires test changes when application behavior may change", () => {
  const f = feature();
  f.changed = f.changed.filter((p) => !p.startsWith("tests/"));
  assert.ok(validate(f).some((e) => e.includes("test")));
});
test("flags schema and architecture changes independently", () => {
  for (const path of [
    "firestore.rules",
    "firestore.indexes.json",
    "src/types/user.ts",
    "src/lib/services/firebase-db.ts",
  ]) {
    const f = feature();
    f.changed.push(path);
    assert.ok(
      validate(f).some((e) => e.includes("docs/DATA_MODEL.md")),
      path,
    );
  }
  for (const path of [
    "next.config.ts",
    "package.json",
    "src/app/api/users/route.ts",
    "src/lib/services/stripe.ts",
    "middleware.ts",
  ]) {
    const f = feature();
    f.changed.push(path);
    assert.ok(
      validate(f).some((e) => e.includes("docs/ARCHITECTURE.md")),
      path,
    );
    assert.ok(
      validate(f).some((e) => e.includes("docs/DECISIONS.md")),
      path,
    );
  }
});
test("accepts documented schema and architecture changes", () => {
  const f = feature();
  f.changed.push(
    "firestore.rules",
    "src/app/api/users/route.ts",
    "docs/DATA_MODEL.md",
    "docs/ARCHITECTURE.md",
    "docs/DECISIONS.md",
  );
  assert.deepEqual(validate(f), []);
});
test("documentation-only PR still needs valid references and evidence", () => {
  const f = fixture();
  f.changed = ["README.md"];
  f.prBody = body;
  assert.deepEqual(validate(f), []);
  f.prBody = "";
  assert.ok(validate(f).length > 0);
});

test("commented requirement examples and placeholders do not count as evidence", () => {
  for (const value of [
    body.replace("GOV-001", "<!-- Example: GOV-001 -->"),
    body.replace("Executed tests.", "<!-- explain --> TODO"),
  ]) {
    const f = feature();
    f.prBody = value;
    assert.ok(validate(f).length > 0);
  }
});
