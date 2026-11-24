import type { Metadata } from "next";
import Workspace from "@/components/factory/Workspace";
import "../portal/portal.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: "Port67 | Video workspace",
  description: "Producer and admin workspace for video production: customer accounts and projects.",
  robots: { index: false, follow: false },
};
export default function WorkspacePage() {
  return <Workspace />;
}
