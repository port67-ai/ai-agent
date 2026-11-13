/** Reviewed, source-controlled capabilities. Runtime proposals cannot modify this registry. */
export interface CapabilityDefinition {
  id: string;
  version: string;
  name: string;
  kind: "research" | "human" | "template" | "synthesis";
  inputContract: string;
  outputContract: string;
  permissions: readonly string[];
  approvalRequired: boolean;
}
export const capabilityRegistry: readonly CapabilityDefinition[] = [
  {
    id: "scope.business",
    version: "1.0.0",
    name: "Scoping agent",
    kind: "synthesis",
    inputContract: "Authorised PUBLIC ProjectBrief + launch channels; no tools, no web search",
    outputContract: "ResearchScope/1.0: classification and per-agent questions, saved on the project",
    permissions: ["model-call-public-data"],
    approvalRequired: false,
  },
  ...(["brand", "customer", "competitor", "creative"] as const).map(
    (segment) => ({
      id: `research.${segment}`,
      version: "1.0.0",
      name: `${segment[0].toUpperCase() + segment.slice(1)} researcher`,
      kind: "research" as const,
      inputContract: "Scoped ProjectBrief/1.0; no sibling outputs",
      outputContract: "Unreviewed cited Source[]/1.0",
      permissions: ["public-web-search"],
      approvalRequired: true,
    }),
  ),
  {
    id: "strategy.direction",
    version: "1.0.0",
    name: "Campaign strategist",
    kind: "human",
    inputContract: "Reviewed Source[] + Insight[] + ProjectBrief",
    outputContract: "CampaignStrategy/1.0",
    permissions: [],
    approvalRequired: true,
  },
  {
    id: "analysis.insights",
    version: "1.0.0",
    name: "Insight draft analyst",
    kind: "synthesis",
    inputContract: "Authorised PUBLIC brief + reviewed public Source[]",
    outputContract: "Unreviewed InsightDraft[]/1.0",
    permissions: ["model-call-public-data"],
    approvalRequired: true,
  },
  {
    id: "drafting.direction",
    version: "1.0.0",
    name: "Campaign direction drafter",
    kind: "synthesis",
    inputContract:
      "Authorised PUBLIC brief + reviewed Source[] + accepted Insight[]",
    outputContract: "Unshared CampaignStrategy/1.0",
    permissions: ["model-call-public-data"],
    approvalRequired: true,
  },
  {
    id: "drafting.content",
    version: "1.0.0",
    name: "Copy pack drafter",
    kind: "synthesis",
    inputContract: "Approved CampaignStrategy/1.0 with key messages + its reviewed Source[]",
    outputContract: "Unshared channel copy pack Asset/1.0",
    permissions: ["model-call-public-data"],
    approvalRequired: true,
  },
  {
    id: "orchestration.producer",
    version: "1.0.0",
    name: "Producer agent",
    kind: "template",
    inputContract: "Project record: sources, insights, direction, production drafts, asset statuses",
    outputContract: "Audited producer steps; stops at customer approval gates",
    permissions: ["write-scoped-draft"],
    approvalRequired: false,
  },
  {
    id: "production.visual",
    version: "1.0.0",
    name: "Visual designer",
    kind: "template",
    inputContract: "Approved CampaignStrategy/1.0",
    outputContract: "SVG Asset/1.0",
    permissions: ["write-scoped-draft"],
    approvalRequired: true,
  },
  {
    id: "production.motion",
    version: "1.0.0",
    name: "Motion designer",
    kind: "template",
    inputContract: "Approved CampaignStrategy/1.0",
    outputContract: "HTML motion storyboard Asset/1.0",
    permissions: ["write-scoped-draft"],
    approvalRequired: true,
  },
  {
    id: "production.copy",
    version: "1.0.0",
    name: "Copywriter",
    kind: "template",
    inputContract: "Approved CampaignStrategy/1.0",
    outputContract: "Markdown copy/script Asset/1.0",
    permissions: ["write-scoped-draft"],
    approvalRequired: true,
  },
];
export const productionCapabilities = capabilityRegistry.filter((c) =>
  c.id.startsWith("production."),
);
export interface AgentExecutionRequest {
  schemaVersion: "1.0";
  taskId: string;
  projectId: string;
  workspaceId: string;
  capabilityId: string;
  capabilityVersion: string;
  contextHash: string;
  sourceIds: string[];
  input: unknown;
  provider: string;
  model: string;
  limits: {
    maxOutputTokens: number;
    timeoutMs: number;
    maxInvocations: number;
  };
}
export interface AgentExecutionResult {
  schemaVersion: "1.0";
  taskId: string;
  status: "completed" | "failed" | "blocked";
  sourceIds: string[];
  artifactIds: string[];
  usage: Record<string, number>;
  warnings: string[];
}
// Future harness adapters must implement the same bounded interface and pass isolation/usage/schema tests.
export interface AgentHarness {
  id: string;
  version: string;
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}
