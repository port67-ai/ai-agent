import type { EdgeStat } from "@/lib/factory/observability";

export const usd = (micro: number) => "$" + (micro / 1e6).toFixed(micro >= 1e6 ? 2 : 4);
const secs = (ms?: number) => (ms === undefined ? "n/a" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
export type Tip = { title: string; summary: string; rows: { label: string; value: string; warn?: boolean }[] };
/** What to show when the admin hovers an agent-to-LLM connector: calls, outcome, tokens, cost and time for that path. */
export function edgeTip(agentName: string, current: { provider: string; model: string } | undefined, edges: EdgeStat[], lastError?: { message: string }): Tip {
  const title = current ? `${agentName} to ${current.provider} ${current.model}` : agentName;
  const mine = current ? edges.find((e) => e.provider === current.provider && e.model === current.model) : undefined;
  const others = edges.filter((e) => e !== mine);
  if (!mine) {
    return { title, summary: `${title}: no API calls yet`, rows: [{ label: "API calls", value: "0 so far" }, { label: "Cost", value: "$0.0000" }, ...(others.length ? [{ label: "Earlier models", value: others.map((e) => `${e.provider} ${e.model}: ${e.calls} calls, ${usd(e.microUsd)}`).join("; ") }] : [])] };
  }
  const bad = mine.failed + mine.unknown;
  const rows: Tip["rows"] = [
    { label: "API calls", value: String(mine.calls) },
    { label: "Outcome", value: `${mine.completed} completed, ${mine.failed} failed, ${mine.unknown} unknown${mine.inFlight ? `, ${mine.inFlight} running` : ""}`, warn: bad > 0 },
    { label: "Tokens in / out", value: `${mine.inputTokens.toLocaleString()} / ${mine.outputTokens.toLocaleString()}` },
    { label: "Estimated cost", value: usd(mine.microUsd) + (mine.unpriced ? ` + ${mine.unpriced} unpriced` : ""), warn: mine.unpriced > 0 },
    { label: "Average time", value: secs(mine.avgLatencyMs) },
    ...(mine.lastAt ? [{ label: "Last call", value: mine.lastAt.slice(0, 16).replace("T", " ") + " UTC" }] : []),
    ...(lastError ? [{ label: "Last error", value: lastError.message.slice(0, 160), warn: true }] : []),
    ...(others.length ? [{ label: "Earlier models", value: others.map((e) => `${e.provider} ${e.model}: ${e.calls} calls, ${usd(e.microUsd)}`).join("; ") }] : []),
  ];
  return { title, summary: `${title}: ${mine.calls} call${mine.calls === 1 ? "" : "s"}, ${usd(mine.microUsd)}${bad ? `, ${bad} failed or unknown` : ""}`, rows };
}
