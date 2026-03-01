import type { TokenUsage } from '../types';

/**
 * Pricing table for known LLM models
 * Prices are per token (converted from per-million-token pricing)
 * Source: https://openrouter.ai/rankings
 * Last updated: 2026-03-01
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenRouter models - Top ranked models
  'openrouter/minimax/minimax-m2.5': {
    input: 0.295 / 1000000,
    output: 1.20 / 1000000,
  },
  'openrouter/google/gemini-3-flash-preview': {
    input: 0.50 / 1000000,
    output: 3.00 / 1000000,
  },
  'openrouter/deepseek/deepseek-v3.2': {
    input: 0.25 / 1000000,
    output: 0.40 / 1000000,
  },
  'openrouter/moonshotai/kimi-k2.5': {
    input: 0.45 / 1000000,
    output: 2.20 / 1000000,
  },
  'openrouter/anthropic/claude-opus-4.6': {
    input: 5.00 / 1000000,
    output: 25.00 / 1000000,
  },
  'openrouter/x-ai/grok-4.1-fast': {
    input: 0.20 / 1000000,
    output: 0.50 / 1000000,
  },
  'openrouter/anthropic/claude-sonnet-4.6': {
    input: 3.00 / 1000000,
    output: 15.00 / 1000000,
  },
  'openrouter/anthropic/claude-sonnet-4.5': {
    input: 3.00 / 1000000,
    output: 15.00 / 1000000,
  },
  'openrouter/z-ai/glm-5': {
    input: 0.95 / 1000000,
    output: 2.55 / 1000000,
  },

  // OpenRouter - Legacy models
  'openrouter/anthropic/claude-3.5-sonnet': {
    input: 3.00 / 1000000,
    output: 15.00 / 1000000,
  },
  'openrouter/anthropic/claude-3-sonnet': {
    input: 3.00 / 1000000,
    output: 15.00 / 1000000,
  },
  'openrouter/anthropic/claude-3-haiku': {
    input: 0.25 / 1000000,
    output: 1.25 / 1000000,
  },
  'openrouter/google/gemini-2.0-flash-exp:free': {
    input: 0,
    output: 0,
  },
  'openrouter/google/gemini-flash-1.5': {
    input: 0.075 / 1000000,
    output: 0.30 / 1000000,
  },

  // Google direct models (same pricing as OpenRouter for most models)
  'google/gemini-3-flash-preview': {
    input: 0.50 / 1000000,
    output: 3.00 / 1000000,
  },
  'google/gemini-2.0-flash-exp': {
    input: 0,
    output: 0,
  },
  'google/gemini-1.5-flash': {
    input: 0.075 / 1000000,
    output: 0.30 / 1000000,
  },
  'google/gemini-1.5-pro': {
    input: 1.25 / 1000000,
    output: 5.00 / 1000000,
  },

  // OpenAI models
  'openai/gpt-4.1-mini': {
    input: 0.15 / 1000000,
    output: 0.6 / 1000000,
  },
  'openai/gpt-4o': {
    input: 2.5 / 1000000,
    output: 10.0 / 1000000,
  },
  'openai/gpt-4o-mini': {
    input: 0.15 / 1000000,
    output: 0.6 / 1000000,
  },

  // Anthropic models
  'anthropic/claude-3-5-sonnet-20241022': {
    input: 3.0 / 1000000,
    output: 15.0 / 1000000,
  },
  'anthropic/claude-3-haiku-20240307': {
    input: 0.25 / 1000000,
    output: 1.25 / 1000000,
  },
};

/**
 * Estimate cost of LLM API call based on token usage
 * @param provider Provider name (e.g., "openrouter", "google", "openai")
 * @param model Model name (e.g., "minimax/minimax-m2.5", "gemini-3-flash-preview")
 * @param usage Token usage metrics
 * @returns Estimated cost in USD
 */
export function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage
): number {
  // Try provider/model key first
  const providerModelKey = `${provider}/${model}`;
  let pricing = PRICING[providerModelKey];

  // Fallback to just model key (for direct providers like Google, OpenAI, Anthropic)
  if (!pricing) {
    const modelKey = `${provider}/${model.split('/').pop()}`;
    pricing = PRICING[modelKey];
  }

  // If still no pricing found, return 0
  if (!pricing) {
    pricing = { input: 0, output: 0 };
  }

  const inputCost = usage.promptTokens * pricing.input;
  const outputCost = usage.completionTokens * pricing.output;

  return inputCost + outputCost;
}
