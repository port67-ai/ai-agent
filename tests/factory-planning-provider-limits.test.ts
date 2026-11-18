import assert from "node:assert/strict";
import { invokeProvider, type Provider } from "../src/lib/factory/providers";
async function main() {
  const original = globalThis.fetch;
  try {
    for (const provider of ["openai", "anthropic", "deepseek", "gemini"] as Provider[]) {
      let sent: Record<string, unknown> = {};
      globalThis.fetch = async (_url, init) => { sent = JSON.parse(String(init?.body)); return Response.json({}); };
      await invokeProvider({ provider, model: "fixture", key: "fixture-only" }, { instructions: "Plan bounded research", input: "Public fixture", maxOutputTokens: 6500 });
      const tokens = provider === "openai" ? sent.max_output_tokens : provider === "gemini" ? (sent.generationConfig as Record<string, unknown>).maxOutputTokens : sent.max_tokens;
      assert.equal(tokens, 6500, `${provider} respects the bounded planner output limit`);
    }
    console.log("Planning token limits honoured by all four provider adapters");
  } finally { globalThis.fetch = original; }
}
void main();
