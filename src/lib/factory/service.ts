import { performanceHistory } from "./performance";
import { runResearchPlanning, runMediumSelection } from "./planning-run";
import { researchTaskKey } from "./planning-context";
import { selectedResearch, taskResearchCurrent, syncTaskPlan, requirePlannedTask } from "./task-plan";
import { youtubeVideoUrl } from "./public-video";
import { researchContextHash } from "./research-catalog";
import { allSegmentEvidence } from "./evidence";
import { costSeries, type SeriesRange } from "./cost-series";
import { approvalOverview, loadApprovalMode, saveApprovalMode } from "./approval-mode";
import { meteredModelCall } from "./metering";
import { registerAccount, listAccounts, canCreateProject } from "./accounts";
import { addTeamMember, listTeam, removeTeamMember, withTeamRole } from "./team";
import { verifyFactoryIdentity, revalidateIdentitySession, type FactoryTokenVerifier, type FactoryUserLookup } from "./identity";
import { adminCostReport, reconcileApiCall, archiveApiCalls, exportApiCalls, saveBudgetSettings, repriceUnknownCalls, setCostBaseline } from "./costs";
import { safeProviderConfiguration } from "./providers";
import { runContent } from "./content-run";
import { promptPack } from "./advert";
import { runAdvisory } from "./advisory-run";
import { saveSkill, skillsOverview } from "./skills";
import { writeSkill, writerConfig } from "./skill-writer";
import { agentsOverview } from "./ai-agents";
import { copySetApproved } from "./copy-set";
import { renderVideo, SCENE_SECONDS } from "./video";
import { getVideo, putVideo, videoKey } from "./video-store";
import { keyConfigured, moveProviderSlots, resolveSelection, researchSlot, routingOverview, saveRouting, stageReady, suggestPublicPrices, suggestSetup } from "./ai-routing";
import { rerunAgent, rerunFailedAgents, type RerunDeps } from "./agent-rerun";
import { failedAgents } from "./failed-agents";
import { runSynthesis } from "./synthesis-run";
import { planNext, producerAgentAuto, registerResearchRunner, evidenceWarnings, reviewScopeBeforeResearch, runProducerAgent, STEP_LABEL } from "./producer-agent";
import { synthesisReady } from "./synthesis";
import { configurationStatus } from "./config";
import { randomBytes } from "node:crypto";
import {
  cookieName,
  demoEnabled,
  liveReady,
  readSession,
  sameOrigin,
  secureEqual,
  sessionKey,
  signSession,
} from "./auth";
import {
  access,
  createProject,
  createStudioProject,
  requireStudioIntakeApproved,
  requireStudioStrategyOpen,
  refuseStudioClassicProduction,
  digest,
  id,
  operator,
  projectView,
  text,
  transition,
  requireProviderConsent,
  hasProviderConsent,
  scopeHash,
} from "./engine";
import { demoRepository, repository, type Repository } from "./repository";
import { researchReady, researchSegment } from "./research";
import { autoApproveProducer, AUTO_APPROVER } from "./auto-approve";
import { prepareResearchPlan, researchDossier, renderDossierMarkdown } from "./research-plan";
import { ensureScope, saveScope, scopeCurrent, scopingEnabled } from "./scope-run";
import { templateScope } from "./scope";
import { buildDiagnostics } from "./diagnostics";
import {
  segments,
  type Principal,
  type Project,
  type ResearchRun,
  type Segment,
  type Video,
} from "./model";
import { maxProjectRuns } from "./run-cap";
import { STUDIO_UPLOAD_RULES, attachBriefAsset, findPiece, isStudioSlot, requireIntakeEditable, requirePieceEditable, sniffMime, studioAssetRefs } from "./studio";
import { applyPieceUpload, applyStudioRerunResult, requireStudio } from "./studio-commands";
import { StudioRerunError, studioRerunHandler } from "./studio-rerun";
// Importing the pre-production module registers its rerun generators for every piece kind it creates (piece B).
import { draftPreproduction, generateStudioImage } from "./studio-preproduction";
import { getStudioFile, putStudioFile, studioKey, studioKeyAccount } from "./studio-store";
import { mediaInfo } from "./studio-media";
import { generateStudioStill, startNextCycle } from "./studio-production-run";
import { studioDeliveryDocument } from "./studio-delivery";
import type { StudioAssetRef, StudioBrief } from "./model";
import { handleCustomers, isCustomerRoute, isCustomerUpload } from "./customers-api";
import { handleCommissions, isCommissionRoute } from "./commissions-api";
import { handleBrandIntel, isBrandIntelRoute } from "./brand-intel-api";
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
const attempts = new Map<string, { at: number; count: number }>();
function rate(key: string, max = 80) {
  const time = Date.now();
  for (const [k, v] of attempts) if (time - v.at > 600000) attempts.delete(k);
  const state = attempts.get(key);
  if (state && time - state.at < 600000) {
    if (++state.count > max)
      throw new Error("Too many requests; try again later");
  } else attempts.set(key, { at: time, count: 1 });
}
function cookie(request: Request, name = cookieName) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(name + "="))
      ?.slice(name.length + 1) || ""
  );
}
function login(request: Request, principal: Principal) {
  const response = json({ ok: true, principal });
  response.headers.set(
    "set-cookie",
    `${cookieName}=${signSession(principal, sessionKey())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${(process.env.PORT67_PUBLIC_ORIGIN ? new URL(process.env.PORT67_PUBLIC_ORIGIN).protocol : new URL(request.url).protocol) === "https:" ? "; Secure" : ""}`,
  );
  return response;
}
function repo(a: Principal): Repository {
  return a.demo ? demoRepository : repository;
}
async function principal(request: Request, lookup?: FactoryUserLookup): Promise<Principal | null> {
  const p = readSession(cookie(request), sessionKey());
  if (!p) return null;
  if (p.demo) return demoEnabled() ? p : null;
  if (!liveReady()) return null;
  if (p.identity === "firebase") {
    try {
      const identity = await withTeamRole(repository, await revalidateIdentitySession(p.subject, p.issuedAt || 0, lookup));
      if (identity.role === "customer" && p.workspaceId !== identity.accountId) return null;
      if (identity.role === "operator" && p.workspaceId !== identity.accountId) {
        const accounts=await listAccounts(repository, {...p, role:"operator"});
        if (!accounts.some(x=>x.id===p.workspaceId)) return null;
      }
      return {...p, role:identity.role, admin:identity.admin, accountId:p.workspaceId};
    } catch { return null; }
  }
  if (p.role === "customer") {
    const db = await repository.read(p.workspaceId);
    const tokenHash = p.subject;
    if (
      !db.invitations.some(
        (i) =>
          i.hash === tokenHash &&
          i.projectId === p.projectId &&
          !i.revoked &&
          i.expires > Date.now(),
      )
    )
      return null;
  }
  return p;
}
function find(projects: Project[], projectId: string, a: Principal) {
  const p = projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Forbidden: project access");
  access(p, a);
  return p;
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("JSON body required");
  const reader = request.body?.getReader();
  if (!reader) return {};
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 64000) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    parts.push(value);
  }
  const parsed = JSON.parse(Buffer.concat(parts).toString());
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid request");
  return parsed as Record<string, unknown>;
}
/** Read a raw upload body, refusing it as soon as it passes the slot's size limit. */
async function rawBody(request: Request, max: number, label: string): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) throw new Error("File too large. " + label);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      throw new Error("File too large. " + label);
    }
    parts.push(value);
  }
  // A body shorter than its declared length was cut off on the way in (for example by a proxy limit): never store part of a file.
  if (declared && bytes !== declared) throw new Error("The upload was cut short; try again");
  return Buffer.concat(parts);
}
/** The Brand Kit is kept per customer account in its own small record and copied into each new studio project's intake. */
const brandKitNamespace = (accountId: string) => "factory-brandkit-" + accountId;
async function readBrandKit(a: Principal): Promise<StudioBrief["brandKit"] | undefined> {
  if (a.demo) return undefined;
  try { return (await repository.read(brandKitNamespace(a.accountId || a.workspaceId))).brandKit?.kit; } catch { return undefined; }
}
async function saveBrandKit(a: Principal, p: Project) {
  if (a.demo || !p.studio) return;
  const kit = structuredClone(p.studio.brief.brandKit);
  await repository.mutate(brandKitNamespace(p.accountId || p.workspaceId), (db) => {
    db.brandKit = { kit, savedAt: new Date().toISOString(), savedBy: a.subject, projectId: p.id };
  });
}
/** Run a recorded studio rerun when piece B has registered a generator for the piece's kind. Without one the request stays pending. */
async function runStudioRerun(a: Principal, projectId: string) {
  const current = find((await repo(a).read(a.workspaceId)).projects, projectId, a);
  const request = current.studio?.rerunRequests?.filter((r) => r.status === "pending").at(-1);
  const piece = request && current.studio!.pieces.find((x) => x.id === request.pieceId);
  const handler = piece && studioRerunHandler(piece.kind);
  if (!request || !piece || !handler) return;
  requireProviderConsent(current);
  await repo(a).mutate(a.workspaceId, (state) => {
    const live = find(state.projects, projectId, a).studio?.rerunRequests?.find((r) => r.id === request.id);
    if (!live || live.status !== "pending") throw new Error("Rerun request is no longer waiting");
    live.status = "running";
  });
  let result: Parameters<typeof applyStudioRerunResult>[2];
  let run: ResearchRun | undefined;
  try { const out = await handler({ project: current, piece, request, principal: a, repo: repo(a) }); run = out.run; result = { text: out.text, image: out.image, runId: out.runId }; }
  catch (error) { run = error instanceof StudioRerunError ? error.run : undefined; result = { error: error instanceof Error ? error.message : "Rerun failed" }; }
  await repo(a).mutate(a.workspaceId, (state) => {
    const live = find(state.projects, projectId, a);
    // Piece C: the rerun's paid call is kept as a project run (with its usage or error) so it shows in project diagnostics.
    if (run && !live.runs.some((r) => r.id === run!.id)) live.runs.push(run);
    // If the output can no longer be stored (for example the stage was approved meanwhile), the request is closed as failed.
    try { applyStudioRerunResult(live, request.id, result, a); }
    catch (error) { applyStudioRerunResult(live, request.id, { error: error instanceof Error ? error.message : "Rerun result could not be stored" }, a); }
    live.revision++;
    live.updatedAt = new Date().toISOString();
  });
}
async function seed(a: Principal) {
  return demoRepository.mutate(a.workspaceId, (db) => {
    let p = createProject(
      {
        business: "Fieldwork",
        description:
          "Fictional independent outdoor essentials brand. A synthetic demonstration; no live market research.",
        objective: "Make room for everyday adventure",
        contact: "demo@example.com",
        website: "https://example.com",
        audience: "B2C · people seeking a simpler outdoor routine",
        brandColor: "#ec663c",
        competitors: "Synthetic competitor examples only",
        inspiration:
          "Warm editorial photography and clear product storytelling",
      },
      a,
    );
    const fixtures: [Segment, string, string][] = [
      [
        "brand",
        "A brand built for everyday adventure",
        "Synthetic brief: keep the brand voice practical, warm and unhurried.",
      ],
      [
        "customer",
        "Less preparation. More getting outside.",
        "Synthetic interview theme: people want outdoor experiences to feel approachable, rather than performance-led.",
      ],
      [
        "competitor",
        "A crowded world of extreme claims",
        "Synthetic competitive hypothesis: explore an everyday-use angle instead of unsupported superiority claims.",
      ],
      [
        "creative",
        "Quiet confidence, clear movement",
        "Synthetic creative reference: simple layouts, warm colour and short, readable motion sequences.",
      ],
    ];
    for (const [segment, title, excerpt] of fixtures) {
      p = transition(
        p,
        { type: "addSource", segment, title, excerpt, kind: "synthetic" },
        a,
      );
      p = transition(
        p,
        { type: "reviewSource", id: p.sources.at(-1)!.id, status: "supported" },
        a,
      );
    }
    p = transition(
      p,
      {
        type: "addInsight",
        title: "Make everyday adventure feel approachable",
        interpretation:
          "Synthetic hypothesis: lead with everyday use and a calm, inviting visual language rather than unverified performance claims.",
        sourceIds: p.sources.map((s) => s.id),
        confidence: "limited",
      },
      a,
    );
    db.projects.push(p);
    return p;
  });
}
async function runResearchSegment(a: Principal, projectId: string, segment: Segment, guidance?: string, videoUrl?: string) {
  let initial = find((await repo(a).read(a.workspaceId)).projects, projectId, a);
  requireStudioIntakeApproved(initial);
  requireStudioStrategyOpen(initial);
  requireProviderConsent(initial);
  if (initial.researchPlanning?.enabled) { await runResearchPlanning(repo(a), a, projectId); initial = find((await repo(a).read(a.workspaceId)).projects, projectId, a); }
  if (!selectedResearch(initial).includes(segment)) throw new Error("This research agent is excluded from the project task plan; revise the plan first");
  requireProviderConsent(initial);
  // Classify the business once per brief so each researcher gets a narrow, business-specific ask. Never blocks research.
  await ensureScope(repo(a), a, projectId);
  if (producerAgentAuto()) await reviewScopeBeforeResearch(repo(a), a, projectId);
  const p = find((await repo(a).read(a.workspaceId)).projects, projectId, a);
    const selection = await resolveSelection(repo(a), researchSlot(segment));
    if (videoUrl) { youtubeVideoUrl(videoUrl); if (selection.provider !== "gemini") throw new Error("Direct video viewing requires Gemini"); }
    const run: ResearchRun = {
      id: id(),
      stage: "research",
      at: new Date().toISOString(),
      status: "running",
      segment,
      provider: selection.provider,
      model: selection.model,
      leaseExpiresAt: new Date(Date.now() + 120000).toISOString(),
      contextHash: digest(researchContextHash(p)),
      ...(p.taskPlan ? { taskInputKey: p.taskPlan.researchKey, researchTaskKey: researchTaskKey(p, segment) } : {}),
      capabilityId: `research.${segment}`, capabilityVersion: "2.0.0", inputHash: digest(researchContextHash(p)),
      contextSnapshot: structuredClone(p.brief),
      contextBundle: JSON.parse(researchContextHash(p)),
      usageStatus: "unknown",
    };
    await repo(a).mutate(a.workspaceId, (state) => {
      const current = find(state.projects, projectId, a);
      requireProviderConsent(current);
      requirePlannedTask(current, "research:" + segment);
      if (!selectedResearch(current).includes(segment) || !taskResearchCurrent(current, run)) throw new Error("Research task plan changed; refresh before execution");
      if (digest(researchContextHash(current)) !== run.contextHash)
        throw new Error(
          "Brief changed before research reservation; refresh and authorise the current context",
        );
      if (
        current.runs.filter((r) => r.stage !== "scope" && r.stage !== "review").length >=
        maxProjectRuns()
      )
        throw new Error("Research invocation cap reached for this project");
      if (current.runs.some((r) => r.status === "running"))
        throw new Error(
          "Research already running; wait before starting another task",
        );
      current.runs.push(run);
    });
    let acceptedError = "";
    try {
      const result = await meteredModelCall(repo(a),a,p,run,()=>researchSegment(p, segment, selection, guidance, videoUrl));
      acceptedError = await repo(a).mutate(a.workspaceId, (state) => {
        const current = find(state.projects, projectId, a);
        const record = current.runs.find((r) => r.id === run.id)!;
        // Meter the returned response before considering whether its findings can be accepted.
        record.usage = result.usage;
        record.usageStatus = Object.keys(result.usage).length
          ? "recorded"
          : "unknown";
        record.providerRequestId = result.providerRequestId;
        const contextError =
          record.status !== "running"
            ? "Research task was recovered or cancelled; no late findings accepted"
            : !taskResearchCurrent(current, record) || !hasProviderConsent(current) ||
                record.contextHash !== digest(researchContextHash(current))
              ? "Research context or authorisation changed; no stale findings accepted"
              : "";
        const error =
          contextError ||
          result.error ||
          (current.sources.length + result.sources.length > 150
            ? "Source limit reached; findings rejected but provider usage retained"
            : "");
        record.status = error ? "failed" : "completed";
        record.finishedAt = new Date().toISOString();
        if (error) {
          record.error = error;
          if (result.note) record.note = result.note;
        } else if (result.gaps?.length) record.gaps = result.gaps;
        if (!error)
          current.sources.push(
            ...result.sources.map((source) => ({
              ...source,
              researchRunId: run.id,
              contextHash: run.contextHash,
            })),
          );
        current.revision++;
        current.updatedAt = new Date().toISOString();
        current.audit.push({
          id: id(),
          at: new Date().toISOString(),
          actor: a.subject,
          role: a.role,
          action: error ? "research_rejected" : "research_completed",
          detail: `${run.id}: ${segment}; usage ${record.usageStatus}; billed cost unreconciled`,
        });
        return error;
      });
    } catch (error) {
      await repo(a).mutate(a.workspaceId, (state) => {
        const record = find(state.projects, projectId, a).runs.find(
          (r) => r.id === run.id,
        )!;
        record.status = "failed";
        record.usageStatus = record.usage ? "recorded" : "unknown";
        record.error =
          error instanceof Error ? error.message : "Research failed";
      });
      throw error;
    }
    if (acceptedError) throw new Error(acceptedError);
}

/** Test mode: authorise public data and run the four research agents for a customer's request, in the background. */
const autoRunning = new Set<string>();
async function noteAutoFailure(r: Repository, op: Principal, projectId: string, detail: string) {
  await r.mutate(op.workspaceId, (state) => {
    const current = state.projects.find((x) => x.id === projectId);
    if (current) current.audit.push({ id: id(), at: new Date().toISOString(), actor: AUTO_APPROVER, role: "operator", action: "producer_step_auto_failed", detail });
  });
}
/** Starts an automatic producer agent pass in the background when PORT67_PRODUCER_AGENT=true. Never throws and never blocks the response. */
function kickProducerAgent(a: Principal, projectId: string, trigger: string) {
  if (!producerAgentAuto() || a.demo) return;
  void runProducerAgent(repo(a), a, projectId, { auto: true, trigger: "automatic after " + trigger }).catch(() => undefined);
}
registerResearchRunner(async (op, projectId, segment, guidance) => { await runResearchSegment(op, projectId, segment, guidance); });
async function autoStartResearch(a: Principal, projectId: string) {
  const key = a.workspaceId + "/" + projectId;
  if (autoRunning.has(key)) return;
  autoRunning.add(key);
  try {
    const op: Principal = { ...a, role: "operator", subject: AUTO_APPROVER, admin: false };
    const r = repo(op);
    const before = find((await r.read(op.workspaceId)).projects, projectId, op);
    if (!before.researchRequest || before.runs.some((x) => (x.stage || "research") === "research" && taskResearchCurrent(before, x))) return;
    // After a failed attempt wait two minutes so a polling page does not retry on every refresh.
    const lastFail = [...before.audit].reverse().find((x) => x.action === "producer_step_auto_failed");
    if (lastFail && Date.parse(lastFail.at) + 120000 > Date.now()) return;
    if (!(await stageReady(r, "research"))) {
      await noteAutoFailure(r, op, projectId, "research is not ready: choose a model for the research agents on the AI agents page, set a provider key in Render and set PORT67_RESEARCH_ENABLED=true.");
      return;
    }
    await r.mutate(op.workspaceId, (state) => {
      const index = state.projects.findIndex((x) => x.id === projectId);
      if (index < 0) return;
      const next = transition(state.projects[index], { type: "authoriseAI", confirm: true }, op);
      next.audit.push({ id: id(), at: new Date().toISOString(), actor: AUTO_APPROVER, role: "operator", action: "producer_step_auto_approved", detail: "Public-data authorisation and research start approved automatically (test mode)" });
      state.projects[index] = next;
    });
    if (before.researchPlanning?.enabled) await runResearchPlanning(r, op, projectId);
    const planned = find((await r.read(op.workspaceId)).projects, projectId, op);
    for (const segment of selectedResearch(planned)) {
      try {
        await runResearchSegment(op, projectId, segment);
      } catch (error) {
        // The failed run is recorded on the project; carry on with the other researchers.
        await noteAutoFailure(r, op, projectId, (segment + ": " + (error instanceof Error ? error.message : "failed")).slice(0, 240));
      }
    }
    kickProducerAgent(op, projectId, "research");
  } catch (error) {
    await noteAutoFailure(repo({ ...a, role: "operator", subject: AUTO_APPROVER }), { ...a, role: "operator", subject: AUTO_APPROVER }, projectId, (error instanceof Error ? error.message : "unexpected error").slice(0, 240)).catch(() => undefined);
  } finally {
    autoRunning.delete(key);
  }
}
export async function handleFactory(
  request: Request,
  path: string[],
  identityVerifier?: FactoryTokenVerifier,
  identityLookup?: FactoryUserLookup,
): Promise<Response> {
  try {
    if (!["GET", "POST"].includes(request.method))
      return json({ error: "Method not allowed" }, 405);
    const route = path.join("/");
    if (
      request.method === "POST" &&
      !sameOrigin(
        request.headers.get("origin"),
        process.env.PORT67_PUBLIC_ORIGIN ||
          new URL(request.url).protocol +
            "//" +
            (request.headers.get("host") || new URL(request.url).host),
      )
    )
      return json({ error: "Cross-origin request rejected" }, 403);
    const a = await principal(request, identityLookup);
    await loadApprovalMode(repository);
    // Studio uploads carry the raw file as the request body; every other POST is a small JSON body.
    const upload = request.method === "POST" && path.length === 4 && path[0] === "projects" && path[2] === "studio" && path[3] === "upload";
    const customerUpload = isCustomerUpload(request, path);
    const data = request.method === "POST" && !upload && !customerUpload ? await body(request) : {};
    const visitorName = "port67_factory_visitor";
    const visitor = readSession(cookie(request, visitorName), sessionKey());
    if (request.method === "POST" && route !== "logout") {
      if (a) rate(a.subject, 100);
      else if (["login", "client-login", "demo", "identity-login"].includes(route)) {
        if (!visitor || visitor.workspaceId !== "visitor")
          return json({ error: "Open the portal before signing in" }, 401);
        rate("visitor:" + visitor.subject, 30);
        // Enable only behind a trusted proxy that overwrites incoming X-Forwarded-For.
        if (process.env.PORT67_TRUST_PROXY === "true")
          rate(
            "ip:" +
              digest(
                request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                  "proxy-missing",
              ),
            60,
          );
      }
    }
    if (route === "auth-config" && request.method === "GET") {
      const projectId=process.env.PORT67_FIREBASE_PROJECT_ID;
      const apiKey=process.env.PORT67_FIREBASE_WEB_API_KEY;
      const authDomain=process.env.PORT67_FIREBASE_AUTH_DOMAIN;
      if(projectId!=="ai-agency-3671b" || !apiKey || authDomain!==`${projectId}.firebaseapp.com`)
        return json({error:"Account sign-in is not configured"},503);
      return json({apiKey,authDomain,projectId});
    }
    if (route === "identity-login" && request.method === "POST") {
      if(!liveReady()) return json({error:"Live workspace is not configured"},503);
      const identity=await withTeamRole(repository,await verifyFactoryIdentity(text(data.idToken,"identity token",16384,true),identityVerifier));
      await registerAccount(repository,{id:identity.accountId,ownerUid:identity.uid,...(identity.email?{email:identity.email}:{}),createdAt:new Date().toISOString()});
      return login(request,{subject:identity.uid,identity:"firebase",...(identity.email?{email:identity.email}:{}),role:identity.role,admin:identity.admin,accountId:identity.accountId,workspaceId:identity.accountId,issuedAt:identity.authenticatedAt!,expires:Date.now()+8*3600000});
    }
    if (route === "session" && request.method === "GET") {
      const response = json({
        principal: a,
        config: {
          demoEnabled: demoEnabled(),
          liveReady: liveReady(),
          researchReady: researchReady() || (a ? await stageReady(repository, "research").catch(() => false) : false),
          synthesisReady: synthesisReady() || (a ? await stageReady(repository, "synthesis").catch(() => false) : false),
          providers: safeProviderConfiguration(),
          storage:
            process.env.PORT67_STORAGE === "firebase"
              ? "Firebase"
              : "Persistent local disk",
        },
      });
      if (!a && !visitor) {
        const token = signSession(
          {
            role: "customer",
            subject: id(),
            workspaceId: "visitor",
            expires: Date.now() + 8 * 3600000,
          },
          sessionKey(),
        );
        response.headers.set(
          "set-cookie",
          `${visitorName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${(process.env.PORT67_PUBLIC_ORIGIN || request.url).startsWith("https:") ? "; Secure" : ""}`,
        );
      }
      return response;
    }
    if (route === "logout" && request.method === "POST") {
      const response = json({ ok: true });
      response.headers.set(
        "set-cookie",
        `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
      );
      return response;
    }
    if (route === "demo" && request.method === "POST") {
      if (!demoEnabled()) return json({ error: "Demo is disabled" }, 403);
      const p: Principal = {
        role: "operator",
        subject: id(),
        workspaceId: "demo-" + id(),
        demo: true,
        expires: Date.now() + 8 * 3600000,
      };
      await seed(p);
      return login(request, p);
    }
    if (route === "login" && request.method === "POST") {
      if (!liveReady())
        return json(
          {
            error:
              "Live workspace is not configured. Use the isolated synthetic demo.",
          },
          503,
        );
      if (
        !secureEqual(
          text(data.password, "password", 300, true),
          process.env.PORT67_OPERATOR_PASSWORD!,
        )
      )
        return json({ error: "Invalid credentials" }, 401);
      return login(request, {
        role: "operator",
        subject: "port67-producer",
        workspaceId: "port67",
        expires: Date.now() + 8 * 3600000,
      });
    }
    if (route === "client-login" && request.method === "POST") {
      if (!liveReady())
        return json({ error: "Live workspace is not configured" }, 503);
      const invitationToken=text(data.token,"invitation",200,true);
      const parts=invitationToken.split(".");
      if(parts.length>2 || (parts.length===2 && !/^acct_[a-f0-9]{32}$/.test(parts[0]))) return json({error:"Invitation is invalid, expired or revoked"},401);
      const workspace=parts.length===2?parts[0]:"port67";
      const hash = digest(invitationToken);
      const db = await repository.read(workspace);
      const invite = db.invitations.find(
        (i) => i.hash === hash && !i.revoked && i.expires > Date.now(),
      );
      if (!invite)
        return json(
          { error: "Invitation is invalid, expired or revoked" },
          401,
        );
      return login(request, {
        role: "customer",
        subject: hash,
        workspaceId: invite.workspaceId,
        projectId: invite.projectId,
        expires: Math.min(invite.expires, Date.now() + 8 * 3600000),
      });
    }
    if (!a) return json({ error: "Sign in to continue" }, 401);
    // Video workspace customer accounts (CHG-0103): producers and admins only, enforced inside the handler.
    if (isCustomerRoute(path)) return await handleCustomers(request, path, a, data);
    // Video workspace commissions (CHG-0107): producers and admins only, enforced inside the handler.
    if (isCommissionRoute(path)) return await handleCommissions(request, path, a, data);
    if (isBrandIntelRoute(path)) return await handleBrandIntel(request, path, a, data);
    if (route === "admin/costs/series") {
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      const q=new URL(request.url).searchParams;
      return json(costSeries(await exportApiCalls(repository),{range:(q.get("range")||undefined) as SeriesRange|undefined,harness:q.get("harness")||undefined}));
    }
    if (route === "admin/costs" || route === "admin/costs/export") {
      let repriceResult: { repriced: number; stillUnknown: number } | undefined;
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(route === "admin/costs/export" && request.method==="GET") return new Response(JSON.stringify({exportedAt:new Date().toISOString(),calls:await exportApiCalls(repository)}),{headers:{"content-type":"application/json","content-disposition":"attachment; filename=port67-api-costs.json","cache-control":"no-store","x-content-type-options":"nosniff"}});
      if(request.method==="POST" && data.action==="limits") await saveBudgetSettings(repository,data.limits,a.subject);
      else if(request.method==="POST" && data.action==="reprice") repriceResult=await repriceUnknownCalls(repository,a.subject);
      else if(request.method==="POST" && data.action==="baseline") await setCostBaseline(repository,data.on===true,a.subject);
      else if(request.method==="POST" && data.action==="archive") await archiveApiCalls(repository,a.subject);
      else if(request.method==="POST") {
        await reconcileApiCall(repository,text(data.id,"call",100,true),{actualMicroUsd:Number(data.actualMicroUsd),reference:text(data.reference,"reference",100,true),actor:a.subject});
      }
      const q=new URL(request.url).searchParams;
      return json({...(await adminCostReport(repository,{accountId:q.get("accountId")||undefined,projectId:q.get("projectId")||undefined,provider:q.get("provider")||undefined,model:q.get("model")||undefined,offset:q.has("offset")?Number(q.get("offset")):undefined,limit:q.has("limit")?Number(q.get("limit")):undefined})),...(repriceResult?{repriceResult}:{})});
    }
    if (route === "admin/team") {
      // Owner only. Producers are added here by verified email; admins come only from PORT67_ADMIN_UIDS.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method==="GET") return json({team:await listTeam(repository)});
      if(data.action==="add") return json({team:await addTeamMember(repository,data.email,a.subject)});
      if(data.action==="remove") return json({team:await removeTeamMember(repository,data.email,a.subject)});
      return json({error:"Unknown team action"},400);
    }
    if (route === "admin/ai-agents") {
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      // With a project chosen on the page (CHG-0100): the agents whose latest run for that project failed, and whether each can be rerun.
      const chosen = new URL(request.url).searchParams.get("projectId");
      if (chosen) {
        const project = find((await repository.read(a.workspaceId)).projects, chosen, a);
        return json({ ...(await agentsOverview(repository)), failed: failedAgents(project, { authorised: hasProviderConsent(project) }) });
      }
      return json(await agentsOverview(repository));
    }
    if (route === "admin/approval-mode") {
      // Owner only. Switches the customer's direction approval between the account owner (manual) and the AI producer.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method==="POST") await saveApprovalMode(repository,data.mode,a.subject);
      return json(await approvalOverview(repository));
    }
    if (route === "admin/skills") {
      // Owner only. Each AI agent has one editable skill; saving makes a new version, which the agent runs from its next call.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method==="POST") await saveSkill(repository,data.agent,data.body,a.subject,data.note);
      return json({ skills: await skillsOverview(repository) });
    }
    if (route === "admin/skill-writer") {
      // Owner only. Returns text for the owner to read and save; saving is a separate step through admin/skills.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method!=="POST" || !data.agent) return json(await writerConfig(repository));
      return json({ result: await writeSkill(repository,a,{ agent:String(data.agent), outsideSkill:typeof data.outsideSkill==="string"?data.outsideSkill:undefined, change:typeof data.change==="string"?data.change:"", notes:typeof data.notes==="string"?data.notes:undefined, model:typeof data.model==="string"?data.model:undefined, effort:typeof data.effort==="string"?data.effort:undefined }) });
    }
    if (route === "admin/ai-routing") {
      // Owner only. Chooses provider and model per job and holds prices; API keys stay in Render.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method==="GET") return json(await routingOverview(repository));
      if(data.action==="save") { await saveRouting(repository,data.settings,a.subject); return json(await routingOverview(repository)); }
      if(data.action==="suggest") return json(await suggestSetup());
      if(data.action==="public-prices") return json(await suggestPublicPrices(Array.isArray(data.models)?data.models:[]));
      // CHG-0100: move every job off a provider that has no quota left, in one validated, recorded save.
      if(data.action==="move") { const result = await moveProviderSlots(repository,data.from,{ research:(data.research as never)||null, synthesis:(data.synthesis as never)||null },a.subject); return json({ ...result, ...(await routingOverview(repository)) }); }
      return json({error:"Unknown AI models action"},400);
    }
    if(route === "accounts") {
      const accounts=await listAccounts(repository,a);
      if(request.method==="GET") return json({accounts});
      const target=text(data.accountId,"account ID",100,true);
      if(!accounts.some(x=>x.id===target)) return json({error:"Forbidden: account selection"},403);
      return login(request,{...a,accountId:target,workspaceId:target});
    }
    if (route === "readiness" && request.method === "GET") {
      operator(a);
      return json(configurationStatus());
    }
    if (route === "demo-role" && request.method === "POST") {
      if (!a.demo) return json({ error: "Role switching is demo-only" }, 403);
      if (data.role !== "operator" && data.role !== "customer")
        throw new Error("Invalid role");
      const db = await repo(a).read(a.workspaceId);
      const projectId =
        text(data.projectId, "projectId", 100) || db.projects[0]?.id;
      if (!db.projects.some((p) => p.id === projectId))
        throw new Error("Forbidden: project access");
      return login(request, {
        ...a,
        role: data.role,
        projectId: data.role === "customer" ? projectId : undefined,
      });
    }
    if (route === "projects" && request.method === "GET") {
      const db = await repo(a).read(a.workspaceId);
      return json({
        projects: db.projects
          .filter((p) => a.role === "operator" || a.identity === "firebase" || p.id === a.projectId)
          .map((p) => projectView(p, a)),
      });
    }
    if (route === "projects" && request.method === "POST") {
      if(!canCreateProject(a)) operator(a);
      const studioInput = data.studio && typeof data.studio === "object" ? (data.studio as Record<string, unknown>) : undefined;
      const p = studioInput ? createStudioProject(studioInput, a, undefined, await readBrandKit(a)) : createProject({ ...data, workRequest: data.workRequest ?? "campaign", useAIPlanner: data.workRequest !== undefined && data.useAIPlanner !== false }, a);
      await repo(a).mutate(a.workspaceId, (db) => {
        if (db.projects.length >= 20)
          throw new Error("Workspace project limit reached");
        db.projects.push(p);
      });
      return json({ project: projectView(p,a) }, 201);
    }
    if (path[0] === "projects" && path[1]) {
      const projectId = path[1];
      const db = await repo(a).read(a.workspaceId);
      const p = find(db.projects, projectId, a);
      // Studio projects run nothing paid before gate 1 (the intake) is approved.
      if (request.method === "POST" && ["planning", "producer-agent", "synthesis", "video-analysis", "research", "video"].includes(path[2] || "")) requireStudioIntakeApproved(p);
      // Stage gating (piece B): no classic production, copy pack or video render on a studio project; research, scoping and drafting
      // only while Creative strategy is open; studio projects do not use AI research planning or medium selection.
      if (request.method === "POST" && p.studio) {
        if (path[2] === "video" || (path[2] === "synthesis" && data.stage === "content")) refuseStudioClassicProduction(p);
        if (path[2] === "planning") throw new Error("Studio projects use the studio research set; AI research planning and medium selection are not used");
        if (["synthesis", "video-analysis", "research", "scope"].includes(path[2] || "")) requireStudioStrategyOpen(p);
      }
      if (upload) {
        if (a.demo) throw new Error("Uploads are disabled in the synthetic demo");
        const url = new URL(request.url);
        const slot = url.searchParams.get("slot");
        if (!isStudioSlot(slot)) throw new Error("Unknown upload slot");
        const s = requireStudio(p);
        const pieceId = url.searchParams.get("pieceId") || "";
        if (slot === "piece") {
          operator(a);
          requirePieceEditable(s, findPiece(s, pieceId));
        } else {
          requireIntakeEditable(s);
          if (url.searchParams.get("rights") !== "confirmed") throw new Error("Confirm that you have the right to use these files");
        }
        const disclosure = url.searchParams.get("aiDisclosure") || "none";
        if (disclosure !== "none" && (slot !== "piece" || !["ai_generated", "ai_edited"].includes(disclosure))) throw new Error("Unknown AI disclosure");
        const rule = STUDIO_UPLOAD_RULES[slot];
        const bytes = await rawBody(request, rule.maxBytes, rule.label);
        if (!bytes.length) throw new Error("The file is empty");
        const mime = sniffMime(bytes.subarray(0, 16));
        if (!mime || !rule.mimes.includes(mime)) throw new Error("That file type is not accepted here. " + rule.label);
        const assetId = id();
        const at = new Date().toISOString();
        const name = ((url.searchParams.get("name") || "").slice(0, 200).replace(/[^\w .()-]/g, "_").trim() || "upload").slice(0, 120);
        // Piece C: a piece upload may carry its rights (source and licence); the pixel size and length are read from the file itself.
        const rightsSource = (url.searchParams.get("rightsSource") || "").trim().slice(0, 300);
        const rightsLicence = (url.searchParams.get("rightsLicence") || "").trim().slice(0, 300);
        const ref: StudioAssetRef = {
          id: assetId, name, mime, bytes: bytes.length, storageKey: studioKey(p.accountId || p.workspaceId, p.id, assetId, mime), uploadedAt: at, uploadedBy: a.subject,
          ...(slot === "piece"
            ? rightsSource && rightsLicence ? { rights: { source: rightsSource, licence: rightsLicence, confirmedBy: a.subject } } : {}
            : { rights: { source: a.role === "customer" ? "Client upload" : "Uploaded by Port67 for the client", licence: "Confirmed by the uploader as usable for this project", confirmedBy: a.subject } }),
          aiDisclosure: disclosure as NonNullable<StudioAssetRef["aiDisclosure"]>,
          ...(mediaInfo(bytes, mime) || {}),
        };
        // Bytes go to the private file store first; only the reference is written to the project document.
        await putStudioFile(ref.storageKey, bytes, mime);
        const result = await repo(a).mutate(a.workspaceId, (state) => {
          const current = find(state.projects, projectId, a);
          if (slot === "piece") applyPieceUpload(current, pieceId, ref, a);
          else {
            attachBriefAsset(requireStudio(current), slot, ref);
            current.audit.push({ id: id(), at, actor: a.subject, role: a.role, action: "studio_asset_uploaded", detail: `${slot}: ${name} (${mime}, ${bytes.length} bytes)` });
          }
          current.revision++;
          current.updatedAt = at;
          return projectView(current, a);
        });
        return json({ project: result, asset: ref }, 201);
      }
      if (path[2] === "studio" && path[3] === "asset" && path[4] && path.length === 5 && request.method === "GET") {
        const view = projectView(p, a);
        const ref = view.studio ? studioAssetRefs(view.studio).find((x) => x.id === path[4]) : undefined;
        if (!ref || studioKeyAccount(ref.storageKey) !== (p.accountId || p.workspaceId)) throw new Error("Forbidden: file access");
        const bytes = await getStudioFile(ref.storageKey);
        const headers: Record<string, string> = {
          "content-type": ref.mime,
          "content-disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${ref.name.replace(/[^\w .()-]/g, "_")}"`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "sandbox; default-src 'none'",
          "accept-ranges": "bytes",
        };
        // Browsers (Safari in particular) need byte ranges to play video previews.
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
        if (range && (range[1] || range[2])) {
          const size = bytes.length;
          const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
          const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
          return new Response(new Uint8Array(bytes.subarray(start, end + 1)), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
        }
        return new Response(new Uint8Array(bytes), { headers: { ...headers, "content-length": String(bytes.length) } });
      }
      if (path.length === 2 && request.method === "GET") {
        // Self-healing: a request made before the switch was on, or one that could not start, is retried on the next view.
        if (autoApproveProducer() && !a.demo && p.researchRequest) void autoStartResearch(a, projectId).catch(() => undefined);
        // The producer orchestrator resumes on a view too (skipped when nothing changed), so a missed kick never leaves a step waiting.
        if (p.runs.length && !p.runs.some((r) => r.status === "running")) kickProducerAgent(a, projectId, "project view");
        return json({ project: projectView(p, a) });
      }
      if (path[2] === "studio" && path[3] === "preproduction" && path.length === 4 && request.method === "POST") {
        operator(a);
        if (data.action === "draft") return json({ project: projectView(await draftPreproduction(repo(a), a, projectId), a) });
        if (data.action === "image") return json({ project: projectView(await generateStudioImage(repo(a), a, projectId, text(data.pieceId, "piece", 100, true)), a) });
        throw new Error("Unknown pre-production action");
      }
      // Stage 4 Production (piece C): prepare the pieces, add motion loops, draw one still, or start the next cycle. Producers only.
      if (path[2] === "studio" && path[3] === "production" && path.length === 4 && request.method === "POST") {
        operator(a);
        if (data.action === "prepare" || data.action === "loops") {
          const result = await repo(a).mutate(a.workspaceId, (state) => {
            const index = state.projects.findIndex((x) => x.id === projectId);
            if (index < 0) throw new Error("Forbidden: project access");
            const next = transition(state.projects[index], data.action === "prepare" ? { type: "prepareStudioProduction", requestId: id() } : { type: "setStudioLoops", count: data.count, requestId: id() }, a);
            state.projects[index] = next;
            return projectView(next, a);
          });
          return json({ project: result });
        }
        if (data.action === "image") return json({ project: projectView(await generateStudioStill(repo(a), a, projectId, text(data.pieceId, "piece", 100, true)), a) });
        if (data.action === "nextCycle") {
          const { previous, next } = await startNextCycle(repo(a), a, projectId);
          return json({ project: projectView(previous, a), next: projectView(next, a) }, 201);
        }
        throw new Error("Unknown production action");
      }
      // Delivery documents (piece C): producers always; the client once the project is delivered. Built from the caller's own view.
      if (path[2] === "studio" && path[3] === "delivery" && path[4] && path.length === 5 && request.method === "GET") {
        const view = projectView(p, a);
        const doc = studioDeliveryDocument(view, path[4], a.role === "operator");
        return new Response(doc.body, { headers: { "content-type": doc.type, "content-disposition": `attachment; filename="${doc.name}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
      }
      // Agent rerun (CHG-0100): which agents failed for this project, rerun one (optionally after an admin switches its model), or
      // rerun every failed agent in dependency order. On success the producer agent carries the project on as after any run.
      if (path[2] === "agents" && path[3] === "failed" && path.length === 4 && request.method === "GET") {
        operator(a);
        return json({ failed: failedAgents(p, { authorised: hasProviderConsent(p) }) });
      }
      if (path[2] === "agents" && (path[3] === "rerun" || path[3] === "rerun-failed") && path.length === 4 && request.method === "POST") {
        operator(a);
        const deps: RerunDeps = { runResearch: (op, id, segment) => runResearchSegment(op, id, segment), runStudioRerun };
        const outcome = path[3] === "rerun" ? { result: await rerunAgent(repo(a), a, projectId, data, deps) } : await rerunFailedAgents(repo(a), a, projectId, data, deps);
        const anyOk = "result" in outcome ? outcome.result.ok : outcome.results.some((r) => r.ok);
        if (anyOk) kickProducerAgent(a, projectId, "agent rerun");
        const fresh = find((await repo(a).read(a.workspaceId)).projects, projectId, a);
        return json({ ...outcome, project: projectView(fresh, a), failed: failedAgents(fresh, { authorised: hasProviderConsent(fresh) }) });
      }
      if (path[2] === "performance-history" && request.method === "POST") {
        operator(a);
        const sourceId = text(data.sourceProjectId, "source project", 100, true);
        if (sourceId === projectId) throw new Error("Choose another campaign");
        const project = await repo(a).mutate(a.workspaceId, state => {
          const source = find(state.projects, sourceId, a);
          const target = find(state.projects, projectId, a);
          if (source.accountId !== target.accountId) throw new Error("Campaign history must stay within its account");
          const history = performanceHistory(source).filter(row => !target.performance?.some(r => r.provenance.startsWith(`Carried from project ${sourceId}, record ${row.id}: `)));
          if (!history.length) throw new Error("No new accepted authorised performance records in that campaign");
          let next = target;
          for (const row of history) next = transition(next, { ...row, type: "recordPerformance", publicAuthorised: true, provenance: (`Carried from project ${sourceId}, record ${row.id}: ` + row.provenance).slice(0,600) }, a);
          state.projects[state.projects.findIndex(x => x.id === projectId)] = next;
          return next;
        });
        return json({ project: projectView(project, a) });
      }
      if (path[2] === "planning" && request.method === "POST") {
        operator(a);
        if (data.kind !== "research" && data.kind !== "medium") throw new Error("Unknown planning task");
        const project = data.kind === "research" ? await runResearchPlanning(repo(a), a, projectId, { force: data.retry === true, feedback: text(data.feedback, "planning feedback", 1000) }) : await runMediumSelection(repo(a), a, projectId, { force: data.retry === true });
        return json({ project: projectView(project, a) });
      }
      if (path[2] === "task-plan" && request.method === "GET") {
        operator(a);
        const project = structuredClone(p);
        syncTaskPlan(project);
        return json({ plan: project.taskPlan || null });
      }
      if (path[2] === "research-plan" && request.method === "GET")
        return json({ plan: prepareResearchPlan(a.role === "operator" ? p : { ...p, scope: undefined }) });
      if (path[2] === "scope" && request.method === "GET") {
        // Producers and admins only: customers never see the scoping output. With none stored yet, a free template preview is returned.
        operator(a);
        const stored = !!p.scope;
        const fallbackScope = templateScope(p, { briefHash: scopeHash(p), version: 0 });
        const shown = p.scope ? { ...p.scope, segments: { ...fallbackScope.segments, ...p.scope.segments } } : fallbackScope;
        return json({ scope: shown, stored, current: stored && scopeCurrent(p), history: p.scopeHistory || [], scoping: { enabled: scopingEnabled() } });
      }
      if (path[2] === "diagnostics" && request.method === "GET") {
        operator(a);
        const routing = await routingOverview(repo(a));
        let ledger;
        if (a.admin) {
          try {
            ledger = (await exportApiCalls(repository)).filter((c) => c.projectId === p.id).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).map((c) => ({ id: c.id, at: c.createdAt, finishedAt: c.finishedAt, agent: c.agent, provider: c.provider, model: c.model, status: c.status, inputTokens: c.usage?.inputTokens, outputTokens: c.usage?.outputTokens, providerRequestId: c.providerRequestId }));
          } catch {
            ledger = [];
          }
        }
        return json(buildDiagnostics({ ...p, researchNote: projectView(p, a).researchNote }, {
          now: new Date().toISOString(),
          since: new URL(request.url).searchParams.get("since") || "latest",
          switches: { PORT67_RESEARCH_ENABLED: process.env.PORT67_RESEARCH_ENABLED === "true", PORT67_SYNTHESIS_ENABLED: process.env.PORT67_SYNTHESIS_ENABLED === "true", PORT67_SCOPING_ENABLED: process.env.PORT67_SCOPING_ENABLED !== "false", scopingAgentActive: scopingEnabled(), PORT67_AUTO_APPROVE_PRODUCER: autoApproveProducer(), openaiKeySet: keyConfigured("openai"), geminiKeySet: keyConfigured("gemini"), anthropicKeySet: keyConfigured("anthropic"), deepseekKeySet: keyConfigured("deepseek") },
          routes: routing.effective.map((e) => ({ agent: e.slot, ...("error" in e ? { problem: String(e.error) } : { provider: e.provider, model: e.model, source: e.source }) })),
          ledger,
        }));
      }
      if (path[2] === "scope" && request.method === "POST") {
        operator(a);
        if (data.action === "classify") return json({ scope: await ensureScope(repo(a), a, projectId, true), stored: true, current: true });
        if (data.action === "save") return json({ scope: await saveScope(repo(a), a, projectId, data.scope), stored: true, current: true });
        throw new Error("Unknown scope action");
      }
      if (path[2] === "producer-agent" && request.method === "GET") {
        // Producers and admins only: where the agent is, what it would do next, and its step log.
        operator(a);
        const aiReady = await stageReady(repo(a), "synthesis").catch(() => false);
        const plan = planNext(p, aiReady);
        return json({ state: p.producerAgent || null, evidence: allSegmentEvidence(p), warnings: evidenceWarnings(p, new Date().toISOString()), reviews: (p.reviews || []).slice(-20), next: "step" in plan ? { step: plan.step, label: STEP_LABEL[plan.step] } : null, stop: "stop" in plan ? plan.stop : null, automatic: producerAgentAuto(), aiReady });
      }
      if (path[2] === "producer-agent" && request.method === "POST") {
        operator(a);
        const project = await runProducerAgent(repo(a), a, projectId, { force: true });
        return json({ project: projectView(project, a) });
      }
      if (path[2] === "research-dossier" && request.method === "GET") {
        const dossier = researchDossier(p, a.role === "operator" ? "operator" : "customer");
        return json({ dossier, markdown: renderDossierMarkdown(dossier) });
      }
      if (path[2] === "invite" && request.method === "POST") {
        operator(a);
        if (a.demo)
          throw new Error(
            "Use demo role switching; real invitations are disabled in demo",
          );
        const token = (a.workspaceId.startsWith("acct_") ? a.workspaceId+"." : "") + randomBytes(32).toString("base64url");
        await repository.mutate(a.workspaceId, (state) => {
          for (const i of state.invitations)
            if (i.projectId === p.id) i.revoked = true;
          state.invitations.push({
            hash: digest(token),
            projectId: p.id,
            workspaceId: a.workspaceId,
            expires: Date.now() + 7 * 86400000,
            revoked: false,
          });
        });
        return json({
          invitation: `${new URL(request.url).origin}/portal#invite=${token}`,
          expiresIn: "7 days; generating another link revokes the previous one",
        });
      }
      if (path[2] === "revoke" && request.method === "POST") {
        operator(a);
        await repo(a).mutate(a.workspaceId, (state) => {
          state.invitations
            .filter((i) => i.projectId === p.id)
            .forEach((i) => {
              i.revoked = true;
            });
        });
        return json({ ok: true });
      }
      if (path[2] === "export" && request.method === "GET") {
        const view = projectView(p, a);
        const direction = p.strategies.at(-1);
        const assets = view.assets.filter(
          (x) =>
            x.status === "approved" &&
            direction?.status === "approved" &&
            x.strategyHash === direction.hash,
        );
        return json({
          project: { id: p.id, accountId: p.accountId || p.workspaceId, business: p.brief.business },
          exportedAt: new Date().toISOString(),
          strategy:
            direction && direction.status === "approved" ? direction : null,
          assets,
          manifest: assets.map((x) => ({
            id: x.id,
            hash: x.hash,
            kind: x.kind,
            strategyHash: x.strategyHash,
            taskId: x.taskId,
            evidenceIds: x.evidenceIds,
            approvedAt: x.approvedAt,
          })),
          limitations:
            "Approved template-created concepts; not a performance report. No third-party media included.",
        });
      }
      if (path[2] === "advert-pack" && request.method === "GET") {
        operator(a);
        if (!p.advert) throw new Error("Plan the advert first");
        const tier = new URL(request.url).searchParams.get("tier") === "final" ? "final" : "draft";
        const md = promptPack(p, p.advert, tier);
        return new Response(md, {
          headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="port67-advert-prompts-v${p.advert.version}.md"`, "cache-control": "no-store", "x-content-type-options": "nosniff" },
        });
      }
      if (path[2] === "asset" && path[3] && request.method === "GET") {
        const view = projectView(p, a);
        const asset = view.assets.find((x) => x.id === path[3]);
        if (!asset) throw new Error("Forbidden: asset access");
        if (a.role === "customer" && asset.status !== "approved")
          throw new Error("Only approved assets can be downloaded");
        if (
          a.role === "customer" &&
          (p.strategies.at(-1)?.hash !== asset.strategyHash ||
            p.strategies.at(-1)?.status !== "approved")
        )
          throw new Error("Asset depends on superseded direction");
        const contentType =
          asset.kind === "svg"
            ? "image/svg+xml"
            : asset.kind === "motion" || asset.kind === "grid"
              ? "text/html"
              : "text/markdown";
        return new Response(asset.content, {
          headers: {
            "content-type": contentType + "; charset=utf-8",
            "content-disposition": `attachment; filename="port67-${asset.id}.${asset.kind === "svg" ? "svg" : asset.kind === "motion" || asset.kind === "grid" ? "html" : "md"}"`,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            "content-security-policy":
              "sandbox; default-src 'none'; style-src 'unsafe-inline'",
          },
        });
      }
      if (path[2] === "video" && request.method === "POST") {
        operator(a);
        if (a.demo) throw new Error("Video rendering is disabled in synthetic demo");
        const asset = p.assets.find((x) => x.id === data.assetId);
        const strategy = p.strategies.at(-1);
        if (!asset || asset.kind !== "motion") throw new Error("Choose a motion storyboard to render");
        if (asset.status !== "approved" || !strategy || strategy.status !== "approved" || strategy.hash !== asset.strategyHash)
          throw new Error("Only a storyboard approved against the current approved direction can be rendered");
        if (!copySetApproved(p, asset.strategyHash))
          throw new Error("Approve the copy set before rendering video; not every campaign needs one");
        const size = data.size === undefined ? 480 : data.size;
        if (size !== 480 && size !== 1080) throw new Error("Video size must be 480 or 1080");
        if ((p.videos || []).length >= 10) throw new Error("This project has reached its video limit");
        const bytes = await renderVideo(p, strategy, undefined, size);
        const videoId = id();
        const video: Video = { id: videoId, assetId: asset.id, assetHash: asset.hash, strategyHash: asset.strategyHash, key: videoKey(a.workspaceId, p.id, videoId), bytes: bytes.length, size, seconds: SCENE_SECONDS * 3, createdAt: new Date().toISOString(), createdBy: a.subject };
        await putVideo(video.key, bytes);
        await repo(a).mutate(a.workspaceId, (state) => {
          const current = find(state.projects, projectId, a);
          const live = current.assets.find((x) => x.id === asset.id);
          if (!live || live.hash !== asset.hash || live.status !== "approved") throw new Error("Storyboard changed during render; render again");
          (current.videos ||= []).push(video);
          current.audit.push({ id: id(), at: video.createdAt, actor: a.subject, role: a.role, action: "video_rendered", detail: `Rendered ${video.seconds}s MP4 from ${asset.id}` });
          current.revision++;
        });
        return json({ ok: true, video });
      }
      if (path[2] === "video" && path[3] && request.method === "GET") {
        const view = projectView(p, a);
        const video = (view.videos || []).find((x) => x.id === path[3]);
        if (!video) throw new Error("Forbidden: video access");
        if (a.role === "customer" && view.deliveryPaused) throw new Error("Asset depends on superseded direction");
        return new Response(new Uint8Array(await getVideo(video.key)), {
          headers: { "content-type": "video/mp4", "content-disposition": `attachment; filename="port67-${video.id}.mp4"`, "cache-control": "no-store", "x-content-type-options": "nosniff" },
        });
      }
      if (path[2] === "synthesis" && request.method === "POST") {
        operator(a);
        if (a.demo)
          throw new Error("Paid AI drafting is disabled in synthetic demo");
        if (!(await stageReady(repo(a), "synthesis")))
          return json(
            {
              error:
                "AI drafting is not configured. Manual paths remain available.",
            },
            503,
          );
        if (data.stage === "content")
          return json({ project: projectView(await runContent(repo(a), a, projectId), a) });
        if (data.stage === "formats" || data.stage === "ideas" || data.stage === "audiences")
          return json({ project: projectView(await runAdvisory(repo(a), a, projectId, data.stage), a) });
        if (data.stage !== "insights" && data.stage !== "strategy")
          throw new Error("Unknown AI drafting stage");
        return json({
          project: projectView(
            await runSynthesis(repo(a), a, projectId, data.stage),
            a,
          ),
        });
      }
      if (path[2] === "recover-research" && request.method === "POST") {
        operator(a);
        await repo(a).mutate(a.workspaceId, (state) => {
          const current = find(state.projects, projectId, a);
          const run = current.runs.find((r) => r.id === data.id);
          if (!run || run.status !== "running")
            throw new Error("No running research task found");
          if (
            Date.parse(
              run.leaseExpiresAt ||
                new Date(Date.parse(run.at) + 120000).toISOString(),
            ) > Date.now()
          )
            throw new Error(
              "Research lease has not expired; wait before recovery",
            );
          run.status = "failed";
          run.error =
            "Interrupted research recovered by operator; no automatic retry. Check provider billing before another invocation.";
          run.usageStatus = run.usage ? "recorded" : "unknown";
          current.revision++;
          current.audit.push({
            id: id(),
            at: new Date().toISOString(),
            actor: a.subject,
            role: a.role,
            action: "research_recovered",
            detail: run.id,
          });
        });
        return json({ ok: true });
      }
      if (path[2] === "video-analysis" && request.method === "POST") {
        operator(a);
        if (a.demo) throw new Error("Paid video analysis is disabled in the synthetic demo");
        const project = find((await repo(a).read(a.workspaceId)).projects, projectId, a);
        const source = project.sources.find(s => s.id === data.sourceId && s.kind === "public_source" && s.status !== "rejected");
        if (!source) throw new Error("Choose an existing public video source in this project");
        const url = youtubeVideoUrl(source.url);
        const selection = await resolveSelection(repo(a), researchSlot("video"));
        if (selection.provider !== "gemini") throw new Error("Choose Gemini for Video language on the system map to view a video directly");
        await runResearchSegment(a, projectId, "video", undefined, url);
        return json({ ok: true });
      }
      if (path[2] === "research" && request.method === "POST") {
        operator(a);
        if (a.demo)
          throw new Error(
            "Live paid research is disabled in synthetic demo; add a manual source to explore the workflow",
          );
        if (!(await stageReady(repo(a), "research")))
          return json(
            {
              error:
                "Research provider is not configured. Manual source collection is available.",
            },
            503,
          );
        if (!segments.includes(data.segment as Segment))
          throw new Error("Invalid research segment");
        await runResearchSegment(a, projectId, data.segment as Segment);
        kickProducerAgent(a, projectId, "after research");
        return json({
          project: projectView(
            find((await repo(a).read(a.workspaceId)).projects, projectId, a),
            a,
          ),
        });
      }
      if (path.length === 2 && request.method === "POST") {
        const result = await repo(a).mutate(a.workspaceId, (state) => {
          const index = state.projects.findIndex((x) => x.id === projectId);
          if (index < 0) throw new Error("Forbidden: project access");
          const current = state.projects[index];
          if (data.revision !== undefined && data.revision !== current.revision)
            throw new Error("Project changed; refresh before saving");
          const next = transition(current, data, a);
          state.projects[index] = next;
          return projectView(next, a);
        });
        if (data.type === "requestResearch" && autoApproveProducer() && !a.demo)
          void autoStartResearch(a, projectId).catch(() => undefined);
        if ((data.type === "approveStudioGate" || data.type === "approveStudioGateWithNote") && data.stage === "intake")
          await saveBrandKit(a, find((await repo(a).read(a.workspaceId)).projects, projectId, a)).catch(() => undefined);
        if (data.type === "requestStudioRerun") {
          await runStudioRerun(a, projectId);
          return json({ project: projectView(find((await repo(a).read(a.workspaceId)).projects, projectId, a), a) });
        }
        if (["approveStrategy", "approveAsset", "approveAllAssets", "reviewAllSources", "reviewAllInsights"].includes(String(data.type)))
          kickProducerAgent(a, projectId, String(data.type));
        return json({ project: result });
      }
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = /Forbidden|role|operator|Customer approval identity/.test(
      message,
    )
      ? 403
      : /Too many/.test(message)
        ? 429
        : 400;
    return json(
      {
        error: message.startsWith("ENOENT")
          ? "Storage is unavailable"
          : message,
      },
      status,
    );
  }
}
