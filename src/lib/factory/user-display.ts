import type { Principal } from "./model";

type Who = Pick<Principal, "email" | "demo" | "role" | "identity" | "admin">;

/** Name shown in the account menu. Never invents an identity. */
export function userLabel(p: Who): string {
  if (p.email) return p.email;
  if (p.demo) return "Demo visitor";
  return p.role === "operator" ? "Port67 producer" : "Customer reviewer";
}

/** Plain-language role shown under the name. */
export function roleLabel(p: Who): string {
  if (p.demo) return "Synthetic demo workspace";
  if (p.admin && p.identity === "firebase") return "Administrator";
  if (p.role === "operator") return "Producer";
  return p.identity === "firebase" ? "Account owner" : "Customer review";
}

/** One or two capital letters for the avatar. */
export function userInitials(p: Who): string {
  const local = (p.email || "").split("@")[0] || "";
  const parts = local.split(/[._+\-\s]+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? parts[0][0] + parts[1][0]
      : (parts[0] || "").slice(0, 2);
  const clean = letters.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
  if (clean) return clean;
  if (p.demo) return "D";
  return p.role === "operator" ? "P" : "C";
}
