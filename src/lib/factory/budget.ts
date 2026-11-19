// Hard USD spend caps for managed model calls. Pure functions, no I/O.
// Fail closed: a call whose cost is not yet known (in flight, unpriced, interrupted
// or missing usage) is counted at a configured hold, never as free.
export type BudgetConfig = {
  monthlyMicroUsd: number;
  projectMicroUsd?: number;
  /** Cap on everything one run (one runId) can spend. */
  runMicroUsd?: number;
  /** Monthly cap per model, keyed "provider:model". */
  modelMicroUsd?: Record<string, number>;
  holdMicroUsd: number;
};
/** Limits saved in the admin portal (USD). They override the Render environment values; blank falls back to the environment. */
export type BudgetSettings = {
  monthlyUsd?: number;
  projectUsd?: number;
  runUsd?: number;
  callHoldUsd?: number;
  models?: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
};
export type BudgetRow = {
  createdAt: string;
  projectId: string;
  runId?: string;
  provider?: string;
  model?: string;
  estimatedMicroUsd?: number;
  reconciliation?: { actualMicroUsd: number };
};
export type BudgetStatus = {
  monthStart: string;
  monthlyCapMicroUsd: number;
  projectCapMicroUsd?: number;
  runCapMicroUsd?: number;
  modelCapsMicroUsd?: Record<string, number>;
  holdPerCallMicroUsd: number;
  committedMicroUsd: number;
  heldMicroUsd: number;
  remainingMicroUsd: number;
};
/**
 * Spend limits only block calls when PORT67_SPEND_LIMITS=on. By default they are off: every call is still recorded and the Private API
 * costs page still shows spend against the configured amounts, so you can see when consumption is over, but nothing is refused.
 */
export const spendLimitsEnforced = (e: Record<string, string | undefined> = process.env) => e.PORT67_SPEND_LIMITS?.trim().toLowerCase() === "on";
export const DEFAULT_MONTHLY_BUDGET_USD = "25";
export const DEFAULT_CALL_HOLD_USD = "0.1";
type Env = Record<string, string | undefined>;
function microUsd(name: string, raw: string): number {
  if (!/^\d{1,7}(\.\d{1,6})?$/.test(raw))
    throw new Error(`${name} must be a plain USD amount such as 25 or 12.50`);
  return Math.round(Number(raw) * 1e6);
}
const usdText = (n: number | undefined) => (n === undefined ? undefined : String(n));
/** Throws on an invalid value so that a typo blocks paid calls instead of lifting the cap. Portal settings win over the environment. */
export function budgetConfig(e: Env = process.env, saved?: BudgetSettings): BudgetConfig {
  const pick = (name: string, fromPortal: number | undefined, fallback?: string) => {
    const portal = usdText(fromPortal);
    if (portal) return portal;
    const raw = e[name]?.trim();
    return raw ? raw : fallback;
  };
  const monthly = microUsd("PORT67_MONTHLY_BUDGET_USD", pick("PORT67_MONTHLY_BUDGET_USD", saved?.monthlyUsd, DEFAULT_MONTHLY_BUDGET_USD)!);
  const hold = microUsd("PORT67_CALL_HOLD_USD", pick("PORT67_CALL_HOLD_USD", saved?.callHoldUsd, DEFAULT_CALL_HOLD_USD)!);
  if (hold <= 0) throw new Error("PORT67_CALL_HOLD_USD must be greater than zero");
  const projectRaw = pick("PORT67_PROJECT_BUDGET_USD", saved?.projectUsd);
  const runRaw = usdText(saved?.runUsd);
  const models = Object.entries(saved?.models || {}).map(([key, usd]) => [key, microUsd(`model cap ${key}`, String(usd))] as const);
  return {
    monthlyMicroUsd: monthly,
    holdMicroUsd: hold,
    ...(projectRaw ? { projectMicroUsd: microUsd("PORT67_PROJECT_BUDGET_USD", projectRaw) } : {}),
    ...(runRaw ? { runMicroUsd: microUsd("per-run cap", runRaw) } : {}),
    ...(models.length ? { modelMicroUsd: Object.fromEntries(models) } : {}),
  };
}
const LIMIT_KEY = /^[a-z0-9_-]{1,40}:[A-Za-z0-9._:/-]{1,100}$/;
/** Validates what the admin typed. Empty or missing values clear a limit. Throws a readable message on anything else. */
export function validateBudgetSettings(raw: unknown): BudgetSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid limits");
  const o = raw as Record<string, unknown>;
  const amount = (name: string, value: unknown, positive: boolean) => {
    if (value === undefined || value === null || value === "") return undefined;
    const text = String(value).trim();
    microUsd(name, text);
    const n = Number(text);
    if (positive && n <= 0) throw new Error(`${name} must be greater than zero`);
    return n;
  };
  const out: BudgetSettings = {};
  const monthly = amount("monthly budget", o.monthlyUsd, true);
  const project = amount("project budget", o.projectUsd, true);
  const run = amount("per-run cap", o.runUsd, true);
  const hold = amount("per-call hold", o.callHoldUsd, true);
  if (monthly !== undefined) out.monthlyUsd = monthly;
  if (project !== undefined) out.projectUsd = project;
  if (run !== undefined) out.runUsd = run;
  if (hold !== undefined) out.callHoldUsd = hold;
  if (o.models !== undefined) {
    if (!o.models || typeof o.models !== "object" || Array.isArray(o.models)) throw new Error("Invalid model limits");
    const entries = Object.entries(o.models as Record<string, unknown>);
    if (entries.length > 40) throw new Error("Too many model limits");
    const models: Record<string, number> = {};
    for (const [key, value] of entries) {
      if (!LIMIT_KEY.test(key)) throw new Error(`Model limits use provider:model, for example openai:gpt-5.4-mini (got ${key.slice(0, 60)})`);
      const n = amount(`model cap ${key}`, value, true);
      if (n !== undefined) models[key] = n;
    }
    if (Object.keys(models).length) out.models = models;
  }
  return out;
}
/** Calendar month in UTC. */
export function monthWindow(now = new Date()) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return { start, end, label: new Date(start).toISOString().slice(0, 10) };
}
function inWindow(row: BudgetRow, start: number, end: number) {
  const at = Date.parse(row.createdAt);
  // An unreadable timestamp is counted: unknown must never lower spend.
  return !Number.isFinite(at) || (at >= start && at < end);
}
function spend(rows: BudgetRow[], hold: number) {
  let committed = 0;
  let held = 0;
  for (const r of rows) {
    if (r.reconciliation && Number.isSafeInteger(r.reconciliation.actualMicroUsd))
      committed += r.reconciliation.actualMicroUsd;
    else if (
      r.estimatedMicroUsd !== undefined &&
      Number.isSafeInteger(r.estimatedMicroUsd)
    )
      committed += r.estimatedMicroUsd;
    else held += hold;
  }
  return { committed, held, total: committed + held };
}
const fmt = (micro: number) => "$" + (micro / 1e6).toFixed(2);
/** Throws if one more call, held at the configured amount, would pass a cap. */
export function assertWithinBudget(
  rows: BudgetRow[],
  config: BudgetConfig,
  projectId: string,
  now = new Date(),
  target: { runId?: string; provider?: string; model?: string } = {},
) {
  const { start, end } = monthWindow(now);
  const month = rows.filter((r) => inWindow(r, start, end));
  const all = spend(month, config.holdMicroUsd);
  if (all.total + config.holdMicroUsd > config.monthlyMicroUsd)
    throw new Error(
      `Monthly AI spend cap reached: ${fmt(all.total)} used or held of ${fmt(config.monthlyMicroUsd)}, and this call can need up to ${fmt(config.holdMicroUsd)}. Raise the monthly limit under Private API costs (or PORT67_MONTHLY_BUDGET_USD) or wait for the next UTC month.`,
    );
  if (config.projectMicroUsd !== undefined) {
    const mine = spend(
      month.filter((r) => r.projectId === projectId),
      config.holdMicroUsd,
    );
    if (mine.total + config.holdMicroUsd > config.projectMicroUsd)
      throw new Error(
        `Project AI spend cap reached: ${fmt(mine.total)} used or held of ${fmt(config.projectMicroUsd)} this month. Raise PORT67_PROJECT_BUDGET_USD (or the project limit under Private API costs) or wait for the next UTC month.`,
      );
  }
  if (config.runMicroUsd !== undefined && target.runId) {
    const run = spend(rows.filter((r) => r.runId === target.runId), config.holdMicroUsd);
    if (run.total + config.holdMicroUsd > config.runMicroUsd)
      throw new Error(`Per-run AI spend cap reached: ${fmt(run.total)} used or held of ${fmt(config.runMicroUsd)} for this run. Raise the per-run limit under Private API costs.`);
  }
  const modelKey = target.provider && target.model ? `${target.provider}:${target.model}` : "";
  const modelCap = modelKey ? config.modelMicroUsd?.[modelKey] : undefined;
  if (modelCap !== undefined) {
    const mine = spend(month.filter((r) => `${r.provider}:${r.model}` === modelKey), config.holdMicroUsd);
    if (mine.total + config.holdMicroUsd > modelCap)
      throw new Error(`Model AI spend cap reached for ${modelKey}: ${fmt(mine.total)} used or held of ${fmt(modelCap)} this month. Raise that model's limit under Private API costs or wait for the next UTC month.`);
  }
}
export function budgetStatus(
  rows: BudgetRow[],
  config: BudgetConfig,
  now = new Date(),
): BudgetStatus {
  const { start, end, label } = monthWindow(now);
  const s = spend(
    rows.filter((r) => inWindow(r, start, end)),
    config.holdMicroUsd,
  );
  return {
    monthStart: label,
    monthlyCapMicroUsd: config.monthlyMicroUsd,
    ...(config.projectMicroUsd === undefined
      ? {}
      : { projectCapMicroUsd: config.projectMicroUsd }),
    ...(config.runMicroUsd === undefined ? {} : { runCapMicroUsd: config.runMicroUsd }),
    ...(config.modelMicroUsd ? { modelCapsMicroUsd: config.modelMicroUsd } : {}),
    holdPerCallMicroUsd: config.holdMicroUsd,
    committedMicroUsd: s.committed,
    heldMicroUsd: s.held,
    remainingMicroUsd: Math.max(0, config.monthlyMicroUsd - s.total),
  };
}
