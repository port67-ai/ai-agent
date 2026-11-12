import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { factoryFirebaseProject, getFactoryFirebaseApp } from "./firebase-admin";

type IdentityClaims = { uid: string; aud: string; iss: string; email?: string; email_verified?: boolean };
export type FactoryTokenVerifier = (token: string, checkRevoked: boolean) => Promise<IdentityClaims>;
export type FactoryIdentity = { uid: string; email?: string; accountId: string; role: "customer" | "operator"; admin: boolean };
const allowed = (value: string | undefined, uid: string) => (value || "").split(/[\s,]+/).filter(Boolean).includes(uid);
export async function verifyFactoryIdentity(idToken: string, verifier: FactoryTokenVerifier = (token, checkRevoked) => getAuth(getFactoryFirebaseApp()).verifyIdToken(token, checkRevoked)): Promise<FactoryIdentity> {
  const project = factoryFirebaseProject();
  if (!idToken || idToken.length > 16384) throw new Error("Invalid identity token");
  const token = await verifier(idToken, true);
  if (!token.uid || token.aud !== project || token.iss !== `https://securetoken.google.com/${project}` || token.email_verified !== true)
    throw new Error("Verified factory identity required");
  const admin = allowed(process.env.PORT67_ADMIN_UIDS, token.uid);
  return {
    uid: token.uid,
    ...(token.email ? { email: token.email } : {}),
    accountId: `acct_${createHash("sha256").update(token.uid).digest("hex").slice(0, 32)}`,
    role: admin || allowed(process.env.PORT67_OPERATOR_UIDS, token.uid) ? "operator" : "customer",
    admin,
  };
}

export type FactoryUserLookup = (uid: string) => Promise<{ uid: string; email?: string; emailVerified: boolean; disabled: boolean; tokensValidAfterTime?: string }>;
export async function revalidateIdentitySession(uid: string, issuedAt: number, lookup: FactoryUserLookup = (subject) => getAuth(getFactoryFirebaseApp()).getUser(subject)): Promise<FactoryIdentity> {
  factoryFirebaseProject();
  if (!uid || !Number.isFinite(issuedAt) || issuedAt <= 0) throw new Error("Invalid identity session");
  const user = await lookup(uid);
  const revokedAfter = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : 0;
  if (user.uid !== uid || user.disabled || !user.emailVerified || !Number.isFinite(revokedAfter) || revokedAfter > issuedAt)
    throw new Error("Identity session no longer valid");
  const admin = allowed(process.env.PORT67_ADMIN_UIDS, uid);
  return { uid, ...(user.email ? { email: user.email } : {}), accountId: `acct_${createHash("sha256").update(uid).digest("hex").slice(0, 32)}`, role: admin || allowed(process.env.PORT67_OPERATOR_UIDS, uid) ? "operator" : "customer", admin };
}
