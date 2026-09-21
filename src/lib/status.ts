import type { Standing } from "./results";

export type Status = "operational" | "degraded" | "partial" | "major" | "incomplete" | "nodata";

export const STATUS_META: Record<Status, { label: string; dot: string; text: string; help: string }> = {
  operational: { label: "Operational", dot: "bg-teal", text: "text-tealdark", help: "Passed every task" },
  degraded: { label: "Degraded", dot: "bg-amber", text: "text-amberdark", help: "Passed 80% or more" },
  partial: { label: "Partial outage", dot: "bg-ember", text: "text-emberdark", help: "Passed 50% to 79%" },
  major: { label: "Major outage", dot: "bg-brick", text: "text-brickdark", help: "Passed under 50%" },
  incomplete: { label: "Incomplete", dot: "cell-error", text: "text-slate", help: "Passed everything scored, but some runs errored" },
  nodata: { label: "No data", dot: "bg-track", text: "text-slate", help: "No scored runs" },
};

export function statusOf(s: Standing): Status {
  if (s.attempted === 0) return "nodata";
  if (s.passRate === 1) return s.errors > 0 ? "incomplete" : "operational";
  if (s.passRate >= 0.8) return "degraded";
  if (s.passRate >= 0.5) return "partial";
  return "major";
}
