import Link from "next/link";
import { notFound } from "next/navigation";
import { fromSlug, modelSlug, money } from "@/lib/format";
import { MODELS, TIER_LABEL } from "@/lib/models";
import { loadResults, standings } from "@/lib/results";
import type { RaceEvent } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return MODELS.map((m) => ({ slug: modelSlug(m.id) }));
}

function step(e: RaceEvent): string {
  switch (e.kind) {
    case "start":
      return "Started";
    case "turn":
      return `Model call ${e.turn}, ${money(e.costUsd)} spent so far`;
    case "tool":
      return `Used tool ${e.tool}`;
    case "tests":
      return `Visible tests: ${e.passed} of ${e.total} pass`;
    case "done":
      return e.ok ? "Finished, passed every hidden test" : `Finished, ${e.hiddenPassed} of ${e.hiddenTotal} hidden tests pass`;
    case "error":
      return `Error: ${e.message}`;
  }
}

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = loadResults();
  const id = fromSlug(slug);
  const model = res?.models.find((m) => m.id === id);
  if (!res || !model) notFound();

  const s = standings(res).find((x) => x.model.id === id)!;
  const runs = res.tasks
    .map((t) => ({ t, r: res.runs.find((r) => r.model === id && r.taskId === t.id) }))
    .filter((x) => x.r);

  const facts: [string, string][] = [
    ["Pass rate", `${Math.round(s.passRate * 100)}% (${s.passes} of ${s.attempted})`],
    ["Cost per pass", money(s.costPerPass)],
    ["Total spend", money(s.costUsd)],
    ["Median time", `${(s.p50Ms / 1000).toFixed(1)}s`],
  ];

  return (
    <>
      {res.source === "mock" && (
        <p role="note" className="mb-6 rounded-md border border-amber bg-amber-soft px-4 py-3 text-sm">
          Demo data. Run <code className="rounded bg-white/70 px-1">npm run bench</code> for real numbers.
        </p>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-tealdark underline underline-offset-4">
        Back to model status
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{model.label}</h1>
      <p className="mt-1 text-sm text-slate">
        {TIER_LABEL[model.tier]} tier, <span className="break-all">{model.id}</span>
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-track py-5 sm:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-slate">{k}</dt>
            <dd className="num mt-0.5 text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-display text-2xl font-semibold">Every run</h2>
      <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate">
        Tap a run to see what the model did, call by call. Times are measured from the start of that run.
      </p>

      <ul className="mt-4">
        {runs.map(({ t, r }) => {
          const run = r!;
          const state = run.error ? "error" : run.ok ? "pass" : "fail";
          const color = state === "pass" ? "bg-teal" : state === "fail" ? "bg-brick" : "cell-error";
          return (
            <li key={t.id} className="border-b border-track">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className={`h-6 w-3.5 shrink-0 rounded-[3px] ${color}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold">{t.title}</span>
                    <span className="block text-sm text-slate">
                      {state === "pass" ? "Passed" : state === "fail" ? `Failed, ${run.hiddenPassed} of ${run.hiddenTotal} hidden tests` : "Errored"}
                      {" · "}
                      {t.category === "coding" ? "write" : "fix"}
                    </span>
                  </span>
                  <span className="num shrink-0 text-right text-sm">
                    <span className="block font-semibold">{money(run.costUsd)}</span>
                    <span className="text-slate">{(run.ms / 1000).toFixed(1)}s</span>
                  </span>
                  <span aria-hidden className="shrink-0 text-slate transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>

                <div className="pb-5 pl-[1.625rem]">
                  <p className="text-sm text-slate">
                    {run.turns} model {run.turns === 1 ? "call" : "calls"}, {run.toolCalls} tool {run.toolCalls === 1 ? "call" : "calls"},{" "}
                    {run.promptTokens.toLocaleString()} tokens in, {run.completionTokens.toLocaleString()} out
                  </p>
                  {run.error && <p className="mt-2 rounded-md border border-brick bg-brick-soft px-3 py-2 text-sm">{run.error}</p>}
                  <ol className="mt-3 space-y-1.5 border-l-2 border-track pl-4">
                    {run.events.map((e, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="num w-12 shrink-0 text-slate">{(e.t / 1000).toFixed(1)}s</span>
                        <span>{step(e)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
