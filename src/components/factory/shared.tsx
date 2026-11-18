"use client";
import type { ReactNode } from "react";
import { CircleDot } from "lucide-react";
import type { Project, Segment } from "@/lib/factory/model";
export const researchLabels: Record<Segment, string> = {
  channel: "Channel and audience behaviour", offer: "Product and offer", measurement: "Measurement and experiments",
  brand: "Business & brand",
  customer: "Customer insight",
  competitor: "Competitor intelligence",
  creative: "Creative research",
  adjacent: "Adjacent businesses", trends: "Social trends", video: "Video language",
};
export const researchNotes: Record<Segment, string> = {
  channel: "Channel and audience behaviour", offer: "Product and offer", measurement: "Measurement and experiments",
  adjacent: "Learn from complementary businesses and parallel categories serving the same audience or occasion.",
  trends: "Investigate recent channel-specific patterns, dates, comparable examples and uncertainty about performance.",
  video: "Study style, lighting, motion, graphics, pace, duration and audio. Search descriptions are not direct video analysis.",
  brand: "Understand the offer, brand voice and facts we can stand behind.",
  customer:
    "Find motivations, objections and the language customers actually use.",
  competitor:
    "Explore positioning, customer praise and gaps worth investigating.",
  creative:
    "Find storytelling principles, design references and channel conventions.",
};
export const fields = (form: HTMLFormElement) => {
  const data = new FormData(form);
  return { ...Object.fromEntries(data.entries()), ...(form.querySelector('[name="requestedFormats"]') ? { requestedFormats: data.getAll("requestedFormats") } : {}) };
};
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"f-tag " + tone}>{children}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="f-empty">
      <CircleDot size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="f-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export type Actions = {
  p: Project;
  operator: boolean;
  busy: boolean;
  command: (
    data: Record<string, unknown>,
    success?: string,
  ) => Promise<boolean> | undefined;
};
