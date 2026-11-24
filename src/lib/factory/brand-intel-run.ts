import { randomUUID } from "node:crypto";
import type { BrandIntelVersion, CustomerAccount, Database } from "./model";
import type { Repository } from "./repository";
import { finishApiCall, reserveApiCall } from "./costs";
import { invokeProvider, type ProviderResult, type ProviderSelection } from "./providers";
import { resolveSelection } from "./ai-routing";
import type { SlotId } from "./ai-slots";
import { GROUPS, MAX_VERSIONS, REQUIRED, dossierText, STRATEGIC_INSTRUCTIONS, buildIntake, citationsOf, currentVersion, groupInput, groupInstructions, isStale, splitSections } from "./brand-intel";
import { findCustomer } from "./customers-commands";
import { CUSTOMERS_WORKSPACE } from "./customers";

// Runs the Brand Intelligence agent for one customer account (CHG-0108): four grounded research calls, then one short call for section 0.
// Every call is reserved and finished on the admin cost ledger. A run is stored as a version; the latest completed one is the foundation.
export const brandIntelWorkspace = (customerId: string) => `factory-brandintel-${customerId}`;
export const versionsOf = (db: Database): BrandIntelVersion[] => (db.brandIntel ||= []);

export type Deps = {
  invoke: (s: ProviderSelection, r: Parameters<typeof invokeProvider>[1]) => Promise<ProviderResult>;
  resolve: (slot: SlotId) => Promise<ProviderSelection>;
  enabled: () => boolean;
  today: () => string;
};
export const realDeps = (repo: Repository): Deps => ({
  invoke: invokeProvider,
  resolve: (slot) => resolveSelection(repo, slot),
  enabled: () => process.env.PORT67_RESEARCH_ENABLED === "true",
  today: () => new Date().toISOString().slice(0, 10),
});

/** Check the account and the AI settings, then record a running version. Throws a readable message if the run cannot start. */
export async function startBrandIntel(repo: Repository, customerId: string, actor: string, deps: Deps): Promise<{ versionId: string; customer: CustomerAccount; research: ProviderSelection; synthesis: ProviderSelection }> {
  const customer = findCustomer(await repo.read(CUSTOMERS_WORKSPACE), customerId);
  if (!deps.enabled()) throw new Error("Live research is not configured. Turn on PORT67_RESEARCH_ENABLED and set the AI keys in Render.");
  const research = await deps.resolve("research:brand-intel");
  const synthesis = await deps.resolve("synthesis:brand-intel");
  const intake = buildIntake(customer);
  const versionId = "bi_" + randomUUID().replace(/-/g, "");
  await repo.mutate(brandIntelWorkspace(customerId), (db) => {
    const list = versionsOf(db);
    if (list.some((v) => v.status === "running" && !isStale(v))) throw new Error("Brand Intelligence is already running for this customer account");
    const version = Math.max(0, ...list.map((v) => v.version)) + 1;
    list.push({ id: versionId, customerId, version, status: "running", startedAt: new Date().toISOString(), startedBy: actor, sections: {}, redLines: intake.redLines, intake: intake.snapshot, sources: [], searchQueries: [], warnings: [], provider: research.provider, model: research.model, calls: 0 });
    // Keep the newest versions, and always the current foundation.
    const keep = new Set(list.slice().sort((a, b) => b.version - a.version).slice(0, MAX_VERSIONS).map((v) => v.id));
    const cur = currentVersion(list);
    if (cur) keep.add(cur.id);
    db.brandIntel = list.filter((v) => keep.has(v.id));
    return null;
  });
  return { versionId, customer, research, synthesis };
}

async function call(repo: Repository, customerId: string, versionId: string, actor: string, slot: SlotId, sel: ProviderSelection, stage: "research" | "synthesis", deps: Deps, request: Parameters<typeof invokeProvider>[1]): Promise<ProviderResult> {
  const callId = await reserveApiCall(repo, { accountId: customerId, workspaceId: brandIntelWorkspace(customerId), projectId: customerId, runId: versionId, stage, agent: slot, provider: sel.provider, model: sel.model, actor });
  let result: ProviderResult;
  try { result = await deps.invoke(sel, request); } catch (e) { await finishApiCall(repo, callId, { status: "unknown" }); throw e; }
  await finishApiCall(repo, callId, { status: result.error ? "failed" : "completed", usage: result.usage as never, rawUsage: result.rawUsage && typeof result.rawUsage === "object" && !Array.isArray(result.rawUsage) ? (result.rawUsage as Record<string, unknown>) : undefined, providerRequestId: result.providerRequestId });
  return result;
}
const patch = (repo: Repository, customerId: string, versionId: string, fn: (v: BrandIntelVersion) => void) =>
  repo.mutate(brandIntelWorkspace(customerId), (db) => { const v = versionsOf(db).find((x) => x.id === versionId); if (v) fn(v); return null; });

/** Run to the end and record the outcome. Never throws: a failure is stored on the version. */
export async function executeBrandIntel(repo: Repository, ctx: Awaited<ReturnType<typeof startBrandIntel>>, actor: string, deps: Deps): Promise<void> {
  const { versionId, customer, research, synthesis } = ctx;
  const cid = customer.id;
  const intake = buildIntake(customer);
  const finish = (error?: string) => patch(repo, cid, versionId, (v) => {
    const missing = REQUIRED.filter((id) => !v.sections[id]);
    v.finishedAt = new Date().toISOString();
    if (error || missing.length) { v.status = "failed"; v.error = error || `Incomplete dossier: sections ${missing.join(", ")} missing`; } else v.status = "completed";
  });
  try {
    for (const g of GROUPS) {
      const result = await call(repo, cid, versionId, actor, "research:brand-intel", research, "research", deps, { research: true, instructions: groupInstructions(g), input: groupInput(intake, deps.today()), maxOutputTokens: 7000, timeoutMs: 240_000 });
      if (result.error) throw new Error(result.error);
      const parsed = splitSections(result.text, g.sections);
      const cites = citationsOf(result.data);
      await patch(repo, cid, versionId, (v) => {
        Object.assign(v.sections, parsed.sections);
        v.warnings.push(...parsed.warnings);
        v.calls += 1;
        const seen = new Set(v.sources.map((s) => s.url));
        for (const s of cites.sources) if (!seen.has(s.url) && v.sources.length < 150) v.sources.push(s);
        v.searchQueries.push(...cites.queries.filter((q) => !v.searchQueries.includes(q)).slice(0, 60 - v.searchQueries.length));
      });
    }
    const draft = await repo.read(brandIntelWorkspace(cid));
    const so = versionsOf(draft).find((v) => v.id === versionId)!;
    const body = REQUIRED.map((id) => `### Section ${id}\n${so.sections[id] || "(missing)"}`).join("\n\n");
    const s0 = await call(repo, cid, versionId, actor, "synthesis:brand-intel", synthesis, "synthesis", deps, { instructions: STRATEGIC_INSTRUCTIONS, input: `Client Intake Data\n${intake.text}\n\nDossier sections\n${body}`, maxOutputTokens: 1500, timeoutMs: 90_000 });
    await patch(repo, cid, versionId, (v) => {
      v.calls += 1;
      const parsed = s0.error ? { sections: {}, warnings: ["Section 0 could not be written: " + s0.error] } : splitSections(s0.text, ["0"]);
      Object.assign(v.sections, parsed.sections);
      v.warnings.push(...parsed.warnings);
    });
    await finish();
  } catch (e) {
    await finish((e as Error).message.slice(0, 300)).catch(() => undefined);
  }
}

/** For later agents: the current Brand Intelligence foundation for a customer account, or undefined if none has completed. */
export async function brandFoundation(repo: Repository, customerId: string): Promise<{ version: BrandIntelVersion; text: string } | undefined> {
  const v = currentVersion(versionsOf(await repo.read(brandIntelWorkspace(customerId))));
  return v ? { version: v, text: dossierText(v) } : undefined;
}
