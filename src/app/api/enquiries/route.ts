import { validateEnquiry } from "@/lib/enquiries";
export const runtime = "nodejs";
// The delivery service owns durable storage, idempotency, shared rate limiting,
// retries and monitored notifications. Never fall back to a mock success.
export async function POST(request: Request) {
  const reply = (status: number, message: string) =>
    Response.json(
      { message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply(403, "Unable to accept this request.");
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return reply(415, "Use a supported request format.");
  if (Number(request.headers.get("content-length")) > 5120)
    return reply(413, "Request is too large.");
  let text = "";
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "Please check the enquiry fields.");
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 5120) {
        await reader.cancel();
        return reply(413, "Request is too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return reply(400, "Please check the enquiry fields.");
  }
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return reply(400, "Please check the enquiry fields.");
  }
  const result = validateEnquiry(input);
  if (!result.ok) return reply(400, "Please check the enquiry fields.");
  const endpoint = process.env.ENQUIRY_DELIVERY_URL,
    token = process.env.ENQUIRY_DELIVERY_TOKEN;
  if (process.env.ENQUIRY_PRIVACY_APPROVED !== "true" || !endpoint || !token)
    return reply(
      503,
      "Online enquiries are not yet available. Your enquiry has not been sent.",
    );
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
    return reply(400, "Please retry the enquiry.");
  try {
    if (new URL(endpoint).protocol !== "https:")
      return reply(503, "Enquiry delivery is unavailable.");
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(result.data),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    if (upstream.status === 429)
      return reply(429, "Please wait before trying again.");
    if (upstream.status !== 201)
      return reply(
        503,
        "Your enquiry could not be confirmed. Please try again later.",
      );
    const accepted = await upstream.json();
    if (
      typeof accepted.lead_id !== "string" ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(accepted.lead_id)
    )
      return reply(
        503,
        "Your enquiry could not be confirmed. Please try again later.",
      );
    return Response.json(
      { lead_id: accepted.lead_id },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return reply(
      503,
      "Your enquiry could not be confirmed. Please try again later.",
    );
  }
}
