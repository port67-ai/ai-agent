# Engineering governance implementation plan

Goal: implement the user's mandatory governance policy in port67-ai/ai-agent without changing application behavior.

Scope: PRD GOV-001 through GOV-006. GitHub is authoritative. Existing application behavior is evidence, not a newly approved feature specification. Do not invent a broader Factory product roadmap.

1. Establish PRD, universal AGENTS.md, architecture, data model, decisions, status, changelog, testing and handover documents. Replace duplicate Claude requirements with a pointer; add Gemini pointer.
2. Test a dependency-free Node governance validator against missing documents, stale handovers, invalid PRD references, absent feature tests, schema/architecture changes and valid documentation-only changes. Implement after observing failing tests.
3. Add formatting, type checking, lint, test and documentation jobs with stable names and no skip-on-failure behavior. Add a PR template. Document required GitHub protection settings; verify access separately before attempting remote administration.
4. Run checks, document actual results and external blockers, review the diff, and commit all applicable documentation and enforcement together on a feature branch.

Constraints: preserve uncommitted work; no product feature changes, Firebase deployments or destructive scripts. Semantic documentation accuracy still requires human review. Existing lint/configuration failures must remain visible.
