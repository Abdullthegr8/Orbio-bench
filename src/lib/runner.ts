import { ApiError, type ChatMessage, type Provider, type ToolDef } from "./orbio";
import { countOk, runHarness } from "./sandbox";
import type { Case, HarnessResult, ModelInfo, RaceEvent, RunRecord, Task } from "./types";

export class BudgetGuard {
  spent = 0;
  constructor(
    public limit: number,
    private signal?: AbortSignal,
  ) {}
  add(cost: number | null) {
    if (cost) this.spent += cost;
  }
  check() {
    if (this.signal?.aborted) throw new Error("Cancelled: the client disconnected");
    if (this.spent >= this.limit) {
      throw new Error(`Budget guard: $${this.spent.toFixed(2)} spent, limit is $${this.limit.toFixed(2)}`);
    }
  }
}

const MAX_TURNS = 8;

const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read solution.js from the workspace.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Replace the full contents of solution.js.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Run the visible tests against solution.js and return per-case results.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "submit",
      description: "Finish. The current solution.js is graded on hidden tests.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function extractCode(text: string | null, fn: string): string | null {
  if (!text) return null;
  const blocks = [...text.matchAll(/```(?:js|javascript|ts|typescript)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  let code = blocks.find((b) => b.includes("module.exports")) ?? blocks[0] ?? (text.includes("function") ? text : null);
  if (!code) return null;
  // Lenient on a forgotten export line only; the logic still has to be right.
  if (!/module\.exports|exports\./.test(code)) code += `\nmodule.exports = { ${fn} };`;
  return code;
}

function describeVisible(task: Task, r: HarnessResult): string {
  if (r.crashed) return `solution.js failed to run: ${r.crashed}`;
  const lines = r.results.map((x, i) => {
    const c = task.visible[i];
    const call = `${task.fn}(${c.args.map((a) => JSON.stringify(a)).join(", ")})`;
    return x.ok
      ? `PASS ${call}`
      : `FAIL ${call}\n  expected ${JSON.stringify(c.expected)}\n  got      ${x.got ?? x.error}`;
  });
  return `${countOk(r)}/${task.visible.length} visible tests pass\n` + lines.join("\n");
}

async function grade(task: Task, code: string) {
  const cases: Case[] = [...task.visible, ...task.hidden];
  const r = await runHarness(code, task.fn, cases);
  const okAll = !r.crashed && r.results.length === cases.length && countOk(r) === cases.length;
  const hiddenPassed = r.results.slice(task.visible.length).filter((x) => x.ok).length;
  const visiblePassed = r.results.slice(0, task.visible.length).filter((x) => x.ok).length;
  return { okAll, hiddenPassed, visiblePassed };
}

export async function runTask(opts: {
  model: ModelInfo;
  task: Task;
  provider: Provider;
  emit?: (e: RaceEvent) => void;
  t0?: number;
  budget?: BudgetGuard;
}): Promise<RunRecord> {
  const { model, task, provider, budget } = opts;
  const t0 = opts.t0 ?? Date.now();
  const startedAt = Date.now();
  const events: RaceEvent[] = [];
  const emit = (e: Omit<RaceEvent, "model" | "t">) => {
    const full: RaceEvent = { model: model.id, t: Date.now() - t0, ...e };
    events.push(full);
    opts.emit?.(full);
  };

  let cost: number | null = null;
  let promptTokens = 0;
  let completionTokens = 0;
  let turns = 0;
  let toolCalls = 0;
  const call = async (messages: ChatMessage[], tools: ToolDef[] | undefined, maxTokens: number) => {
    budget?.check();
    const res = await provider({ model: model.id, messages, tools, maxTokens });
    turns++;
    promptTokens += res.promptTokens;
    completionTokens += res.completionTokens;
    if (res.costUsd !== null) cost = (cost ?? 0) + res.costUsd;
    budget?.add(res.costUsd);
    emit({ kind: "turn", turn: turns, costUsd: cost });
    return res.message;
  };

  emit({ kind: "start" });
  try {
    let code: string | null = null;

    if (task.category === "coding") {
      const msg = await call(
        [
          {
            role: "system",
            content: `You write correct, dependency-free JavaScript (CommonJS). Reply with exactly one \`\`\`js code block and nothing else. The block defines the function and ends with module.exports = { ${task.fn} };`,
          },
          { role: "user", content: `Spec:\n${task.spec}` },
        ],
        undefined,
        4000,
      );
      code = extractCode(msg.content, task.fn);
    } else {
      let file = task.starter ?? "";
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `You are a careful software engineer in a small sandbox. Fix solution.js so it satisfies the spec. Use the tools, run the tests after every change, and call submit when you are done. You have at most ${MAX_TURNS} turns.`,
        },
        {
          role: "user",
          content: `Spec:\n${task.spec}\n\nsolution.js exports { ${task.fn} } via module.exports. run_tests runs the visible tests. Grading uses additional hidden tests, so satisfy the whole spec including edge cases.`,
        },
      ];
      let submitted = false;
      while (turns < MAX_TURNS && !submitted) {
        const msg = await call(messages, TOOLS, 2500);
        messages.push(msg);
        if (!msg.tool_calls?.length) break;
        for (const tc of msg.tool_calls) {
          toolCalls++;
          let args: { content?: string; path?: string } = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            /* malformed arguments are reported back to the model below */
          }
          let out: string;
          const name = tc.function.name;
          emit({ kind: "tool", tool: name });
          if (name === "read_file") out = file;
          else if (name === "write_file") {
            if (typeof args.content !== "string") out = "error: write_file needs a string `content`.";
            else if (args.path && args.path !== "solution.js") out = "error: only solution.js exists in this workspace.";
            else {
              file = args.content;
              out = "ok: solution.js written";
            }
          } else if (name === "run_tests") {
            const r = await runHarness(file, task.fn, task.visible);
            emit({ kind: "tests", passed: countOk(r), total: task.visible.length });
            out = describeVisible(task, r);
          } else if (name === "submit") {
            submitted = true;
            out = "submitted";
          } else out = `error: unknown tool ${name}`;
          messages.push({ role: "tool", tool_call_id: tc.id, content: out.slice(0, 3000) });
        }
      }
      code = file;
    }

    const g = code ? await grade(task, code) : { okAll: false, hiddenPassed: 0, visiblePassed: 0 };
    if (task.category === "coding") emit({ kind: "tests", passed: g.visiblePassed, total: task.visible.length });
    const ms = Date.now() - startedAt;
    emit({ kind: "done", ok: g.okAll, hiddenPassed: g.hiddenPassed, hiddenTotal: task.hidden.length, costUsd: cost, ms, turns });
    return {
      model: model.id, taskId: task.id, ok: g.okAll, hiddenPassed: g.hiddenPassed, hiddenTotal: task.hidden.length,
      costUsd: cost, promptTokens, completionTokens, ms, turns, toolCalls,
      ...(code ? {} : { error: "no code returned" }), events,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({ kind: "error", message });
    return {
      model: model.id, taskId: task.id, ok: false, hiddenPassed: 0, hiddenTotal: task.hidden.length,
      costUsd: cost, promptTokens, completionTokens, ms: Date.now() - startedAt, turns, toolCalls, error: message,
      ...(e instanceof ApiError && e.fatal ? { fatal: true } : {}), events,
    };
  }
}
