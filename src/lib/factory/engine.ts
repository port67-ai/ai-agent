import { productionCapabilities } from "./registry";
import { createHash, randomUUID } from "node:crypto";
import {
  segments,
  type Asset,
  type Brief,
  type Principal,
  type Project,
  type Segment,
  type Strategy,
} from "./model";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const now = () => new Date().toISOString();
export const id = () => randomUUID();
export function text(
  value: unknown,
  name: string,
  max = 6000,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${name} is required`);
    return "";
  }
  if (typeof value !== "string" || value.length > max)
    throw new Error(`${name} must be text up to ${max} characters`);
  const out = value.trim();
  if (required && !out) throw new Error(`${name} is required`);
  return out;
}
export function publicUrl(value: unknown): string {
  const s = text(value, "URL", 2000);
  if (!s) return "";
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error("Use a public HTTPS URL");
  }
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !h.includes(".") ||
    h.includes(":") ||
    /^\d/.test(h) ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "localhost"
  )
    throw new Error("Use a public HTTPS URL");
  return u.href;
}
export function access(p: Project, a: Principal) {
  if (
    p.workspaceId !== a.workspaceId ||
    (a.role === "customer" && a.projectId !== p.id)
  )
    throw new Error("Forbidden: project access");
}
export function operator(a: Principal) {
  if (a.role !== "operator") throw new Error("Requires operator role");
}
export function strategyHash(s: Strategy): string {
  return digest(
    JSON.stringify({
      version: s.version,
      audience: s.audience,
      message: s.message,
      rationale: s.rationale,
      design: s.design,
      channels: s.channels,
      format: s.format,
      cta: s.cta,
      evidenceIds: s.evidenceIds,
      insightIds: s.insightIds,
      hypothesis: s.hypothesis,
      uncertainties: s.uncertainties,
    }),
  );
}
export function createProject(
  input: Record<string, unknown>,
  a: Principal,
  projectId: string = id(),
): Project {
  operator(a);
  const brief: Brief = {
    business: text(input.business, "business", 120, true),
    objective: text(input.objective, "objective", 1200, true),
    description: text(input.description, "description", 4000),
    website: publicUrl(input.website),
    contact: text(input.contact, "contact", 180, true),
    audience:
      text(input.audience, "audience", 600) ||
      "To be established through research",
    competitors: text(input.competitors, "competitors", 2000),
    inspiration: text(input.inspiration, "inspiration", 2000),
    brandColor: text(input.brandColor, "brandColor", 7) || "#ec663c",
  };
  if (input.logoData) {
    const logo = text(input.logoData, "logo", 45000);
    if (
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo) ||
      !Buffer.from(logo.split(",")[1], "base64")
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error("Logo must be a small PNG image");
    if (input.logoPermission !== "confirmed")
      throw new Error("Confirm permission to use this logo");
    brief.logoData = logo;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.contact))
    throw new Error("A valid approval contact email is required");
  if (!/^#[a-f\d]{6}$/i.test(brief.brandColor))
    throw new Error("Use a six-digit brand colour");
  return {
    id: projectId,
    workspaceId: a.workspaceId,
    createdAt: now(),
    updatedAt: now(),
    revision: 1,
    brief,
    sources: [],
    insights: [],
    strategies: [],
    tasks: [],
    assets: [],
    capabilities: [],
    audit: [
      {
        id: id(),
        at: now(),
        actor: a.subject,
        role: a.role,
        action: "brief_submitted",
        detail: "Customer brief recorded",
      },
    ],
    runs: [],
    processed: [],
  };
}
function latest(p: Project) {
  const s = p.strategies.at(-1);
  if (!s) throw new Error("Create a direction first");
  return s;
}
function approved(p: Project) {
  const s = latest(p);
  if (s.status !== "approved" || s.hash !== strategyHash(s))
    throw new Error("Customer-approved current direction required");
  return s;
}
function requireHash(hash: unknown, actual: string) {
  if (hash !== actual)
    throw new Error("This version changed; reload before approving");
}
export const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function wrap(s: string, max = 36) {
  const words = s.split(/\s+/);
  const lines: string[] = [""];
  for (const word of words) {
    if ((lines.at(-1)! + " " + word).trim().length > max && lines.at(-1))
      lines.push(word);
    else lines[lines.length - 1] += (lines.at(-1) ? " " : "") + word;
  }
  return lines.slice(0, 5);
}
function svg(p: Project, s: Strategy) {
  const lines = wrap(s.message);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="${escapeXml(s.message)}"><rect width="1080" height="1080" fill="#161d27"/><circle cx="920" cy="120" r="260" fill="${p.brief.brandColor}" opacity=".22"/>${p.brief.logoData ? `<image href="${p.brief.logoData}" x="800" y="60" width="200" height="100" preserveAspectRatio="xMidYMid meet"/>` : ""}<rect x="80" y="180" width="80" height="8" fill="${p.brief.brandColor}"/><text x="80" y="125" font-family="Arial,sans-serif" font-size="26" fill="#c6cbd1">${escapeXml(p.brief.business.toUpperCase())}</text>${lines.map((l, i) => `<text x="80" y="${300 + i * 82}" font-family="Arial,sans-serif" font-weight="700" font-size="60" fill="#ffffff">${escapeXml(l)}</text>`).join("")}<rect x="80" y="820" width="920" height="100" rx="16" fill="${p.brief.brandColor}"/><text x="112" y="882" font-family="Arial,sans-serif" font-size="28" fill="#111827">${escapeXml(s.cta.slice(0, 55))}</text><text x="80" y="1010" font-family="Arial,sans-serif" font-size="20" fill="#929aa7">${escapeXml(s.format)} · Creative concept · v${s.version}</text></svg>`;
}
function motion(p: Project, s: Strategy) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(p.brief.business)} — motion concept</title><style>body{margin:0;background:#111827;color:white;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}.frame{width:min(90vw,700px);aspect-ratio:1;position:relative;overflow:hidden;background:#161d27;border-radius:24px}.scene{position:absolute;inset:10%;display:flex;flex-direction:column;justify-content:center;opacity:0;animation:scene 15s infinite}.scene:nth-child(2){animation-delay:5s}.scene:nth-child(3){animation-delay:10s}small{color:${p.brief.brandColor};font-size:20px}h1{font-size:clamp(28px,6vw,55px);line-height:1.12}p{font-size:22px}.note{position:absolute;bottom:22px;left:10%;font-size:12px;color:#b7bec8}@keyframes scene{0%,30%{opacity:1;transform:translateY(0)}33%,100%{opacity:0;transform:translateY(15px)}}@media(prefers-reduced-motion:reduce){.scene{animation:none;position:static;opacity:1;padding:10%}.frame{aspect-ratio:auto}.note{position:static;padding:10%}}</style><main class="frame"><section class="scene"><small>${escapeXml(p.brief.business)}</small><h1>${escapeXml(s.message)}</h1></section><section class="scene"><small>THE IDEA</small><h1>${escapeXml(p.brief.objective)}</h1></section><section class="scene"><small>YOUR NEXT STEP</small><h1>${escapeXml(s.cta)}</h1></section><div class="note">15-second looping motion storyboard · creative concept · not a rendered video</div></main></html>`;
}
export function makeAsset(_p: Project, a: Asset) {
  return a.content;
}
export function transition(
  input: Project,
  c: Record<string, unknown>,
  a: Principal,
): Project {
  access(input, a);
  const p = structuredClone(input);
  const requestId = text(c.requestId, "requestId", 100);
  const type = text(c.type, "type", 60, true);
  const customerActions = [
    "approveStrategy",
    "requestStrategyChanges",
    "approveAsset",
    "requestAssetChanges",
  ];
  if (!customerActions.includes(type) && type !== "updateBrief") operator(a);
  if (customerActions.includes(type) && a.role !== "customer")
    throw new Error("Customer approval identity required");
  if (requestId && p.processed.includes(requestId)) return p;
  if (type === "updateBrief") {
    if (p.strategies.length)
      throw new Error(
        "Brief is locked after direction work begins; request a scoped change from Port67",
      );
    const checked = createProject(
      {
        ...p.brief,
        ...c,
        logoPermission:
          c.logoData === undefined || c.logoData === p.brief.logoData
            ? p.brief.logoData
              ? "confirmed"
              : c.logoPermission
            : c.logoPermission,
      },
      { ...a, role: "operator" },
      p.id,
    );
    p.brief = checked.brief;
  } else if (type === "addSource") {
    if (!segments.includes(c.segment as Segment))
      throw new Error("Invalid research segment");
    if (p.sources.length >= 150) throw new Error("Source limit reached");
    const kind =
      c.kind === "client_assertion"
        ? "client_assertion"
        : a.demo && c.kind === "synthetic"
          ? "synthetic"
          : "public_source";
    const url = publicUrl(c.url);
    if (kind === "public_source" && !url)
      throw new Error("Public source requires a URL");
    p.sources.push({
      id: id(),
      segment: c.segment as Segment,
      title: text(c.title, "title", 240, true),
      url,
      excerpt: text(c.excerpt, "excerpt", 6000, true),
      kind,
      status: "unreviewed",
      collectedAt: now(),
      method:
        kind === "client_assertion" ? "Customer supplied" : "Manual collection",
    });
  } else if (type === "reviewSource") {
    const source = p.sources.find((x) => x.id === c.id);
    if (!source) throw new Error("Source not found");
    if (c.status !== "supported" && c.status !== "rejected")
      throw new Error("Invalid review status");
    if (source.kind === "client_assertion" && c.status === "supported")
      throw new Error(
        "A client assertion cannot be marked independently supported",
      );
    source.status = c.status;
    // Revalidate the current direction after any evidence review; old versions remain history.
    if (p.strategies.length) {
      const previous = latest(p);
      const next = {
        ...previous,
        id: id(),
        version: p.strategies.length + 1,
        status: "draft" as const,
        createdAt: now(),
        approvedBy: undefined,
        approvedAt: undefined,
        feedback: undefined,
      };
      next.evidenceIds = next.evidenceIds.filter((e) =>
        p.sources.some((x) => x.id === e && x.status === "supported"),
      );
      next.insightIds = p.insights
        .filter((i) => i.sourceIds.every((e) => next.evidenceIds.includes(e)))
        .map((i) => i.id);
      next.hash = strategyHash(next);
      p.strategies.push(next);
    }
  } else if (type === "addInsight") {
    const sourceIds = Array.isArray(c.sourceIds)
      ? c.sourceIds.filter((x): x is string => typeof x === "string")
      : [];
    if (
      !sourceIds.length ||
      sourceIds.length > 20 ||
      sourceIds.some(
        (e) => !p.sources.some((s) => s.id === e && s.status === "supported"),
      )
    )
      throw new Error("Insights require reviewed sources from this project");
    if (p.insights.length >= 80) throw new Error("Insight limit reached");
    p.insights.push({
      id: id(),
      title: text(c.title, "title", 200, true),
      interpretation: text(c.interpretation, "interpretation", 3000, true),
      sourceIds,
      confidence:
        c.confidence === "strong"
          ? "strong"
          : c.confidence === "moderate"
            ? "moderate"
            : "limited",
      createdAt: now(),
    });
  } else if (type === "draftStrategy") {
    if (p.strategies.length >= 50)
      throw new Error("Direction version limit reached");
    const evidence = p.sources.filter((x) => x.status === "supported");
    const old = p.strategies.at(-1);
    const s: Strategy = {
      id: id(),
      version: p.strategies.length + 1,
      status: "draft",
      audience:
        text(c.audience, "audience", 1200) || old?.audience || p.brief.audience,
      message:
        text(c.message, "message", 600) || old?.message || p.brief.objective,
      rationale:
        text(c.rationale, "rationale", 6000) ||
        old?.rationale ||
        (evidence.length
          ? `Working recommendation based on ${evidence.length} reviewed source(s). Explain the insight-to-message connection before sharing.`
          : "Brief-led proposal only. Research has not established customer motivations or market fit; validate before making factual claims."),
      design:
        text(c.design, "design", 3000) ||
        old?.design ||
        "Clear typography, generous space and restrained motion. Use the approved brand colour; validate imagery and accessibility with the customer.",
      channels:
        text(c.channels, "channels", 600) ||
        old?.channels ||
        "Propose after audience research",
      format:
        text(c.format, "format", 600) ||
        old?.format ||
        "Square social concept + 15-second motion storyboard",
      cta: text(c.cta, "cta", 100) || old?.cta || "Discover more",
      evidenceIds: evidence.map((x) => x.id),
      insightIds: p.insights
        .filter((i) =>
          i.sourceIds.every((e) => evidence.some((s) => s.id === e)),
        )
        .map((i) => i.id),
      hypothesis:
        text(c.hypothesis, "hypothesis", 2000) ||
        old?.hypothesis ||
        "Clearer communication may improve qualified interest; measure after publication.",
      uncertainties:
        text(c.uncertainties, "uncertainties", 3000) ||
        old?.uncertainties ||
        "Audience, channel fit and performance are unverified. No commercial outcome is guaranteed.",
      createdAt: now(),
      hash: "",
    };
    s.hash = strategyHash(s);
    p.strategies.push(s);
  } else if (type === "shareStrategy") {
    const s = latest(p);
    if (s.status !== "draft")
      throw new Error("Only draft directions can be shared");
    if (
      !s.evidenceIds.length ||
      !s.insightIds.length ||
      !s.evidenceIds.every((e) =>
        p.sources.some(
          (source) => source.id === e && source.status === "supported",
        ),
      ) ||
      !s.insightIds.every((e) =>
        p.insights.some(
          (insight) =>
            insight.id === e &&
            insight.sourceIds.every((source) => s.evidenceIds.includes(source)),
        ),
      )
    )
      throw new Error(
        "Share a direction only after linking reviewed evidence and an interpreted insight",
      );
    if (!s.rationale || !s.design)
      throw new Error("Reasoning and design are required");
    s.status = "shared";
  } else if (type === "approveStrategy" || type === "requestStrategyChanges") {
    const s = latest(p);
    requireHash(c.hash, s.hash);
    if (s.status !== "shared")
      throw new Error("Direction must be shared for review");
    s.status = type === "approveStrategy" ? "approved" : "changes_requested";
    s.feedback = text(c.feedback, "feedback", 2000, type !== "approveStrategy");
    if (s.status === "approved") {
      s.approvedBy = a.subject;
      s.approvedAt = now();
    }
  } else if (type === "produce") {
    const s = approved(p);
    if (p.tasks.some((t) => t.strategyId === s.id))
      throw new Error(
        "Drafts already exist for this direction; create a new direction version for rework",
      );
    const kinds = ["svg", "motion", "copy"] as const;
    kinds.forEach((kind, i) => {
      const task = {
        id: id(),
        role: productionCapabilities[i].name,
        strategyId: s.id,
        strategyHash: s.hash,
        evidenceIds: [...s.evidenceIds],
        instructions: `${s.message}\nAudience: ${s.audience}\nDesign: ${s.design}\nFormat: ${s.format}\nCTA: ${s.cta}\nBrand: ${p.brief.brandColor}\nConstraints: no unsupported claims; licensed original assets only.`,
        acceptance: [
          "Matches approved direction hash",
          "No unsupported factual claims",
          "Customer approval before delivery",
        ],
        status: "draft_created" as const,
        agentVersion:
          productionCapabilities[i].id +
          "/" +
          productionCapabilities[i].version,
      };
      p.tasks.push(task);
      const content =
        kind === "svg"
          ? svg(p, s)
          : kind === "motion"
            ? motion(p, s)
            : `# ${p.brief.business} — creative copy\n\nHook: ${s.message}\n\nObjective: ${p.brief.objective}\n\nCTA: ${s.cta}\n\n## Motion beats (15-second concept)\n0–5s: Brand and hook\n5–10s: Campaign objective, illustrated with approved brand elements\n10–15s: Call to action\n\n## Production brief\n${task.instructions}\n\n## Evidence and limitations\n${s.rationale}\n${s.uncertainties}\n\nTemplate-generated creative draft; human production/claims review required.\n`;
      p.assets.push({
        id: id(),
        version: p.assets.filter((x) => x.kind === kind).length + 1,
        kind,
        title: ["Social artwork", "Motion storyboard", "Copy & script"][i],
        strategyId: s.id,
        strategyHash: s.hash,
        taskId: task.id,
        evidenceIds: [...s.evidenceIds],
        status: "draft",
        content,
        hash: digest(content),
        createdAt: now(),
      });
    });
  } else if (
    type === "shareAsset" ||
    type === "approveAsset" ||
    type === "requestAssetChanges"
  ) {
    const asset = p.assets.find((x) => x.id === c.id);
    if (!asset) throw new Error("Asset not found");
    const s = approved(p);
    if (asset.strategyHash !== s.hash)
      throw new Error("Asset depends on superseded direction");
    if (type === "shareAsset") {
      if (asset.status !== "draft")
        throw new Error("Only draft assets can be shared");
      asset.status = "shared";
    } else {
      requireHash(c.hash, asset.hash);
      if (asset.status !== "shared")
        throw new Error("Asset must be shared for review");
      asset.feedback = text(
        c.feedback,
        "feedback",
        2000,
        type === "requestAssetChanges",
      );
      asset.status = type === "approveAsset" ? "approved" : "changes_requested";
      if (asset.status === "approved") {
        asset.approvedBy = a.subject;
        asset.approvedAt = now();
      }
    }
  } else if (type === "proposeCapability") {
    if (p.capabilities.length >= 30)
      throw new Error("Capability proposal limit reached");
    p.capabilities.push({
      id: id(),
      name: text(c.name, "name", 120, true),
      reason: text(c.reason, "reason", 2000, true),
      status: "proposed",
      evaluation:
        "Pending: input/output contracts, rights, permissions, data policy, cost ceiling, regression fixtures and operator promotion review.",
      createdAt: now(),
    });
  } else throw new Error("Unsupported command");
  if (requestId) p.processed.push(requestId);
  p.revision++;
  p.updatedAt = now();
  p.audit.push({
    id: id(),
    at: now(),
    actor: a.subject,
    role: a.role,
    action: type,
    detail: `Revision ${p.revision}`,
  });
  return p;
}
export function projectView(input: Project, a: Principal): Project {
  access(input, a);
  const p = structuredClone(input);
  if (a.role === "operator") return p;
  p.deliveryPaused = p.strategies.at(-1)?.status !== "approved";
  p.strategies = p.strategies.filter((s) => s.status !== "draft");
  const visible = new Set(p.strategies.flatMap((s) => s.evidenceIds));
  p.sources = p.sources.filter(
    (s) => visible.has(s.id) && s.status === "supported",
  );
  p.assets = p.assets.filter(
    (x) =>
      x.status !== "draft" && p.strategies.some((s) => s.id === x.strategyId),
  );
  p.insights = p.insights.filter((i) =>
    p.strategies.some((s) => s.insightIds.includes(i.id)),
  );
  p.tasks = [];
  p.capabilities = [];
  p.audit = [];
  p.runs = [];
  p.processed = [];
  return p;
}
