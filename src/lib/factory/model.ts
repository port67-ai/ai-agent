import type { ApiCall, Pricing } from "./costs";
import type { BudgetSettings } from "./budget";
import type { SegmentEvidence, SourceGrade } from "./evidence";
import type { ResearchScope, ScopeEntry } from "./scope";
export const segments = [
  "brand",
  "customer",
  "competitor",
  "creative",
  "adjacent",
  "trends",
  "video",
  "channel",
  "offer",
  "measurement",
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
  /** Explicit requested journey; omitted on legacy projects. */
  workRequest?: "campaign" | "research";
  /** Customer's requested outputs; producer format confirmation remains a later gate. */
  requestedFormats?: string[];
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
  /** Optional. Where the business operates or sells. Only stored when filled in. */
  market?: string;
  /** Optional. What makes the offer different. */
  differentiators?: string;
  /** Optional. Proof the business already has: reviews, awards, case studies, numbers it can stand behind. */
  proof?: string;
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
  items: { id: string; verdict: "accept" | "reject"; reason: string; score?: number }[];
  /** 0 to 100: how well the reviewed work fits its own evidence and the brief. Only set when a model judged it; the free checks do not score. */
  score?: number;
  /** Claims, figures or messages the reviewer could not trace to the evidence it was given. A pass is never given while any remain. */
  unsupported?: string[];
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
  /** Admiralty and CRAAP grade, computed for producers when the project is viewed. Never stored. */
  videoAnalysis?: import("./video-intelligence").VideoAnalysis;
  grade?: SourceGrade;
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
  kind: "svg" | "motion" | "copy" | "grid";
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
  planningContextKey?: string;
  researchTaskKey?: string;
  taskInputKey?: string;
  accountId?: string;
  projectId?: string;
  capabilityId?: string;
  capabilityVersion?: string;
  stage?: "scope" | "review" | "research" | "insights" | "strategy" | "content" | "formats" | "ideas" | "audiences" | "planning" | "medium" | "studio";
  inputHash?: string;
  sourceIds?: string[];
  leaseExpiresAt?: string;
  contextHash?: string;
  contextSnapshot?: Brief;
  /** Frozen public research context (brief fields, channels, scope and skill version). */
  contextBundle?: Record<string, unknown>;
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
  /** Studio runs (CHG-0100): the piece a test frame, keyframe, still or piece rerun was for, so a failure can be rerun piece by piece. */
  pieceId?: string;
  /** Studio runs (CHG-0100): set when the run fulfilled a recorded rerun request. */
  rerunRequestId?: string;
};
/** Video advert track (PRD 25.5). Phase 1 is planning only: treatment, shot list, Continuity Profile, deterministic prompts. No vendor is called. */
export type AdvertRef = { kind: "character" | "location" | "prop"; label: string };
export type AdvertShot = {
  id: string;
  n: number;
  /** Index into the approved direction's key messages that this shot expresses. */
  keyMessage: number;
  sourceIds: string[];
  seconds: number;
  scene: string;
  action: string;
  dialogue: string;
  onScreen: string;
  refs: AdvertRef[];
  overrides?: { lighting?: string; lens?: string };
};
export type Continuity = {
  /** Hex colours, most important first. */
  palette: string[];
  lighting: string;
  cameraBody: string;
  lens: string;
  aspect: "16:9" | "9:16" | "1:1" | "4:5";
  grade: string;
  /** Values are estimates until a producer confirms them. */
  confidence: "estimate" | "confirmed";
  source: "template" | "producer";
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
};
export type AdvertPlan = {
  id: string;
  version: number;
  strategyHash: string;
  status: "draft" | "shared" | "approved" | "changes_requested";
  treatment: { creativeDirection?: string; title: string; logline: string; story: string; tone: string; durationSec: number; music: { atSec: number; cue: string }[] };
  shots: AdvertShot[];
  continuity: Continuity;
  createdAt: string;
  hash: string;
  feedback?: string;
  approvedBy?: string;
  approvedAt?: string;
};
/** An ad idea in the ideas bank. A producer keeps or drops each one. */
export type Idea = {
  id: string; title: string; format: string; keyMessage: number; segment?: string; hook: string; angle: string;
  criteria: string[]; productionNotes: string; sourceIds: string[]; rank: number;
  by?: "ai" | "rules"; status: "proposed" | "kept" | "dropped"; priority: "high" | "medium" | "low"; createdAt: string; decidedBy?: string;
};
/**
 * Studio stages (CHG-0097, docs/superpowers/specs/2026-11-20-studio-stages-design.md). Four gated stages and two offers.
 * Large binaries never live in the project document: only a StudioAssetRef pointing at the private file store.
 */
export type StudioOffer = "scene_pack" | "hook_pack";
export type ParkedOffer = "hero_spot" | "creator_localisation" | "b2b_trailer";
export type StudioStage = "intake" | "strategy" | "preproduction" | "production";
export type StudioGateStatus = "locked" | "active" | "approved" | "stale";
export type StudioGate = { stage: StudioStage; status: StudioGateStatus; approvedBy?: string; approvedAt?: string; onBehalfOfClient?: boolean; note?: string; /** Piece B: what still blocked a plain approval when the gate was approved with a note. */ gaps?: string[]; history: { at: string; by: string; action: "approve" | "approve_with_note" | "reopen" | "stale"; note?: string; gaps?: string[] }[] };
export type StudioAssetRef = {
  id: string; name: string; mime: string; bytes: number; storageKey: string; uploadedAt: string; uploadedBy: string; rights?: { source: string; licence: string; confirmedBy?: string }; aiDisclosure?: "ai_generated" | "ai_edited" | "none";
  /** Piece C: pixel size (and length for video) read from the file's own header when it was stored; absent on older files. */
  width?: number; height?: number; seconds?: number;
};
export type StudioBrief = {
  client: { businessName: string; website: string; sector?: string; markets?: string; approverName: string; approverEmail: string };
  project: { name: string; quantity?: number; deadline?: string };
  brandKit: { logo?: StudioAssetRef; colours: string[]; fonts: string[]; tone: string; avoid: string };
  references: { liked: string[]; disliked: string[]; mood: StudioAssetRef[] };
  product: { url: string; names: string; benefits: string; offer: string; cta: string };
  assets: { packshots: StudioAssetRef[]; clips: StudioAssetRef[] };
  socials: Partial<Record<"instagram" | "tiktok" | "youtube" | "facebook" | "pinterest" | "linkedin" | "x", string>>;
  themes: string[];
};
export type StudioPieceStatus = "draft" | "changes_requested" | "approved" | "stale";
export type StudioPieceVersion = { n: number; text?: string; image?: StudioAssetRef; createdAt: string; createdBy: string; source: "ai" | "human" | "upload"; runId?: string; brief?: string };
export type StudioComment = { id: string; at: string; by: string; text: string; region?: { x: number; y: number; w: number; h: number }; resolved?: boolean };
export type StudioPiece = { id: string; stage: StudioStage; kind: string; title: string; status: StudioPieceStatus; dependsOn: string[]; versions: StudioPieceVersion[]; comments: StudioComment[]; aiDisclosure?: "ai_generated" | "ai_edited" | "none" };
/** Piece A extension: a recorded request to redraw one piece. Piece B's generator fulfils it (see studio-rerun.ts). */
export type StudioRerunRequest = { id: string; pieceId: string; at: string; by: string; brief: string; instruction?: string; impact: string[]; status: "pending" | "running" | "done" | "failed"; finishedAt?: string; runId?: string; error?: string };
/** A person's confirmation, tied to a fingerprint of what was confirmed: it lapses when that changes. */
export type StudioConfirmation = { by: string; at: string; fingerprint: string; note?: string };
/** A rights record the producer adds for something that is not an uploaded file (music, voice, font) or for a file missing its rights. */
export type StudioRightsRecord = { id: string; kind: "music" | "voice" | "font" | "footage" | "image" | "other"; name: string; source: string; licence: string; usedIn?: string; addedBy: string; addedAt: string };
/** Go-to-market records for Stage 4 (piece C, CHG-0099). Computed checks live in studio-gtm.ts; only decisions are stored. */
export type StudioGtm = {
  /** Producer confirmed the pack scope (quantities, ratios, revision rounds) against the offer. */
  scope?: StudioConfirmation;
  /** Rights records for music, voice, fonts and anything else used that is not an uploaded file. */
  rights: StudioRightsRecord[];
  /** Rights filled in for an uploaded or generated file that had none, keyed by asset id. */
  assetRights: Record<string, { source: string; licence: string; by: string; at: string }>;
  /** Claim flags the producer cleared, keyed by flag id, with the reason. */
  claimClearances: Record<string, { reason: string; by: string; at: string; text: string; pieceId: string }>;
  /** Producer confirmed the AI disclosure tags and the per-channel disclosure lines. */
  disclosure?: StudioConfirmation;
  /** Per piece: spec exceptions, safe-zone checks and product accuracy spot checks, each tied to the piece's current version. */
  specs: Record<string, StudioConfirmation>;
  safeZones: Record<string, StudioConfirmation>;
  productAccuracy: Record<string, StudioConfirmation>;
  /** Production pieces a producer marked as winners after the results came in; the next cycle carries them as liked references. */
  winners: string[];
  /** Motion loops chosen for a Scene Pack (offer option, 0 to 10). */
  loops?: number;
  /** The next cycle started from this project. */
  nextCycle?: { projectId: string; at: string; by: string };
  /** The project this one continues, when it was started with Start next cycle. */
  previousCycle?: { projectId: string; name: string };
};
export type StudioState = {
  schemaVersion: 1; offer: StudioOffer; stage: StudioStage | "delivered"; brief: StudioBrief; briefVersion: number;
  gates: Record<StudioStage, StudioGate>; pieces: StudioPiece[];
  /** Piece C: go-to-market records (what a person decided). Everything that can be computed is computed from the pieces (studio-gtm.ts). */
  gtm?: StudioGtm;
  /** Rerun requests, newest last. Producers only; removed from customer views. */
  rerunRequests?: StudioRerunRequest[];
  /** Piece B: client stages a producer has opened for client review. Until then customers do not see that stage's pieces. */
  readyForClient?: Partial<Record<StudioStage, { at: string; by: string }>>;
};
export type Project = {
  /** Present only on studio projects (four gated stages). Legacy projects have no studio field and keep today's flow. */
  studio?: StudioState;
  performance?: import("./performance").PerformanceRecord[];
  researchPlanning?: import("./research-planner").ResearchPlanning;
  mediumSelection?: import("./medium-selection").MediumSelection;
  mediumDecision?: { at: string; by: string; rationale: string; recommendationVersion?: number; formats: string[]; requestedFormats: string[] };
  /** Operator projection only: compact optimistic concurrency token for a medium decision. */
  mediumContextHash?: string;
  taskPlan?: import("./task-plan").TaskPlan;
  /** Customer-safe progress, without agent instructions, private costs or plan history. */
  taskProgress?: { id: string; title: string; status: string }[];
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
  /** Ad formats: what the system suggested after the insight review and what a producer chose. Drives direction, copy and the video track. */
  formats?: { suggested: { id: string; score: number; reason: string }[]; suggestedAt: string; suggestedBy?: "ai" | "rules"; selected: string[]; decidedBy?: string; decidedAt?: string };
  /** The strapline (the one message every ad carries) and the demographics the brand is tailored to. */
  audiences?: { strapline: string; segments: { id: string; name: string; description: string; angle: string; demographics?: string }[]; updatedAt: string; updatedBy: string };
  /** What the AI audience agent suggested from the research. A producer reads it and copies what to keep into the strapline and segments; nothing is applied automatically. */
  /** Operator view only: this project's stored size in bytes and its biggest parts. */
  storage?: { bytes: number; limitBytes: number; parts: { name: string; bytes: number; count?: number }[] };
  audienceSuggestion?: { straplines: { text: string; why: string }[]; segments: { name: string; demographics: string; description: string; angle: string; sourceIds: string[] }[]; suggestedAt: string; by: "ai" };
  /** The ideas bank. */
  ideas?: Idea[];
  /** The weekly research pack, computed for producers when the project is viewed. Never stored. */
  researchPack?: { generatedAt: string; sections: { title: string; items: string[] }[]; actions: { rank: number; text: string }[] };
  /** The current video advert plan for the approved direction. Customers see it only once shared. */
  advert?: AdvertPlan;
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
    /** Weak research segments the producer already sent back to its researcher once, with guidance. */
    researchRetries?: Partial<Record<Segment, number>>;
    /** Weak evidence the producer found: warnings for people, never a block. Newest last. */
    warnings?: { at: string; gate: string; text: string }[];
  };
  /** GRADE-style evidence rating per research segment, computed for producers when the project is viewed. Never stored. */
  evidence?: { segments: SegmentEvidence[] };
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
/**
 * Video workspace (CHG-0103, FAC-VWS-004 to 007): a customer account is a producer-managed company record, and the company is the brand.
 * No sign-in belongs to it. All records live in the system workspace `factory-customers`; files live in the private file store.
 */
export type SocialPlatform = "x" | "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin" | "pinterest";
export type RedLineCategory = "topic" | "competitor" | "person_or_brand" | "phrase" | "visual";
export type RedLine = { id: string; category: RedLineCategory; text: string; reason?: string; addedBy: string; addedAt: string; updatedAt?: string };
export type BrandPurposeFile = {
  id: string; name: string; mime: string; bytes: number; storageKey: string; uploadedAt: string; uploadedBy: string;
  /** The producer's confirmation that Port67 may hold and use the file. Required for every upload. */
  rights: { confirmedBy: string; at: string };
  /** Present only after a producer explicitly authorises models to read this file's content (FAC-VWS-006). */
  modelAuthorisation?: { authorisedBy: string; at: string };
};
export type BrandIntelSource = { url: string; title: string };
/** One run of the Brand Intelligence agent. Section texts are model output with bracketed source tags; redLines is the intake list copied verbatim. */
export type BrandIntelVersion = {
  id: string; customerId: string; version: number;
  status: "running" | "completed" | "failed";
  startedAt: string; startedBy: string; finishedAt?: string;
  /** Sections "0" to "6" of the dossier blueprint. */
  sections: Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7", string>>;
  redLines: { category: string; text: string; reason: string }[];
  /** What the agent was and was not given, so a reader can judge the dossier. */
  intake: { name: string; website: string; socials: Record<string, string>; purposeTextRead: boolean; knownForRead: boolean; filesNotRead: string[] };
  sources: BrandIntelSource[]; searchQueries: string[]; warnings: string[];
  provider?: string; model?: string; calls: number; error?: string;
};
export type CustomerAudit = { id: string; at: string; actor: string; action: string; detail: string };
export type CustomerAccount = {
  id: string; name: string; website: string;
  socials: Partial<Record<SocialPlatform, string>>;
  redLines: RedLine[];
  brandPurpose: BrandPurposeFile[];
  /** Typed brand purpose and what the brand is known for (CHG-0105, FAC-VWS-010). Read by models only after a producer authorises it. */
  purposeText?: string;
  knownFor?: string;
  textAuthorisation?: { authorisedBy: string; at: string };
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string;
  audit: CustomerAudit[];
};
/**
 * Video workspace commissions (CHG-0107, FAC-VWS-011 to 016): one piece of work for a customer account, starting with the
 * Inspiration baseline. Stored per customer account in the system workspace `factory-commissions-<customer id>`.
 */
export type CommissionInput = "objective" | "product" | "audience" | "brand";
export type EvidenceBasis = "announced" | "client_confirmed" | "inference";
export type EvidenceItem = { id: string; input: CommissionInput; source: string; where: string; note: string; basis: EvidenceBasis; addedBy: string; addedAt: string };
export type BrandListEntry = { id: string; text: string; scope: "recurring" | "single_campaign"; kind?: "can_change" | "out_of_character"; addedBy: string; addedAt: string };
export type AgentPromptVersion = { body: string; version: number; by: string; at: string };
export type AgentPromptRecord = { current?: AgentPromptVersion; history: AgentPromptVersion[] };
/** What an input agent found besides the answers: labelled sections and the sources it used. Replaced each time the agent runs. */
export type AiNotes = { sections: { title: string; text: string }[]; sources: { title: string; url: string }[]; generatedAt: string; by: string; model: string };
/** Video steps (CHG-0115). A plan belongs to one project and one age group that was selected for direction. */
export type VideoReference = { id: string; title: string; link: string; why: string; palette: string; composition: string; camera: string; film: string; lens: string; searchTerms: string; source: "producer" | "ai"; accepted: boolean; addedBy: string; addedAt: string };
export type VideoShot = { seconds: number; visual: string; line: string; onScreen: string };
export type VideoScript = { template: "15" | "30" | "60" | "custom"; title: string; shots: VideoShot[]; creativeBrief?: string; narrative?: string; savedBy: string; savedAt: string };
export type VideoChat = { id: string; at: string; by: string; instruction: string; reply: string };
/** One image in a project's library, used as an @name reference in video prompts. The bytes live in private storage, never in the record. */
export type ProjectStyleReference = { commissionId: string; imageId: string; fields: Record<string,string>; notes: string; prompt: string; revision: string; savedAt: string; savedBy: string; model?: string };
export type VideoImageKind = "Person" | "Product" | "Location" | "Prop" | "Scene";
export type VideoImage = { title?: string; category?: VideoImageKind; id: string; commissionId: string; name: string; description: string; mime: "image/png" | "image/jpeg" | "image/webp"; bytes: number; storageKey: string; uploadedAt: string; uploadedBy: string };
export type VideoSheet = { id: string; kind: "person" | "product" | "location" | "prop"; name: string; description: string; details: string; source: "producer" | "ai"; accepted: boolean; addedBy: string; addedAt: string };
export type VideoPrompts = { overall: string; shots: { shot: number; prompt: string; negative: string; seconds?: number; visual?: string; line?: string; onScreen?: string }[]; generatedAt: string; by: string; model: string; edited?: boolean };
export type PipelineStage = "info" | "beats" | "technical";
export type VideoTarget = "seedance-2.5" | "magi-3";
export type PipelineEntry = { videoTarget?: VideoTarget; skillVersion?: string; text: string; accepted: boolean; revision: string; generatedAt: string; by: string; model: string; assetIds?: string[]; assetNames?: string[] };
export type VideoPipeline = { duration: number; aspectRatio: string; sourceKey: string; info?: PipelineEntry; beats?: PipelineEntry; technical?: PipelineEntry };
export type VideoPlan = {
  pipeline?: VideoPipeline;
  id: string; commissionId: string; generation: Generation;
  references: VideoReference[]; referenceSummary?: string;
  script?: VideoScript; chat: VideoChat[]; sheets: VideoSheet[]; prompts?: VideoPrompts;
  createdAt: string; updatedAt: string; updatedBy: string;
};
/** Age groups for the intended audience (CHG-0111). Ranges are the owner's definitions. */
export type Generation = "gen_x" | "gen_y" | "gen_z" | "gen_alpha";
export type AudienceSet = { answers: Record<string, string>; savedAt: string; savedBy: string; ai?: boolean };
export type Commission = {
  id: string; customerId: string; name: string;
  /** Answers to each input's prompts, keyed by input then prompt. */
  answers: Record<CommissionInput, Record<string, string>>;
  /** The specific offer this project is about; used by the input agents. */
  brief?: { product: string; market: string; timing: string; productUrl?: string; subBrand?: string; format?: string };
  /** Notes from the Generate from AI agents for Inputs 1, 3 and 5. */
  aiNotes?: Partial<Record<"objective" | "product" | "brand", AiNotes>>;
  /** Input 4 answers per age group, saved by a producer (an AI draft is only stored when saved). */
  audience?: Partial<Record<Generation, AudienceSet>>;
  /** Age groups the producer has selected to take forward to direction. At least one is needed before direction. */
  directionGenerations?: Generation[];
  preserve: BrandListEntry[];
  change: BrandListEntry[];
  wentTooFar: string;
  evidence: EvidenceItem[];
  /** Objective and audience should be confirmed directly with the client. */
  confirmed: { objective?: { by: string; at: string }; audience?: { by: string; at: string } };
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string;
  audit: CustomerAudit[];
};
export type Database = {
  /** Video workspace commissions; used only in the system workspace `factory-commissions-<customer id>`. */
  commissions?: Commission[];
  /** Brand Intelligence dossier versions for one customer account (workspace `factory-brandintel-<customerId>`). */
  brandIntel?: BrandIntelVersion[];
  /** Editable prompts for the project input agents (workspace `factory-agent-prompts`), keyed by AI job id. */
  agentPrompts?: Record<string, AgentPromptRecord>;
  /** Video steps plans for one customer account (workspace `factory-video-<customerId>`): one per project and age group. */
  videoPlans?: VideoPlan[];
  /** Image library for the projects of one customer account (same workspace as videoPlans). Each image belongs to one project. */
  videoImages?: VideoImage[];
  referenceSheetDrafts?: import("./reference-sheets").SheetDraft[];
  projectStyles?: ProjectStyleReference[];
  /** Video workspace customer accounts; used only in the system workspace `factory-customers`. */
  customers?: CustomerAccount[];
  /** Studio Brand Kit for one customer account, kept in its own small record (factory-brandkit-<account>). */
  brandKit?: { kit: StudioBrief["brandKit"]; savedAt: string; savedBy: string; projectId: string };
  accounts?: Account[];
  aiRouting?: AiRoutingConfig;
  budgetSettings?: BudgetSettings;
  /** Spend before this moment stays in the ledger but no longer counts towards the caps (testing aid). */
  costBaseline?: { at: string; by: string };
  skills?: Record<string, { version: number; body: string; editedBy: string; at: string; note?: string }[]>;
  approvalMode?: { mode: "ai" | "manual"; updatedAt: string; updatedBy: string };
  team?: TeamMember[];
  teamAudit?: TeamAuditEntry[];
  apiCalls?: ApiCall[];
  ledgerArchives?: string[];
  schemaVersion: 1;
  projects: Project[];
  invitations: Invitation[];
};
