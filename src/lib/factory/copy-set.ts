import type { Project } from "./model";
/** Video is optional. It needs an approved storyboard and an approved copy set for the same direction: the AI copy pack if one exists, otherwise the template copy. Pure, so the browser can use it too. */
export function copySetApproved(p: Pick<Project, "assets">, strategyHash: string) {
  const copy = p.assets.filter((x) => x.kind === "copy" && x.strategyHash === strategyHash);
  const ai = copy.filter((x) => x.title === "AI copy pack");
  return (ai.length ? ai : copy).some((x) => x.status === "approved");
}
