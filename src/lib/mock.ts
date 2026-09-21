import type { ChatMessage, ChatRequest, ChatResult, Provider, ToolCall } from "./orbio";
import { MODELS } from "./models";
import type { Task, Tier } from "./types";

/**
 * Simulated provider for demos and offline testing. It knows each task's reference answer,
 * so outcomes are drawn from a per-tier success rate. Results made this way are labelled
 * "mock" everywhere and must never be presented as real benchmark numbers.
 */

const SUCCESS: Record<Tier, number> = { frontier: 0.9, mid: 0.7, cheap: 0.5 };
const LATENCY: Record<Tier, number> = { frontier: 900, mid: 600, cheap: 350 };
const MOCK_OUT_PER_M: Record<Tier, number> = { frontier: 40, mid: 8, cheap: 2 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Step = { tool: "read_file" | "write_file" | "run_tests" | "submit"; good?: boolean };

export function mockProvider(task: Task): Provider {
  return async (req: ChatRequest): Promise<ChatResult> => {
    const info = MODELS.find((m) => m.id === req.model);
    const tier: Tier = info?.tier ?? "mid";
    const rand = rng(hash(req.model + task.id));
    const success = rand() < SUCCESS[tier];
    const turn = req.messages.filter((m) => m.role === "assistant").length;
    const bad = `function ${task.fn}(){ return null; }\nmodule.exports = { ${task.fn} };`;

    await sleep(LATENCY[tier] * (0.6 + rand() * 0.8) * (req.tools ? 0.6 : 1));
    const completionTokens = Math.round((req.tools ? 160 : 420) * (0.7 + rand() * 0.9) * (tier === "frontier" ? 1.4 : 1));
    const promptTokens = 350 + turn * 260;
    const price = MOCK_OUT_PER_M[tier];
    const costUsd = (promptTokens * (price / 5) + completionTokens * price) / 1_000_000;

    let message: ChatMessage;
    if (!req.tools) {
      message = { role: "assistant", content: "```js\n" + (success ? task.reference : bad) + "\n```" };
    } else {
      const plan: Step[] = success
        ? tier === "frontier"
          ? [{ tool: "run_tests" }, { tool: "write_file", good: true }, { tool: "run_tests" }, { tool: "submit" }]
          : tier === "mid"
            ? [{ tool: "read_file" }, { tool: "write_file", good: true }, { tool: "run_tests" }, { tool: "submit" }]
            : [{ tool: "read_file" }, { tool: "write_file", good: false }, { tool: "run_tests" }, { tool: "write_file", good: true }, { tool: "run_tests" }, { tool: "submit" }]
        : [{ tool: "read_file" }, { tool: "write_file", good: false }, { tool: "run_tests" }, { tool: "submit" }];
      const step = plan[Math.min(turn, plan.length - 1)];
      const args =
        step.tool === "write_file"
          ? { path: "solution.js", content: step.good ? task.reference : bad }
          : step.tool === "read_file"
            ? { path: "solution.js" }
            : {};
      const call: ToolCall = {
        id: `call_${turn}`,
        type: "function",
        function: { name: step.tool, arguments: JSON.stringify(args) },
      };
      message = { role: "assistant", content: null, tool_calls: [call] };
    }
    return { message, promptTokens, completionTokens, costUsd };
  };
}
