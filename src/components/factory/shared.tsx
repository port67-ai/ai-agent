"use client";
import type { ReactNode } from "react";
import { CircleDot } from "lucide-react";
import type { Project, Segment } from "@/lib/factory/model";
export const researchLabels: Record<Segment, string> = {
  brand: "Business & brand",
  customer: "Customer insight",
  competitor: "Competitor intelligence",
  creative: "Creative research",
};
export const researchNotes: Record<Segment, string> = {
  brand: "Understand the offer, brand voice and facts we can stand behind.",
  customer:
    "Find motivations, objections and the language customers actually use.",
  competitor:
    "Explore positioning, customer praise and gaps worth investigating.",
  creative:
    "Find storytelling principles, design references and channel conventions.",
};
export const fields = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form).entries());
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
