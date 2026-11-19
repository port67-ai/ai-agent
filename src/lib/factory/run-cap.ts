// Per-project limit on research and drafting runs (scoping and review runs do not count).
// Set high on purpose: approvals and the loop protection in the producer agent stop a project, not this number.
// PORT67_MAX_RESEARCH_RUNS can still lower or raise it (1 to 5000). Spend is shown on the owner's Private API costs page.
export const DEFAULT_MAX_PROJECT_RUNS = 500;
export const MAX_PROJECT_RUNS_CEILING = 5000;
export function maxProjectRuns(env: Record<string, string | undefined> = process.env): number {
  return Math.max(1, Math.min(MAX_PROJECT_RUNS_CEILING, Number.parseInt(env.PORT67_MAX_RESEARCH_RUNS || "", 10) || DEFAULT_MAX_PROJECT_RUNS));
}
