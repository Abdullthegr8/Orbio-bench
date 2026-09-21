import { timingSafeEqual } from "node:crypto";
import { MODELS } from "@/lib/models";
import { mockProvider } from "@/lib/mock";
import { orbioProvider, type Provider } from "@/lib/orbio";
import { loadResults } from "@/lib/results";
import { BudgetGuard, runTask } from "@/lib/runner";
import { taskById } from "@/lib/tasks";
import type { RaceEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MIN_LIVE_GAP_MS = 60_000;
let lastLiveAt = 0;
let liveRunning = false;

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { taskId?: string; mode?: string; token?: string };
  const task = body.taskId ? taskById(body.taskId) : undefined;
  if (!task) return json(400, "Unknown task.");

  const live = body.mode === "live";
  if (live) {
    const secret = process.env.RACE_TOKEN;
    if (!secret) return json(403, "Live races are switched off on this deployment. Replay is available.");
    if (typeof body.token !== "string" || !sameToken(body.token, secret)) return json(403, "Wrong race token.");
    if (liveRunning) return json(429, "A live race is already running. Try again when it finishes.");
    const wait = lastLiveAt + MIN_LIVE_GAP_MS - Date.now();
    if (wait > 0) return json(429, `Another live race ran a moment ago. Try again in ${Math.ceil(wait / 1000)}s.`);
  }

  const results = live ? null : loadResults();
  const recorded = results?.runs.filter((r) => r.taskId === task.id) ?? [];
  if (!live && !recorded.length) return json(404, "No recorded run for this task yet. Run npm run bench first.");

  let provider: Provider | undefined;
  if (live) {
    try {
      provider = process.env.MOCK === "1" ? mockProvider(task) : orbioProvider();
    } catch (e) {
      return json(500, e instanceof Error ? e.message : "Provider setup failed.");
    }
    lastLiveAt = Date.now();
    liveRunning = true;
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        } catch {
          /* client disconnected */
        }
      };
      try {
        if (live && provider) {
          const budget = new BudgetGuard(Number(process.env.LIVE_BUDGET_USD ?? 1), req.signal);
          const t0 = Date.now();
          await Promise.all(
            MODELS.map((model) =>
              runTask({ model, task, provider: provider!, t0, budget, emit: (e) => send(e) }),
            ),
          );
        } else {
          // Replay: recorded events, all lanes starting together, compressed so the race stays watchable.
          const events: RaceEvent[] = recorded.flatMap((r) => r.events).sort((a, b) => a.t - b.t);
          const longest = Math.max(...events.map((e) => e.t), 1);
          const speed = Math.max(1, longest / 40_000);
          let prev = 0;
          for (const e of events) {
            if (req.signal.aborted) break;
            await sleep((e.t - prev) / speed);
            prev = e.t;
            send({ ...e, t: Math.round(e.t / speed) });
          }
        }
      } catch (e) {
        send({ fatal: e instanceof Error ? e.message : "Race failed." });
      } finally {
        if (live) liveRunning = false;
        send({ end: true });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
