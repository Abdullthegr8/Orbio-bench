import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModelInfo, Results, RunRecord } from "./types";

export type Cell = "pass" | "fail" | "error";

export interface Standing {
  model: ModelInfo;
  attempted: number;
  passes: number;
  errors: number;
  passRate: number;
  codingRate: number | null;
  agenticRate: number | null;
  costUsd: number | null;
  costPerPass: number | null;
  p50Ms: number;
  cells: Record<string, Cell>;
}

export function loadResults(): Results | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "data", "results.json"), "utf8")) as Results;
  } catch {
    return null;
  }
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function standings(res: Results): Standing[] {
  const cat = new Map(res.tasks.map((t) => [t.id, t.category]));
  const rate = (rs: RunRecord[]) => (rs.length ? rs.filter((r) => r.ok).length / rs.length : null);

  const rows = res.models.map((model): Standing => {
    const runs = res.runs.filter((r) => r.model === model.id);
    const ok = runs.filter((r) => !r.error);
    const passes = ok.filter((r) => r.ok).length;
    // Errored runs may have spent nothing (a rejected request has no cost), so a missing cost only
    // makes the total unknown when it belongs to a run that was actually scored.
    const costKnown = ok.length > 0 && ok.every((r) => r.costUsd !== null);
    const costUsd = costKnown ? runs.reduce((s, r) => s + (r.costUsd ?? 0), 0) : null;
    const cells: Record<string, Cell> = {};
    for (const r of runs) cells[r.taskId] = r.error ? "error" : r.ok ? "pass" : "fail";
    return {
      model,
      attempted: ok.length,
      passes,
      errors: runs.length - ok.length,
      passRate: ok.length ? passes / ok.length : 0,
      codingRate: rate(ok.filter((r) => cat.get(r.taskId) === "coding")),
      agenticRate: rate(ok.filter((r) => cat.get(r.taskId) === "agentic")),
      costUsd,
      costPerPass: costUsd !== null && passes > 0 ? costUsd / passes : null,
      p50Ms: median(ok.map((r) => r.ms)),
      cells,
    };
  });

  return rows.sort((a, b) => {
    if (a.costPerPass === null && b.costPerPass === null) return b.passRate - a.passRate;
    if (a.costPerPass === null) return 1;
    if (b.costPerPass === null) return -1;
    return a.costPerPass - b.costPerPass;
  });
}
