import { linkProjectOwnership } from "./accounts";
import { getFactoryFirebaseApp } from "./firebase-admin";
import { serializeAccount, hydrateAccount, type AccountMetadata } from "./storage-schema";
import type { Firestore, DocumentReference, Transaction } from "firebase-admin/firestore";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { Database } from "./model";
export interface Repository {
  read(workspace: string): Promise<Database>;
  mutate<T>(workspace: string, fn: (db: Database) => T): Promise<T>;
}
// Reserve 80KB per active paid task so validation failures/completions can still persist usage.
function snapshotLimit(db: Database) {
  return (
    700_000 -
    db.projects.reduce(
      (n, p) => n + p.runs.filter((r) => r.status === "running").length,
      0,
    ) *
      80_000
  );
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
        db.projects = db.projects.map(linkProjectOwnership);
        const serialized = JSON.stringify(db);
        if (Buffer.byteLength(serialized) > snapshotLimit(db))
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
  constructor(private database?: Firestore) {}
  private async ref(workspace: string) {
    const db=this.database || (await import("firebase-admin/firestore")).getFirestore(getFactoryFirebaseApp(),process.env.PORT67_FIREBASE_DATABASE || "(default)");
    const collection=workspace.startsWith("acct_") ? "factory_accounts_v2" : workspace.startsWith("factory-") ? "factory_system_v1" : "factory_workspaces_v1";
    return db.collection(collection).doc(safe(workspace));
  }
  private async load(tx:Transaction,ref:DocumentReference,workspace:string):Promise<Database>{
    const snapshot=await tx.get(ref);
    if(!snapshot.exists) return empty();
    if(!workspace.startsWith("acct_")) return snapshot.data() as Database;
    const metadata=snapshot.data() as AccountMetadata;
    if(!Array.isArray(metadata.projectIds) || metadata.projectIds.length>20) throw Error("Invalid account project index");
    const docs=metadata.projectIds.length ? await tx.getAll(...metadata.projectIds.map(id=>ref.collection("projects").doc(safe(id)))) : [];
    return hydrateAccount(workspace,metadata,docs.filter(d=>d.exists).map(d=>d.data() as Database['projects'][number]));
  }
  async read(workspace: string) {
    const ref=await this.ref(workspace);
    return ref.firestore.runTransaction(tx=>this.load(tx,ref,workspace));
  }
  async mutate<T>(workspace: string, fn: (db: Database) => T) {
    const ref=await this.ref(workspace);
    return ref.firestore.runTransaction(async tx=>{
      const db=await this.load(tx,ref,workspace);
      const before=new Map(db.projects.map(p=>[p.id,JSON.stringify(p)]));
      const result=fn(db);
      db.projects=db.projects.map(linkProjectOwnership);
      const serialized=JSON.stringify(db);
      if(Buffer.byteLength(serialized)>snapshotLimit(db)) throw Error("Workspace storage limit reached");
      if(workspace.startsWith("acct_")) {
        const stored=serializeAccount(workspace,db);
        // No deletion is implicit: archival/migration needs a separate explicit operation.
        if([...before.keys()].some(id=>!stored.metadata.projectIds.includes(id))) throw Error("Project deletion requires explicit archival");
        tx.set(ref,JSON.parse(JSON.stringify(stored.metadata)));
        for(const p of stored.projects) if(before.get(p.id)!==JSON.stringify(p)) tx.set(ref.collection("projects").doc(p.id),JSON.parse(JSON.stringify(p)));
      } else tx.set(ref,JSON.parse(serialized));
      return result;
    });
  }
}
export const repository: Repository =
  process.env.PORT67_STORAGE === "firebase"
    ? new FirebaseRepository()
    : new LocalRepository();
// Demo records always use a separate local namespace, never the production Firebase project.
export const demoDataDirectory = () =>
  process.env.PORT67_DEMO_DATA_DIR || join(tmpdir(), "port67-factory-demo");
export const demoRepository: Repository = new LocalRepository(
  demoDataDirectory(),
);
