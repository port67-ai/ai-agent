"use client";
import { UserCheck } from "lucide-react";
import type { Project } from "@/lib/factory/model";

/** The account owner's one place to see what needs their decision and to open it. */
export default function CustomerApprovals({ p, go }: { p: Project; go: (tab: "direction" | "assets") => void }) {
  const d = p.strategies.at(-1);
  const shared = p.assets.filter((x) => x.status === "shared").length;
  const items: { key: string; text: string; tab: "direction" | "assets" }[] = [];
  if (d?.status === "shared") items.push({ key: "d", text: "Your campaign direction is ready for you to approve.", tab: "direction" });
  if (shared) items.push({ key: "a", text: `${shared} asset${shared === 1 ? " is" : "s are"} ready for you to approve.`, tab: "assets" });
  return (
    <section className="f-panel" aria-label="Waiting for you">
      <div className="f-eyebrow">Waiting for you</div>
      {items.length ? items.map((i) => (
        <p key={i.key} className="f-small" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <UserCheck size={16} aria-hidden="true" /> {i.text}
          <button type="button" className="f-button small" onClick={() => go(i.tab)}>Review and approve</button>
        </p>
      )) : <p className="f-small">{d?.status === "approved" ? "Nothing needs your approval right now." : "Port67 is preparing your direction. You will be asked to approve it here."}</p>}
    </section>
  );
}
