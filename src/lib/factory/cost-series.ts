import type { ApiCall } from "./costs";

// Historical cost series for the Private API costs page. Pure: rows in, buckets out.
// Cost of a call = reconciled actual, else the estimate. A call with no known cost adds 0 and is counted as "unknown", never as free.
export type SeriesRange = "day" | "month" | "3m" | "6m" | "12m";
export const RANGES: SeriesRange[] = ["day", "month", "3m", "6m", "12m"];
type Step = "hour" | "day" | "week" | "month";
const SPEC: Record<SeriesRange, { step: Step; count: number }> = {
  day: { step: "hour", count: 24 }, // last 24 hours, one point per hour
  month: { step: "day", count: 30 }, // last 30 days, one point per day
  "3m": { step: "day", count: 91 }, // last 3 months, one point per day
  "6m": { step: "week", count: 26 }, // last 6 months, one point per week
  "12m": { step: "month", count: 12 }, // last 12 months, one point per month
};
const HOUR = 3600000;
const DAY = 24 * HOUR;
export type Line = {
  key: string;
  label: string;
  kind: "total" | "harness" | "model";
  /** Running totals at the end of each bucket for the selected period. */
  cumulativeMicroUsd: number[];
  cumulativeInputTokens: number[];
  cumulativeOutputTokens: number[];
  cumulativeCalls: number[];
  /** What fell inside each bucket alone. */
  bucketMicroUsd: number[];
  totalMicroUsd: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  unknownCalls: number;
};
export type Series = {
  range: SeriesRange;
  step: Step;
  from: string;
  to: string;
  buckets: string[]; // ISO start of each bucket (UTC)
  harness: string; // "" = all harnesses
  harnesses: { key: string; label: string; totalMicroUsd: number; calls: number }[];
  total: Line;
  lines: Line[]; // one per harness when all are shown; one per model when a harness is isolated
  models: { provider: string; model: string; harness: string; calls: number; unknownCalls: number; totalMicroUsd: number; inputTokens: number; outputTokens: number }[];
};
export const harnessOf = (r: Pick<ApiCall, "agent" | "stage">) => r.agent || r.stage || "unknown";
const costOf = (r: ApiCall) => (r.reconciliation && Number.isSafeInteger(r.reconciliation.actualMicroUsd) ? r.reconciliation.actualMicroUsd : r.estimatedMicroUsd !== undefined && Number.isSafeInteger(r.estimatedMicroUsd) ? r.estimatedMicroUsd : undefined);
function bucketStarts(range: SeriesRange, now: Date): number[] {
  const { step, count } = SPEC[range];
  const out: number[] = [];
  if (step === "hour") {
    const end = Math.floor(now.getTime() / HOUR) * HOUR;
    for (let i = count - 1; i >= 0; i--) out.push(end - i * HOUR);
  } else if (step === "day") {
    const end = Math.floor(now.getTime() / DAY) * DAY;
    for (let i = count - 1; i >= 0; i--) out.push(end - i * DAY);
  } else if (step === "week") {
    const end = Math.floor(now.getTime() / DAY) * DAY;
    for (let i = count - 1; i >= 0; i--) out.push(end - i * 7 * DAY);
  } else {
    for (let i = count - 1; i >= 0; i--) out.push(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  }
  return out;
}
const bucketEnd = (starts: number[], i: number, step: Step) => (i + 1 < starts.length ? starts[i + 1] : step === "hour" ? starts[i] + HOUR : step === "day" ? starts[i] + DAY : step === "week" ? starts[i] + 7 * DAY : Date.UTC(new Date(starts[i]).getUTCFullYear(), new Date(starts[i]).getUTCMonth() + 1, 1));
const blank = (key: string, label: string, kind: Line["kind"], n: number): Line => ({ key, label, kind, cumulativeMicroUsd: Array(n).fill(0), cumulativeInputTokens: Array(n).fill(0), cumulativeOutputTokens: Array(n).fill(0), cumulativeCalls: Array(n).fill(0), bucketMicroUsd: Array(n).fill(0), totalMicroUsd: 0, inputTokens: 0, outputTokens: 0, calls: 0, unknownCalls: 0 });

export function costSeries(rows: ApiCall[], opts: { range?: SeriesRange; harness?: string; now?: Date } = {}): Series {
  const range = opts.range && RANGES.includes(opts.range) ? opts.range : "month";
  const now = opts.now || new Date();
  const { step } = SPEC[range];
  const starts = bucketStarts(range, now);
  const n = starts.length;
  const from = starts[0];
  const to = bucketEnd(starts, n - 1, step);
  const harness = opts.harness || "";
  const inRange = rows.filter((r) => {
    const at = Date.parse(r.createdAt);
    return Number.isFinite(at) && at >= from && at < to;
  });
  const total = blank("total", "All harnesses", "total", n);
  const byHarness = new Map<string, Line>();
  const byModel = new Map<string, Line>();
  const modelRows = new Map<string, Series["models"][number]>();
  const bucketIndex = (at: number) => {
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= at) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const add = (line: Line, i: number, cost: number | undefined, input: number, output: number) => {
    line.calls++;
    if (cost === undefined) line.unknownCalls++;
    else { line.bucketMicroUsd[i] += cost; line.totalMicroUsd += cost; }
    line.inputTokens += input;
    line.outputTokens += output;
    // Token and call history is accumulated per bucket in the arrays below, then made cumulative once.
    line.cumulativeInputTokens[i] += input;
    line.cumulativeOutputTokens[i] += output;
    line.cumulativeCalls[i] += 1;
  };
  for (const r of inRange) {
    const i = bucketIndex(Date.parse(r.createdAt));
    const cost = costOf(r);
    const input = r.usage?.inputTokens || 0;
    const output = r.usage?.outputTokens || 0;
    const h = harnessOf(r);
    add(total, i, cost, input, output);
    if (!byHarness.has(h)) byHarness.set(h, blank(h, h, "harness", n));
    add(byHarness.get(h)!, i, cost, input, output);
    if (!harness || harness === h) {
      const mk = `${r.provider}:${r.model}`;
      if (harness) {
        if (!byModel.has(mk)) byModel.set(mk, blank(mk, mk, "model", n));
        add(byModel.get(mk)!, i, cost, input, output);
      }
      const rk = `${h}|${mk}`;
      const m = modelRows.get(rk) || { provider: r.provider, model: r.model, harness: h, calls: 0, unknownCalls: 0, totalMicroUsd: 0, inputTokens: 0, outputTokens: 0 };
      m.calls++;
      if (cost === undefined) m.unknownCalls++; else m.totalMicroUsd += cost;
      m.inputTokens += input;
      m.outputTokens += output;
      modelRows.set(rk, m);
    }
  }
  const cumulate = (line: Line) => {
    let c = 0, inp = 0, out = 0, calls = 0;
    for (let i = 0; i < n; i++) {
      c += line.bucketMicroUsd[i]; inp += line.cumulativeInputTokens[i]; out += line.cumulativeOutputTokens[i]; calls += line.cumulativeCalls[i];
      line.cumulativeMicroUsd[i] = c; line.cumulativeInputTokens[i] = inp; line.cumulativeOutputTokens[i] = out; line.cumulativeCalls[i] = calls;
    }
    return line;
  };
  cumulate(total);
  const harnessLines = [...byHarness.values()].map(cumulate).sort((a, b) => b.totalMicroUsd - a.totalMicroUsd || b.calls - a.calls);
  const modelLines = [...byModel.values()].map(cumulate).sort((a, b) => b.totalMicroUsd - a.totalMicroUsd || b.calls - a.calls);
  const isolated = harness ? harnessLines.find((l) => l.key === harness) : undefined;
  return {
    range, step,
    from: new Date(from).toISOString(), to: new Date(to).toISOString(),
    buckets: starts.map((s) => new Date(s).toISOString()),
    harness,
    harnesses: harnessLines.map((l) => ({ key: l.key, label: l.label, totalMicroUsd: l.totalMicroUsd, calls: l.calls })),
    total: isolated || total,
    lines: harness ? modelLines : harnessLines,
    models: [...modelRows.values()].sort((a, b) => b.totalMicroUsd - a.totalMicroUsd || b.calls - a.calls),
  };
}
