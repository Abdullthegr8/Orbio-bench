import Link from "next/link";
import CostChart from "@/components/CostChart";
import ShareBar from "@/components/ShareBar";
import StatusBoard from "@/components/StatusBoard";
import { modelSlug, money } from "@/lib/format";
import { loadResults, standings } from "@/lib/results";
import { statusOf } from "@/lib/status";

export const dynamic = "force-static";

export default function Home() {
  const res = loadResults();

  if (!res) {
    return (
      <>
        <h1 className="font-display text-3xl font-bold">No results yet</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-slate">
          Run <code className="rounded bg-white px-1.5 py-0.5">npm run bench</code> with your Orbio key in{" "}
          <code className="rounded bg-white px-1.5 py-0.5">.env.local</code>. It writes{" "}
          <code className="rounded bg-white px-1.5 py-0.5">data/results.json</code>, and this page fills in.
        </p>
      </>
    );
  }

  const rows = standings(res);
  const total = rows.length;
  const operational = rows.filter((r) => statusOf(r) === "operational").length;
  const anyMajor = rows.some((r) => ["major", "partial"].includes(statusOf(r)));
  const errored = res.runs.filter((r) => r.error).length;
  const failed = res.runs.filter((r) => !r.error && !r.ok);
  const best = rows.filter((r) => r.costPerPass !== null).sort((a, b) => a.costPerPass! - b.costPerPass!)[0];
  const top = [...rows].sort((a, b) => b.passRate - a.passRate || (a.costPerPass ?? 1e9) - (b.costPerPass ?? 1e9))[0];
  const demo = res.source === "mock";

  const banner =
    operational === total
      ? { tone: "bg-tealdark", title: "All models are operational", body: "Every model passed every task in the latest run." }
      : {
          tone: anyMajor ? "bg-brickdark" : "bg-amberdark",
          title: `${operational} of ${total} models passed every task`,
          body: `${failed.length} scored ${failed.length === 1 ? "run" : "runs"} failed${errored ? `, ${errored} errored and ${errored === 1 ? "is" : "are"} not counted` : ""}.`,
        };

  const shareText = best
    ? `${best.model.label} gives the most passing code per dollar on an Orbio key: ${money(best.costPerPass)} per pass across ${res.tasks.length} tasks and ${total} models, graded on hidden tests. Built for Orbio Build Week @orbiodotso`
    : "";

  return (
    <>
      {demo && (
        <p role="note" className="mb-6 rounded-md border border-amber bg-amber-soft px-4 py-3 text-sm leading-relaxed">
          Demo data. These numbers are simulated so the page can be tried without spending anything. Run{" "}
          <code className="rounded bg-white/70 px-1">npm run bench</code> to replace them with a real run.
        </p>
      )}

      <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Model status</h1>
      <p className="mt-2 max-w-prose leading-relaxed text-slate">
        Which model gives you the most passing code per dollar? {total} models run {res.tasks.length} tasks through one Orbio key. Every answer is graded on tests the model never sees.
      </p>

      <div role="status" className={`mt-6 rounded-lg px-5 py-4 text-white ${banner.tone}`}>
        <p className="font-display text-xl font-semibold sm:text-2xl">{banner.title}</p>
        <p className="mt-0.5 text-sm text-white/90">{banner.body}</p>
      </div>

      {best && top && (
        <p className="mt-6 max-w-prose leading-relaxed">
          <strong>{best.model.label}</strong> is the best value at {money(best.costPerPass)} per passing task.{" "}
          <strong>{top.model.label}</strong> is the most accurate, passing {top.passes} of {top.attempted} scored runs.
        </p>
      )}
      <div className="mt-4">
        <ShareBar text={shareText} demo={demo} />
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold">Models</h2>
      <p className="mb-5 mt-1 max-w-prose text-sm leading-relaxed text-slate">
        Each square is one task. Tap a model to see every run, call by call.
      </p>
      <StatusBoard rows={rows} tasks={res.tasks} />

      <h2 className="mt-14 font-display text-2xl font-semibold">Cost per passing task</h2>
      <div className="mt-3">
        <CostChart rows={rows} />
      </div>

      <h2 className="mt-14 font-display text-2xl font-semibold">Incidents</h2>
      {res.runs.some((r) => !r.ok) ? (
        <ul className="mt-3">
          {[...res.runs]
            .filter((r) => !r.ok)
            .sort((a, b) => Number(!!b.error) - Number(!!a.error))
            .slice(0, 40)
            .map((r) => {
              const model = res.models.find((m) => m.id === r.model);
              const task = res.tasks.find((t) => t.id === r.taskId);
              return (
                <li key={r.model + r.taskId} className="border-b border-track py-3">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={`text-sm font-semibold ${r.error ? "text-amberdark" : "text-brickdark"}`}>{r.error ? "Errored" : "Failed"}</span>
                    <Link href={`/model/${modelSlug(r.model)}`} className="font-display font-semibold underline-offset-4 hover:underline">
                      {model?.label ?? r.model}
                    </Link>
                    <span className="text-slate">on {task?.title ?? r.taskId}</span>
                  </p>
                  <p className="mt-0.5 break-words text-sm text-slate">
                    {r.error ?? `Passed ${r.hiddenPassed} of ${r.hiddenTotal} hidden tests`}
                  </p>
                </li>
              );
            })}
        </ul>
      ) : (
        <p className="mt-3 text-slate">No failed or errored runs in this benchmark.</p>
      )}

      <p className="mt-12 text-sm text-slate">
        Latest run {new Date(res.generatedAt).toUTCString().slice(0, 22)} UTC, total spend {money(res.totalCostUsd)}.
      </p>
    </>
  );
}
