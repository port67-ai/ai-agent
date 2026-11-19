# Studio stages: four gated stages, two offers (design, 20 November 2026)

Owner-approved direction (CHG-0097 onwards). Source: the owner's spec doc "Port67 Studio Workflow Spec: Four Stages, Two Offers". The owner authorised building steps 1 to 6 without further input; step 7 (running real clients) is the owner's.

## Product rules

1. Port67 sells two offers to e-commerce and DTC brands:
   - **Product Scene Pack** (`scene_pack`, static): 25 lifestyle stills from up to 5 products at 4:5 and 1:1; optional 10 five-second motion loops. Channels: Instagram feed and carousels, Pinterest, Meta catalogue ads. Client supplies clean packshots (PNG), brand kit, mood references.
   - **Hook-Test Video Pack** (`hook_pack`, short video): one 20-second product story cut into 12 variants (3 narratives x 4 opening hooks), 9:16 MP4 with burned-in captions and sound. Channels: TikTok, Instagram Reels, Facebook Reels, YouTube Shorts. Client supplies product URL, 3 or more raw clips or photos, brand kit, offer and call to action.
2. Parked offers are shown in the intake offer picker, greyed out and not selectable: `hero_spot` (Impossible B-roll hero commercial), `creator_localisation` (multi-language creator and demo ads), `b2b_trailer` (B2B tech launch trailer).
3. One offer per project. A client with both gets two projects sharing one Brand Kit (Brand Kit is stored per client account and copied into each project's brief at intake; the copy is what the project uses).
4. Every studio project moves through four stages, one active at a time: `intake` (Client Intake and Brand Memory), `strategy` (Creative Strategy), `preproduction` (Pre-production), `production` (Production), then `delivered`.
5. Gates:
   - Gate 1 (end of intake): completeness check passes for the chosen offer, then a producer approves.
   - Gate 2 (end of strategy): producer approves research (approve-with-note allowed), then the strategy (campaign direction) is approved on the client's behalf or by the client using the existing direction approval.
   - Gate 3 (end of pre-production): client approves concepts and test frames or keyframes (producers may approve on the client's behalf, recorded as such, matching the existing PORT67_ACCOUNT_APPROVALS behaviour).
   - Gate 4 (end of production): client final approval, then delivery.
   - Every gate supports: approve; approve with a note (records what is missing and why it is acceptable; the note is shown in later stages and in the delivery pack); reopen an approved stage (later stages become `stale`, their work is kept, not deleted).
6. Review is per piece. A piece (one mood board, one scene, one script, one hook, one keyframe, one still, one clip) can be: edited (new human version), marked up (comment; on images a comment may carry a region box in 0..1 fractions of width and height), rerun on its own (AI redraws only that piece with the open comments and an optional instruction as its brief; old version kept; cost shown), approved, or have changes requested. Before a rerun the app lists the later pieces that depend on it (impact); after a rerun those dependants are marked `stale`. No rerun limit.
7. Thin research is a warning, not a hard stop. The "fewer than 2 accepted sources" producer hold becomes a warning everywhere.
8. Research reads public pages only; it cannot log in to social accounts.
9. AI disclosure: every generated or AI-edited asset carries an `aiDisclosure` tag (`ai_generated`, `ai_edited`, `none`) used by the go-to-market checks and the delivery pack (TikTok AIGC label, Meta "AI info", EU AI Act Article 50 deepfake disclosure since 2 August 2026).
10. Image, video and voice generation: an image adapter (OpenAI Images API first, model from an admin route or `PORT67_IMAGE_MODEL`) is built for test frames, keyframes and Scene Pack stills. Video generation has a provider-neutral interface but no provider wired in; Hook pack clips are uploaded by the producer (made in any tool from the app's prompt pack). Every paid call is metered through the existing ledger (`reserveApiCall` / `finishApiCall`); spend limits are off by default (CHG-0096).

## Data contract (all build pieces use these names)

Types live in `src/lib/factory/model.ts`; logic in `src/lib/factory/studio*.ts`.

```ts
export type StudioOffer = "scene_pack" | "hook_pack";
export type ParkedOffer = "hero_spot" | "creator_localisation" | "b2b_trailer";
export type StudioStage = "intake" | "strategy" | "preproduction" | "production";
export type StudioGateStatus = "locked" | "active" | "approved" | "stale";
export type StudioGate = { stage: StudioStage; status: StudioGateStatus; approvedBy?: string; approvedAt?: string; onBehalfOfClient?: boolean; note?: string; history: { at: string; by: string; action: "approve" | "approve_with_note" | "reopen" | "stale"; note?: string }[] };
export type StudioAssetRef = { id: string; name: string; mime: string; bytes: number; storageKey: string; uploadedAt: string; uploadedBy: string; rights?: { source: string; licence: string; confirmedBy?: string } ; aiDisclosure?: "ai_generated" | "ai_edited" | "none" };
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
export type StudioState = { schemaVersion: 1; offer: StudioOffer; stage: StudioStage | "delivered"; brief: StudioBrief; briefVersion: number; gates: Record<StudioStage, StudioGate>; pieces: StudioPiece[]; gtm?: StudioGtm /* piece C: see model.ts */ };
// Project gets: studio?: StudioState
```

Large binaries (images, clips, logos, packshots) never go into the project document: they go to the existing private file store (Firebase Storage in production, local directory otherwise; see `video-store.ts`) and only a `StudioAssetRef` is stored. Watch the per-project document limit (CHG-0095).

## Bridge to the existing engine

Studio projects reuse the existing research, source review, insight, strapline/audience, ideas, direction and copy machinery. At gate 1 the studio brief is mapped onto the existing `brief` and `channels` fields (business, website, objective from the offer, audience if known, channels from the socials and the offer's channels, requested formats from the offer) so existing agents work unchanged. Studio projects use a task plan whose research roles are limited to brand, customer, competitor, creative and channel, and the orchestrator does not run past the stage gate that is currently active. Legacy projects (no `studio`) keep today's behaviour and UI.

## UI

- Left sidebar for a studio project: the four stages in order with a status badge (locked, in progress, waiting for approval, approved, out of date), the active stage expanded with its steps; below them Brand Kit, Project settings, and admin-only Costs and Diagnostics. Legacy projects keep today's sidebar.
- Each stage page ends with a gate bar: Approve, Approve with a note, and (for approved stages) Reopen.
- Piece cards show the current version, version history, comments (image comments as pins/boxes on the image), and buttons: Edit, Comment, Rerun (shows impact first), Approve, Request changes.
- New brief: "New brief" opens the studio intake for new projects.

## Build pieces

- A: data model, gates, pieces API, sidebar, Stage 1 intake (offer picker, Brand Kit, uploads, socials, completeness), bridge at gate 1.
- B: Stage 2 (studio-scoped research, warnings, gate 2) and Stage 3 (pre-production generators for both offers, image adapter, gate tools UI, gate 3).
- C: Stage 4 (Scene Pack stills batch, Hook pack upload and 12-variant matrix, video adapter interface), go-to-market checks (rights, claims, AI disclosure, specs and safe zones, naming, delivery manifest, handoff test plan, performance read-back via existing feedback import, next-cycle brief), gate 4 and delivery.

## Build status (20 November 2026)

- Piece A: done (CHG-0097). Piece B: done (CHG-0098). Piece C: done (CHG-0099): Stage 4 production, go-to-market checks (`StudioState.gtm` typed as `StudioGtm` in model.ts), gate 4, delivery pack, launch handoff, performance read-back and Start next cycle.
- Build steps 1 to 6 are built locally and pass the scratch-copy checks (tsc, lint, `npm test`, build). Not committed, not deployed, no browser or live provider checks. Step 7 (running real clients) is the owner's: see PRD 28.1 "How to run your first client".
