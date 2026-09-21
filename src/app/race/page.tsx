import RaceClient from "@/components/RaceClient";
import { loadResults } from "@/lib/results";
import { TASKS } from "@/lib/tasks";

export const dynamic = "force-static";

export default function RacePage() {
  const res = loadResults();
  return (
    <>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Live race</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-slate">
        Pick a task and watch every model work on it at once: the bar fills as tests pass, and the cost ticks up with every call.
      </p>
      <RaceClient
        tasks={TASKS.map((t) => ({ id: t.id, title: t.title, category: t.category }))}
        source={res?.source ?? null}
      />
    </>
  );
}
