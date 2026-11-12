import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
async function main() {
  const directory = await mkdtemp(join(tmpdir(), "port67-api-"));
  process.env.PORT67_DATA_DIR = join(directory, "live");
  process.env.PORT67_DEMO_DATA_DIR = join(directory, "demo");
  const { handleFactory } = await import("../src/lib/factory/service");
  let cookie = "";
  async function request(
    path: string,
    body?: unknown,
    origin = "http://localhost:3000",
  ) {
    const headers: Record<string, string> = { origin, cookie };
    if (body) headers["content-type"] = "application/json";
    const response = await handleFactory(
      new Request("http://localhost:3000/api/factory/" + path, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
      path.split("/"),
    );
    const set = response.headers.get("set-cookie");
    if (set) {
      const pair = set.split(";")[0];
      const name = pair.split("=")[0];
      cookie = [
        ...cookie
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith(name + "=")),
        pair,
      ].join("; ");
    }
    return response;
  }
  assert.equal((await request("projects")).status, 401);
  const proxied = await handleFactory(
    new Request("http://0.0.0.0:3000/api/factory/logout", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    ["logout"],
  );
  assert.equal(
    proxied.status,
    200,
    "same-origin requests behind the Node listener must work",
  );
  assert.equal((await request("demo", {}, "http://evil.test")).status, 403);
  await request("session");
  let response = await request("demo", {});
  assert.equal(response.status, 200);
  const me = await (await request("session")).json();
  assert.equal(me.principal.demo, true);
  const list = await (await request("projects")).json();
  const project = list.projects[0];
  assert.ok(project.id);
  assert.equal(
    (await request("projects/" + project.id, { type: "draftStrategy" })).status,
    200,
  );
  assert.equal(
    (await request("projects/" + project.id, { type: "produce" })).status,
    400,
  );
  await request("projects/" + project.id, { type: "shareStrategy" });
  await request("demo-role", { role: "customer", projectId: project.id });
  assert.equal(
    (await request("projects/" + project.id, { type: "addSource" })).status,
    403,
  );
  const view = await (await request("projects/" + project.id)).json();
  assert.equal(view.project.audit.length, 0);
  response = await request("projects/" + project.id, {
    type: "approveStrategy",
    hash: view.project.strategies.at(-1).hash,
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await request("projects/00000000-0000-0000-0000-000000000000")).status,
    403,
  );
  await request("logout", {});
  assert.equal((await request("projects")).status, 401);

  assert.equal(
    (await request("login", { password: "not-configured" })).status,
    503,
  );
  process.env.PORT67_OPERATOR_PASSWORD = "test-only-operator-password";
  process.env.PORT67_SESSION_SECRET =
    "test-only-session-secret-with-at-least-32-characters";
  await request("session");
  assert.equal(
    (await request("login", { password: "wrong-password-value" })).status,
    401,
  );
  assert.equal(
    (await request("login", { password: process.env.PORT67_OPERATOR_PASSWORD }))
      .status,
    200,
  );
  const operatorCookie = cookie;
  const real = await (
    await request("projects", {
      business: "Private brand",
      objective: "Awaiting customer brief",
      contact: "owner@example.com",
    })
  ).json();
  const realId = real.project.id;
  const invitation = await (
    await request("projects/" + realId + "/invite", {})
  ).json();
  const token = new URLSearchParams(
    new URL(invitation.invitation).hash.slice(1),
  ).get("invite");
  assert.ok(token);
  await request("logout", {});
  assert.equal((await request("client-login", { token })).status, 200);
  const clientCookie = cookie;
  assert.equal(
    (await request("demo-role", { role: "operator", projectId: realId }))
      .status,
    403,
  );
  assert.equal(
    (
      await request("projects/" + realId, {
        type: "updateBrief",
        business: "Customer voice",
        objective: "Launch",
        contact: "owner@example.com",
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("projects/" + realId, { type: "draftStrategy" })).status,
    403,
  );
  cookie = operatorCookie;
  assert.equal(
    (
      await request("projects/" + realId, {
        type: "approveStrategy",
        hash: "fake",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("projects/" + realId + "/research", { segment: "brand" }))
      .status,
    503,
  );
  await request("projects/" + realId + "/invite", {});
  cookie = clientCookie;
  assert.equal(
    (await request("projects")).status,
    401,
    "replacement invitation revokes the prior customer session",
  );
  await rm(directory, { recursive: true, force: true });
  console.log(
    "Factory API: unauthenticated, cross-origin, role boundaries and review journey passed.",
  );
}
void main();
