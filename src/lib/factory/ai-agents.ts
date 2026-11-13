import { autoApproveProducer } from "./auto-approve";
import { exportApiCalls, type ApiCall } from "./costs";
import { capabilityRegistry, productionCapabilities } from "./registry";
import { SLOTS, routingOverview } from "./ai-routing";
import type { Repository } from "./repository";
import { flowObservability } from "./observability";

// Admin view of every agent: what it does, which model runs it, and what it has done and cost.
const PURPOSE: Record<string, { capability: string; purpose: string }> = {
  "scope:business": { capability: "scope.business", purpose: "Reads the brief (no web search) and classifies the business: type, size, reach, audience and regulation. Saves that classification and a narrow, business-specific question list for each research agent to Firestore, so every later step can read it." },
  "research:brand": { capability: "research.brand", purpose: "Reads the business website and independent coverage to establish the offer, brand voice and facts the business can stand behind." },
  "research:customer": { capability: "research.customer", purpose: "Finds real customer reviews and discussion: motivations, objections, the words customers use and the alternatives they weigh." },
  "research:competitor": { capability: "research.competitor", purpose: "Maps named competitors: positioning, who they target, what customers praise and complain about, and the gaps they leave." },
  "research:creative": { capability: "research.creative", purpose: "Finds the formats, hooks and channel conventions that work in the category and on the chosen launch channels." },
  "synthesis:insights": { capability: "analysis.insights", purpose: "Turns reviewed sources into draft insights, each tied to the evidence behind it." },
  "synthesis:strategy": { capability: "drafting.direction", purpose: "Drafts the campaign direction: positioning, key messages with proof, tone, channels and claims to avoid." },
  "synthesis:content": { capability: "drafting.content", purpose: "Writes channel copy from the approved direction and its evidence only; rejected if it invents a figure." },
  "review:scope": { capability: "review.scope", purpose: "Walled garden: sees only the brief and the stored classification and questions. Checks they fit the business; sends them back once if not." },
  "review:sources": { capability: "review.sources", purpose: "Walled garden: sees only each source, the business and the questions its segment was asked. Accepts or rejects each source; never sees insights or the direction." },
  "review:insights": { capability: "review.insights", purpose: "Walled garden: sees only each draft insight and its own evidence. Accepts or rejects each; sends the set back once with notes if too few are supported. Never sees the direction." },
  "review:direction": { capability: "review.direction", purpose: "Walled garden: sees only the draft direction, its accepted insights, the objective and the launch channels. Decides whether it is ready for the account owner; sends it back once with notes. Never sees raw sources." },
};
export type AgentStats = { calls: number; completed: number; failed: number; unknown: number; inFlight: number; inputTokens: number; outputTokens: number; estimatedMicroUsd: number; lastAt?: string; lastStatus?: "completed" | "failed" | "unknown" | "reserved" };
const IN_FLIGHT_MS = 120000;
export function agentStats(rows: ApiCall[], agent: string, now = Date.now()): AgentStats {
  const own = rows.filter((r) => r.agent === agent);
  const flying = (r: ApiCall) => r.status === "reserved" && Date.parse(r.createdAt) + IN_FLIGHT_MS > now;
  return {
    calls: own.length,
    completed: own.filter((r) => r.status === "completed").length,
    failed: own.filter((r) => r.status === "failed").length,
    unknown: own.filter((r) => r.status === "unknown" || (r.status === "reserved" && !flying(r))).length,
    inFlight: own.filter(flying).length,
    inputTokens: own.reduce((n, r) => n + (r.usage?.inputTokens || 0), 0),
    outputTokens: own.reduce((n, r) => n + (r.usage?.outputTokens || 0), 0),
    estimatedMicroUsd: own.reduce((n, r) => n + (r.reconciliation ? r.reconciliation.actualMicroUsd : r.estimatedMicroUsd || 0), 0),
    ...(own.length ? { lastAt: own.map((r) => r.createdAt).sort().at(-1), lastStatus: ((l) => (l.status === "reserved" ? (flying(l) ? "reserved" : "unknown") : l.status))([...own].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1)!) } : {}),
  };
}
export async function agentsOverview(repo: Repository, env: Record<string, string | undefined> = process.env) {
  const routing = await routingOverview(repo, env);
  let rows: ApiCall[] = [];
  let ledgerError = "";
  try {
    rows = await exportApiCalls(repo);
  } catch (e) {
    ledgerError = e instanceof Error ? e.message : "Ledger unavailable";
  }
  const now = Date.now();
  const ai = SLOTS.map((slot) => {
    const meta = PURPOSE[slot.id];
    const cap = capabilityRegistry.find((c) => c.id === meta.capability);
    const eff = routing.effective.find((e) => e.slot === slot.id);
    return {
      id: slot.id as string,
      group: slot.id === "scope:business" ? "scoping" : slot.id.startsWith("review:") ? "review" : slot.stage === "research" ? "research" : "drafting",
      name: cap?.name || slot.label,
      purpose: meta.purpose,
      kind: "ai" as const,
      capability: cap ? { id: cap.id, version: cap.version, input: cap.inputContract, output: cap.outputContract, permissions: [...cap.permissions] } : undefined,
      model: eff && !("error" in eff && eff.error) ? { provider: eff.provider, model: eff.model, source: eff.source, priced: eff.priced } : undefined,
      problem: eff && "error" in eff ? eff.error : undefined,
      stats: agentStats(rows, slot.id, now),
    };
  });
  const templates = [
    ...productionCapabilities.map((c) => ({ id: c.id as string, group: "production", name: c.name, purpose: c.outputContract, kind: "template" as const, capability: { id: c.id, version: c.version, input: c.inputContract, output: c.outputContract, permissions: [...c.permissions] }, model: undefined, problem: undefined, stats: undefined })),
    { id: "orchestration.producer", group: "producer", name: "Producer orchestrator", purpose: "Rules only. Decides which producer reviewer or drafting agent goes next, applies each verdict, carries reviewer notes back to the right drafter once, and enforces the loop limits. After the account owner approves the direction it creates the production drafts and AI copy pack and shares the assets. Stops at every customer approval. Switch: PORT67_PRODUCER_AGENT.", kind: "template" as const, capability: { id: "orchestration.producer", version: "1.0.0", input: "Project record: sources, insights, direction, production drafts, asset statuses", output: "Audited producer steps; stops at customer approval gates", permissions: ["write-scoped-draft"] }, model: undefined, problem: undefined, stats: undefined },
    { id: "production.video", group: "production", name: "Video renderer", purpose: "Renders an approved storyboard to a 480p draft or 1080p MP4 from the approved direction. A template render: no AI model and no AI cost.", kind: "template" as const, capability: undefined, model: undefined, problem: undefined, stats: undefined },
  ];
  const recent = [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((r) => ({ id: r.id, agent: r.agent || null, stage: r.stage, provider: r.provider, model: r.model, status: r.status === "reserved" && Date.parse(r.createdAt) + IN_FLIGHT_MS <= now ? "unknown" : r.status, at: r.createdAt, inputTokens: r.usage?.inputTokens, outputTokens: r.usage?.outputTokens, estimatedMicroUsd: r.reconciliation ? r.reconciliation.actualMicroUsd : r.estimatedMicroUsd }));
  const flow = await flowObservability(repo, rows, ai.map((a) => ({ id: a.id, name: a.name, hasModel: !!a.model })), now);
  return {
    flow,
    agents: [...ai, ...templates],
    recent,
    totals: { calls: rows.length, inFlight: ai.reduce((n, a) => n + a.stats.inFlight, 0), estimatedMicroUsd: ai.reduce((n, a) => n + a.stats.estimatedMicroUsd, 0), unattributed: rows.filter((r) => !r.agent).length },
    ledgerError,
    switches: { ...routing.switches, autoApproveProducer: autoApproveProducer() },
  };
}
