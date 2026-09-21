"use client";

import { useRef, useState } from "react";
import { MODELS, TIER_LABEL } from "@/lib/models";
import type { RaceEvent } from "@/lib/types";

interface Lane {
  status: "idle" | "running" | "done" | "error";
  turns: number;
  action: string;
  tests: { passed: number; total: number } | null;
  cost: number | null;
  ms: number;
  ok: boolean;
  hidden: { passed: number; total: number } | null;
  place: number | null;
  message?: string;
}

const blank = (): Lane => ({ status: "idle", turns: 0, action: "", tests: null, cost: null, ms: 0, ok: false, hidden: null, place: null });
const initial = () => Object.fromEntries(MODELS.map((m) => [m.id, blank()])) as Record<string, Lane>;
const money = (n: number | null) => (n === null ? "n/a" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

function progress(l: Lane) {
  if (l.status === "idle") return 0;
  if (l.status === "done") return l.ok ? 1 : l.hidden && l.hidden.total ? Math.max(0.06, l.hidden.passed / l.hidden.total) : 0.06;
  if (l.status === "error") return 0.06;
  if (l.tests && l.tests.total) return 0.1 + 0.75 * (l.tests.passed / l.tests.total);
  return Math.min(0.08 + l.turns * 0.06, 0.4);
}

export default function RaceClient({
  tasks,
  source,
}: {
  tasks: { id: string; title: string; category: "coding" | "agentic" }[];
  source: "orbio" | "mock" | null;
}) {
  const [taskId, setTaskId] = useState(tasks[0].id);
  const [mode, setMode] = useState<"replay" | "live">("replay");
  const [token, setToken] = useState("");
  const [lanes, setLanes] = useState<Record<string, Lane>>(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(0);

  const apply = (e: RaceEvent) => {
    setLanes((prev) => {
      const l = { ...(prev[e.model] ?? blank()) };
      l.ms = e.t;
      if (e.kind === "start") l.status = "running";
      if (e.kind === "turn") {
        l.turns = e.turn ?? l.turns + 1;
        l.cost = e.costUsd ?? l.cost;
        l.action = "thinking";
      }
      if (e.kind === "tool") l.action = e.tool ?? "";
      if (e.kind === "tests") {
        l.tests = { passed: e.passed ?? 0, total: e.total ?? 0 };
        l.action = `tests ${e.passed}/${e.total}`;
      }
      if (e.kind === "error") {
        l.status = "error";
        l.message = e.message;
      }
      if (e.kind === "done") {
        l.status = "done";
        l.ok = !!e.ok;
        l.cost = e.costUsd ?? l.cost;
        l.ms = e.ms ?? l.ms;
        l.hidden = { passed: e.hiddenPassed ?? 0, total: e.hiddenTotal ?? 0 };
        if (e.ok) l.place = ++finished.current;
      }
      return { ...prev, [e.model]: l };
    });
  };

  async function start() {
    setError(null);
    setLanes(initial());
    finished.current = 0;
    setRunning(true);
    try {
      const res = await fetch("/api/race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, mode, token }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const msg = JSON.parse(p.slice(6)) as RaceEvent & { end?: boolean; fatal?: string };
          if (msg.fatal) setError(msg.fatal);
          else if (!msg.end) apply(msg);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Race failed.");
    } finally {
      setRunning(false);
    }
  }

  const done = Object.values(lanes).filter((l) => l.status === "done" || l.status === "error").length;
  const winner = MODELS.map((m) => ({ m, l: lanes[m.id] }))
    .filter((x) => x.l.ok && x.l.cost !== null)
    .sort((a, b) => (a.l.cost ?? 0) - (b.l.cost ?? 0))[0];
  const complete = !running && done === MODELS.length;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end gap-4 border-b border-track pb-5">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1 block text-sm font-medium">Task</span>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={running}
            className="min-h-11 w-full rounded-md border border-track bg-white px-3 font-body"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.category === "coding" ? "write" : "fix"})
              </option>
            ))}
          </select>
        </label>

        <div role="group" aria-label="Race mode" className="flex overflow-hidden rounded-md border border-track bg-white">
          {(["replay", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={running}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 px-4 font-display text-sm font-semibold ${mode === m ? "bg-ink text-white" : "hover:bg-fog"}`}
            >
              {m === "replay" ? "Replay" : "Live"}
            </button>
          ))}
        </div>

        {mode === "live" && (
          <label className="basis-48">
            <span className="mb-1 block text-sm font-medium">Race token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={running}
              autoComplete="off"
              className="min-h-11 w-full rounded-md border border-track bg-white px-3"
            />
          </label>
        )}

        <button
          type="button"
          onClick={start}
          disabled={running}
          className="min-h-11 rounded-md bg-teal px-5 font-display text-base font-semibold text-white disabled:opacity-60"
        >
          {running ? "Racing" : mode === "live" ? "Start live race" : "Start replay"}
        </button>
      </div>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate">
        {mode === "replay"
          ? `Replays the recorded run for this task with every model starting together${source === "mock" ? ". The recording is demo data" : ""}.`
          : "Live races call the models now and spend real credit from the key on the server. The server caps each race and allows one a minute."}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-brick bg-brick-soft px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <ul className="mt-6" aria-live="polite">
        {MODELS.map((m) => {
          const l = lanes[m.id];
          const p = progress(l);
          const fill = l.status === "error" || (l.status === "done" && !l.ok) ? "bg-brick" : "bg-teal";
          return (
            <li key={m.id} className="border-b border-track py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-display text-lg font-semibold">
                  {m.label} <span className="ml-1 font-body text-sm font-normal text-slate">{TIER_LABEL[m.tier]}</span>
                </p>
                <p className="num shrink-0 text-lg font-bold">{l.status === "idle" ? "-" : l.status === "running" && l.cost === null && l.turns === 0 ? "..." : money(l.cost)}</p>
              </div>

              <div className="mt-2 h-3.5 overflow-hidden rounded-[3px] bg-track" role="progressbar" aria-label={`${m.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
                <div
                  className={`h-full rounded-[3px] transition-[width] duration-500 ${l.status === "running" ? "lane-running" : fill}`}
                  style={{ width: `${Math.round(p * 100)}%` }}
                />
              </div>

              <p className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm text-slate">
                <span>
                  {l.status === "idle" && "Waiting"}
                  {l.status === "running" && (l.action || "starting")}
                  {l.status === "error" && (l.message ?? "Errored")}
                  {l.status === "done" &&
                    (l.ok
                      ? `Passed ${l.place ? ordinal(l.place) : ""}, all hidden tests`
                      : `Failed, ${l.hidden?.passed ?? 0} of ${l.hidden?.total ?? 0} hidden tests`)}
                </span>
                <span className="num">
                  turn {l.turns} · {(l.ms / 1000).toFixed(1)}s
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      {complete && (
        <p className="mt-6 max-w-prose leading-relaxed">
          {winner ? (
            <>
              Cheapest pass: <strong>{winner.m.label}</strong> at {money(winner.l.cost)}.{" "}
              {Object.values(lanes).filter((l) => l.ok).length} of {MODELS.length} models passed.
            </>
          ) : (
            "No model passed this task."
          )}
        </p>
      )}
    </div>
  );
}
