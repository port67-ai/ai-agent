import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { factoryFirebaseProject, getFactoryFirebaseApp } from "./firebase-admin";
import { mimeExtension } from "./studio";

// Studio uploads (logos, packshots, mood images, clips, piece files) live outside the project document, like rendered videos
// (video-store.ts): Firebase Storage in production, a local private folder otherwise. Only a StudioAssetRef is stored on the
// project. Files are read back only through the authorised API route, never through a public URL.
const KEY = /^studio\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\.(png|jpg|webp|mp4|mov)$/;
export function studioKey(accountId: string, projectId: string, assetId: string, mime: string) {
  const ext = mimeExtension(mime);
  if (!ext) throw new Error("Unsupported file type");
  return checked(`studio/${accountId}/${projectId}/${assetId}.${ext}`);
}
const checked = (key: string) => {
  if (!KEY.test(key)) throw new Error("Invalid file key");
  return key;
};
/** The account a stored key belongs to; used to keep a shared Brand Kit logo inside its own account. */
export const studioKeyAccount = (key: string) => checked(key).split("/")[1];
async function bucket() {
  const { getStorage } = await import("firebase-admin/storage");
  const name = process.env.PORT67_FIREBASE_STORAGE_BUCKET || `${factoryFirebaseProject()}.firebasestorage.app`;
  return getStorage(getFactoryFirebaseApp()).bucket(name);
}
const local = (key: string) => join(process.env.PORT67_DATA_DIR || join(process.cwd(), ".factory-data"), normalize(checked(key)));
export async function putStudioFile(key: string, bytes: Buffer, contentType: string) {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { await (await bucket()).file(checked(key)).save(bytes, { contentType, resumable: false }); }
    catch { throw new Error("File storage is unavailable; check the Firebase Storage bucket and its billing plan"); }
    return;
  }
  await mkdir(dirname(local(key)), { recursive: true, mode: 0o700 });
  await writeFile(local(key), bytes, { mode: 0o600 });
}
export async function getStudioFile(key: string): Promise<Buffer> {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { return (await (await bucket()).file(checked(key)).download())[0]; }
    catch { throw new Error("File is unavailable"); }
  }
  return readFile(local(key));
}
