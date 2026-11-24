import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { factoryFirebaseProject, getFactoryFirebaseApp } from "./firebase-admin";
import { purposeExtension } from "./customers";

// Brand purpose files live outside the customer record, in the same private store arrangement as studio uploads (studio-store.ts):
// Firebase Storage in production, a private local folder otherwise. Only a BrandPurposeFile reference is stored on the record.
// Files are read back only through the authorised producer route, never through a public URL.
const KEY = /^customers\/cust_[a-f0-9]{32}\/[a-f0-9-]{36}\.(pdf|docx|txt|png|jpg)$/;
const checked = (key: string) => {
  if (!KEY.test(key)) throw new Error("Invalid file key");
  return key;
};
export function purposeKey(customerId: string, fileId: string, mime: string) {
  const ext = purposeExtension(mime);
  if (!ext) throw new Error("Unsupported file type");
  return checked(`customers/${customerId}/${fileId}.${ext}`);
}
async function bucket() {
  const { getStorage } = await import("firebase-admin/storage");
  const name = process.env.PORT67_FIREBASE_STORAGE_BUCKET || `${factoryFirebaseProject()}.firebasestorage.app`;
  return getStorage(getFactoryFirebaseApp()).bucket(name);
}
const local = (key: string) => join(process.env.PORT67_DATA_DIR || join(process.cwd(), ".factory-data"), normalize(checked(key)));
export async function putPurposeFile(key: string, bytes: Buffer, contentType: string) {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { await (await bucket()).file(checked(key)).save(bytes, { contentType, resumable: false }); }
    catch { throw new Error("File storage is unavailable; check the Firebase Storage bucket and its billing plan"); }
    return;
  }
  await mkdir(dirname(local(key)), { recursive: true, mode: 0o700 });
  await writeFile(local(key), bytes, { mode: 0o600 });
}
export async function getPurposeFile(key: string): Promise<Buffer> {
  if (process.env.PORT67_STORAGE === "firebase") {
    try { return (await (await bucket()).file(checked(key)).download())[0]; }
    catch { throw new Error("File is unavailable"); }
  }
  return readFile(local(key));
}
