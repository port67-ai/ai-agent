import type { ApiCall } from "./costs";
import { accountDirectory } from "./accounts";
import type { Repository } from "./repository";
import type { Project } from "./model";
import { scopeHash } from "./engine";

// Observability for the whole agent system: where data flows (calls, tokens, cost, latency per edge),
// where it is stored (counts per Firestore record), and where it is blocked or not flowing at all.
const IN_FLIGHT_MS = 120000;
const costOf = (r: ApiCall) => (r.reconciliation ? r.reconciliation.actualMicroUsd : r.estimatedMicroUsd);
export type EdgeStat = {
  agent: string;
  provider: string;
  model: string;
  calls: number;
  completed: number;
  failed: number;
  unknown: number;
  inFlight: number;
  inputTokens: number;
  outputTokens: number;
  microUsd: number;
  /** Calls with no known price. Their cost is not zero; it is unknown. */
  unpriced: number;
  avgLatencyMs?: number;
  lastAt?: string;
  /** Status of the most recent call: an old failure does not keep an agent red once a later call succeeds. */
  lastStatus?: "completed" | "failed" | "unknown" | "reserved";
};
const latestStatus = (rows: ApiCall[], flying: (r: ApiCall) => boolean): "completed" | "failed" | "unknown" | "reserved" => {
  const last = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1)!;
  return last.status === "reserved" ? (flying(last) ? "reserved" : "unknown") : last.status;
};
function fold(rows: ApiCall[], now: number): Omit<EdgeStat, "agent" | "provider" | "model"> {
  const flying = (r: ApiCall) => r.status === "reserved" && Date.parse(r.createdAt) + IN_FLIGHT_MS > now;
  const done = rows.filter((r) => r.status === "completed" && r.finishedAt);
  const latency = done.map((r) => Date.parse(r.finishedAt!) - Date.parse(r.createdAt)).filter((n) => Number.isFinite(n) && n >= 0);
  return {
    calls: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    failed: rows.filter((r) => r.status === "failed").length,
    unknown: rows.filter((r) => r.status === "unknown" || (r.status === "reserved" && !flying(r))).length,
    inFlight: rows.filter(flying).length,
    inputTokens: rows.reduce((n, r) => n + (r.usage?.inputTokens || 0), 0),
    outputTokens: rows.reduce((n, r) => n + (r.usage?.outputTokens || 0), 0),
    microUsd: rows.reduce((n, r) => n + (costOf(r) || 0), 0),
    unpriced: rows.filter((r) => costOf(r) === undefined).length,
    ...(latency.length ? { avgLatencyMs: Math.round(latency.reduce((a, b) => a + b, 0) / latency.length) } : {}),
    ...(rows.length ? { lastAt: rows.map((r) => r.createdAt).sort().at(-1) } : {}),
    ...(rows.length ? { lastStatus: latestStatus(rows, flying) } : {}),
  };
}
/** One edge per agent, provider and model: every edge is a metered API call path. */
export function edgeStats(rows: ApiCall[], now = Date.now()): EdgeStat[] {
  const groups = new Map<string, ApiCall[]>();
  for (const r of rows) {
    const key = [r.agent || "unattributed", r.provider, r.model].join("|");
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const [agent, provider, model] = key.split("|");
    return { agent, provider, model, ...fold(list, now) };
  });
}
export type ModelStat = Omit<EdgeStat, "agent"> & { sharePct: number };
/** Cost by model, most expensive first, so the costly models are obvious. */
export function modelStats(rows: ApiCall[], now = Date.now()): ModelStat[] {
  const groups = new Map<string, ApiCall[]>();
  for (const r of rows) groups.set(r.provider + "|" + r.model, [...(groups.get(r.provider + "|" + r.model) || []), r]);
  const all = [...groups.entries()].map(([key, list]) => {
    const [provider, model] = key.split("|");
    return { provider, model, ...fold(list, now) };
  });
  const total = all.reduce((n, m) => n + m.microUsd, 0);
  return all.map((m) => ({ ...m, sharePct: total ? Math.round((m.microUsd / total) * 1000) / 10 : 0 })).sort((a, b) => b.microUsd - a.microUsd);
}
export type PipelineStats = {
  projects: number;
  channelsChosen: number;
  researchRequested: number;
  consented: number;
  researchRuns: { completed: number; failed: number; running: number };
  sources: { total: number; unreviewed: number; supported: number; rejected: number; findings: number };
  gaps: number;
  insights: { total: number; draft: number; reviewed: number; rejected: number };
  directions: { total: number; draft: number; shared: number; approved: number; changes: number };
  copyPacks: number;
  storyboards: number;
  assetsApproved: number;
  videos: number;
  /** Classifications stored on projects in Firestore. */
  scopes: { classified: number; ai: number; template: number; manual: number; stale: number; byCategory: Record<string, number> };
  waiting: { producerStart: number; sourceReview: number; insightReview: number; directionApproval: number; assetApproval: number };
};
export function pipelineStats(projects: Project[]): PipelineStats {
  const sum = (f: (p: Project) => number) => projects.reduce((n, p) => n + f(p), 0);
  const count = (f: (p: Project) => boolean) => projects.filter(f).length;
  const researchRun = (p: Project) => p.runs.filter((r) => (r.stage || "research") === "research");
  const latest = (p: Project) => p.strategies.at(-1);
  return {
    projects: projects.length,
    channelsChosen: count((p) => !!p.channels?.length),
    researchRequested: count((p) => !!p.researchRequest),
    consented: count((p) => !!p.aiConsent),
    researchRuns: {
      completed: sum((p) => researchRun(p).filter((r) => r.status === "completed").length),
      failed: sum((p) => researchRun(p).filter((r) => r.status === "failed").length),
      running: sum((p) => researchRun(p).filter((r) => r.status === "running").length),
    },
    sources: {
      total: sum((p) => p.sources.length),
      unreviewed: sum((p) => p.sources.filter((s) => s.status === "unreviewed").length),
      supported: sum((p) => p.sources.filter((s) => s.status === "supported").length),
      rejected: sum((p) => p.sources.filter((s) => s.status === "rejected").length),
      findings: sum((p) => p.sources.reduce((n, s) => n + (s.findings?.length || 0), 0)),
    },
    gaps: sum((p) => researchRun(p).reduce((n, r) => n + (r.gaps?.length || 0), 0)),
    insights: {
      total: sum((p) => p.insights.length),
      draft: sum((p) => p.insights.filter((i) => (i.status || "reviewed") === "draft").length),
      reviewed: sum((p) => p.insights.filter((i) => (i.status || "reviewed") === "reviewed").length),
      rejected: sum((p) => p.insights.filter((i) => i.status === "rejected").length),
    },
    directions: {
      total: sum((p) => p.strategies.length),
      draft: count((p) => latest(p)?.status === "draft"),
      shared: count((p) => latest(p)?.status === "shared"),
      approved: count((p) => latest(p)?.status === "approved"),
      changes: count((p) => latest(p)?.status === "changes_requested"),
    },
    copyPacks: sum((p) => p.assets.filter((a) => a.kind === "copy").length),
    storyboards: sum((p) => p.assets.filter((a) => a.kind === "motion").length),
    assetsApproved: sum((p) => p.assets.filter((a) => a.status === "approved").length),
    videos: sum((p) => (p.videos || []).length),
    scopes: {
      classified: count((p) => !!p.scope),
      ai: count((p) => p.scope?.source === "ai"),
      template: count((p) => p.scope?.source === "template"),
      manual: count((p) => p.scope?.source === "manual"),
      stale: count((p) => !!p.scope && p.scope.briefHash !== scopeHash(p)),
      byCategory: projects.reduce<Record<string, number>>((m, p) => (p.scope ? { ...m, [p.scope.classification.category]: (m[p.scope.classification.category] || 0) + 1 } : m), {}),
    },
    waiting: {
      producerStart: count((p) => !!p.researchRequest && researchRun(p).length === 0),
      sourceReview: count((p) => p.sources.some((s) => s.status === "unreviewed")),
      insightReview: count((p) => p.insights.some((i) => (i.status || "reviewed") === "draft")),
      directionApproval: count((p) => latest(p)?.status === "shared"),
      assetApproval: count((p) => p.assets.some((a) => a.status === "shared")),
    },
  };
}
export type ScopeRow = { accountId: string; projectId: string; business: string; category: string; businessType: string; size: string; reach: string; audienceModel: string; regulated: boolean; source: string; version: number; at: string; model?: string; current: boolean };
/** Every stored classification, newest first: what the system believes each business is, readable in one place. */
export function scopeRows(projects: Project[], limit = 40): ScopeRow[] {
  return projects
    .filter((p) => !!p.scope)
    .map((p) => ({ accountId: p.accountId || p.workspaceId, projectId: p.id, business: p.brief.business, category: p.scope!.classification.category, businessType: p.scope!.classification.businessType, size: p.scope!.classification.size, reach: p.scope!.classification.reach, audienceModel: p.scope!.classification.audienceModel, regulated: p.scope!.classification.regulated, source: p.scope!.source, version: p.scope!.version, at: p.scope!.at, ...(p.scope!.model ? { model: p.scope!.model } : {}), current: p.scope!.briefHash === scopeHash(p) }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
export async function loadAllProjects(repo: Repository): Promise<{ projects: Project[]; error: string }> {
  try {
    const accounts = ((await repo.read(accountDirectory)).accounts || []).slice(0, 100);
    const lists = await Promise.all(accounts.map(async (a) => {
      try {
        return (await repo.read(a.id)).projects || [];
      } catch {
        return [] as Project[];
      }
    }));
    return { projects: lists.flat(), error: "" };
  } catch (e) {
    return { projects: [], error: e instanceof Error ? e.message : "Projects unavailable" };
  }
}
export type Blocker = { level: "blocked" | "failed" | "idle"; where: string; text: string };
/** Plain statements about where data is blocked, failing or not flowing. Nothing here is guessed: each line comes from a count. */
export function findBlockers(p: PipelineStats, edges: EdgeStat[], aiAgents: { id: string; name: string; hasModel: boolean }[], errors: Record<string, { message: string }> = {}): Blocker[] {
  const out: Blocker[] = [];
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;
  if (p.waiting.producerStart) out.push({ level: "blocked", where: "Producer start", text: `${n(p.waiting.producerStart, "project is", "projects are")} waiting for a producer to start research.` });
  if (p.waiting.sourceReview) out.push({ level: "blocked", where: "Gate 1", text: `${n(p.sources.unreviewed, "source is", "sources are")} unreviewed across ${n(p.waiting.sourceReview, "project", "projects")}; insights cannot start.` });
  if (p.waiting.insightReview) out.push({ level: "blocked", where: "Gate 2", text: `${n(p.waiting.insightReview, "project has", "projects have")} draft insights waiting for acceptance.` });
  if (p.waiting.directionApproval) out.push({ level: "blocked", where: "Gate 3", text: `${n(p.waiting.directionApproval, "direction is", "directions are")} shared and waiting for customer approval.` });
  if (p.waiting.assetApproval) out.push({ level: "blocked", where: "Gate 5", text: `${n(p.waiting.assetApproval, "project has", "projects have")} shared assets waiting for customer approval.` });
  for (const e of edges.filter((x) => (x.lastStatus ? x.lastStatus === "failed" || x.lastStatus === "unknown" : x.failed || x.unknown))) {
    const name = aiAgents.find((a) => a.id === e.agent)?.name || e.agent;
    out.push({ level: "failed", where: name, text: `${e.failed ? n(e.failed, "call failed", "calls failed") : ""}${e.failed && e.unknown ? " and " : ""}${e.unknown ? n(e.unknown, "call has", "calls have") + " unknown usage" : ""} on ${e.provider} ${e.model}.${errors[e.agent] ? " Last error: " + errors[e.agent].message : ""}` });
  }
  for (const a of aiAgents) {
    if (!a.hasModel) out.push({ level: "idle", where: a.name, text: a.id === "scope:business" ? "No model chosen: the free template scope is used instead of an AI classification." : a.id.startsWith("review:") ? "No model chosen: this producer reviewer uses its free rule checks only." : "No model chosen, so this agent cannot run." });
    else if (!edges.some((e) => e.agent === a.id)) out.push({ level: "idle", where: a.name, text: "Has not made an API call yet: no data has flowed through it." });
  }
  return out;
}
export type AgentError = { at: string; message: string; provider: string; model: string };
const agentOfRun = (r: Project["runs"][number]) => r.stage === "scope" ? "scope:business" : r.stage === "review" ? "review:" + String(r.capabilityId || "").replace("review.", "") : ((r.stage || "research") === "research" ? (r.segment ? "research:" + r.segment : "") : r.stage ? "synthesis:" + (r.stage === "insights" ? "insights" : r.stage === "strategy" ? "strategy" : "content") : "");
/** The most recent failure message per agent, read from run records. */
export function lastErrors(projects: Project[]): Record<string, AgentError> {
  const out: Record<string, AgentError> = {};
  for (const p of projects)
    for (const r of p.runs) {
      const agent = agentOfRun(r);
      if (!agent || r.status !== "failed" || !r.error) continue;
      const at = r.finishedAt || r.at;
      if (!out[agent] || out[agent].at < at) out[agent] = { at, message: r.error.slice(0, 300), provider: r.provider, model: r.model };
    }
  return out;
}
export async function flowObservability(repo: Repository, rows: ApiCall[], aiAgents: { id: string; name: string; hasModel: boolean }[], now = Date.now()) {
  const { projects, error } = await loadAllProjects(repo);
  const pipeline = pipelineStats(projects);
  const edges = edgeStats(rows, now);
  const errors = lastErrors(projects);
  return { pipeline, edges, errors, scopes: scopeRows(projects), models: modelStats(rows, now), blockers: findBlockers(pipeline, edges, aiAgents, errors), projectsError: error };
}
export type FlowObservability = Awaited<ReturnType<typeof flowObservability>>;
