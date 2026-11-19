import type { Database, Project } from "./model";

// Storage gauge and safe trimming. A workspace snapshot (every project of one account together) must stay under this size,
// less a reserve for each running paid task. See PRD planned item FAC-STO-002 for the split into separate records.
export const STORAGE_LIMIT_BYTES = 700_000;
export const KEEP_RUN_SNAPSHOTS = 10;
const size = (v: unknown) => Buffer.byteLength(JSON.stringify(v ?? null));

export function storageLimit(db: Database) {
  return STORAGE_LIMIT_BYTES - db.projects.reduce((n, p) => n + p.runs.filter((r) => r.status === "running").length, 0) * 80_000;
}
// Firebase accounts store every project as its own document (Firestore allows 1 MiB per document), so the Firebase repository
// checks each project on its own instead of adding all projects of an account together. The margin covers JSON versus Firestore sizing.
export const PROJECT_DOC_LIMIT_BYTES = 850_000;
export const projectDocLimit = (p: Project) => PROJECT_DOC_LIMIT_BYTES - p.runs.filter((r) => r.status === "running").length * 80_000;
/** The first project whose own document is too big to save, if any. */
export function oversizedProject(db: Database): { id: string; bytes: number; limit: number } | undefined {
  for (const p of db.projects) {
    const bytes = size(p);
    const limit = projectDocLimit(p);
    if (bytes > limit) return { id: p.id, bytes, limit };
  }
  return undefined;
}
/** How big one project is and which lists take the room. */
export function projectParts(p: Project) {
  const parts = Object.entries(p as unknown as Record<string, unknown>)
    .map(([name, v]) => ({ name, bytes: size(v), count: Array.isArray(v) ? v.length : undefined }))
    .filter((x) => x.bytes > 200)
    .sort((a, b) => b.bytes - a.bytes);
  return { bytes: size(p), parts: parts.slice(0, 6) };
}
export function accountUsage(db: Database) {
  const bytes = size(db);
  const limit = storageLimit(db);
  return { bytes, limit, percent: Math.round((bytes / limit) * 100), projects: db.projects.length };
}
/**
 * Removes only bulky copies from old finished runs: the frozen brief and context bundle. The run itself, its hashes, usage, cost and the
 * audit trail stay, so what was run and when can still be shown. The newest runs keep theirs. Returns how many runs were trimmed.
 */
export function trimRunSnapshots(p: Project, keep = KEEP_RUN_SNAPSHOTS): number {
  const finished = p.runs.filter((r) => r.status !== "running");
  let n = 0;
  for (const r of finished.slice(0, Math.max(0, finished.length - keep))) {
    if (r.contextSnapshot || r.contextBundle) {
      delete r.contextSnapshot;
      delete r.contextBundle;
      n++;
    }
  }
  return n;
}
/** Used by the repositories when a save would pass the limit: trim old run copies everywhere in the account, then let the caller re-check. */
export function trimDatabase(db: Database): number {
  return db.projects.reduce((n, p) => n + trimRunSnapshots(p, KEEP_RUN_SNAPSHOTS), 0);
}
