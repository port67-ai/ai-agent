import type { Metadata } from "next";
import Portal from "@/components/factory/Portal";
import "./portal.css";
export const metadata: Metadata = {
  title: "Port67 EXPLAIN | Creative workspace",
  description:
    "Research-led marketing content and creative production. A managed workspace for brief, research, direction, production and approval.",
  robots: { index: false, follow: false },
};
export default function PortalPage() {
  return <Portal />;
}
