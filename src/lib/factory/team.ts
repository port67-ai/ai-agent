import type { TeamAuditEntry, TeamMember } from "./model";
import type { FactoryIdentity } from "./identity";
import type { Repository } from "./repository";
// Server-only registry of Port67 staff (producers). Admins stay bootstrapped by PORT67_ADMIN_UIDS
// in Render so the registry can never grant admin or be used to lock the owner out.
export const teamNamespace = "factory-team";
export const MAX_TEAM_MEMBERS = 50;
const MAX_AUDIT = 200;
export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Enter an email address");
  const email = raw.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email)
  )
    throw new Error("Enter a valid email address");
  return email;
}
export async function listTeam(repo: Repository): Promise<TeamMember[]> {
  return [...((await repo.read(teamNamespace)).team || [])].sort((a, b) =>
    a.email.localeCompare(b.email),
  );
}
function audit(db: { teamAudit?: TeamAuditEntry[] }, entry: TeamAuditEntry) {
  const log = (db.teamAudit ||= []);
  log.push(entry);
  if (log.length > MAX_AUDIT) log.splice(0, log.length - MAX_AUDIT);
}
/** Idempotent: adding an existing member changes nothing. */
export async function addTeamMember(repo: Repository, rawEmail: unknown, actorUid: string) {
  const email = normalizeEmail(rawEmail);
  await repo.mutate(teamNamespace, (db) => {
    const team = (db.team ||= []);
    if (team.some((m) => m.email === email)) return;
    if (team.length >= MAX_TEAM_MEMBERS)
      throw new Error(`Team limit of ${MAX_TEAM_MEMBERS} reached`);
    const at = new Date().toISOString();
    team.push({ email, addedBy: actorUid, addedAt: at });
    audit(db, { at, actor: actorUid, action: "add", email });
  });
  return listTeam(repo);
}
export async function removeTeamMember(repo: Repository, rawEmail: unknown, actorUid: string) {
  const email = normalizeEmail(rawEmail);
  await repo.mutate(teamNamespace, (db) => {
    const before = db.team || [];
    if (!before.some((m) => m.email === email)) return;
    db.team = before.filter((m) => m.email !== email);
    audit(db, { at: new Date().toISOString(), actor: actorUid, action: "remove", email });
  });
  return listTeam(repo);
}
/**
 * Apply the staff registry to a verified identity. Only ever promotes customer to producer, and only
 * for an email Firebase has verified (callers pass the verified identity). Never grants admin.
 */
export async function withTeamRole(repo: Repository, identity: FactoryIdentity): Promise<FactoryIdentity> {
  if (identity.role === "operator" || !identity.email) return identity;
  let email: string;
  try {
    email = normalizeEmail(identity.email);
  } catch {
    return identity;
  }
  let team: TeamMember[];
  try {
    team = (await repo.read(teamNamespace)).team || [];
  } catch {
    // Fail closed on privilege: an unreadable registry never promotes anyone.
    return identity;
  }
  return team.some((m) => m.email === email) ? { ...identity, role: "operator" } : identity;
}
