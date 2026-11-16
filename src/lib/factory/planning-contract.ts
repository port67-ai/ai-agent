export function object(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  const o = value as Record<string, unknown>;
  if (Object.keys(o).some(k => !fields.includes(k)) || fields.some(k => !(k in o))) throw new Error(`Invalid ${label} fields`);
  return o;
}
export function string(value: unknown, label: string, max = 600): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${label}`);
  return value.trim();
}
export function list(value: unknown, label: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`Invalid ${label}`);
  return value;
}
export const strings = (value: unknown, label: string, max = 6, length = 400) => list(value, label, max).map(x => string(x, label, length));
export const numericTokens = (text: string): string[] => text.match(/\d[\d,.]*%?/g) || [];
export function noInventedFigures(text: string, payload: unknown) {
  const known = numericTokens(JSON.stringify(payload));
  if (numericTokens(text).some(n => !known.includes(n))) throw new Error("A recommendation contains a figure not present in the supplied evidence");
}
export const textSchema = { type: "string" };
export const textsSchema = { type: "array", items: textSchema };
export const strictSchema = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });

