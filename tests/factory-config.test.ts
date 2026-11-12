import assert from "node:assert/strict";
import {
  configurationStatus,
  firebaseCredentialMode,
  liveConfigurationReady,
} from "../src/lib/factory/config";
assert.equal(
  firebaseCredentialMode({
    PORT67_FIREBASE_USE_ADC: "true",
    PORT67_FIREBASE_SERVICE_ACCOUNT: "stale-invalid-secret",
  }),
  "adc",
);
assert.equal(
  firebaseCredentialMode({ PORT67_FIREBASE_SERVICE_ACCOUNT: "configured" }),
  "service-account",
);
const env = {
  NODE_ENV: "production",
  PORT67_SESSION_SECRET: "a".repeat(40),
  PORT67_OPERATOR_PASSWORD: "b".repeat(20),
};
assert.equal(
  liveConfigurationReady(env),
  false,
  "secrets alone cannot enable production without durable storage/origin",
);
const configured = {
  ...env,
  PORT67_PUBLIC_ORIGIN: "https://ai-agent-7k04.onrender.com",
  PORT67_DATA_DIR: "/var/data/port67-factory",
  PORT67_PERSISTENCE_CONFIRMED: "true",
  PORT67_LIVE_ENABLED: "true",
};
assert.equal(liveConfigurationReady(configured), true);
assert.equal(
  liveConfigurationReady({ ...configured, PORT67_DATA_DIR: "/tmp/clients" }),
  false,
  "temporary storage cannot be a live persistent store",
);
assert.equal(
  liveConfigurationReady({
    ...configured,
    PORT67_PUBLIC_ORIGIN: "http://example.com",
  }),
  false,
);
const invalid = {
  ...configured,
  PORT67_STORAGE: "firebase",
  PORT67_FIREBASE_PROJECT_ID: "factory-live",
  PORT67_FIREBASE_SERVICE_ACCOUNT: "secret-invalid-json",
  PORT67_FIREBASE_SERVER_ONLY_CONFIRMED: "true",
};
assert.equal(liveConfigurationReady(invalid), false);
const result = configurationStatus(invalid);
const serialized = JSON.stringify(result);
for (const secret of [
  env.PORT67_SESSION_SECRET,
  env.PORT67_OPERATOR_PASSWORD,
  "secret-invalid-json",
])
  assert.ok(!serialized.includes(secret));
assert.ok(
  result.checks.every((c) =>
    ["ready", "missing", "blocked", "disabled"].includes(c.state),
  ),
);
assert.equal(
  liveConfigurationReady({ ...env, NODE_ENV: "development" }),
  true,
  "local development remains supported",
);
console.log(
  "Live configuration: durable storage/origin gating, credential validation and secret-free diagnostics passed.",
);

assert.equal(
  liveConfigurationReady({ ...configured, PORT67_DATA_DIR: "/var/tmp" }),
  false,
  "the temporary root itself must be rejected",
);
