// Hard USD spend caps for managed model calls. Pure functions, no I/O.
// Fail closed: a call whose cost is not yet known (in flight, unpriced, interrupted
// or missing usage) is counted at a configured hold, never as free.
export type BudgetConfig = {
  monthlyMicroUsd: number;
  projectMicroUsd?: number;
  holdMicroUsd: number;
};
export type BudgetRow = {
  createdAt: string;
  projectId: string;
  estimatedMicroUsd?: number;
  reconciliation?: { actualMicroUsd: number };
};
export type BudgetStatus = {
  monthStart: string;
  monthlyCapMicroUsd: number;
  projectCapMicroUsd?: number;
  holdPerCallMicroUsd: number;
  committedMicroUsd: number;
  heldMicroUsd: number;
  remainingMicroUsd: number;
};
export const DEFAULT_MONTHLY_BUDGET_USD = "25";
export const DEFAULT_CALL_HOLD_USD = "1";
type Env = Record<string, string | undefined>;
function microUsd(name: string, raw: string): number {
  if (!/^\d{1,7}(\.\d{1,6})?$/.test(raw))
    throw new Error(`${name} must be a plain USD amount such as 25 or 12.50`);
  return Math.round(Number(raw) * 1e6);
}
/** Throws on an invalid value so that a typo blocks paid calls instead of lifting the cap. */
export function budgetConfig(e: Env = process.env): BudgetConfig {
  const pick = (name: string, fallback?: string) => {
    const raw = e[name]?.trim();
    return raw ? raw : fallback;
  };
  const monthly = microUsd(
    "PORT67_MONTHLY_BUDGET_USD",
    pick("PORT67_MONTHLY_BUDGET_USD", DEFAULT_MONTHLY_BUDGET_USD)!,
  );
  const holdRaw = pick("PORT67_CALL_HOLD_USD", DEFAULT_CALL_HOLD_USD)!;
  const hold = microUsd("PORT67_CALL_HOLD_USD", holdRaw);
  if (hold <= 0) throw new Error("PORT67_CALL_HOLD_USD must be greater than zero");
  const projectRaw = pick("PORT67_PROJECT_BUDGET_USD");
  return {
    monthlyMicroUsd: monthly,
    holdMicroUsd: hold,
    ...(projectRaw
      ? { projectMicroUsd: microUsd("PORT67_PROJECT_BUDGET_USD", projectRaw) }
      : {}),
  };
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
) {
  const { start, end } = monthWindow(now);
  const month = rows.filter((r) => inWindow(r, start, end));
  const all = spend(month, config.holdMicroUsd);
  if (all.total + config.holdMicroUsd > config.monthlyMicroUsd)
    throw new Error(
      `Monthly AI spend cap reached: ${fmt(all.total)} used or held of ${fmt(config.monthlyMicroUsd)}, and this call can need up to ${fmt(config.holdMicroUsd)}. Raise PORT67_MONTHLY_BUDGET_USD or wait for the next UTC month.`,
    );
  if (config.projectMicroUsd !== undefined) {
    const mine = spend(
      month.filter((r) => r.projectId === projectId),
      config.holdMicroUsd,
    );
    if (mine.total + config.holdMicroUsd > config.projectMicroUsd)
      throw new Error(
        `Project AI spend cap reached: ${fmt(mine.total)} used or held of ${fmt(config.projectMicroUsd)} this month. Raise PORT67_PROJECT_BUDGET_USD or wait for the next UTC month.`,
      );
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
    holdPerCallMicroUsd: config.holdMicroUsd,
    committedMicroUsd: s.committed,
    heldMicroUsd: s.held,
    remainingMicroUsd: Math.max(0, config.monthlyMicroUsd - s.total),
  };
}
