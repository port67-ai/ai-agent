import { providerConfigured } from "./providers";
import { budgetConfig } from "./budget";
import { isAbsolute, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
export type Environment = Record<string, string | undefined>;
export type ConfigurationCheck = {
  id: string;
  label: string;
  state: "ready" | "missing" | "blocked" | "disabled";
  message: string;
  variables: string[];
  requiredForLive: boolean;
};
export const firebaseCredentialMode = (e: Environment = process.env) =>
  e.PORT67_FIREBASE_USE_ADC === "true"
    ? ("adc" as const)
    : ("service-account" as const);
function originReady(e: Environment) {
  try {
    const u = new URL(e.PORT67_PUBLIC_ORIGIN || "");
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.hostname.includes(".") &&
      !/^\d/.test(u.hostname) &&
      !u.hostname.endsWith(".local") &&
      !u.hostname.endsWith(".internal") &&
      u.origin === (e.PORT67_PUBLIC_ORIGIN || "").replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}
function storageReady(e: Environment) {
  if (e.PORT67_STORAGE === "firebase") {
    const project = e.PORT67_FIREBASE_PROJECT_ID;
    if (
      !project ||
      project === e.FIREBASE_PROJECT_ID ||
      project === e.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      e.PORT67_FIREBASE_SERVER_ONLY_CONFIRMED !== "true"
    )
      return false;
    if (firebaseCredentialMode(e) === "adc") return true;
    try {
      const account = JSON.parse(e.PORT67_FIREBASE_SERVICE_ACCOUNT || "");
      return (
        account.type === "service_account" &&
        account.project_id === project &&
        typeof account.client_email === "string" &&
        account.client_email.includes("@") &&
        typeof account.private_key === "string" &&
        account.private_key.includes("BEGIN PRIVATE KEY")
      );
    } catch {
      return false;
    }
  }
  if (e.PORT67_STORAGE && e.PORT67_STORAGE !== "local") return false;
  const path = e.PORT67_DATA_DIR;
  if (!path || !isAbsolute(path) || e.PORT67_PERSISTENCE_CONFIRMED !== "true")
    return false;
  const location = resolve(path);
  const temporary = resolve(tmpdir());
  return (
    location !== temporary &&
    !location.startsWith(temporary + sep) &&
    location !== "/var/tmp" &&
    !location.startsWith("/var/tmp/") &&
    location !== "/"
  );
}
export function configurationStatus(e: Environment = process.env) {
  const production = e.NODE_ENV === "production";
  const check = (
    id: string,
    label: string,
    ready: boolean,
    variables: string[],
    message: string,
    requiredForLive = true,
  ): ConfigurationCheck => ({
    id,
    label,
    state: ready ? "ready" : "missing",
    message: ready
      ? "Configuration present; connection/operational checks are separate."
      : message,
    variables,
    requiredForLive,
  });
  const checks: ConfigurationCheck[] = [
    check(
      "session",
      "Private session signing",
      (e.PORT67_SESSION_SECRET || "").length >= 32,
      ["PORT67_SESSION_SECRET"],
      "Set a randomly generated session secret of at least 32 characters in Render Environment.",
    ),
    check(
      "operator",
      "Producer sign-in",
      (e.PORT67_OPERATOR_PASSWORD || "").length >= 16,
      ["PORT67_OPERATOR_PASSWORD"],
      "Set a private operator password of at least 16 characters in Render Environment.",
    ),
    check(
      "origin",
      "Render public origin",
      originReady(e),
      ["PORT67_PUBLIC_ORIGIN"],
      "Set the canonical HTTPS origin for the Render service, with no path/query.",
    ),
    check(
      "storage",
      e.PORT67_STORAGE === "firebase"
        ? "Dedicated Firebase storage"
        : "Persistent Render storage",
      storageReady(e),
      e.PORT67_STORAGE === "firebase"
        ? [
            "PORT67_STORAGE",
            "PORT67_FIREBASE_PROJECT_ID",
            "PORT67_FIREBASE_SERVICE_ACCOUNT",
            "PORT67_FIREBASE_SERVER_ONLY_CONFIRMED",
          ]
        : ["PORT67_STORAGE", "PORT67_DATA_DIR", "PORT67_PERSISTENCE_CONFIRMED"],
      "Attach a private persistent disk and set an absolute non-temporary data directory, or configure a separate server-only Firebase project. Confirm persistence only after verifying the backing storage.",
    ),
    check(
      "launch",
      "Live workspace enabled",
      e.PORT67_LIVE_ENABLED === "true",
      ["PORT67_LIVE_ENABLED"],
      "Set true only after live storage, credentials and launch security checks are complete.",
    ),
  ];
  const required = production
    ? checks
    : checks.filter((c) => ["session", "operator"].includes(c.id));
  const liveReady = required.every((c) => c.state === "ready");

  const research = check(
    "research",
    "Cited web research",
    providerConfigured("research", e) &&
      e.PORT67_RESEARCH_ENABLED === "true",
    [
      "PORT67_RESEARCH_PROVIDER",
      "PORT67_OPENAI_API_KEY", "PORT67_GEMINI_API_KEY",
      "PORT67_RESEARCH_MODEL",
      "PORT67_RESEARCH_ENABLED",
    ],
    "Configure the approved provider key/model and explicitly enable research. No paid calls are made by this check.",
    false,
  );
  if (e.PORT67_RESEARCH_ENABLED !== "true") research.state = "disabled";
  const synthesis = check(
    "synthesis",
    "AI insight and direction drafts",
    providerConfigured("synthesis", e) &&
      e.PORT67_SYNTHESIS_ENABLED === "true",
    [
      "PORT67_SYNTHESIS_PROVIDER",
      "PORT67_OPENAI_API_KEY", "PORT67_ANTHROPIC_API_KEY", "PORT67_DEEPSEEK_API_KEY", "PORT67_GEMINI_API_KEY",
      "PORT67_SYNTHESIS_MODEL",
      "PORT67_SYNTHESIS_ENABLED",
    ],
    "Configure the approved synthesis model and explicitly enable drafting; project-level data authorisation is still required.",
    false,
  );
  if (e.PORT67_SYNTHESIS_ENABLED !== "true") synthesis.state = "disabled";
  return {
    host: "Render" as const,
    production,
    liveReady,
    checks: [...checks, research, synthesis,
      check("accounts","Individual Firebase accounts",e.PORT67_FIREBASE_PROJECT_ID === "ai-agency-3671b" && !!e.PORT67_FIREBASE_WEB_API_KEY && e.PORT67_FIREBASE_AUTH_DOMAIN === "ai-agency-3671b.firebaseapp.com",["PORT67_FIREBASE_PROJECT_ID","PORT67_FIREBASE_WEB_API_KEY","PORT67_FIREBASE_AUTH_DOMAIN"],"Enable email/password sign-in and configure the dedicated Firebase public web settings. Add your Render domain to Firebase authorised domains.",false),
      check("admin","Private owner admin",!!e.PORT67_ADMIN_UIDS?.trim(),["PORT67_ADMIN_UIDS"],"Add only the owner's verified Firebase UID to the server-side admin allowlist. Producer access alone does not grant cost visibility.",false),
      check("budget","AI spend caps",(()=>{try{budgetConfig(e);return true;}catch{return false;}})(),["PORT67_MONTHLY_BUDGET_USD","PORT67_PROJECT_BUDGET_USD","PORT67_CALL_HOLD_USD"],"A spend cap setting is invalid, so paid AI calls are blocked. Use plain USD amounts such as 25 or 12.50; a blank monthly cap defaults to 25.",false),
      check("pricing","Model cost estimates",!!e.PORT67_MODEL_PRICING_JSON,["PORT67_MODEL_PRICING_JSON"],"Configure dated provider:model prices. Calls are tracked without rates, but their cost is shown as unknown until priced or reconciled.",false)
    ],
  };
}
export const liveConfigurationReady = (e: Environment = process.env) =>
  configurationStatus(e).liveReady;
