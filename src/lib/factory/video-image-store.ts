import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { factoryFirebaseProject, getFactoryFirebaseApp } from "./firebase-admin";
import { IMAGE_EXT } from "./video-images";

// Project library images live outside the workspace document, in the same private arrangement as brand purpose files:
// Firebase Storage in production, a private local folder otherwise. Read back only through the authorised producer route.
const KEY = /^video-images\/cust_[a-f0-9]{32}\/comm_[a-f0-9]{32}\/[a-f0-9-]{36}\.(png|jpg|webp)$/;
const checked = (key: string) => { if (!KEY.test(key)) throw new Error("Invalid file key"); return key; };
export function imageKey(customerId: string, commissionId: string, id: string, mime: string) {
  const ext = IMAGE_EXT[mime];
  if (!ext) throw new Error("Unsupported file type");
  return checked(`video-images/${customerId}/${commissionId}/${id}.${ext}`);
}
async function bucket() {
  const { getStorage } = await import("firebase-admin/storage");
  const name = process.env.PORT67_FIREBASE_STORAGE_BUCKET || `${factoryFirebaseProject()}.firebasestorage.app`;
  return getStorage(getFactoryFirebaseApp()).bucket(name);
}
const local = (key: string) => join(process.env.PORT67_DATA_DIR || join(process.cwd(), ".factory-data"), normalize(checked(key)));
export async function putImage(key: string, bytes: Buffer, contentType: string) {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { await (await bucket()).file(checked(key)).save(bytes, { contentType, resumable: false }); }
    catch { throw new Error("File storage is unavailable; check the Firebase Storage bucket and its billing plan"); }
    return;
  }
  await mkdir(dirname(local(key)), { recursive: true, mode: 0o700 });
  await writeFile(local(key), bytes, { mode: 0o600 });
}
export async function getImage(key: string): Promise<Buffer> {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { return (await (await bucket()).file(checked(key)).download())[0]; }
    catch { throw new Error("File is unavailable"); }
  }
  return readFile(local(key));
}
/** Best effort: a leftover file is harmless because nothing references it, so a failure here never blocks a delete. */
export async function deleteImage(key: string) {
  try {
    if (process.env.PORT67_STORAGE === "firebase") await (await bucket()).file(checked(key)).delete({ ignoreNotFound: true });
    else await unlink(local(key));
  } catch { /* nothing references it any more */ }
}
