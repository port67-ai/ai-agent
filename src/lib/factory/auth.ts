import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { liveConfigurationReady } from "./config";
import type { Principal } from "./model";
const ephemeralKey = randomBytes(48).toString("hex");
export const sessionKey = () =>
  process.env.PORT67_SESSION_SECRET || ephemeralKey;
export const liveReady = () => liveConfigurationReady();
export const demoEnabled = () => process.env.PORT67_DEMO_ENABLED !== "false";
export const secureEqual = (a: string, b: string) =>
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function signSession(p: Principal, key: string) {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return (
    body + "." + createHmac("sha256", key).update(body).digest("base64url")
  );
}
export function readSession(token: string, key: string): Principal | null {
  try {
    const [body, signature, ...extra] = token.split(".");
    if (extra.length || !body || !signature) return null;
    const expected = createHmac("sha256", key).update(body).digest("base64url");
    if (!secureEqual(signature, expected)) return null;
    const p = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as Principal;
    if (
      !p.expires ||
      p.expires < Date.now() ||
      !["customer", "operator"].includes(p.role) ||
      !p.workspaceId ||
      !p.subject
    )
      return null;
    return p;
  } catch {
    return null;
  }
}
export function sameOrigin(origin: string | null, url: string) {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(url).origin;
  } catch {
    return false;
  }
}
export const cookieName = "port67_factory";
