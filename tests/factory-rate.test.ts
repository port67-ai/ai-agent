import assert from "node:assert/strict";
process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
process.env.PORT67_SESSION_SECRET = "test-session-secret-which-is-at-least-32";
async function main() {
  const { handleFactory } = await import("../src/lib/factory/service");
  async function visitor() {
    const r = await handleFactory(
      new Request("http://localhost:3000/api/factory/session"),
      ["session"],
    );
    return r.headers.get("set-cookie")?.split(";")[0] || "";
  }
  async function login(cookie: string, password: string) {
    return handleFactory(
      new Request("http://localhost:3000/api/factory/login", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({ password }),
      }),
      ["login"],
    );
  }
  const first = await visitor();
  for (let i = 0; i < 31; i++) await login(first, "invalid-password");
  assert.equal((await login(first, "invalid-password")).status, 429);
  const second = await visitor();
  assert.equal(
    (await login(second, process.env.PORT67_OPERATOR_PASSWORD!)).status,
    200,
    "one visitor cannot exhaust another visitor login allowance",
  );
  console.log("Authentication throttling: visitor buckets are isolated.");
}
void main();
