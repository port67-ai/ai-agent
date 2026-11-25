# Video steps: design

Status: BUILT LOCALLY in CHG-0115 with defaults for the unanswered questions (see CHANGELOG). Originally a draft for owner sign-off. Change ID CHG-0113 (design part); requirements FAC-VWS-026 to FAC-VWS-030 (PRD 1.41.0, section 33); decision PRODUCT-030. Follows the project inputs (CHG-0107 to CHG-0113). No code until the owner says go.

## What it is

A new sidebar entry after Projects, "Video steps", for working out how a project's video is made. It follows a project (and, once direction exists, one or more of its selected age groups). It has four sections, in order. Each section feeds the next, and each can use an AI agent with the same AI agent box (model dropdown and editable prompt) as the project inputs.

## The four sections

1. **References.** The baseline for the end video. Collects reference stills and clips that match the story, the brand and the demographic look and feel. Each reference carries: the image or link, why it belongs, and the technical read of it: colour palette, composition, camera and movement, film stock or look, lens. A reference board per project (and per age group). An AI agent reads a reference image and drafts the technical read; a producer confirms it.
2. **Scripting.** Starts from template scripts (for example a 15 second hook, proof, call to action). An AI agent opens a conversation: it proposes a first script from the commission objective, product, audience and references, and the producer refines it by replying. The saved result is a numbered shot-by-shot script with timing, spoken lines and on-screen text.
3. **Characters, locations and props.** Character sheets for people, product sheets and location sheets: a name, a written description that stays fixed across shots, and reference images. An AI agent drafts each sheet from the script and the references. The sheets are the continuity source for video generation.
4. **Video generation.** Pulls the previous three together. An AI agent writes a generation prompt for each shot from the script, the sheets and the references, in the format the chosen video model expects. First version: prompts to copy into the video tool. Later: send them to the tool directly.

## What it reads

The project's inputs (objective, product, selected age groups, brand lists), the customer's Brand Intelligence dossier and client red lines (always applied, never contradicted), and the earlier sections.

## Safeguards

- Client red lines and the age-appropriate rules for under-18 groups are fixed text in every agent, as in the project input agents.
- Reference images are rights-confirmed when added, private, and only read by an AI step if allowed, as with brand purpose files.
- Every AI call is metered on the admin ledger. Drafts fill the form and are saved only by a producer.

## Questions for the owner

1. Reference source. You named Shopdeck; I assume ShotDeck (film stills with palette, camera, film and lens details). To my knowledge it has no public API, so the first version would be producers uploading or linking stills, with the AI reading each image. Is that acceptable, and do you have licensing in mind for stored stills?
2. Scripting templates. Which templates do you want first (for example 15, 30 and 60 second shapes), and is the script a numbered shot list or prose with timings?
3. Characters and props. Should the sheets include AI-generated images (the existing studio image job) or written descriptions plus uploaded references only?
4. Video generation. You wrote "CDance 2.5"; I assume ByteDance Seedance. Which exact model and version, and is the first version prompts to copy, or calls to its API?
5. Age groups. Does each selected age group get its own references, script and sheets (a separate video workflow), or do they share one set?

## Out of scope for this step

Rendering or storing video, publishing, performance feedback.
