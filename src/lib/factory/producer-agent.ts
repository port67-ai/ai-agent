import { access, digest, id, operator, transition } from "./engine";
import { runContent } from "./content-run";
import { runSynthesis } from "./synthesis-run";
import { stageReady } from "./ai-routing";
import { segments, type Principal, type Project } from "./model";
import type { Repository } from "./repository";

// The producer agent: acts as the human producer between the approval steps. It accepts sources, drafts and accepts insights,
// drafts and shares the direction, creates the production drafts and the AI copy pack, and shares the assets for the account
// owner to approve. It never approves for the customer: it stops at "waiting for the customer" at the direction and at the assets.
// It calls no model of its own; the drafting steps use the existing insight, direction and copy pack agents, metered as usual.
//
// Loop protection: a pass does at most MAX_STEPS steps; an AI step that fails ends the pass and is not retried inside it; an
// automatic pass is skipped when nothing changed since the previous pass (same progress fingerprint); a project is limited to
// MAX_PASSES passes; and one pass at a time runs per project.
export const PRODUCER_AGENT = "port67-producer-agent";
export const producerAgentAuto = () => process.env.PORT67_PRODUCER_AGENT === "true";
const MAX_STEPS = 8;
const MAX_PASSES = 30;
const MAX_LOG = 40;

export type StepId = "acceptSources" | "draftInsights" | "acceptInsights" | "draftDirection" | "shareDirection" | "produce" | "draftCopyPack" | "shareAssets";
export const STEP_LABEL: Record<StepId, string> = {
  acceptSources: "Accept supported sources",
  draftInsights: "Draft insights with AI",
  acceptInsights: "Accept draft insights",
  draftDirection: "Draft direction with AI",
  shareDirection: "Share direction with the account owner",
  produce: "Create production drafts",
  draftCopyPack: "Draft AI copy pack",
  shareAssets: "Share assets with the account owner",
};
export type Stop = { kind: "waiting_customer" | "waiting_human" | "blocked" | "done"; reason: string };
export type Plan = { step: StepId } | { stop: Stop };

/** Short digest of everything the agent decides from. Equal fingerprints mean the next pass would decide the same thing. */
export function progressFingerprint(p: Project): string {
  const count = (items: { status?: string }[]) => items.reduce<Record<string, number>>((m, x) => ((m[x.status || "-"] = (m[x.status || "-"] || 0) + 1), m), {});
  const last = p.strategies.at(-1);
  return digest(JSON.stringify({
    runs: p.runs.length,
    running: p.runs.filter((r) => r.status === "running").length,
    sources: count(p.sources),
    insights: count(p.insights),
    strategy: last ? [last.id, last.status, last.hash] : null,
    tasks: p.tasks.length,
    assets: p.assets.map((x) => [x.id, x.status]),
  }));
}
const wait = (kind: Stop["kind"], reason: string): Plan => ({ stop: { kind, reason } });

/** The single next thing a producer would do, or the reason the agent stops. Pure: no calls, no writes. */
export function planNext(p: Project, aiReady: boolean): Plan {
  if (p.runs.some((r) => r.status === "running")) return wait("blocked", "A provider task is still running; the agent continues when it finishes.");
  if (!p.sources.some((s) => s.kind === "public_source")) return wait("waiting_human", "No research sources yet: start research first.");
  for (const seg of segments) {
    const run = p.runs.filter((r) => (r.stage || "research") === "research" && r.segment === seg).at(-1);
    if (!run) return wait("waiting_human", `The ${seg} research has not run yet.`);
    if (run.status !== "completed") return wait("waiting_human", `The ${seg} research ${run.status === "failed" ? "failed: re-run it" : "is not finished"}.`);
  }
  if (p.sources.some((s) => s.kind === "public_source" && s.status === "unreviewed")) return { step: "acceptSources" };
  if (!p.sources.some((s) => s.status === "supported")) return wait("waiting_human", "Every source was rejected, so there is nothing to build insights from.");
  const live = p.insights.filter((i) => (i.status || "reviewed") !== "rejected");
  if (!live.length) return aiReady ? { step: "draftInsights" } : wait("waiting_human", "AI drafting is not configured: draft insights by hand.");
  const supported = (i: Project["insights"][number]) => i.sourceIds.every((e) => p.sources.some((s) => s.id === e && s.status === "supported"));
  if (live.some((i) => (i.status || "reviewed") === "draft" && supported(i))) return { step: "acceptInsights" };
  if (!live.some((i) => (i.status || "reviewed") !== "draft")) return wait("waiting_human", "Draft insights lack accepted sources: review the sources first.");
  const direction = p.strategies.at(-1);
  if (!direction) return aiReady ? { step: "draftDirection" } : wait("waiting_human", "AI drafting is not configured: draft the direction by hand.");
  if (direction.status === "shared") return wait("waiting_customer", "Direction shared: waiting for the account owner to approve it.");
  if (direction.status === "changes_requested") return wait("waiting_human", "The account owner asked for changes to the direction: a producer decides how to rework it.");
  if (direction.status === "draft") {
    const readyToShare = direction.insightIds.length > 0 && !!direction.keyMessages?.length;
    if (!readyToShare) return aiReady ? { step: "draftDirection" } : wait("waiting_human", "The draft direction needs key messages and accepted insights before it can be shared.");
    return { step: "shareDirection" };
  }
  // The direction is approved by the customer from here on.
  const hash = direction.hash;
  if (!p.tasks.some((t) => t.strategyId === direction.id)) return { step: "produce" };
  const mine = p.assets.filter((x) => x.strategyHash === hash);
  if (aiReady && direction.keyMessages?.length && !mine.some((x) => x.title === "AI copy pack") && !p.assets.some((x) => x.title === "AI copy pack" && x.strategyHash === hash)) return { step: "draftCopyPack" };
  if (mine.some((x) => x.status === "draft")) return { step: "shareAssets" };
  if (mine.some((x) => x.status === "shared")) return wait("waiting_customer", "Assets shared: waiting for the account owner to approve the storyboard and outline assets.");
  if (mine.some((x) => x.status === "changes_requested")) return wait("waiting_human", "The account owner asked for changes to an asset: a producer decides how to rework it.");
  if (mine.length && mine.every((x) => x.status === "approved")) return wait("done", "All assets are approved by the account owner. Video render and download are optional, manual steps.");
  return wait("waiting_human", "Nothing for the agent to do.");
}

const running = new Set<string>();
const find = (projects: Project[], projectId: string, a: Principal) => {
  const p = projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Forbidden: project access");
  access(p, a);
  return p;
};
type LogEntry = NonNullable<Project["producerAgent"]>["log"][number];

/**
 * One bounded pass. `auto` passes (started by the system after research, an approval, or a producer click when the switch is on)
 * are skipped when nothing changed. A manual pass (`force`) always looks again, but still obeys the step and pass limits.
 */
export async function runProducerAgent(repo: Repository, a: Principal, projectId: string, opts: { auto?: boolean; force?: boolean; trigger?: string } = {}): Promise<Project> {
  if (a.demo) throw new Error("The producer agent does not run in the synthetic demo");
  if (!opts.auto) operator(a);
  const op: Principal = { ...a, role: "operator", subject: PRODUCER_AGENT, admin: false };
  const key = a.workspaceId + "/" + projectId;
  const read = async () => find((await repo.read(op.workspaceId)).projects, projectId, op);
  if (running.has(key)) return read();
  running.add(key);
  const log: LogEntry[] = [];
  const stamp = (step: string, outcome: LogEntry["outcome"], detail: string) => log.push({ at: new Date().toISOString(), step, outcome, detail: detail.slice(0, 240) });
  let stop: Stop = { kind: "blocked", reason: "" };
  try {
    const first = await read();
    const state = first.producerAgent;
    if ((state?.passes || 0) >= MAX_PASSES) return first;
    if (!opts.force && state?.lastFingerprint === progressFingerprint(first)) return first;
    const aiReady = await stageReady(repo, "synthesis").catch(() => false);
    for (let n = 0; n < MAX_STEPS; n++) {
      const current = await read();
      const plan = planNext(current, aiReady);
      if ("stop" in plan) {
        stop = plan.stop;
        break;
      }
      const label = STEP_LABEL[plan.step];
      try {
        await perform(repo, op, projectId, plan.step);
        stamp(plan.step, "done", label);
      } catch (e) {
        const why = e instanceof Error ? e.message : "failed";
        stamp(plan.step, "failed", `${label}: ${why}`);
        stop = { kind: "blocked", reason: `${label} did not complete: ${why}`.slice(0, 240) };
        break;
      }
      if (n === MAX_STEPS - 1) stop = { kind: "blocked", reason: "Step limit for one pass reached; run the agent again to continue." };
    }
    return await repo.mutate(op.workspaceId, (s) => {
      const p = find(s.projects, projectId, op);
      const prev = p.producerAgent;
      p.producerAgent = { passes: (prev?.passes || 0) + 1, status: stop.kind, reason: stop.reason, at: new Date().toISOString(), lastFingerprint: progressFingerprint(p), log: [...(prev?.log || []), ...log].slice(-MAX_LOG) };
      p.audit.push({ id: id(), at: p.producerAgent.at, actor: PRODUCER_AGENT, role: "operator", action: "producer_agent_pass", detail: `${opts.trigger || (opts.auto ? "automatic" : "manual by " + a.subject)}: ${log.map((l) => l.step + " " + l.outcome).join(", ") || "no step"}; stopped: ${stop.kind}, ${stop.reason}`.slice(0, 480) });
      p.revision++;
      return structuredClone(p);
    });
  } finally {
    running.delete(key);
  }
}

async function perform(repo: Repository, op: Principal, projectId: string, step: StepId) {
  const command = (build: (p: Project) => Record<string, unknown>[]) =>
    repo.mutate(op.workspaceId, (s) => {
      const index = s.projects.findIndex((x) => x.id === projectId);
      if (index < 0) throw new Error("Forbidden: project access");
      let next = s.projects[index];
      for (const c of build(next)) next = transition(next, c, op);
      s.projects[index] = next;
    });
  if (step === "acceptSources") return command(() => [{ type: "reviewAllSources", confirm: true }]);
  if (step === "acceptInsights") return command(() => [{ type: "reviewAllInsights", confirm: true }]);
  if (step === "shareDirection") return command(() => [{ type: "shareStrategy" }]);
  if (step === "produce") return command(() => [{ type: "produce" }]);
  if (step === "shareAssets") return command((p) => { const hash = p.strategies.at(-1)?.hash; return p.assets.filter((x) => x.status === "draft" && x.strategyHash === hash).map((x) => ({ type: "shareAsset", id: x.id })); });
  if (step === "draftInsights") return void (await runSynthesis(repo, op, projectId, "insights"));
  if (step === "draftDirection") return void (await runSynthesis(repo, op, projectId, "strategy"));
  return void (await runContent(repo, op, projectId));
}
