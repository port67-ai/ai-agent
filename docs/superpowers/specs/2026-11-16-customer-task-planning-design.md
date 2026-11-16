# Customer-driven task architecture

Owner instruction, 16 November 2026: evolve the existing MVP so customer input determines relevant agents, the task manager creates and tracks the work, and tasks can change with requirements. Existing controls remain authoritative. This implements the approach recommended in the preceding architecture review; execution is authorised by the owner's current request and PRODUCT-002.

## Approach

Use a small persistent task coordinator inside the existing Next.js service, with versioned project plans and approved capability IDs. Reuse existing runners, repository transactions, metering, reviews and approval commands. A separate workflow framework adds deployment and migration work without solving the immediate agent-selection problem; editable prompts alone cannot manage dependencies or durable progress. These are the alternatives considered; the embedded coordinator is the implementation choice.

## Behaviour

- Generate a free deterministic plan from the customer's objective, requested work, channels and chosen formats. Customers may explicitly request research only; otherwise retain the managed campaign journey. Expose initial requested work in intake and brief editing. Record why every research agent is selected or excluded. Ambiguous requirements produce a visible clarification rather than silently selecting every optional specialist.
- Brand and customer evidence are foundational. Competitor, creative, adjacent, trends and video research are selected only for matching requirements; the producer may override research selection with reasons. No unknown capability or arbitrary executable instruction can be registered through planning.
- Store the current version, input fingerprint, dependencies, assigned capability, acceptance criteria and task states with the project. Preserve superseded plan summaries and old run/evidence records. Selective changes retain compatible results; changed public briefs/channels require fresh research and evidence review before downstream work. Existing direction/asset version approval rules continue to apply.
- The orchestrator gets its next action from the plan. Selected research runs precede evidence review; advisory format/audience/idea suggestions are explicit optional work, not mandatory paid calls. Production follows approved selected formats; unsupported formats remain visible manual work. Research-only requests finish after reviewed research and insights.
- Show a project-management view with task status, dependencies, assigned agent, selection reasons, blockers and plan history. Producers can revise the plan before direction work begins; brief/channel changes replan automatically. Existing projects keep their prior research selection until deliberately replanned.
- Server execution rejects unselected research and stale plan results before acceptance, retains paid usage, and never bypasses consent, identity, budget or review gates. Store status alongside run lifecycle; recover through persisted records rather than process-local progress alone. No automatic retry of failed or unknown paid work.

## Constraints and limits

No new paid planning call, provider, service, publishing, queue infrastructure or external bot credentials. Existing framework adapter interfaces remain the extension point; installing external agents is separate work. This is not full Cloud Tasks delivery or multi-worker exactly-once execution. Human gates and circuit limits stay enforced in code. Plans contain public requirements and internal execution detail; customers receive a deliberately reduced projection. Stable new requirement IDs FAC-TSK-001 through FAC-TSK-005 avoid the existing duplicated FAC-SKL IDs.

## Acceptance

Static/written campaign, video campaign and research-only briefs select different agents and outputs. Excluded research cannot incur a call. Dependencies, customer approvals, failed runs and stale results prevent premature continuation. Replanning is versioned and audited, preserves compatible completed work and costs, and does not reuse stale brief evidence. Legacy projects continue. Task progress is visible and customer projections contain no internal instructions or private costs. Existing tests, typecheck, lint, build and documentation checks pass, with environment limitations stated separately.
