import type { BrandListEntry, Commission, CommissionInput, EvidenceBasis, EvidenceItem, Generation, RedLine } from "./model";
import { webUrl } from "./customers";

// Commissions and the Inspiration baseline (CHG-0107, FAC-VWS-011 to FAC-VWS-016). Pure and client-safe: no Node imports, no AI.
export const MAX_COMMISSIONS = 50;
export const MAX_EVIDENCE = 30;
export const MAX_LIST = 30;
export const MAX_ANSWER = 2000;
/** The two brand expression answers hold the AI's labelled prose, so they may be longer. */
export const MAX_LONG_ANSWER = 12000;
/** Evidence and the "can change or out of character" list are shown greyed out and are not part of the flow for now. Turn on to restore the rules below. */
export const EVIDENCE_ACTIVE = false;
export const CHANGE_LIST_ACTIVE = false;
export const INPUT_KEYS: CommissionInput[] = ["objective", "product", "audience", "brand"];

/** The four primary inputs, numbered as the owner listed them (there is no Input 2). */
export const INPUTS: { key: CommissionInput; number: number; title: string; role: string; helper: string; prompts: { key: string; label: string; max?: number }[] }[] = [
  { key: "objective", number: 1, title: "Commission objective", role: "The Filter", helper: "Decides what research to ignore. Confirm directly with the client.", prompts: [
    { key: "why", label: "Why has the client commissioned this work now?" },
    { key: "making", label: "What are you making, for whom, and where will they encounter it?" },
    { key: "think", label: "What should they think afterwards?" },
    { key: "feel", label: "What should they feel?" },
    { key: "do", label: "What should they do after?" },
    { key: "success", label: "How will the client judge success?" },
  ] },
  { key: "product", number: 3, title: "Product or service being commissioned", role: "The Proof", helper: "Keeps inspiration grounded in physical truth rather than empty aesthetics.", prompts: [
    { key: "offer", label: "Which specific offer is in scope?" },
    { key: "need", label: "What need does it meet?" },
    { key: "price", label: "What does it cost?" },
    { key: "usage", label: "When is it used?" },
    { key: "choice", label: "Why would someone choose it?" },
    { key: "proof", label: "What feature, experience or proof makes its promise credible?" },
  ] },
  { key: "audience", number: 4, title: "Current and intended audience", role: "The Bridge", helper: "Shows how and where to explore. Confirm the intended audience with the client.", prompts: [
    { key: "who", label: "Who buys it, who uses it and who influences the decision?" },
    { key: "motivations", label: "What motivates them?" },
    { key: "putOffs", label: "What puts them off?" },
    { key: "words", label: "What words do they use?" },
    { key: "intended", label: "Who does the client want this commission to reach, if that differs from today?" },
  ] },
  { key: "brand", number: 5, title: "Brand expression and boundaries", role: "The Anchor", helper: "The brand's non-negotiable DNA once the setting is removed. Separate an announced direction from your own inference.", prompts: [
    { key: "recognisable", label: "What makes the brand recognisable in its imagery, colours, typography, tone, casting, settings and storytelling?", max: MAX_LONG_ANSWER },
    { key: "recurring", label: "Which elements recur across years and channels, and which belonged to a single campaign?", max: MAX_LONG_ANSWER },
  ] },
];
/** The age groups for Input 4, with the owner's definitions. */
export const GENERATIONS: { key: Generation; label: string; range: string; minors: boolean }[] = [
  { key: "gen_x", label: "Gen X", range: "46–61", minors: false },
  { key: "gen_y", label: "Gen Y", range: "30–45", minors: false },
  { key: "gen_z", label: "Gen Z / Zoomers", range: "14–29", minors: true },
  { key: "gen_alpha", label: "Gen Alpha", range: "2–13", minors: true },
];
export const generationDef = (key: string) => GENERATIONS.find((g) => g.key === key);
export function generationKey(value: unknown): Generation {
  const g = generationDef(String(value));
  if (!g) throw new Error("Choose an age group: Gen X, Gen Y, Gen Z or Gen Alpha");
  return g.key;
}
export const inputDef = (key: string) => INPUTS.find((i) => i.key === key);

/** Shown greyed out and not editable in this step. */
export const SECONDARY: { title: string; what: string; where: string }[] = [
  { title: "Company story and values", what: "Who are they, what do they do, how did they get here, and what do they stand for today? Which founding stories still shape the business? If they claim a purpose or social commitment, how does it show up in their decisions?", where: "About and history pages, founder interviews, company reports, partnerships, product and service policies." },
  { title: "Competition and alternatives", what: "What else would this customer realistically choose, including doing nothing? What promises, imagery and language do competitors keep using? Where could your client credibly stand apart?", where: "Compare a small set of direct competitors and substitutes across equivalent products, campaigns, pricing and reviews." },
  { title: "Parallels and creative inspiration", what: "Which brands outside the immediate category have solved a similar creative problem? What exactly can you learn from their approach, and how would you express that idea in the client's own voice?", where: "Campaigns, experiences, partnerships or products selected for a specific shared challenge. Capture the reason each reference belongs." },
];

export const EVIDENCE_WHERE: { key: string; label: string }[] = [
  { key: "client_brief", label: "Client brief" }, { key: "conversation", label: "Commissioning conversation" }, { key: "product_page", label: "Product page, pricing or FAQ" },
  { key: "reviews", label: "Reviews or customer stories" }, { key: "community", label: "Community discussion" }, { key: "retailer", label: "Retailer or stockist" },
  { key: "trade_coverage", label: "Trade coverage" }, { key: "interview", label: "Leadership interview" }, { key: "other", label: "Other" },
];
export const EVIDENCE_BASIS: { key: EvidenceBasis; label: string }[] = [
  { key: "announced", label: "Announced by the client" }, { key: "client_confirmed", label: "Client confirmed" }, { key: "inference", label: "My inference" },
];
export const LIST_NAMES = ["preserve", "change"] as const;
export type ListName = (typeof LIST_NAMES)[number];

function str(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) { if (required) throw new Error(`${name} is required`); return ""; }
  if (typeof value !== "string" || value.length > max) throw new Error(`${name} must be text up to ${max} characters`);
  const out = value.trim();
  if (required && !out) throw new Error(`${name} is required`);
  return out;
}
export const commissionName = (value: unknown) => str(value, "Project name", 120, true);
export const emptyAnswers = (): Commission["answers"] => ({ objective: {}, product: {}, audience: {}, brand: {} });

/** Validate the prompts sent for one input. Only the prompts sent change; unknown prompts are refused. */
export function answerFields(input: unknown, answers: unknown): { input: CommissionInput; answers: Record<string, string> } {
  const def = inputDef(String(input));
  if (!def) throw new Error("Unknown input");
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("Answers must be an object");
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    const prompt = def.prompts.find((p) => p.key === k);
    if (!prompt) throw new Error("Unknown question");
    out[k] = str(v, prompt.label, prompt.max ?? MAX_ANSWER);
  }
  return { input: def.key, answers: out };
}

export function listName(value: unknown): ListName {
  if (!(LIST_NAMES as readonly unknown[]).includes(value)) throw new Error("Unknown list");
  return value as ListName;
}
export function listEntryFields(list: ListName, data: Record<string, unknown>, partial = false) {
  const out: { text?: string; scope?: BrandListEntry["scope"]; kind?: BrandListEntry["kind"] } = {};
  if (!partial || "text" in data) out.text = str(data.text, "Entry", 500, true);
  if (!partial || "scope" in data) {
    if (data.scope !== "recurring" && data.scope !== "single_campaign") throw new Error("Say whether it recurs across years or belonged to a single campaign");
    out.scope = data.scope;
  }
  if (list === "change" && (!partial || "kind" in data)) {
    if (data.kind !== "can_change" && data.kind !== "out_of_character") throw new Error("Say whether it can change or is out of character");
    out.kind = data.kind;
  }
  return out;
}

/** A source is a public https link or a plain note. Anything that starts like a web address must be a valid public https one. */
export function evidenceSource(value: unknown): string {
  const s = str(value, "Source", 500, true);
  return /^(https?:\/\/|www\.)/i.test(s) ? webUrl(s, "Source link") : s;
}
export function evidenceFields(data: Record<string, unknown>, partial = false) {
  const out: { source?: string; where?: string; note?: string; basis?: EvidenceBasis } = {};
  if (!partial || "source" in data) out.source = evidenceSource(data.source);
  if (!partial || "where" in data) {
    if (!EVIDENCE_WHERE.some((w) => w.key === data.where)) throw new Error("Say where you looked");
    out.where = data.where as string;
  }
  if (!partial || "note" in data) out.note = str(data.note, "Note", 1000);
  if (!partial || "basis" in data) {
    if (!EVIDENCE_BASIS.some((b) => b.key === data.basis)) throw new Error("Say whether this was announced, client confirmed or your inference");
    out.basis = data.basis as EvidenceBasis;
  }
  return out;
}

// ---------- Status and the Inspiration baseline ----------

export type InputStatus = "not_started" | "in_progress" | "complete";
export const STATUS_LABEL: Record<InputStatus, string> = { not_started: "Not started", in_progress: "In progress", complete: "Complete" };
const count = (key: CommissionInput, a: Record<string, string> | undefined) => (inputDef(key)?.prompts || []).filter((p) => (a?.[p.key] || "").trim()).length;
/** For the audience, the most complete age group counts (answers saved before age groups existed count too). */
const answered = (c: Commission, key: CommissionInput) =>
  key === "audience" ? Math.max(count(key, c.answers.audience), ...Object.values(c.audience || {}).map((s) => count(key, s?.answers))) : count(key, c.answers[key]);
const evidenceFor = (c: Commission, key: CommissionInput) => c.evidence.filter((e) => e.input === key);
/** Complete means every prompt answered (and, once evidence is switched on, at least one evidence item). */
export function inputStatus(c: Commission, key: CommissionInput): InputStatus {
  const total = inputDef(key)!.prompts.length;
  const n = answered(c, key);
  const ev = EVIDENCE_ACTIVE ? evidenceFor(c, key).length : 0;
  if (n === 0 && ev === 0) return "not_started";
  return n === total && (!EVIDENCE_ACTIVE || ev > 0) ? "complete" : "in_progress";
}

export type BaselineView = {
  status: Record<CommissionInput, InputStatus>;
  /** Input 4 answers saved before age groups existed. */
  reach: { label: string; text: string }[];
  /** Saved age groups, in order, with whether each is selected for direction. */
  audiences: { key: Generation; label: string; range: string; selected: boolean; lines: { label: string; text: string }[] }[];
  directionReady: boolean;
  achieve: { label: string; text: string }[];
  recognise: { label: string; text: string }[];
  preserve: BrandListEntry[];
  fresh: BrandListEntry[];
  wentTooFar: string;
  proof: { label: string; text: string }[];
  redLines: RedLine[];
  evidence: { input: CommissionInput; title: string; items: EvidenceItem[] }[];
  gaps: string[];
};
const lines = (c: Commission, key: CommissionInput, from?: Record<string, string>) => inputDef(key)!.prompts.map((p) => ({ label: p.label, text: ((from ?? c.answers[key])?.[p.key] || "").trim() })).filter((x) => x.text);

/** Assemble the baseline from what was entered. No AI. Shows even when incomplete, and lists what is missing. */
export function baseline(c: Commission, redLines: RedLine[] = []): BaselineView {
  const status = Object.fromEntries(INPUT_KEYS.map((k) => [k, inputStatus(c, k)])) as Record<CommissionInput, InputStatus>;
  const gaps: string[] = [];
  for (const def of INPUTS) {
    const n = answered(c, def.key);
    const ev = evidenceFor(c, def.key).length;
    const label = `Input ${def.number}, ${def.title}`;
    if (status[def.key] === "not_started") gaps.push(`${label} is not started`);
    else {
      if (n < def.prompts.length) gaps.push(`${label} has ${def.prompts.length - n} unanswered question${def.prompts.length - n === 1 ? "" : "s"}`);
      if (EVIDENCE_ACTIVE && !ev) gaps.push(`${label} has no evidence`);
    }
  }
  if (!c.preserve.length) gaps.push("Nothing is listed to preserve");
  if (CHANGE_LIST_ACTIVE && !c.change.length) gaps.push("Nothing is listed as can change or out of character");
  const selected = (c.directionGenerations || []).filter((g) => c.audience?.[g]);
  if (Object.keys(c.audience || {}).length && !selected.length) gaps.push("No age group is selected for direction");
  if (!c.confirmed.objective) gaps.push("The objective has not been confirmed with the client");
  if (!c.confirmed.audience) gaps.push("The audience has not been confirmed with the client");
  return {
    status,
    reach: lines(c, "audience"),
    audiences: GENERATIONS.filter((g) => c.audience?.[g.key]).map((g) => ({ key: g.key, label: g.label, range: g.range, selected: selected.includes(g.key), lines: lines(c, "audience", c.audience![g.key]!.answers) })),
    directionReady: selected.length >= 1,
    achieve: lines(c, "objective"),
    recognise: lines(c, "brand"),
    preserve: c.preserve,
    fresh: c.change,
    wentTooFar: c.wentTooFar,
    proof: lines(c, "product"),
    redLines,
    evidence: INPUTS.map((d) => ({ input: d.key, title: `Input ${d.number}, ${d.title}`, items: evidenceFor(c, d.key) })).filter((g) => g.items.length),
    gaps,
  };
}
