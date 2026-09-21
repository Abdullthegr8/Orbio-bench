export type Tier = "frontier" | "mid" | "cheap";
export type Category = "coding" | "agentic";

export interface ModelInfo {
  id: string;
  label: string;
  tier: Tier;
}

export interface Case {
  args: unknown[];
  expected: unknown;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  fn: string;
  spec: string;
  /** Buggy starting file for agentic tasks. */
  starter?: string;
  visible: Case[];
  hidden: Case[];
  /** Known-good solution, used to verify the task itself and to drive mock mode. */
  reference: string;
}

export type EventKind = "start" | "turn" | "tool" | "tests" | "done" | "error";

export interface RaceEvent {
  model: string;
  /** Milliseconds since the race started. */
  t: number;
  kind: EventKind;
  turn?: number;
  costUsd?: number | null;
  tool?: string;
  passed?: number;
  total?: number;
  ok?: boolean;
  hiddenPassed?: number;
  hiddenTotal?: number;
  turns?: number;
  ms?: number;
  message?: string;
}

export interface RunRecord {
  model: string;
  taskId: string;
  ok: boolean;
  hiddenPassed: number;
  hiddenTotal: number;
  costUsd: number | null;
  promptTokens: number;
  completionTokens: number;
  ms: number;
  turns: number;
  toolCalls: number;
  error?: string;
  /** True when the run stopped because the key or balance is unusable, not because of the model. */
  fatal?: boolean;
  events: RaceEvent[];
}

export interface Results {
  generatedAt: string;
  /** "orbio" = real calls through an Orbio key. "mock" = simulated demo data. */
  source: "orbio" | "mock";
  budgetUsd: number;
  totalCostUsd: number;
  models: ModelInfo[];
  tasks: { id: string; title: string; category: Category }[];
  runs: RunRecord[];
}

export interface HarnessResult {
  results: { ok: boolean; got?: string; error?: string }[];
  crashed?: string;
  timedOut?: boolean;
}
