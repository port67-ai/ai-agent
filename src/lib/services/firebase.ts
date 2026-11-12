import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Lazy initialization keeps dormant legacy routes from breaking standalone Factory builds.
// Missing credentials are an explicit error when the legacy service is used, never mock credentials.
export function getFirebaseApp() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId)
    throw new Error("Legacy Firebase is not configured");
  return getApps().some((a) => a.name === "[DEFAULT]")
    ? getApp()
    : initializeApp(config);
}
export const getFirebaseAuth = () => getAuth(getFirebaseApp());
export const getFirebaseDb = () => getFirestore(getFirebaseApp());
