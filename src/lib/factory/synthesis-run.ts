import { meteredModelCall } from "./metering";
import { resolveSelection, stageReady, synthesisSlot } from "./ai-routing";
import { capabilityRegistry } from "./registry";
import {
  access,
  digest,
  id,
  operator,
  strategyHash,
  transition,
} from "./engine";
import type { Principal, Project, ResearchRun } from "./model";
import type { Repository } from "./repository";
import {
  generateSynthesis,
  prepareSynthesis,
  type SynthesisStage,
  type InsightDraft,
  type DirectionDraft,
} from "./synthesis";
export async function runSynthesis(
  repo: Repository,
  a: Principal,
  projectId: string,
  stage: SynthesisStage,
): Promise<Project> {
  operator(a);
  if (a.demo) throw new Error("Paid AI drafting is disabled in synthetic demo");
  if (!(await stageReady(repo, "synthesis"))) throw new Error("AI drafting is not configured");
  const selection = await resolveSelection(repo, synthesisSlot(stage));
  const reservation = await repo.mutate(a.workspaceId, (state) => {
    const current = state.projects.find((p) => p.id === projectId);
    if (!current) throw new Error("Forbidden: project access");
    access(current, a);
    const context = prepareSynthesis(current, stage);
    if (current.runs.some((r) => r.status === "running"))
      throw new Error(
        "A provider task is already running; wait or recover its expired lease",
      );
    if (
      current.runs.length >=
      Math.max(
        1,
        Math.min(
          50,
          Number.parseInt(process.env.PORT67_MAX_RESEARCH_RUNS || "12", 10) ||
            12,
        ),
      )
    )
      throw new Error("Provider invocation cap reached for this project");
    const capability = capabilityRegistry.find(
      (c) =>
        c.id ===
        (stage === "insights" ? "analysis.insights" : "drafting.direction"),
    )!;
    const run: ResearchRun = {
      capabilityId: capability.id,
      capabilityVersion: capability.version,
      id: id(),
      stage,
      at: new Date().toISOString(),
      status: "running",
      provider: selection.provider,
      model: selection.model,
      leaseExpiresAt: new Date(Date.now() + 120000).toISOString(),
      contextHash: digest(JSON.stringify(current.brief)),
      contextSnapshot: structuredClone(current.brief),
      inputHash: context.inputHash,
      sourceIds: context.sourceIds,
      usageStatus: "unknown",
    };
    current.runs.push(run);
    current.revision++;
    return { project: structuredClone(current), run };
  });
  let error = "";
  try {
    const result = await meteredModelCall(repo,a,reservation.project,reservation.run,()=>generateSynthesis(reservation.project, stage, selection));
    error = await repo.mutate(a.workspaceId, (state) => {
      const index = state.projects.findIndex((p) => p.id === projectId);
      const current = state.projects[index];
      access(current, a);
      const record = current.runs.find((r) => r.id === reservation.run.id)!;
      record.usage = result.usage;
      record.usageStatus = Object.keys(result.usage).length
        ? "recorded"
        : "unknown";
      record.providerRequestId = result.providerRequestId;
      let reason = result.error;
      try {
        if (record.status !== "running")
          throw new Error(
            "Provider task was recovered or cancelled; no late output accepted",
          );
        if (
          prepareSynthesis(current, stage).inputHash !==
          reservation.run.inputHash
        )
          throw new Error(
            "Research context changed during AI drafting; no stale output accepted",
          );
        if (reason || !result.value)
          throw new Error(reason || "No valid AI draft returned");
        let next = structuredClone(current);
        if (stage === "insights") {
          const insights = result.value as InsightDraft[];
          if (next.insights.length + insights.length > 80)
            throw new Error(
              "Insight limit reached; output rejected but usage retained",
            );
          for (const insight of insights) {
            next = transition(next, { type: "addInsight", ...insight }, a);
            const saved = next.insights.at(-1)!;
            saved.status = "draft";
            saved.generatedByRunId = record.id;
          }
        } else {
          const proposed = result.value as DirectionDraft;
          next = transition(next, { type: "draftStrategy", ...proposed }, a);
          const saved = next.strategies.at(-1)!;
          saved.evidenceIds = proposed.evidenceIds;
          saved.insightIds = proposed.insightIds;
          saved.generatedByRunId = record.id;
          saved.hash = strategyHash(saved);
        }
        next.runs.find((r) => r.id === record.id)!.status = "completed";
        next.audit.push({
          id: id(),
          at: new Date().toISOString(),
          actor: a.subject,
          role: a.role,
          action: "ai_draft_created",
          detail: `${record.id}: ${stage}; human review required`,
        });
        state.projects[index] = next;
        return "";
      } catch (e) {
        reason = e instanceof Error ? e.message : "AI draft rejected";
        record.status = "failed";
        record.error = reason;
        current.revision++;
        current.audit.push({
          id: id(),
          at: new Date().toISOString(),
          actor: a.subject,
          role: a.role,
          action: "ai_draft_rejected",
          detail: record.id,
        });
        return reason;
      }
    });
  } catch (e) {
    await repo.mutate(a.workspaceId, (state) => {
      const p = state.projects.find((p) => p.id === projectId)!;
      const run = p.runs.find((r) => r.id === reservation.run.id)!;
      run.status = "failed";
      run.usageStatus = run.usage ? "recorded" : "unknown";
      run.error = e instanceof Error ? e.message : "AI drafting failed";
      p.revision++;
    });
    throw e;
  }
  if (error) throw new Error(error);
  const project = (await repo.read(a.workspaceId)).projects.find(
    (p) => p.id === projectId,
  );
  if (!project) throw new Error("Project unavailable");
  return project;
}
