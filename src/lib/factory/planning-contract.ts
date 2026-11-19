export function object(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}: the model returned ${Array.isArray(value) ? "a list" : value === null ? "nothing" : typeof value} where an object was expected`);
  const o = value as Record<string, unknown>;
  const extra = Object.keys(o).filter(k => !fields.includes(k)), missing = fields.filter(k => !(k in o));
  if (extra.length || missing.length) throw new Error(`Invalid ${label} fields${missing.length ? `: missing ${missing.join(", ")}` : ""}${extra.length ? `${missing.length ? "; " : ": "}unexpected ${extra.join(", ")}` : ""}`);
  return o;
}
export function string(value: unknown, label: string, max = 600): string {
  if (typeof value !== "string") throw new Error(`Invalid ${label}: expected text, got ${value === null ? "nothing" : Array.isArray(value) ? "a list" : typeof value}`);
  if (!value.trim()) throw new Error(`Invalid ${label}: the text was empty`);
  if (value.length > max) throw new Error(`Invalid ${label}: ${value.length} characters, but at most ${max} are allowed`);
  return value.trim();
}
export function list(value: unknown, label: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}: expected a list, got ${value === null || value === undefined ? "nothing" : typeof value}`);
  if (value.length < min || value.length > max) throw new Error(`Invalid ${label}: ${value.length} item${value.length === 1 ? "" : "s"}, but ${min ? `${min} to ${max}` : `at most ${max}`} ${max === 1 ? "is" : "are"} allowed`);
  return value;
}
export const strings = (value: unknown, label: string, max = 6, length = 400) => list(value, label, max).map(x => string(x, label, length));
export const numericTokens = (text: string): string[] => text.match(/\d[\d,.]*%?/g) || [];
export function noInventedFigures(text: string, payload: unknown) {
  const known = numericTokens(JSON.stringify(payload));
  const unknown = [...new Set(numericTokens(text).filter(n => !known.includes(n)))];
  if (unknown.length) throw new Error(`A recommendation contains a figure not present in the supplied evidence: ${unknown.slice(0, 5).join(", ")}`);
}
export const textSchema = { type: "string" };
export const textsSchema = { type: "array", items: textSchema };
export const strictSchema = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
