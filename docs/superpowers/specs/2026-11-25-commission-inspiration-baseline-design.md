# Commission project and Inspiration baseline (design draft, 25 November 2026)

Status: APPROVED by owner ("go"); built as CHG-0107. Change ID CHG-0106; requirements FAC-VWS-011 to FAC-VWS-016 (PRD 1.35.0, section 31); decision PRODUCT-024. Follows the video workspace spec (docs/superpowers/specs/2026-11-25-video-workspace-design.md, decision D9: project inputs after the Customer account).

## Intent

A commission is one piece of work for a customer account. Its first job is the Inspiration baseline: a clear picture of who the commission needs to reach and what it needs to achieve, which parts of the brand the audience should recognise (preserve), where there is room for a fresh idea, and what evidence supports that judgement.

This step captures the inputs and their evidence and shows the baseline assembled from them. It makes no AI call (owner decision, 25 November 2026). AI drafting can come later.

## Where it sits

The Projects entry in the workspace sidebar becomes the list of commissions, each belonging to one customer account. Opening one shows the Inspiration baseline page: the four primary inputs, the three locked secondary checks, and the baseline view.

## Primary inputs

Numbers follow the owner's list: Inputs 1, 3, 4 and 5 (there is no Input 2). Each input shows its role as helper text and its questions as separate prompts. Every prompt is a text box up to 2000 characters.

| Input | Role | Prompts |
|---|---|---|
| 1 Commission objective | The Filter: decides what research to ignore | Why has the client commissioned this now. What are you making, for whom, and where will they encounter it. What should that person think, feel or do afterwards. How will the client judge success. |
| 3 Product or service | The Proof: keeps inspiration grounded in physical truth | Which specific offer is in scope. What need does it meet. What does it cost. When is it used. Why would someone choose it. What feature, experience or proof makes its promise credible. |
| 4 Current and intended audience | The Bridge: shows how and where to explore | Who buys it, who uses it, who influences the decision. What motivates them. What puts them off. What words do they use. Who does the client want this commission to reach, if that differs from today. |
| 5 Brand expression and boundaries | The Anchor: the non-negotiable DNA | What makes the brand recognisable in imagery, colours, typography, tone, casting, settings and storytelling. Which elements recur across years and channels, and which belonged to a single campaign. |

Input 5 also has two lists and one field:

- **Preserve**: the non-negotiable elements. Each entry has text, and whether it recurs across years and channels or belonged to a single campaign.
- **Can change or out of character**: where there is room for a fresh idea, or what would be out of character. Same entry shape, plus a choice of "can change" or "out of character".
- **One example that went too far**: the client's own example, which becomes the creative guardrail.
- The customer account's red lines are shown beside these lists for reference. They are not copied.

## Evidence

Each input has its own evidence list. An evidence item records: a source (a public https link or a note), where it was looked for (client brief, commissioning conversation, product page, reviews, community, retailer, trade coverage, interview, other), a short note, and a basis: announced by the client, client confirmed in conversation, or the producer's inference. The brand expression input asks the producer to distinguish an announced direction from their own inference, so the basis is required on every item. At most 30 items per input.

Inputs 1 and 4 also have a "confirmed with the client" tick, since the brief says to confirm these directly.

## Secondary checks (locked)

Company story and values, Competition and alternatives, and Parallels and creative inspiration appear as greyed-out cards showing their question and where to look. They cannot be edited or opened in this step.

## Inspiration baseline view

Read-only page assembled from the inputs, no AI:

1. Who to reach: the audience, and the intended audience if different.
2. What to achieve: the objective, the response wanted and how success is judged.
3. What the audience should recognise: the Preserve list.
4. Room for a fresh idea: the Can change list, then what is out of character, then the example that went too far.
5. Proof: the product or service and what makes its promise credible.
6. Evidence: each item grouped by input, labelled announced, confirmed or inferred.
7. Gaps: any input not started or without evidence, an empty Preserve or Can change list, and objective or audience not yet confirmed with the client.

Each input shows Not started, In progress or Complete. Complete means every prompt is answered and there is at least one evidence item. The baseline is shown even when incomplete, with the gaps listed.

## Data and limits

A commission belongs to one customer account and is stored in its own system workspace per account (`factory-commissions-<customer id>`), so one account cannot crowd out another. At most 50 commissions per account. Producers and admins only; customers and the demo are refused. Every change is audited (latest 100 entries). Nothing here deletes a customer account.

## Out of scope for this step

AI drafting of the baseline, the three secondary checks, uploads on a commission, anything after the baseline (concepts, production), and the customer role removal and data reset (still separate steps).

## Resolved questions (owner, 25 November 2026)

1. The sidebar entry stays "Projects"; each item is a commission.
2. A commission can start with just a name; the inputs are filled in afterwards.

## Open questions

None. Awaiting the owner's explicit go to start the build.
