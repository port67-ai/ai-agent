export const segments = [
  "brand",
  "customer",
  "competitor",
  "creative",
] as const;
export type Segment = (typeof segments)[number];
export type Principal = {
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
};
export type Insight = {
  id: string;
  title: string;
  interpretation: string;
  sourceIds: string[];
  confidence: "limited" | "moderate" | "strong";
  createdAt: string;
};
export type Strategy = {
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
  createdAt: string;
  hash: string;
  feedback?: string;
  approvedBy?: string;
  approvedAt?: string;
};
export type ProductionTask = {
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
export type Capability = {
  id: string;
  name: string;
  reason: string;
  status: "proposed";
  evaluation: string;
  createdAt: string;
};
export type Audit = {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  detail: string;
};
export type ResearchRun = {
  leaseExpiresAt?: string;
  contextHash?: string;
  contextSnapshot?: Brief;
  providerRequestId?: string;
  usageStatus?: "recorded" | "unknown";
  id: string;
  at: string;
  status: "running" | "completed" | "failed";
  segment: Segment;
  provider: string;
  model: string;
  usage?: Record<string, number>;
  error?: string;
};
export type Project = {
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
export type Database = {
  schemaVersion: 1;
  projects: Project[];
  invitations: Invitation[];
};
