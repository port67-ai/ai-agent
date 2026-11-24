# Video workspace rebuild: producer and admin only (design draft, 25 November 2026)

Status: DRAFT for owner sign-off. The owner told the build to start on 25 November 2026: the shell and the Customer account are built (CHG-0104). Source: the owner's instructions in session on 25 November 2026. Change ID CHG-0103; requirements FAC-VWS-001 to FAC-VWS-009 (PRD 1.34.0, section 30); decision PRODUCT-023; ADR-0004.

## Intent

Rebuild the creative workspace as a minimal, video-first tool used only by producers and admins. Start with an almost empty sidebar and add workflow pieces back one at a time, checking each is covered before the next.

## Decisions made by the owner

| # | Decision |
|---|---|
| D1 | Build a new minimal shell. The current 15-tab portal and studio stage code stay in the repository, parked and unreachable from the new shell. |
| D2 | Remove the customer role entirely. Only two levels remain: producer (`operator`) and admin (owner, the existing `admin` flag). |
| D3 | Non-video features (static Scene Pack, copy packs, the ten research roles, parked offers) are hidden, not deleted. Video is the only offer in the UI. |
| D4 | Social links: manual entry per platform plus a free "Find from website" button that pre-fills links the company's own site already publishes. The producer confirms before anything is saved. No paid call. |
| D5 | Brand purpose upload is stored privately. Models read its text only after the producer explicitly authorises it, as with public project data today. |
| D6 | Client red lines are a structured list. Each entry has a category and an optional reason. |
| D7 | The company is the brand. One customer account is one company and one brand, in a flat list. A project (commission) relates to the brand of its account. |
| D8 | Existing customer accounts are removed and the new workspace starts fresh. See "Resetting existing data". |
| D9 | Business side first. Project (commission) inputs are specified only after the Customer account is built. Overview contents come later still. |

## Roles

- **Producer**: creates and edits customer accounts and projects, runs and approves every workflow step. Records approvals that were previously the customer's, with the producer recorded as actor.
- **Admin**: everything a producer can do, plus models, routing, costs, team access.
- A signed-in user who is neither a producer nor an admin has no access. Customers never sign in. "Customer account" in the new workspace means a company record, not a login.

## Sidebar (initial, three entries)

1. **Overview**: placeholder. Contents specified later.
2. **Customer account**: inputs about the company. Specified below.
3. **Projects**: one entry per commission, each belonging to one customer account. Inputs specified after the Customer account is complete.

Admin-only pages (AI agents, costs, team) remain reachable for admins only, in an Admin group, unchanged for now.

## Customer account inputs (specified)

| Field | Type | Rules |
|---|---|---|
| Business name | text | Required. This is also the brand name. |
| Website | URL | Optional, validated. Public https only. |
| Social links | one URL per platform | Platforms: X, Instagram, Facebook, TikTok, YouTube, LinkedIn, Pinterest, other as needed. Each must belong to the platform's domain. "Find from website" fetches only the company's own page, reads outbound links to known platforms, and pre-fills empty fields. The producer confirms and saves. |
| Brand purpose | file upload | Reuses the private studio file store, file-type sniffing and rights confirmation. Accepted types: PDF, DOCX, TXT, PNG, JPG. Limit 25 MB per file and five files per account, held as settings so they are easy to change (brand books are often 10 to 30 MB, and models only ever read extracted text). Stored privately; text extraction and model use only after producer authorisation. |
| Client red lines | list of entries | Each entry: category (topic, competitor, person or brand, word or phrase, visual), text, optional reason. Add, edit, remove, each audited (who, when, what). |

Reuse notes: `StudioBrief` already has `client.businessName`, `client.website`, `socials` (instagram, tiktok, youtube, facebook, pinterest, linkedin, x) and a free-text `brandKit.avoid`. Red lines replace `avoid` as a structured list. Nothing is migrated because the owner chose a clean start. Account Brand Kit storage exists on the store. Exact new type names belong to the implementation plan.

## Project (commission) inputs and Overview

Not specified. Deferred by the owner (D9). They carry no requirement IDs yet.

## Impact of removing the customer role

Touches: `identity.ts` (role type and sign-in), account scoping (accounts become producer-managed company records instead of per-user tenants derived from a sign-in), approval gates (`PORT67_ACCOUNT_APPROVALS`, direction and asset approval), the customer projection in `service.ts`, customer-facing delivery and shared-stage visibility, Firestore rules, and many tests. This is a data model and tenancy change (ADR-0004).

Sequencing rule: remove the customer role as its own change, after the new shell no longer depends on it, so the suite stays green at each step.

## Resetting existing data

The owner wants existing customer accounts removed so the new workspace starts fresh. This is destructive, so it is a separate step, never part of a build step, and:

1. It happens only after the customer role is removed and the new workspace is working.
2. A verified export of the existing accounts, projects and stored files is taken first, for the local store and for the Firestore project `ai-agency-3671b`.
3. The owner confirms the deletion at that moment, naming what is deleted.
4. The deletion is audited.
5. The owner cost ledger is kept unless the owner says otherwise, because it is spend evidence. Its rows still carry old account and project IDs.
6. The legacy clear scripts (`scripts/clear-database.ts`, `scripts/clear-all-users.ts`) belong to the old booking app and must not be reused without review.

No data is deleted by this documentation change, and nothing in it touches production.

## Governance items

- Requirement IDs FAC-VWS-001 to FAC-VWS-009: PROPOSED, delivery NOT STARTED.
- PRD 1.34.0 (minor): new section 30.
- ADR-0004: two-role identity and company-record tenancy.
- DECISIONS.md PRODUCT-023 records D1 to D9.
- One CHG entry per later step. Update status, handover, ARCHITECTURE, DATA_MODEL and TESTING in the same commits (these three docs are stale at CHG-0084).

## Proposed build order

1. Owner signs off this spec.
2. New shell: Overview placeholder, Customer account form and list, Projects list (no workflow). Producer and admin only.
3. Customer account inputs fully working with tests, including Find from website and the red-line list.
4. Remove the customer role (separate CHG).
5. Reset existing data (separate CHG, with the safeguards above).
6. Specify and build project inputs, then Overview.
7. Add workflow pieces back, video first, one per CHG.

## Resolved questions (owner, 25 November 2026)

1. Brand purpose accepts PDF, DOCX, TXT, PNG and JPG. The owner had no view on size, so 25 MB per file was proposed and adopted as a single changeable setting.
2. The owner cost ledger is kept through the reset, as spend evidence.
3. Existing producer and admin allowlists (`PORT67_OPERATOR_UIDS`, admin emails) carry over unchanged. They must be verified before the customer role is removed, since they become the only way in.

## Open questions

None for the Customer account. Project inputs and Overview contents are deferred by the owner (D9). Awaiting the owner's explicit go to start the build.
