import assert from "node:assert/strict";
import { POST } from "../src/app/api/enquiries/route";
async function run() {
  const request = (
    body: string,
    origin = "https://example.org",
    type = "application/json",
  ) =>
    new Request("https://example.org/api/enquiries", {
      method: "POST",
      headers: { origin, "content-type": type },
      body,
    });
  assert.equal((await POST(request("{}", "https://evil.example"))).status, 403);
  assert.equal(
    (await POST(request("{}", "https://example.org", "text/plain"))).status,
    415,
  );
  assert.equal((await POST(request("x".repeat(5121)))).status, 413);
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request("{}"))).status, 400);
  const valid = {
    name: "Test Person",
    email: "person@example.org",
    organisation: "Example Ltd",
    service: "automate",
    budget: "8-12k",
    timing: "soon",
    challenge: "We need to improve a controlled enquiry review workflow.",
    ack: true,
  };
  delete process.env.ENQUIRY_PRIVACY_APPROVED;
  assert.equal((await POST(request(JSON.stringify(valid)))).status, 503);
  process.env.ENQUIRY_PRIVACY_APPROVED = "true";
  process.env.ENQUIRY_DELIVERY_URL = "https://delivery.example.org/enquiries";
  process.env.ENQUIRY_DELIVERY_TOKEN = "test-token";
  const deliver = () => {
    const req = request(JSON.stringify(valid));
    req.headers.set("idempotency-key", "12345678-1234-1234-1234-123456789012");
    return POST(req);
  };
  const originalFetch = globalThis.fetch;
  try {
    for (const [upstream, expected] of [
      [new Response("{}", { status: 500 }), 503],
      [new Response("{}", { status: 429 }), 429],
      [new Response('{"lead_id":"opaque-lead-123"}', { status: 201 }), 201],
      [new Response("{}", { status: 201 }), 503],
      [new Response('{"lead_id":"email@example.org"}', { status: 201 }), 503],
      [new Response("invalid", { status: 201 }), 503],
    ] as const) {
      globalThis.fetch = async () => upstream;
      assert.equal((await deliver()).status, expected);
    }
    globalThis.fetch = async () => {
      throw new Error("Network timeout");
    };
    assert.equal((await deliver()).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.ENQUIRY_PRIVACY_APPROVED;
    delete process.env.ENQUIRY_DELIVERY_URL;
    delete process.env.ENQUIRY_DELIVERY_TOKEN;
  }
  console.log(
    "Enquiry delivery: confirmed acceptance, rejection, rate limit, malformed acknowledgement and network failure passed.",
  );
  console.log(
    "Enquiry route: origin, type, size, malformed input, schema and unavailable delivery passed.",
  );
}
run();
