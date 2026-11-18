import type { Project } from "./model";
import { nextAction, runTracker, type TrackStep } from "./run-tracker";

// Where one project is on the system map: a small mark on the node each run-progress step belongs to. Computed from the project.
export type Mark = { text: string; tone: "you" | "ai" | "done" };
export type Focus = Record<string, Mark>;

const NODE: Record<string, string> = {
  scope: "scope:business", "insights-draft": "synthesis:insights", insights: "review:insights", "formats-suggest": "synthesis:formats", "audiences-suggest": "synthesis:audiences", sources: "review:sources", direction: "synthesis:strategy", "direction-approval": "review:direction", production: "synthesis:content", "asset-approval": "gate-5",
};
const markFor = (s: TrackStep): Mark | undefined =>
  s.state === "done" ? { text: "DONE", tone: "done" } : s.state === "running" ? { text: "RUNNING", tone: "ai" } : s.state === "paused" || s.state === "waiting_approval" ? { text: "YOUR TURN", tone: "you" } : undefined;

export function focusMarks(p: Project): Focus {
  const out: Focus = {};
  const steps = runTracker(p);
  for (const s of steps) {
    const m = markFor(s);
    if (!m) continue;
    const node = s.id.startsWith("research:") ? s.id : NODE[s.id];
    if (node) out[node] = m;
    if (s.id === "production") out.production = m;
  }
  if (p.researchRequest && !(p.runs || []).some((r) => (r.stage || "research") === "research")) out["producer-start"] = { text: "YOUR TURN", tone: "you" };
  else if (p.researchRequest) out["producer-start"] = { text: "DONE", tone: "done" };
  return out;
}

export type ProjectLine = { id: string; name: string; who: string; text: string; label: string };
/** One line per project for the "All projects" view: which stage it is at and whether a person has to press something. */
export const projectLines = (projects: Project[]): ProjectLine[] =>
  projects.map((p) => {
    const n = nextAction(runTracker(p));
    return { id: p.id, name: p.brief?.business || p.id, who: n.who, text: n.text, label: n.label };
  });
