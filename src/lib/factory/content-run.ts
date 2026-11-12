import { meteredModelCall } from "./metering";
import { capabilityRegistry } from "./registry";
import { access, digest, id, operator } from "./engine";
import type { Principal, Project, ResearchRun } from "./model";
import type { Repository } from "./repository";
import { resolveSelection, stageReady, synthesisSlot } from "./ai-routing";
import { generateContent, prepareContent, renderCopyPack } from "./content";

/** Draft the AI copy pack for the approved direction. Metered and capped like every managed model call; no retry. */
export async function runContent(repo: Repository, a: Principal, projectId: string): Promise<Project> {
  operator(a);
  if (a.demo) throw new Error("Paid AI drafting is disabled in synthetic demo");
  if (!(await stageReady(repo, "synthesis"))) throw new Error("AI drafting is not configured");
  const selection = await resolveSelection(repo, synthesisSlot("content"));
  const capability = capabilityRegistry.find((c) => c.id === "drafting.content")!;
  const reservation = await repo.mutate(a.workspaceId, (state) => {
    const current = state.projects.find((p) => p.id === projectId);
    if (!current) throw new Error("Forbidden: project access");
    access(current, a);
    const context = prepareContent(current);
    if (!current.assets.some((x) => x.kind === "copy" && x.strategyHash === context.strategy.hash))
      throw new Error("Create the production drafts first so the copy pack has a task to attach to");
    if (current.assets.filter((x) => x.title === "AI copy pack").length >= 10) throw new Error("This project has reached its copy pack limit");
    if (current.runs.some((r) => r.status === "running")) throw new Error("A provider task is already running; wait or recover its expired lease");
    if (current.runs.length >= Math.max(1, Math.min(50, Number.parseInt(process.env.PORT67_MAX_RESEARCH_RUNS || "12", 10) || 12)))
      throw new Error("Provider invocation cap reached for this project");
    const run: ResearchRun = {
      capabilityId: capability.id, capabilityVersion: capability.version, id: id(), stage: "content",
      at: new Date().toISOString(), status: "running", provider: selection.provider, model: selection.model,
      leaseExpiresAt: new Date(Date.now() + 120000).toISOString(), contextHash: digest(JSON.stringify(current.brief)),
      contextSnapshot: structuredClone(current.brief), inputHash: context.inputHash, sourceIds: context.sourceIds, usageStatus: "unknown",
    };
    current.runs.push(run);
    current.revision++;
    return { project: structuredClone(current), run, strategyHash: context.strategy.hash, inputHash: context.inputHash };
  });
  let error = "";
  try {
    const result = await meteredModelCall(repo, a, reservation.project, reservation.run, () => generateContent(reservation.project, selection));
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
        const fresh = prepareContent(current);
        if (fresh.inputHash !== reservation.inputHash) throw new Error("Direction or evidence changed during drafting; no stale output accepted");
        if (reason || !result.value) throw new Error(reason || "AI copy rejected");
        const taskId = current.assets.find((x) => x.kind === "copy" && x.strategyHash === fresh.strategy.hash)!.taskId;
        const content = renderCopyPack(current, fresh.strategy, result.value);
        current.assets.push({
          id: id(), version: current.assets.filter((x) => x.title === "AI copy pack").length + 1, kind: "copy", title: "AI copy pack",
          strategyId: fresh.strategy.id, strategyHash: fresh.strategy.hash, taskId,
          evidenceIds: [...new Set(result.value.flatMap((i) => i.sourceIds))], status: "draft", content, hash: digest(content), createdAt: new Date().toISOString(),
        });
        record.status = "completed";
        current.audit.push({ id: id(), at: new Date().toISOString(), actor: a.subject, role: a.role, action: "ai_draft_created", detail: `${record.id}: content; human review required` });
        current.revision++;
        return "";
      } catch (e) {
        reason = e instanceof Error ? e.message : "AI copy rejected";
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
