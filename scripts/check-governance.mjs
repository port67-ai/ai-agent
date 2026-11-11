import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const requiredDocs = [
  "PRD.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "docs/ARCHITECTURE.md",
  "docs/DATA_MODEL.md",
  "docs/DECISIONS.md",
  "docs/CHANGELOG.md",
  "docs/IMPLEMENTATION_STATUS.md",
  "docs/HANDOVER.md",
  "docs/TESTING.md",
];
const handoverHeadings = [
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
];
function section(text, heading) {
  const parts = text.split(/^##\s+/m).slice(1);
  return (
    parts
      .find((p) => p.split("\n")[0].trim() === heading)
      ?.split("\n")
      .slice(1)
      .join("\n")
      .trim() || ""
  );
}
function meaningful(text) {
  const content = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[[ xX]\]/g, "")
    .trim();
  return !!content && !/^(TBD|TODO|N\/A|none|\.\.\.)[.!]?$/i.test(content);
}
export function validate({ files, changed = [], prBody = "" }) {
  const errors = [];
  for (const path of requiredDocs)
    if (!files[path]?.trim())
      errors.push(`Missing or empty required document: ${path}`);
  for (const heading of handoverHeadings)
    if (!meaningful(section(files["docs/HANDOVER.md"] || "", heading)))
      errors.push(`Handover requires content: ${heading}`);
  if (!changed.length) return errors;
  const known = new Set(
    [...(files["PRD.md"] || "").matchAll(/^### ([A-Z][A-Z0-9]*-\d+)\b/gm)].map(
      (m) => m[1],
    ),
  );
  const refs =
    section(prBody.replace(/<!--[\s\S]*?-->/g, ""), "PRD requirements").match(
      /\b[A-Z][A-Z0-9]*-\d+\b/g,
    ) || [];
  if (!refs.length)
    errors.push(
      "PRD requirements section must reference a canonical PRD requirement ID",
    );
  for (const id of refs)
    if (!known.has(id)) errors.push(`Unknown PRD requirement: ${id}`);
  for (const h of [
    "Documentation impact",
    "Testing evidence",
    "Acceptance criteria",
  ])
    if (!meaningful(section(prBody, h)))
      errors.push(`PR body requires evidence: ${h}`);
  const requireChanged = (path) => {
    if (!changed.includes(path))
      errors.push(`Change requires an update to ${path}`);
  };
  const implementation = changed.some((p) =>
    /^(src\/|scripts\/|tests\/|\.github\/workflows\/)|^(middleware\.|next\.config\.|package(?:-lock)?\.json$|firestore\.|firebase\.json$)/.test(
      p,
    ),
  );
  if (implementation)
    for (const path of [
      "docs/HANDOVER.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/CHANGELOG.md",
      "docs/TESTING.md",
    ])
      requireChanged(path);
  if (
    changed.some((p) => p.startsWith("src/") || p.startsWith("middleware.")) &&
    !changed.some((p) => /^(tests\/)|\.(test|spec)\.[cm]?[jt]sx?$/.test(p))
  )
    errors.push(
      "Application changes require relevant test changes; reviewers must verify behavioral coverage",
    );
  if (
    changed.some((p) =>
      /^firestore\.|^src\/types\/|^src\/lib\/services\/firebase(?:-db)?\.ts$/.test(
        p,
      ),
    )
  )
    requireChanged("docs/DATA_MODEL.md");
  if (
    changed.some((p) =>
      /^src\/app\/api\/|^src\/lib\/|^middleware\.|^next\.config\.|^firebase\.json$|^package(?:-lock)?\.json$/.test(
        p,
      ),
    )
  )
    for (const path of ["docs/ARCHITECTURE.md", "docs/DECISIONS.md"])
      requireChanged(path);
  return errors;
}
function main() {
  const files = {};
  for (const p of requiredDocs) {
    try {
      files[p] = readFileSync(p, "utf8");
    } catch {
      files[p] = "";
    }
  }
  const args = process.argv.slice(2);
  const base = args[0];
  const changed = base
    ? execFileSync("git", ["diff", "--name-only", "-z", `${base}...HEAD`], {
        encoding: "utf8",
      })
        .split("\0")
        .filter(Boolean)
    : [];
  let prBody = "";
  if (process.env.GITHUB_EVENT_PATH)
    prBody =
      JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
        .pull_request?.body || "";
  if (args[1]) prBody = readFileSync(args[1], "utf8");
  const errors = validate({ files, changed, prBody });
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exitCode = 1;
  } else
    console.log(
      `Governance checks passed (${requiredDocs.length} documents; ${changed.length} changed paths). Semantic review is still required.`,
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
