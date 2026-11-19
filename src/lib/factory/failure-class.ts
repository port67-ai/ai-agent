// Why an AI agent's run failed, in one of eight classes, from the run's stored error text (and the HTTP status when known), with
// a plain-English title and the recommended next step (CHG-0100). Pure and client-safe. Matching is on the stored text, so it
// works for failures recorded before this existed. Provider errors are stored as "AI provider returned <status>: <message>".
export type FailureKind = "quota" | "rate_limit" | "auth" | "model" | "timeout" | "provider_down" | "invalid_output" | "other";
export type FailureClass = {
  kind: FailureKind;
  title: string;
  /** What happened, in one sentence. */
  what: string;
  /** The recommended next step. */
  recommendation: string;
  /** True when rerunning on the same provider and model will very likely fail again: switch provider or model first. */
  switchFirst: boolean;
  status?: number;
};
const SWITCH = "Switch this agent to another provider or model, then rerun.";
export const FAILURE_INFO: Record<FailureKind, Omit<FailureClass, "kind" | "status">> = {
  quota: { title: "The AI provider account has no quota or credit left", what: "The provider refused the call because the account behind its API key is out of quota, credit or billing allowance. Every call to this provider fails the same way until that changes.", recommendation: SWITCH + " Or add credit or raise the quota in the provider's billing settings and rerun later.", switchFirst: true },
  auth: { title: "The provider did not accept the API key", what: "The API key is missing, wrong, revoked or not allowed to use this model.", recommendation: SWITCH + " Or fix the key in Render and rerun.", switchFirst: true },
  model: { title: "The provider does not offer this model", what: "The model ID is not available to this key or does not support this kind of call.", recommendation: SWITCH + " Check the exact model ID on the provider's model list.", switchFirst: true },
  rate_limit: { title: "The provider asked us to slow down", what: "Too many calls in a short time (a rate limit). The account still has quota.", recommendation: "Wait a minute, then rerun.", switchFirst: false },
  timeout: { title: "The provider took too long to answer", what: "The call did not finish within the time limit, so its answer was not used.", recommendation: "Rerun. If it times out again, switch to a faster model.", switchFirst: false },
  provider_down: { title: "The provider had a server problem", what: "The provider returned a server error or could not be reached. This is not a problem with the project.", recommendation: "Rerun. If it keeps failing, switch to another provider for now.", switchFirst: false },
  invalid_output: { title: "The model's answer failed the app's checks", what: "The model replied, but the answer was not valid JSON, broke the output rules, or had nothing the app could cite, so nothing was saved.", recommendation: "Rerun; a model often gets it right on a second attempt. If it fails the same way twice, try a stronger model.", switchFirst: false },
  other: { title: "The agent failed for a reason the app does not classify", what: "Read the message below for the cause.", recommendation: "Rerun once the cause in the message is fixed.", switchFirst: false },
};
const make = (kind: FailureKind, status?: number): FailureClass => ({ kind, ...FAILURE_INFO[kind], ...(status ? { status } : {}) });

const QUOTA = /insufficient_quota|exceeded your current quota|quota (?:exceeded|has been exhausted)|out of (?:quota|credits?)|credit balance is too low|insufficient (?:balance|credits?|funds)|billing (?:details|hard limit|account)|check your plan and billing|payment required|exceeded .*quota/i;
const AUTH = /invalid[_ ]api[_ ]key|incorrect api key|api key not valid|api_key_invalid|invalid x-api-key|authentication[_ ]error|unauthori[sz]ed|permission[_ ]denied|is not set in Render|missing (?:an )?api key|no api key/i;
const MODEL = /model[_ ]not[_ ]found|(?:model|models\/)[^;]{0,120}(?:not found|does not exist|is not supported|not supported for)|unsupported model|unknown model|does not exist or you do not have access|not a valid model/i;
const RATE = /rate.?limit|too many requests|requests per (?:minute|day)|resource[_ ]exhausted|tokens per min/i;
const TIMEOUT = /timed? ?out|timeout|deadline exceeded/i;
const DOWN = /overloaded|service unavailable|bad gateway|internal (?:server )?error|server error|ECONN\w*|ENOTFOUND|EAI_AGAIN|fetch failed|request failed|socket hang up|network/i;
const OUTPUT = /invalid|validation|schema|contract|JSON|unexpected (?:token|end)|end of (?:data|input)|no citations|nothing citable|citable|no usable cited|could not be read|not usable|no valid|returned nothing|empty|figure not present|which is not in|unknown (?:launch channel|format|key message)|output rejected|draft rejected|no image data/i;

/** The HTTP status in a stored provider error ("AI provider returned 429: ...", "Image provider returned 402 ..."). */
export function failureStatus(error: string): number | undefined {
  const m = /\b(?:provider|API) returned (\d{3})\b/i.exec(error || "");
  return m ? Number(m[1]) : undefined;
}

export function classifyFailure(error: string, status?: number): FailureClass {
  const text = (error || "").trim();
  const code = status ?? failureStatus(text);
  if (code === 402 || QUOTA.test(text)) return make("quota", code);
  if (code === 401 || code === 403 || AUTH.test(text)) return make("auth", code);
  if (code === 404 || MODEL.test(text)) return make("model", code);
  if (code === 429 || RATE.test(text)) return make("rate_limit", code);
  if (code === 408 || ((code === undefined || code < 500) && TIMEOUT.test(text))) return make("timeout", code);
  if ((code !== undefined && code >= 500) || DOWN.test(text)) return make("provider_down", code);
  // A provider HTTP error that is none of the above (for example a 400 about the request) is not the model's answer.
  if (code === undefined && OUTPUT.test(text)) return make("invalid_output");
  return make("other", code);
}
