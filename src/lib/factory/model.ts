import type { ApiCall, Pricing } from "./costs";
import type { ResearchScope, ScopeEntry } from "./scope";
export const segments = [
  "brand",
  "customer",
  "competitor",
  "creative",
] as const;
export type Segment = (typeof segments)[number];
export type Principal = {
  accountId?: string;
  identity?: "firebase";
  /** Verified sign-in email, shown only to its owner in the account menu. */
  email?: string;
  admin?: boolean;
  issuedAt?: number;
  subject: string;
  workspaceId: string;
  role: "operator" | "customer";
  projectId?: string;
  demo?: boolean;
  expires?: number;
};
export type Brief = {
  business: string;
  objective: string;
  description: string;
  website: string;
  contact: string;
  audience: string;
  competitors: string;
  inspiration: string;
  brandColor: string;
  logoData?: string;
};
/** The four walled-garden producer reviewers. Each sees only its own inputs. */
export type ReviewGate = "scope" | "sources" | "insights" | "direction";
export type ReviewRecord = {
  id: string;
  at: string;
  gate: ReviewGate;
  /** "ai" when a model made the judgement, "rules" when only the free checks ran (no model, no authorisation, or limit reached). */
  by: "ai" | "rules";
  provider?: string;
  model?: string;
  runId?: string;
  /** What was reviewed: scope version, a source batch, insight ids or the direction hash. */
  subject: string;
  verdict: "pass" | "rework" | "hold";
  summary: string;
  /** Guidance for the redraft when the verdict is rework. */
  notes?: string;
  items: { id: string; verdict: "accept" | "reject"; reason: string }[];
  /** Why the model was not used, when by is rules. */
  skipped?: string;
};
export type Source = {
  accountId?: string;
  projectId?: string;
  researchRunId?: string;
  contextHash?: string;
  id: string;
  segment: Segment;
  title: string;
  url: string;
  excerpt: string;
  kind: "public_source" | "client_assertion" | "synthetic";
  status: "unreviewed" | "supported" | "rejected";
  collectedAt: string;
  method: string;
  /** Claim-level findings from grounded research, each tied to this source's URL. */
  findings?: { claim: string; quote?: string }[];
  confidence?: "limited" | "moderate" | "strong";
};
export type Insight = {
  accountId?: string;
  projectId?: string;
  status?: "draft" | "reviewed" | "rejected";
  generatedByRunId?: string;
  id: string;
  title: string;
  interpretation: string;
  sourceIds: string[];
  confidence: "limited" | "moderate" | "strong";
  createdAt: string;
};
/** A message the campaign will say, the proof behind it, and the reviewed sources that support that proof. */
export type KeyMessage = { message: string; proof: string; sourceIds: string[] };
export type Strategy = {
  accountId?: string;
  projectId?: string;
  generatedByRunId?: string;
  id: string;
  version: number;
  status: "draft" | "shared" | "approved" | "changes_requested";
  audience: string;
  message: string;
  rationale: string;
  design: string;
  channels: string;
  format: string;
  cta: string;
  evidenceIds: string[];
  insightIds: string[];
  hypothesis: string;
  uncertainties: string;
  /** Richer strategy fields. Optional so earlier directions stay valid and keep their fingerprints. */
  positioning?: string;
  audienceSegments?: string;
  keyMessages?: KeyMessage[];
  tone?: string;
  doNotClaim?: string;
  createdAt: string;
  hash: string;
  feedback?: string;
  approvedBy?: string;
  approvedAt?: string;
};
export type ProductionTask = {
  accountId?: string;
  projectId?: string;
  id: string;
  role: string;
  strategyId: string;
  strategyHash: string;
  evidenceIds: string[];
  instructions: string;
  acceptance: string[];
  status: "ready" | "draft_created";
  agentVersion: string;
};
export type Asset = {
  accountId?: string;
  projectId?: string;
  id: string;
  version: number;
  kind: "svg" | "motion" | "copy";
  title: string;
  strategyId: string;
  strategyHash: string;
  taskId: string;
  evidenceIds: string[];
  status: "draft" | "shared" | "approved" | "changes_requested";
  content: string;
  hash: string;
  createdAt: string;
  feedback?: string;
  approvedBy?: string;
  approvedAt?: string;
};
/** A rendered MP4 of an approved motion storyboard. The file is stored outside the workspace document. */
export type Video = {
  id: string;
  assetId: string;
  assetHash: string;
  strategyHash: string;
  key: string;
  bytes: number;
  /** Square edge in pixels; drafts are 480 and HD is rendered on request. */
  size?: number;
  seconds: number;
  createdAt: string;
  createdBy: string;
};
export type Capability = {
  accountId?: string;
  projectId?: string;
  id: string;
  name: string;
  reason: string;
  status: "proposed";
  evaluation: string;
  createdAt: string;
};
export type Audit = {
  accountId?: string;
  projectId?: string;
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  detail: string;
};
export type ResearchRun = {
  accountId?: string;
  projectId?: string;
  capabilityId?: string;
  capabilityVersion?: string;
  stage?: "scope" | "review" | "research" | "insights" | "strategy" | "content";
  inputHash?: string;
  sourceIds?: string[];
  leaseExpiresAt?: string;
  contextHash?: string;
  contextSnapshot?: Brief;
  providerRequestId?: string;
  usageStatus?: "recorded" | "unknown";
  id: string;
  at: string;
  status: "running" | "completed" | "failed";
  segment?: Segment;
  provider: string;
  model: string;
  usage?: Record<string, number>;
  finishedAt?: string;
  /** What the researcher looked for and could not find or confirm. */
  gaps?: string[];
  error?: string;
  /** When a research call ran but returned nothing citable: the start of what the model wrote, for the producer only. Never used as evidence. */
  note?: string;
};
export type Project = {
  accountId?: string;
  createdBy?: string;
  aiConsent?: {
    briefHash: string;
    dataClass: "PUBLIC";
    by: string;
    at: string;
  };
  aiAuthorised?: boolean;
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deliveryPaused?: boolean;
  brief: Brief;
  sources: Source[];
  insights: Insight[];
  strategies: Strategy[];
  tasks: ProductionTask[];
  assets: Asset[];
  videos?: Video[];
  /** Launch channels (IDs from channels.ts) chosen for this campaign; they steer research, direction and copy. */
  channels?: string[];
  /** Per research agent status, computed for the response only (never stored) so customers can follow progress without seeing run internals. */
  researchProgress?: { segment: Segment; status: "idle" | "running" | "completed" | "failed"; sources: number; at?: string }[];
  /** Test mode, computed for producers only: they may press the customer approval buttons (PORT67_PRODUCER_APPROVALS). */
  producerApprovals?: boolean;
  /** Why a requested research has not started, computed for the response only. Operators see the reason; customers see a neutral line. */
  researchNote?: string;
  /** The classification of the business and what each research agent should look for. Stored with the project so it can be read at any time. */
  scope?: ResearchScope;
  /** Earlier classifications, newest last, so a change of scope is traceable. */
  scopeHistory?: ScopeEntry[];
  /** The producer agent's state: where it stopped and why, the progress fingerprint it stopped at, and its step log. Producers and admins only. */
  producerAgent?: {
    passes: number;
    status: "waiting_customer" | "waiting_human" | "blocked" | "done";
    reason: string;
    at: string;
    lastFingerprint: string;
    log: { at: string; step: string; outcome: "done" | "failed"; detail: string }[];
    /** Rework budget used per gate since the last manual run. One redraft per gate, then a hand-over to a human. */
    reworks?: Partial<Record<ReviewGate, number>>;
    /** A reviewer sent work back: the next step redrafts it once with these notes. */
    pending?: { gate: "insights" | "direction"; notes: string };
    /** A reviewer's final word when the rework budget is spent: a human decides. */
    hold?: { gate: ReviewGate; subject: string; notes: string };
  };
  /** Every producer reviewer verdict with its reasons, newest last. Producers and admins only. */
  reviews?: ReviewRecord[];
  /** A customer's request for the producer to start research on the chosen channels. */
  researchRequest?: { at: string; by: string; channels: string[] };
  capabilities: Capability[];
  audit: Audit[];
  runs: ResearchRun[];
  processed: string[];
};
export type Invitation = {
  hash: string;
  projectId: string;
  workspaceId: string;
  expires: number;
  revoked: boolean;
};
export type Account = {
  id: string; ownerUid: string; email?: string; createdAt: string;
};
/** Port67 staff granted the producer role by the owner. Matched by the verified Firebase email. */
export type TeamMember = { email: string; addedBy: string; addedAt: string };
export type TeamAuditEntry = { at: string; actor: string; action: "add" | "remove"; email: string };
/** Which provider and exact model ID handles one job. API keys stay in deployment settings. */
export type AiRoute = { provider: "openai" | "anthropic" | "deepseek" | "gemini"; model: string };
export type AiRoutingConfig = {
  defaults?: { research?: AiRoute; synthesis?: AiRoute };
  slots?: Record<string, AiRoute>;
  /** Owner-entered USD prices keyed "provider:model"; these override PORT67_MODEL_PRICING_JSON. */
  pricing?: Record<string, Pricing>;
  updatedAt?: string;
  updatedBy?: string;
  history?: { at: string; actor: string; summary: string }[];
};
export type Database = {
  accounts?: Account[];
  aiRouting?: AiRoutingConfig;
  approvalMode?: { mode: "ai" | "manual"; updatedAt: string; updatedBy: string };
  team?: TeamMember[];
  teamAudit?: TeamAuditEntry[];
  apiCalls?: ApiCall[];
  ledgerArchives?: string[];
  schemaVersion: 1;
  projects: Project[];
  invitations: Invitation[];
};
