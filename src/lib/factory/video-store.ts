import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { factoryFirebaseProject, getFactoryFirebaseApp } from "./firebase-admin";

// Rendered videos live outside the workspace document (Firestore documents are too small for video).
// Firebase Storage in production, a local folder otherwise. Access is only through the authorised API.
const KEY = /^videos\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\.mp4$/;
export const videoKey = (accountId: string, projectId: string, videoId: string) => `videos/${accountId}/${projectId}/${videoId}.mp4`;
const checked = (key: string) => { if (!KEY.test(key)) throw new Error("Invalid video key"); return key; };
async function bucket() {
  const { getStorage } = await import("firebase-admin/storage");
  const name = process.env.PORT67_FIREBASE_STORAGE_BUCKET || `${factoryFirebaseProject()}.firebasestorage.app`;
  return getStorage(getFactoryFirebaseApp()).bucket(name);
}
const local = (key: string) => join(process.env.PORT67_DATA_DIR || join(process.cwd(), ".factory-data"), normalize(checked(key)));
export async function putVideo(key: string, bytes: Buffer) {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { await (await bucket()).file(checked(key)).save(bytes, { contentType: "video/mp4", resumable: false }); }
    catch { throw new Error("Video storage is unavailable; check the Firebase Storage bucket and its billing plan"); }
    return;
  }
  await mkdir(dirname(local(key)), { recursive: true });
  await writeFile(local(key), bytes);
}
export async function getVideo(key: string): Promise<Buffer> {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { return (await (await bucket()).file(checked(key)).download())[0]; }
    catch { throw new Error("Video file is unavailable"); }
  }
  return readFile(local(key));
}
