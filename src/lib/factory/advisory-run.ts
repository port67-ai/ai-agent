import { meteredModelCall } from "./metering";
import { capabilityRegistry } from "./registry";
import { access, digest, id, operator } from "./engine";
import type { Principal, Project, ResearchRun } from "./model";
import type { Repository } from "./repository";
import { resolveSelection, stageReady, synthesisSlot } from "./ai-routing";
import { generateFormats, generateIdeas, prepareFormats, prepareIdeas } from "./advisory";
import { MAX_IDEAS } from "./ideas";

type Kind = "formats" | "ideas";
const CAP = { formats: "analysis.formats", ideas: "drafting.ideas" } as const;

/** Run one advisory agent (format suggester or ideas drafter). Metered and capped like every managed model call; no retry; nothing is chosen or kept automatically. */
export async function runAdvisory(repo: Repository, a: Principal, projectId: string, kind: Kind): Promise<Project> {
  operator(a);
  if (a.demo) throw new Error("Paid AI drafting is disabled in synthetic demo");
  if (!(await stageReady(repo, "synthesis"))) throw new Error("AI drafting is not configured");
  const selection = await resolveSelection(repo, synthesisSlot(kind));
  const capability = capabilityRegistry.find((c) => c.id === CAP[kind])!;
  const prepare = (p: Project) => (kind === "formats" ? prepareFormats(p) : prepareIdeas(p));
  const reservation = await repo.mutate(a.workspaceId, (state) => {
    const current = state.projects.find((p) => p.id === projectId);
    if (!current) throw new Error("Forbidden: project access");
    access(current, a);
    const context = prepare(current);
    if (current.runs.some((r) => r.status === "running")) throw new Error("A provider task is already running; wait or recover its expired lease");
    if (current.runs.filter((r) => r.stage !== "scope" && r.stage !== "review").length >= Math.max(1, Math.min(50, Number.parseInt(process.env.PORT67_MAX_RESEARCH_RUNS || "12", 10) || 12)))
      throw new Error("Provider invocation cap reached for this project");
    const run: ResearchRun = {
      capabilityId: capability.id, capabilityVersion: capability.version, id: id(), stage: kind, at: new Date().toISOString(), status: "running",
      provider: selection.provider, model: selection.model, leaseExpiresAt: new Date(Date.now() + 120000).toISOString(),
      contextHash: digest(JSON.stringify(current.brief)), contextSnapshot: structuredClone(current.brief), inputHash: context.inputHash, usageStatus: "unknown",
    };
    current.runs.push(run);
    current.revision++;
    return { project: structuredClone(current), run, inputHash: context.inputHash };
  });
  let error = "";
  try {
    const result = await meteredModelCall<Awaited<ReturnType<typeof generateFormats>> | Awaited<ReturnType<typeof generateIdeas>>>(repo, a, reservation.project, reservation.run, () => (kind === "formats" ? generateFormats(reservation.project, selection) : generateIdeas(reservation.project, selection)));
    error = await repo.mutate(a.workspaceId, (state) => {
      const current = state.projects.find((p) => p.id === projectId)!;
      access(current, a);
      const record = current.runs.find((r) => r.id === reservation.run.id)!;
      record.usage = result.usage;
      record.usageStatus = Object.keys(result.usage).length ? "recorded" : "unknown";
      record.providerRequestId = result.providerRequestId;
      let reason = result.error;
      try {
        if (record.status !== "running") throw new Error("Provider task was recovered or cancelled; no late output accepted");
        if (record.contextHash !== digest(JSON.stringify(current.brief))) throw new Error("Brief changed during drafting; no stale output accepted");
        if (prepare(current).inputHash !== reservation.inputHash) throw new Error("Project data changed during drafting; no stale output accepted");
        if (reason || !result.value) throw new Error(reason || "AI output rejected");
        const at = new Date().toISOString();
        if (kind === "formats") {
          current.formats = { ...(current.formats || { selected: [] }), suggested: result.value as { id: string; score: number; reason: string }[], suggestedAt: at, suggestedBy: "ai" };
        } else {
          const keep = (current.ideas || []).filter((i) => i.status !== "proposed");
          const base = keep.length;
          const fresh = (result.value as ReturnType<typeof Object>[]).slice(0, Math.max(0, MAX_IDEAS)).map((v, n) => ({ ...(v as object), id: id(), rank: base + n + 1, status: "proposed" as const, priority: "medium" as const, by: "ai" as const, createdAt: at }));
          current.ideas = [...keep, ...fresh] as Project["ideas"];
        }
        record.status = "completed";
        current.audit.push({ id: id(), at, actor: a.subject, role: a.role, action: "ai_draft_created", detail: `${record.id}: ${kind}; a producer decides` });
        current.revision++;
        return "";
      } catch (e) {
        reason = e instanceof Error ? e.message : "AI output rejected";
        record.status = "failed";
        record.error = reason;
        current.revision++;
        current.audit.push({ id: id(), at: new Date().toISOString(), actor: a.subject, role: a.role, action: "ai_draft_rejected", detail: record.id });
        return reason;
      }
    });
  } catch (e) {
    await repo.mutate(a.workspaceId, (state) => {
      const p = state.projects.find((x) => x.id === projectId)!;
      const run = p.runs.find((r) => r.id === reservation.run.id)!;
      run.status = "failed";
      run.usageStatus = run.usage ? "recorded" : "unknown";
      run.error = e instanceof Error ? e.message : "AI drafting failed";
      p.revision++;
    });
    throw e;
  }
  if (error) throw new Error(error);
  const project = (await repo.read(a.workspaceId)).projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project unavailable");
  return project;
}
