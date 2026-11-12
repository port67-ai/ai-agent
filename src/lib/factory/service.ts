import { meteredModelCall } from "./metering";
import { registerAccount, listAccounts, canCreateProject } from "./accounts";
import { addTeamMember, listTeam, removeTeamMember, withTeamRole } from "./team";
import { verifyFactoryIdentity, revalidateIdentitySession, type FactoryTokenVerifier, type FactoryUserLookup } from "./identity";
import { adminCostReport, reconcileApiCall, archiveApiCalls, exportApiCalls } from "./costs";
import { safeProviderConfiguration } from "./providers";
import { runContent } from "./content-run";
import { agentsOverview } from "./ai-agents";
import { copySetApproved } from "./copy-set";
import { renderVideo, SCENE_SECONDS } from "./video";
import { getVideo, putVideo, videoKey } from "./video-store";
import { resolveSelection, researchSlot, routingOverview, saveRouting, stageReady, suggestPublicPrices, suggestSetup } from "./ai-routing";
import { runSynthesis } from "./synthesis-run";
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
  digest,
  id,
  operator,
  projectView,
  text,
  transition,
  requireProviderConsent,
  hasProviderConsent,
} from "./engine";
import { demoRepository, repository, type Repository } from "./repository";
import { researchReady, researchSegment } from "./research";
import {
  segments,
  type Principal,
  type Project,
  type ResearchRun,
  type Segment,
  type Video,
} from "./model";
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
    const data = request.method === "POST" ? await body(request) : {};
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
    if (route === "admin/costs" || route === "admin/costs/export") {
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(route === "admin/costs/export" && request.method==="GET") return new Response(JSON.stringify({exportedAt:new Date().toISOString(),calls:await exportApiCalls(repository)}),{headers:{"content-type":"application/json","content-disposition":"attachment; filename=port67-api-costs.json","cache-control":"no-store","x-content-type-options":"nosniff"}});
      if(request.method==="POST" && data.action==="archive") await archiveApiCalls(repository,a.subject);
      else if(request.method==="POST") {
        await reconcileApiCall(repository,text(data.id,"call",100,true),{actualMicroUsd:Number(data.actualMicroUsd),reference:text(data.reference,"reference",100,true),actor:a.subject});
      }
      const q=new URL(request.url).searchParams;
      return json(await adminCostReport(repository,{accountId:q.get("accountId")||undefined,projectId:q.get("projectId")||undefined,provider:q.get("provider")||undefined,model:q.get("model")||undefined,offset:q.has("offset")?Number(q.get("offset")):undefined,limit:q.has("limit")?Number(q.get("limit")):undefined}));
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
      return json(await agentsOverview(repository));
    }
    if (route === "admin/ai-routing") {
      // Owner only. Chooses provider and model per job and holds prices; API keys stay in Render.
      if(!a.admin || a.identity!=="firebase" || a.demo) return json({error:"Forbidden: owner admin access required"},403);
      if(request.method==="GET") return json(await routingOverview(repository));
      if(data.action==="save") { await saveRouting(repository,data.settings,a.subject); return json(await routingOverview(repository)); }
      if(data.action==="suggest") return json(await suggestSetup());
      if(data.action==="public-prices") return json(await suggestPublicPrices(Array.isArray(data.models)?data.models:[]));
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
      const p = createProject(data, a);
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
      if (path.length === 2 && request.method === "GET")
        return json({ project: projectView(p, a) });
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
            : asset.kind === "motion"
              ? "text/html"
              : "text/markdown";
        return new Response(asset.content, {
          headers: {
            "content-type": contentType + "; charset=utf-8",
            "content-disposition": `attachment; filename="port67-${asset.id}.${asset.kind === "svg" ? "svg" : asset.kind === "motion" ? "html" : "md"}"`,
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
        requireProviderConsent(p);
        const segment = data.segment as Segment;
        const selection = await resolveSelection(repo(a), researchSlot(segment));
        const run: ResearchRun = {
          id: id(),
          stage: "research",
          at: new Date().toISOString(),
          status: "running",
          segment,
          provider: selection.provider,
          model: selection.model,
          leaseExpiresAt: new Date(Date.now() + 120000).toISOString(),
          contextHash: digest(JSON.stringify(p.brief)),
          contextSnapshot: structuredClone(p.brief),
          usageStatus: "unknown",
        };
        await repo(a).mutate(a.workspaceId, (state) => {
          const current = find(state.projects, projectId, a);
          requireProviderConsent(current);
          if (digest(JSON.stringify(current.brief)) !== run.contextHash)
            throw new Error(
              "Brief changed before research reservation; refresh and authorise the current context",
            );
          if (
            current.runs.length >=
            Math.max(
              1,
              Math.min(
                50,
                Number.parseInt(
                  process.env.PORT67_MAX_RESEARCH_RUNS || "12",
                  10,
                ) || 12,
              ),
            )
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
          const result = await meteredModelCall(repo(a),a,p,run,()=>researchSegment(p, segment, selection));
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
                : !hasProviderConsent(current) ||
                    record.contextHash !== digest(JSON.stringify(current.brief))
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
            if (error) record.error = error;
            else if (result.gaps?.length) record.gaps = result.gaps;
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
