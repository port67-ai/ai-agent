import { channelById } from "./channels";
import type { Project } from "./model";

// Shared, bounded context blocks for the writing agents. Text typed by people is collapsed to one line and clipped; it is passed as data,
// never added to the instructions.
const one = (t: unknown, max: number) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Ideas a producer kept in the ideas bank: what the team already likes. */
export const keptIdeas = (p: Project) =>
  (p.ideas || []).filter((i) => i.status === "kept").sort((a, b) => a.rank - b.rank).slice(0, 8)
    .map((i) => ({ title: one(i.title, 80), format: i.format, hook: one(i.hook, 200), angle: one(i.angle, 200), ...(i.segment ? { segment: i.segment } : {}) }));

/** What each launch channel is good for and how it works natively. */
export const channelPlaybooks = (p: Project) =>
  (p.channels || []).map(channelById).filter((c): c is NonNullable<typeof c> => !!c).map((c) => ({ name: c.name, whyItMatters: one(c.summary, 240), nativePlaybook: one(c.playbook, 400) }));

/** The previous direction and what the customer said about it, so a redraft keeps what worked and fixes what did not. */
export function previousDirection(p: Project) {
  const d = p.strategies.at(-1);
  if (!d) return null;
  return {
    version: d.version, status: d.status,
    message: one(d.message, 300), positioning: one(d.positioning, 400), tone: one(d.tone, 300), doNotClaim: one(d.doNotClaim, 600), cta: one(d.cta, 100),
    keyMessages: (d.keyMessages || []).map((k) => ({ message: one(k.message, 200), proof: one(k.proof, 300) })),
    ...(d.feedback ? { customerFeedback: one(d.feedback, 1000) } : {}),
  };
}
/** Copy the customer or a producer sent back for changes on the current direction. */
export const assetFeedback = (p: Project, strategyHash: string) =>
  p.assets.filter((a) => a.strategyHash === strategyHash && a.status === "changes_requested" && a.feedback).slice(-6).map((a) => ({ title: one(a.title, 100), feedback: one(a.feedback, 600) }));
