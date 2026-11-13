import { meteredModelCall } from "./metering";
import { resolveSelection } from "./ai-routing";
import { access, digest, hasProviderConsent, id } from "./engine";
import { invokeProvider } from "./providers";
import { INSTRUCTIONS, PRODUCER_AGENT, SCHEMA, directionRules, directionView, insightRules, insightsView, itemsOutcome, parseReview, scopeView, sourceBatches, sourceRules, type GateResult, type Item } from "./producer-reviews";
import type { Principal, Project, ResearchRun, ReviewGate, ReviewRecord } from "./model";
import type { Repository } from "./repository";

// Runs one producer reviewer: free rule checks first (a rule rejection is final), then, when a model is chosen and the brief is
// authorised, one bounded call that sees only that reviewer's own view. If the model cannot be used the rules verdict stands and
// the record says why. Reviewers never change the project themselves: the orchestrator applies their verdicts.
const MAX_REVIEW_RUNS = 20;
const MAX_REVIEWS = 60;
const find = (projects: Project[], projectId: string, a: Principal) => {
  const p = projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Forbidden: project access");
  access(p, a);
  return p;
};
type Asked = { result: GateResult; provider: string; model: string; runId: string } | { skipped: string };

async function ask(repo: Repository, a: Principal, projectId: string, gate: ReviewGate, view: unknown, ids: string[]): Promise<Asked> {
  if (a.demo) return { skipped: "Synthetic demo: no paid calls." };
  if (process.env.PORT67_SYNTHESIS_ENABLED !== "true") return { skipped: "AI drafting is not switched on, so only the free checks ran." };
  const before = find((await repo.read(a.workspaceId)).projects, projectId, a);
  if (!hasProviderConsent(before)) return { skipped: "The brief is not authorised for AI providers, so only the free checks ran." };
  let selection;
  try {
    selection = await resolveSelection(repo, `review:${gate}` as never);
  } catch {
    return { skipped: "No model chosen for this reviewer, so only the free checks ran." };
  }
  const run: ResearchRun = {
    id: id(), stage: "review", capabilityId: `review.${gate}`, capabilityVersion: "1.0.0", at: new Date().toISOString(), status: "running",
    provider: selection.provider, model: selection.model, leaseExpiresAt: new Date(Date.now() + 120000).toISOString(),
    contextHash: digest(JSON.stringify(before.brief)), contextSnapshot: structuredClone(before.brief), usageStatus: "unknown",
  };
  const reserved = await repo.mutate(a.workspaceId, (state) => {
    const current = find(state.projects, projectId, a);
    if (current.runs.some((r) => r.status === "running")) return null;
    if (current.runs.filter((r) => r.stage === "review").length >= MAX_REVIEW_RUNS) return "limit" as const;
    current.runs.push(run);
    current.revision++;
    return structuredClone(current);
  });
  if (!reserved) return { skipped: "Another provider task is running, so only the free checks ran." };
  if (reserved === "limit") return { skipped: "The reviewer call limit for this project was reached, so only the free checks ran." };
  let reason = "";
  let usage: Record<string, number> = {};
  let requestId: string | undefined;
  let result: GateResult | undefined;
  try {
    const r = await meteredModelCall(repo, a, reserved, run, () => invokeProvider(selection, { instructions: INSTRUCTIONS[gate], input: JSON.stringify(view), schema: SCHEMA[gate], name: "port67_review_" + gate }));
    usage = r.usage;
    requestId = r.providerRequestId;
    if (r.error) reason = r.error;
    else {
      try {
        result = parseReview(gate, r.text, ids);
      } catch (e) {
        reason = "The reviewer's answer was not usable" + (e instanceof Error ? ": " + e.message.slice(0, 100) : "");
      }
    }
  } catch (e) {
    reason = e instanceof Error ? e.message.slice(0, 200) : "The review call failed";
  }
  await repo.mutate(a.workspaceId, (state) => {
    const rec = find(state.projects, projectId, a).runs.find((r) => r.id === run.id);
    if (!rec) return;
    rec.status = reason ? "failed" : "completed";
    rec.finishedAt = new Date().toISOString();
    rec.usage = usage;
    rec.usageStatus = Object.keys(usage).length ? "recorded" : "unknown";
    if (requestId) rec.providerRequestId = requestId;
    if (reason) rec.error = reason;
  });
  return result ? { result, provider: selection.provider, model: selection.model, runId: run.id } : { skipped: `${reason}; only the free checks ran.`.slice(0, 220) };
}

/** Free checks, then the model on what the free checks did not already decide. Returns the verdict without storing it. */
export async function reviewGate(repo: Repository, a: Principal, projectId: string, gate: ReviewGate): Promise<ReviewRecord> {
  const p = find((await repo.read(a.workspaceId)).projects, projectId, a);
  const base = { id: id(), at: new Date().toISOString(), gate };
  let subject = "";
  let outcome: GateResult;
  let asked: Asked[] = [];
  if (gate === "scope") {
    if (!p.scope) throw new Error("No scope to review");
    subject = "v" + p.scope.version;
    const r = await ask(repo, a, projectId, gate, scopeView(p), []);
    asked = [r];
    outcome = "result" in r ? r.result : { verdict: "pass", summary: "Accepted without a model review.", items: [] };
  } else if (gate === "direction") {
    const d = p.strategies.at(-1);
    if (!d) throw new Error("No direction to review");
    subject = d.hash;
    const rules = directionRules(p);
    if (rules.verdict === "rework") outcome = rules;
    else {
      const r = await ask(repo, a, projectId, gate, directionView(p), []);
      asked = [r];
      outcome = "result" in r ? r.result : rules;
    }
  } else if (gate === "sources") {
    const batches = sourceBatches(p);
    const all = batches.flatMap((b) => b.ids);
    subject = `${all.length} sources`;
    const rules = sourceRules(p, all);
    const final: Item[] = rules.filter((x) => x.verdict === "reject");
    for (const b of batches) {
      const open = new Set(rules.filter((x) => x.verdict === "accept" && b.ids.includes(x.id)).map((x) => x.id));
      if (!open.size) continue;
      const view = b.view as { sources: { id: string }[] };
      const r = await ask(repo, a, projectId, gate, { ...view, sources: view.sources.filter((s) => open.has(s.id)) }, [...open]);
      asked.push(r);
      if ("result" in r) final.push(...r.result.items);
      else final.push(...rules.filter((x) => open.has(x.id)));
    }
    outcome = itemsOutcome(final, all.length, "sources");
  } else {
    const view = insightsView(p);
    subject = view.ids.join(",").slice(0, 120);
    const rules = insightRules(p, view.ids);
    const final: Item[] = rules.filter((x) => x.verdict === "reject");
    const open = new Set(rules.filter((x) => x.verdict === "accept").map((x) => x.id));
    let notes: string | undefined;
    if (open.size) {
      const v = view.view as { insights: { id: string }[] };
      const r = await ask(repo, a, projectId, gate, { ...v, insights: v.insights.filter((i) => open.has(i.id)) }, [...open]);
      asked.push(r);
      if ("result" in r) {
        final.push(...r.result.items);
        notes = r.result.notes;
      } else final.push(...rules.filter((x) => open.has(x.id)));
    }
    outcome = { ...itemsOutcome(final, view.ids.length, "insights"), ...(notes ? { notes } : {}) };
    if (outcome.verdict === "rework" && !outcome.notes) outcome.notes = "Fewer than two insights were supported by their evidence. Write insights that follow directly from the supplied sources.";
  }
  const used = asked.filter((x): x is Extract<Asked, { result: GateResult }> => "result" in x);
  const skipped = asked.filter((x): x is { skipped: string } => "skipped" in x).map((x) => x.skipped)[0];
  const record: ReviewRecord = {
    ...base, by: used.length ? "ai" : "rules", ...(used[0] ? { provider: used[0].provider, model: used[0].model, runId: used[0].runId } : {}),
    subject, verdict: outcome.verdict, summary: outcome.summary.slice(0, 300), ...(outcome.notes ? { notes: outcome.notes.slice(0, 600) } : {}), items: outcome.items.slice(0, 100), ...(skipped ? { skipped } : {}),
  };
  return record;
}

/** Stores a verdict and audits it. Called by the orchestrator once it has applied the verdict. */
export async function saveReview(repo: Repository, a: Principal, projectId: string, record: ReviewRecord) {
  await repo.mutate(a.workspaceId, (state) => {
    const p = find(state.projects, projectId, a);
    p.reviews = [...(p.reviews || []), record].slice(-MAX_REVIEWS);
    p.revision++;
    p.audit.push({ id: id(), at: record.at, actor: PRODUCER_AGENT, role: "operator", action: "producer_review", detail: `${record.gate} ${record.verdict} (${record.by}${record.model ? " " + record.model : ""}): ${record.summary}${record.notes ? " Notes: " + record.notes : ""}`.slice(0, 480) });
  });
}
