import { TASKS } from "@/lib/tasks";

export const dynamic = "force-static";

const METHOD = [
  ["Tests the model never sees", "Each task has visible cases the model can run and hidden cases used only for grading. A run passes only if every visible and hidden case passes."],
  ["Two kinds of work", "Write-from-spec tasks get one shot and no tools. Fix-the-bug tasks start from a broken file and give the model read, write, run-tests and submit tools with up to 8 turns."],
  ["Code runs away from the key", "Model code runs in a separate process with a timeout, a memory cap and an empty environment, so it can never read the API key. Functions that mutate their input fail."],
  ["Cost is measured, not estimated", "Each call's cost comes from the gateway response. If a response has no cost, the model list's price is used. If neither exists, cost shows as n/a instead of a guess."],
  ["A spend cap on the benchmark itself", "The runner stops when total spend passes BENCH_BUDGET_USD, so a bad run cannot drain the key."],
  ["Errors are not failures", "Requests that fail after retries are marked as errors and left out of the pass rate."],
];

export default function TasksPage() {
  const groups = [
    { name: "Write from a spec", items: TASKS.filter((t) => t.category === "coding") },
    { name: "Fix the bug with tools", items: TASKS.filter((t) => t.category === "agentic") },
  ];
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Tasks and method</h1>
      <dl className="mt-6 max-w-prose space-y-5">
        {METHOD.map(([h, b]) => (
          <div key={h}>
            <dt className="font-display text-lg font-semibold">{h}</dt>
            <dd className="mt-1 leading-relaxed text-slate">{b}</dd>
          </div>
        ))}
      </dl>

      {groups.map((g) => (
        <section key={g.name} className="mt-12">
          <h2 className="border-b border-track pb-2 font-display text-2xl font-semibold">{g.name}</h2>
          <ul>
            {g.items.map((t) => (
              <li key={t.id} className="border-b border-track py-5">
                <p className="font-display text-lg font-semibold">{t.title}</p>
                <p className="mt-1 max-w-prose leading-relaxed text-slate">{t.spec}</p>
                <p className="mt-2 text-sm text-slate">
                  {t.visible.length} visible cases, {t.hidden.length} hidden cases
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
