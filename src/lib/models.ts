import type { ModelInfo } from "./types";

/**
 * Model ids as listed on the Orbio catalogue. Edit freely: any id your key can call works.
 * Tiers are a rough grouping by price band, used for display only.
 */
export const MODELS: ModelInfo[] = [
  { id: "anthropic/claude-fable-5.1", label: "Claude Fable 5.1", tier: "frontier" },
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra", tier: "frontier" },
  { id: "anthropic/claude-opus-5", label: "Claude Opus 5", tier: "frontier" },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5", tier: "mid" },
  { id: "x-ai/grok-4.6", label: "Grok 4.6", tier: "mid" },
  { id: "moonshotai/kimi-k3", label: "Kimi K3", tier: "mid" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", tier: "cheap" },
  { id: "deepseek/deepseek-v4-pro-0813", label: "DeepSeek V4 Pro", tier: "cheap" },
];

export const TIER_LABEL = { frontier: "Frontier", mid: "Mid", cheap: "Cheap" } as const;
