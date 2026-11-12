import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { firebaseCredentialMode, type Environment } from "./config";

export const FACTORY_FIREBASE_PROJECT = "ai-agency-3671b";
export function factoryFirebaseProject(e: Environment = process.env) {
  const project = e.PORT67_FIREBASE_PROJECT_ID;
  if (project !== FACTORY_FIREBASE_PROJECT || project === e.FIREBASE_PROJECT_ID || project === e.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    throw new Error("Dedicated factory Firebase project required");
  return project;
}
export function getFactoryFirebaseApp() {
  const projectId = factoryFirebaseProject();
  const name = `port67-factory-${projectId}`;
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;
  if (firebaseCredentialMode() === "adc")
    return initializeApp({ projectId, credential: applicationDefault() }, name);
  let account;
  try { account = JSON.parse(process.env.PORT67_FIREBASE_SERVICE_ACCOUNT || ""); }
  catch { throw new Error("Factory Firebase credentials unavailable"); }
  if (account.type !== "service_account" || account.project_id !== projectId || typeof account.client_email !== "string" || typeof account.private_key !== "string")
    throw new Error("Factory Firebase credentials unavailable");
  return initializeApp({ projectId, credential: cert(account) }, name);
}
