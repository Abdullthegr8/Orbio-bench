import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { MODELS } from "../src/lib/models";
import { TASKS } from "../src/lib/tasks";
import { orbioProvider } from "../src/lib/orbio";
import { mockProvider } from "../src/lib/mock";
import { BudgetGuard, runTask } from "../src/lib/runner";
import type { Results, RunRecord } from "../src/lib/types";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* file not present */
  }
}

const MOCK = process.env.MOCK === "1";
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 4);
const budgetUsd = Number(process.env.BENCH_BUDGET_USD ?? 8);
const OUT = "data/results.json";

// Usage: bench [--fresh] [taskId ...]
//   default   resume: keep every good run in data/results.json, run only what is missing or errored.
//   --fresh   throw away existing runs (for the named tasks, or all tasks) and redo them.
//   taskId    limit the run to those tasks; other tasks' runs are left untouched.
const args = process.argv.slice(2);
const FRESH = args.includes("--fresh");
const only = args.filter((a) => !a.startsWith("--"));

function save(runs: RunRecord[]) {
  const results: Results = {
    generatedAt: new Date().toISOString(),
    source: MOCK ? "mock" : "orbio",
    budgetUsd: MOCK ? 0 : budgetUsd,
    totalCostUsd: runs.reduce((s, r) => s + (r.costUsd ?? 0), 0),
    models: MODELS,
    tasks: TASKS.map((t) => ({ id: t.id, title: t.title, category: t.category })),
    runs,
  };
  mkdirSync("data", { recursive: true });
  writeFileSync(OUT + ".tmp", JSON.stringify(results));
  renameSync(OUT + ".tmp", OUT); // atomic, so a crash never leaves a half-written file
  return results;
}

async function main() {
  const tasks = only.length ? TASKS.filter((t) => only.includes(t.id)) : TASKS;
  const real = MOCK ? null : orbioProvider();
  const budget = new BudgetGuard(MOCK ? Infinity : budgetUsd);

  let kept: RunRecord[] = [];
  if (existsSync(OUT)) {
    const prev = JSON.parse(readFileSync(OUT, "utf8")) as Results;
    if (prev.source === "orbio" && MOCK) throw new Error(`${OUT} holds real results. Move it aside before generating mock data.`);
    if (prev.source === "mock" && !MOCK) {
      console.log("Replacing demo data with a real run.");
      prev.runs = [];
    }
    const inScope = (id: string) => only.length === 0 || only.includes(id);
    kept = prev.runs.filter((r) => !r.error && !(FRESH && inScope(r.taskId)));
    console.log(`Keeping ${kept.length} good runs from the last run.`);
  }
  const done = new Set(kept.map((r) => `${r.model}|${r.taskId}`));
  const jobs = tasks.flatMap((task) => MODELS.map((model) => ({ task, model }))).filter((j) => !done.has(`${j.model.id}|${j.task.id}`));
  if (!jobs.length) console.log("Nothing to run: every model already has a good run for these tasks. Use --fresh to redo them.");

  const runs: RunRecord[] = [...kept];
  const target = jobs.length;
  let started = 0;
  let finished = 0;
  let stopReason: string | null = null;

  async function worker() {
    while (!stopReason) {
      const i = started++;
      if (i >= jobs.length) return;
      const { task, model } = jobs[i];
      const run = await runTask({ model, task, provider: real ?? mockProvider(task), budget });
      if (run.fatal || run.error?.startsWith("Budget guard")) {
        // Not the model's fault: do not record it, so a later --retry picks it up.
        stopReason ??= run.error ?? "fatal error";
        continue;
      }
      runs.push(run);
      finished++;
      save(runs);
      const tag = run.ok ? "PASS" : run.error ? "ERR " : "FAIL";
      console.log(
        `[${finished}/${target}] ${tag} ${model.label.padEnd(18)} ${task.id.padEnd(18)} ` +
          `${run.costUsd === null ? "$?" : "$" + run.costUsd.toFixed(4)} ${(run.ms / 1000).toFixed(1)}s` +
          (run.error ? `  ${run.error.slice(0, 120)}` : ""),
      );
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (!runs.length) {
    console.log(`\nNo runs recorded, so ${OUT} was not written.`);
    if (stopReason) console.log(`Stopped early: ${stopReason}\nFix the cause (key, balance or budget), then run npm run bench again.`);
    process.exit(stopReason ? 1 : 0);
  }
  const results = save(runs);
  const errored = runs.filter((r) => r.error).length;
  console.log(`\nWrote ${OUT} (${MOCK ? "MOCK data" : "real run"}): ${runs.length} runs, ${errored} errored, spend $${results.totalCostUsd.toFixed(4)}`);
  if (stopReason) {
    console.log(`\nStopped early: ${stopReason}`);
    console.log("Fix the cause (key, balance or budget), then run npm run bench again. It resumes where it stopped.");
    process.exit(1);
  }
  if (errored) console.log("Some runs errored. Run npm run bench again to redo only those.");
}
main();
