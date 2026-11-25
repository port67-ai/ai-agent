import type { AgentPromptVersion, Database } from "./model";
import type { Repository } from "./repository";
import { AGENT_SLOTS, DEFAULT_PROMPTS, MAX_PROMPT, checkPrompt, type AgentSlot } from "./agent-prompts";

// Saved prompt edits for the project input agents (CHG-0113). One setting per agent, shared by every project. Each save is a version.
export const AGENT_PROMPTS_WORKSPACE = "factory-agent-prompts";
const MAX_HISTORY = 20;
const records = (db: Database) => (db.agentPrompts ||= {});

export type EffectivePrompt = { body: string; isDefault: boolean; version: number; by?: string; at?: string; defaultBody: string };
export async function effectivePrompt(repo: Repository, slot: AgentSlot): Promise<EffectivePrompt> {
  const cur = (await repo.read(AGENT_PROMPTS_WORKSPACE)).agentPrompts?.[slot]?.current;
  return { body: cur?.body ?? DEFAULT_PROMPTS[slot], isDefault: !cur, version: cur?.version ?? 0, by: cur?.by, at: cur?.at, defaultBody: DEFAULT_PROMPTS[slot] };
}
export async function savePrompt(repo: Repository, slot: AgentSlot, body: unknown, actor: string): Promise<void> {
  const text = checkPrompt(slot, body);
  await repo.mutate(AGENT_PROMPTS_WORKSPACE, (db) => {
    const rec = (records(db)[slot] ||= { history: [] });
    if ((rec.current?.body ?? DEFAULT_PROMPTS[slot]) === text) return null;
    const next: AgentPromptVersion = { body: text, version: (rec.current?.version ?? 0) + 1, by: actor, at: new Date().toISOString() };
    if (rec.current) rec.history.push(rec.current);
    rec.history = rec.history.slice(-MAX_HISTORY);
    rec.current = next;
    return null;
  });
}
/** Go back to the original prompt. The edited versions stay in the history. */
export async function resetPrompt(repo: Repository, slot: AgentSlot): Promise<void> {
  await repo.mutate(AGENT_PROMPTS_WORKSPACE, (db) => {
    const rec = records(db)[slot];
    if (rec?.current) { rec.history.push(rec.current); rec.history = rec.history.slice(-MAX_HISTORY); delete rec.current; }
    return null;
  });
}
export { AGENT_SLOTS, MAX_PROMPT };
