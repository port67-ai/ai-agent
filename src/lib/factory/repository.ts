import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "./model";
export interface Repository {
  read(workspace: string): Promise<Database>;
  mutate<T>(workspace: string, fn: (db: Database) => T): Promise<T>;
}
const empty = (): Database => ({
  schemaVersion: 1,
  projects: [],
  invitations: [],
});
function safe(workspace: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(workspace))
    throw new Error("Invalid workspace");
  return workspace;
}
const queues = new Map<string, Promise<unknown>>();
export class LocalRepository implements Repository {
  constructor(
    private directory = process.env.PORT67_DATA_DIR ||
      join(process.cwd(), ".factory-data"),
  ) {}
  async read(workspace: string): Promise<Database> {
    try {
      return JSON.parse(
        await readFile(join(this.directory, safe(workspace) + ".json"), "utf8"),
      ) as Database;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty();
      throw e;
    }
  }
  async mutate<T>(workspace: string, fn: (db: Database) => T): Promise<T> {
    const key = join(this.directory, safe(workspace));
    const previous = queues.get(key) || Promise.resolve();
    const pending = previous
      .catch(() => {})
      .then(async () => {
        await mkdir(this.directory, { recursive: true, mode: 0o700 });
        const db = await this.read(workspace);
        const result = fn(db);
        const serialized = JSON.stringify(db);
        if (Buffer.byteLength(serialized) > 700_000)
          throw new Error(
            "Workspace storage limit reached; export and archive completed projects",
          );
        const temp = key + "." + randomUUID() + ".tmp";
        await writeFile(temp, serialized, { mode: 0o600 });
        await rename(temp, key + ".json");
        return result;
      });
    queues.set(key, pending);
    try {
      return await pending;
    } finally {
      if (queues.get(key) === pending) queues.delete(key);
    }
  }
}
// Dedicated Factory project only. Server-side authz remains required for every request.
export class FirebaseRepository implements Repository {
  private async ref(workspace: string) {
    const [
      { getApps, initializeApp, cert, applicationDefault },
      { getFirestore },
    ] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/firestore"),
    ]);
    const projectId = process.env.PORT67_FIREBASE_PROJECT_ID;
    if (!projectId)
      throw new Error("Dedicated Factory Firebase project is not configured");
    const name = "port67-factory";
    const credentials = process.env.PORT67_FIREBASE_SERVICE_ACCOUNT;
    const app =
      getApps().find((a) => a.name === name) ||
      initializeApp(
        {
          projectId,
          credential: credentials
            ? cert(JSON.parse(credentials))
            : applicationDefault(),
        },
        name,
      );
    return getFirestore(
      app,
      process.env.PORT67_FIREBASE_DATABASE || "(default)",
    )
      .collection("factory_workspaces_v1")
      .doc(safe(workspace));
  }
  async read(workspace: string) {
    const snapshot = await (await this.ref(workspace)).get();
    return snapshot.exists ? (snapshot.data() as Database) : empty();
  }
  async mutate<T>(workspace: string, fn: (db: Database) => T) {
    const ref = await this.ref(workspace);
    return ref.firestore.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const db = snapshot.exists ? (snapshot.data() as Database) : empty();
      const result = fn(db);
      const serialized = JSON.stringify(db);
      if (Buffer.byteLength(serialized) > 700_000)
        throw new Error("Workspace storage limit reached");
      tx.set(ref, JSON.parse(serialized));
      return result;
    });
  }
}
export const repository: Repository =
  process.env.PORT67_STORAGE === "firebase"
    ? new FirebaseRepository()
    : new LocalRepository();
// Demo records always use a separate local namespace, never the production Firebase project.
export const demoRepository: Repository = new LocalRepository(
  process.env.PORT67_DEMO_DATA_DIR || join(process.cwd(), ".factory-demo"),
);
