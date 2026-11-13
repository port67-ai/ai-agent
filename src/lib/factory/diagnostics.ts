import type { Project } from "./model";

// Producer and admin diagnostics for one project: everything needed to understand a failure, with timestamps, in a form that
// can be copied into a chat. Secrets are never included: only whether a switch is on and which provider and model is chosen.
export type DiagnosticsContext = {
  now: string;
  switches: Record<string, boolean | string>;
  routes: { agent: string; provider?: string; model?: string; source?: string; problem?: string }[];
  /** Ledger rows for this project. Only passed for the admin, who may see the cost ledger. */
  ledger?: { id: string; at: string; finishedAt?: string; agent?: string; provider: string; model: string; status: string; inputTokens?: number; outputTokens?: number; providerRequestId?: string }[];
};
export type DiagEvent = { at: string; finishedAt?: string; seconds?: number; kind: "run" | "audit"; agent: string; status: string; provider?: string; model?: string; text: string; usage?: Record<string, number>; requestId?: string; note?: string };
const agentOf = (r: Project["runs"][number]) => (r.stage === "scope" ? "scope:business" : (r.stage || "research") === "research" ? "research:" + (r.segment || "?") : "synthesis:" + (r.stage === "insights" ? "insights" : r.stage === "content" ? "content" : "strategy"));
const secs = (a: string, b?: string) => (b && Number.isFinite(Date.parse(a)) && Number.isFinite(Date.parse(b)) ? Math.round((Date.parse(b) - Date.parse(a)) / 100) / 10 : undefined);
const NOTABLE = /fail|reject|error|scope|auto_approved|authoris|research_|ai_draft/i;
function buildReport(p: Project, ctx: DiagnosticsContext) {
  const events: DiagEvent[] = [
    ...p.runs.map((r): DiagEvent => ({ at: r.at, finishedAt: r.finishedAt, seconds: secs(r.at, r.finishedAt), kind: "run", agent: agentOf(r), status: r.status, provider: r.provider, model: r.model, text: r.error || (r.status === "completed" ? "completed" : r.status), usage: r.usage, requestId: r.providerRequestId, note: r.note })),
    ...p.audit.filter((a) => NOTABLE.test(a.action)).map((a): DiagEvent => ({ at: a.at, kind: "audit", agent: a.actor, status: a.action, text: a.detail })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const failures = events.filter((e) => e.status === "failed" || /fail|reject/.test(e.status));
  const report = {
    generatedAt: ctx.now,
    project: { id: p.id, accountId: p.accountId || p.workspaceId, business: p.brief.business, createdAt: p.createdAt, updatedAt: p.updatedAt, revision: p.revision, channels: p.channels || [], researchRequestedAt: p.researchRequest?.at, aiAuthorised: !!p.aiConsent },
    switches: ctx.switches,
    routes: ctx.routes,
    scope: p.scope ? { version: p.scope.version, source: p.scope.source, at: p.scope.at, model: p.scope.model, note: p.scope.note, classification: p.scope.classification } : null,
    researchNote: p.researchNote,
    counts: { runs: p.runs.length, failedRuns: p.runs.filter((r) => r.status === "failed").length, sources: p.sources.length, unreviewed: p.sources.filter((s) => s.status === "unreviewed").length },
    failures,
    events,
    ledger: ctx.ledger,
  };
  return report;
}
export type DiagnosticsReport = ReturnType<typeof buildReport>;
export function buildDiagnostics(p: Project, ctx: DiagnosticsContext) {
  const report = buildReport(p, ctx);
  return { report, markdown: renderDiagnostics(report) };
}
export function renderDiagnostics(r: DiagnosticsReport): string {
  const L: string[] = [`# Port67 diagnostics: ${r.project.business}`, "", `Generated ${r.generatedAt} (UTC)`, `Project ${r.project.id} · account ${r.project.accountId} · revision ${r.project.revision}`, `Created ${r.project.createdAt} · updated ${r.project.updatedAt}`, `Channels: ${r.project.channels.join(", ") || "none"} · research requested ${r.project.researchRequestedAt || "no"} · brief authorised for AI: ${r.project.aiAuthorised ? "yes" : "no"}`, ""];
  L.push("## Switches", ...Object.entries(r.switches).map(([k, v]) => `- ${k}: ${v}`), "");
  L.push("## Models in use", ...r.routes.map((x) => `- ${x.agent}: ${x.problem ? "PROBLEM: " + x.problem : `${x.provider} ${x.model} (${x.source})`}`), "");
  L.push("## Scope", r.scope ? `- v${r.scope.version} from ${r.scope.source} at ${r.scope.at}${r.scope.model ? " (" + r.scope.model + ")" : ""}: ${r.scope.classification.businessType} / ${r.scope.classification.category} / size ${r.scope.classification.size} / reach ${r.scope.classification.reach}${r.scope.note ? "\n- Note: " + r.scope.note : ""}` : "- Not classified yet", "");
  if (r.researchNote) L.push("## Research note", r.researchNote, "");
  L.push(`## Failures (${r.failures.length})`);
  if (!r.failures.length) L.push("- None recorded");
  for (const f of r.failures) L.push(`- ${f.at} ${f.agent} [${f.status}]${f.provider ? " " + f.provider + " " + f.model : ""}${f.seconds !== undefined ? " after " + f.seconds + "s" : ""}: ${f.text}${f.note ? "\n  Model wrote instead of findings (not evidence): " + f.note : ""}${f.requestId ? "\n  Provider request ID: " + f.requestId : ""}`);
  L.push("", "## Timeline (UTC)");
  for (const e of r.events) L.push(`- ${e.at}${e.finishedAt ? " to " + e.finishedAt : ""} ${e.kind} ${e.agent} [${e.status}]${e.provider ? " " + e.provider + " " + e.model : ""}${e.seconds !== undefined ? " " + e.seconds + "s" : ""}${e.usage && Object.keys(e.usage).length ? " usage " + JSON.stringify(e.usage) : ""}: ${e.text}`);
  if (r.ledger) {
    L.push("", "## API call ledger for this project");
    for (const c of r.ledger) L.push(`- ${c.at}${c.finishedAt ? " to " + c.finishedAt : ""} ${c.agent || "unattributed"} ${c.provider} ${c.model} [${c.status}] in ${c.inputTokens ?? "?"} out ${c.outputTokens ?? "?"}${c.providerRequestId ? " request " + c.providerRequestId : ""}`);
  }
  return L.join("\n");
}
