export type Enquiry = {
  name: string;
  email: string;
  organisation: string;
  role: string;
  service: string;
  budget: string;
  timing: string;
  decision: string;
  challenge: string;
  systems: string;
  ack: true;
  website: string;
};
export function validateEnquiry(
  input: unknown,
): { ok: true; data: Enquiry } | { ok: false } {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false };
  const v = input as Record<string, unknown>;
  const text = (key: string, min: number, max: number, multiline = false) =>
    typeof v[key] === "string" &&
    (v[key] as string).trim().length >= min &&
    (v[key] as string).length <= max &&
    !(multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(
      v[key] as string,
    );
  const optional = (key: string, max: number) =>
    v[key] === undefined || text(key, 0, max);
  const choice = (key: string, values: string[]) =>
    typeof v[key] === "string" && values.includes(v[key] as string);
  if (
    !text("name", 2, 100) ||
    !text("organisation", 2, 160) ||
    !text("email", 3, 160) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email as string) ||
    !text("challenge", 20, 1800, true) ||
    !optional("role", 100) ||
    !optional("systems", 200) ||
    !choice("service", ["understand", "automate", "explain", "unsure"]) ||
    !choice("budget", ["under-5k", "5-8k", "8-12k", "12k-plus", "unknown"]) ||
    !choice("timing", ["now", "soon", "later"]) ||
    (v.decision !== undefined &&
      v.decision !== "" &&
      !choice("decision", ["yes", "shared", "no"])) ||
    v.ack !== true ||
    (v.website !== undefined && v.website !== "")
  )
    return { ok: false };
  const clean = Object.fromEntries(
    [
      "name",
      "email",
      "organisation",
      "role",
      "service",
      "budget",
      "timing",
      "decision",
      "challenge",
      "systems",
      "website",
    ].map((k) => [k, typeof v[k] === "string" ? (v[k] as string).trim() : ""]),
  );
  return { ok: true, data: { ...clean, ack: true } as Enquiry };
}
