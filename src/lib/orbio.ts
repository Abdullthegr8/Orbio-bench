export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  maxTokens: number;
}

export interface ChatResult {
  message: ChatMessage;
  promptTokens: number;
  completionTokens: number;
  /** Dollars charged for this call, or null when neither the gateway nor a price list reported it. */
  costUsd: number | null;
}

export type Provider = (req: ChatRequest) => Promise<ChatResult>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `fatal` errors (bad key, no balance) will fail every later call too, so callers should stop. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fatal: boolean,
  ) {
    super(message);
  }
}

export function baseUrl() {
  return (process.env.ORBIO_BASE_URL ?? "https://api.orbio.so/api/v1").replace(/\/$/, "");
}

export function apiKey() {
  return process.env.ORBIO_API_KEY ?? process.env.OPENROUTER_API_KEY;
}

let pricing: Map<string, { prompt: number; completion: number }> | null = null;

/** Per-token prices from the gateway's model list. Only used when a response carries no cost. */
async function priceFor(model: string, key: string) {
  if (!pricing) {
    pricing = new Map();
    try {
      const res = await fetch(`${baseUrl()}/models`, { headers: { Authorization: `Bearer ${key}` } });
      const json = (await res.json()) as { data?: { id: string; pricing?: { prompt?: string; completion?: string } }[] };
      for (const m of json.data ?? []) {
        const p = Number(m.pricing?.prompt);
        const c = Number(m.pricing?.completion);
        if (Number.isFinite(p) && Number.isFinite(c)) pricing.set(m.id, { prompt: p, completion: c });
      }
    } catch {
      /* no price list available; cost stays null */
    }
  }
  return pricing.get(model);
}

/** Calls an Orbio key through the OpenAI-compatible chat completions endpoint. */
export function orbioProvider(): Provider {
  const key = apiKey();
  if (!key) throw new Error("Set ORBIO_API_KEY in .env.local, or run with MOCK=1 for demo data.");

  return async (req) => {
    const body = {
      model: req.model,
      messages: req.messages,
      max_tokens: req.maxTokens,
      usage: { include: true },
      ...(req.tools ? { tools: req.tools, tool_choice: "auto" } : {}),
    };

    let lastErr = "unknown error";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 180_000);
      try {
        const res = await fetch(`${baseUrl()}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Orbio Bench" },
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = `HTTP ${res.status}`;
          await sleep(1500 * attempt);
          continue;
        }
        const json = (await res.json()) as {
          error?: { message?: string };
          choices?: { message: ChatMessage }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
        };
        if (!res.ok || !json.choices?.[0]) {
          const fatal = [401, 402, 403].includes(res.status);
          const hint = fatal ? " (check the key, its balance, and that it is not revoked)" : "";
          throw new ApiError(`HTTP ${res.status}: ${json.error?.message ?? "no choices returned"}${hint}`, res.status, fatal);
        }
        const pt = json.usage?.prompt_tokens ?? 0;
        const ct = json.usage?.completion_tokens ?? 0;
        let cost: number | null = typeof json.usage?.cost === "number" ? json.usage.cost : null;
        if (cost === null) {
          const p = await priceFor(req.model, key);
          if (p) cost = pt * p.prompt + ct * p.completion;
        }
        return { message: json.choices[0].message, promptTokens: pt, completionTokens: ct, costUsd: cost };
      } catch (e) {
        if (e instanceof ApiError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        lastErr = msg;
        await sleep(1500 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`Request failed after 3 attempts: ${lastErr}`);
  };
}
