import type { ApiCall, Pricing } from "./costs";
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
  stage?: "research" | "insights" | "strategy" | "content";
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
  team?: TeamMember[];
  teamAudit?: TeamAuditEntry[];
  apiCalls?: ApiCall[];
  ledgerArchives?: string[];
  schemaVersion: 1;
  projects: Project[];
  invitations: Invitation[];
};
