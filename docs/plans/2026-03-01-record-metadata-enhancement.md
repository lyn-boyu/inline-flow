# Record Metadata Enhancement - LLM Usage Tracking

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Add LLM configuration and usage metrics to vault record metadata

---

## Context

Currently, vault records only track basic metadata (skill ID, version, timestamp, input). There's no visibility into:
- Which LLM provider/model was used
- How many tokens were consumed
- How much the API call cost
- How long it took to generate

This makes it impossible to analyze costs, compare model performance, or debug issues.

---

## Requirements

### Must Have
1. **LLM Configuration Tracking**
   - Provider (openrouter, google, anthropic, etc.)
   - Model name (minimax/minimax-m2.5, etc.)
   - Temperature setting

2. **Usage Metrics**
   - Prompt tokens (input)
   - Completion tokens (output)
   - Total tokens
   - API call duration (milliseconds)
   - Estimated cost (USD)

3. **Cost Estimation**
   - Calculate based on known pricing for each provider/model
   - Fallback to $0 if pricing unknown

### Nice to Have (Deferred)
- Logging system (`vault/logs/agent.{timestamp}.log`)
- Full execution trace (cache hits, pre-tool scripts, etc.)
- Real-time cost from API responses (OpenRouter provides this)

---

## Design

### Type Definitions

```typescript
// src/types.ts

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  durationMs: number;
}

export interface RecordMetadata {
  createdAt: string;
  skillId: string;
  skillVersion: string;
  tags: string[];

  // NEW: LLM configuration
  llm: {
    provider: string;
    model: string;
    temperature: number;
  };

  // NEW: Usage metrics
  usage: {
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;  // USD
  };

  source: {
    frontmostApp?: string;
  };
  input: {
    selectionText?: string;
  };
  cachedFrom: string;
}
```

### LLM Client Changes

**Before:**
```typescript
export async function callLLM(
  skill: Skill,
  systemPrompt: string,
  userPrompt: string
): Promise<string>
```

**After:**
```typescript
export async function callLLM(
  skill: Skill,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse>  // Returns { content, usage, durationMs }
```

### Provider Function Pattern

Each provider function (callOpenRouter, callGoogle, etc.) will:

1. Record start time
2. Make API call
3. Extract token usage from response
4. Calculate duration
5. Return structured response

**Example (OpenRouter):**
```typescript
async function callOpenRouter(...): Promise<LLMResponse> {
  const startTime = Date.now();

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    // ... request config
  });

  const data = await response.json();
  const durationMs = Date.now() - startTime;

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    durationMs,
  };
}
```

### Cost Estimation

Simple pricing table for known models:

```typescript
// src/lib/pricing.ts

export function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage
): number {
  const pricing: Record<string, { input: number, output: number }> = {
    'openrouter/minimax-m2.5': {
      input: 0.001 / 1000,   // $0.001 per 1K tokens
      output: 0.002 / 1000
    },
    'google/gemini-3-flash-preview': {
      input: 0.01 / 1000,
      output: 0.02 / 1000
    },
    'openrouter/anthropic/claude-3.5-sonnet': {
      input: 0.003 / 1000,
      output: 0.015 / 1000
    },
    // ... more models
  };

  const key = `${provider}/${model}`;
  const price = pricing[key] || { input: 0, output: 0 };

  return (usage.promptTokens * price.input) +
         (usage.completionTokens * price.output);
}
```

### Run Handler Integration

```typescript
// src/api/run.ts (line ~110)

// Call LLM
const llmResult = await callLLM(skill, systemPrompt, userPrompt);

// Calculate cost
const estimatedCost = estimateCost(
  skill.llm.provider,
  skill.llm.model,
  llmResult.usage
);

// Create metadata
const metadata: RecordMetadata = {
  createdAt: timestamp,
  skillId: skill.id,
  skillVersion: skill.version,
  tags: skill.tags,

  llm: {
    provider: skill.llm.provider,
    model: skill.llm.model,
    temperature: skill.llm.temperature,
  },

  usage: {
    durationMs: llmResult.durationMs,
    promptTokens: llmResult.usage.promptTokens,
    completionTokens: llmResult.usage.completionTokens,
    totalTokens: llmResult.usage.totalTokens,
    estimatedCost,
  },

  source: { ...(frontmostApp ? { frontmostApp } : {}) },
  input: { selectionText: primaryInput },
  cachedFrom: '',
};

// Write record
await writeRecord(expandedVaultDir, recordPath, metadata, llmResult.content);
```

---

## Example Record Output

```yaml
---
createdAt: 2026-03-01_08-30-47
skillId: sentence-polish
skillVersion: 0.2.0
tags: [polish, learning, workplace-english]
llm:
  provider: openrouter
  model: minimax/minimax-m2.5
  temperature: 0.4
usage:
  durationMs: 2341
  promptTokens: 850
  completionTokens: 400
  totalTokens: 1250
  estimatedCost: 0.00275
source: {}
input:
  selectionText: "It's basically from the backend..."
cachedFrom: ''
---

[LLM response content...]
```

---

## Implementation Impact

### Files to Modify

1. **src/types.ts** - Add new type definitions
2. **src/lib/llm-client.ts** - Update all provider functions
3. **src/lib/pricing.ts** - New file for cost estimation
4. **src/api/run.ts** - Integrate usage tracking

### Breaking Changes

**Yes** - `RecordMetadata` structure changes

**Migration:** Existing records will continue to work (YAML parser ignores missing fields), but won't have `llm` or `usage` fields.

### Backward Compatibility

- Old records: Read-only compatible (missing fields default to undefined)
- Cache: No impact (cache key unchanged)
- API: No changes to request/response format

---

## Testing Strategy

1. **Unit Tests**
   - Cost estimation for known models
   - Token usage extraction from mock API responses

2. **Integration Tests**
   - Call each provider (OpenRouter, Google, Anthropic)
   - Verify metadata written to record
   - Verify duration and token counts are reasonable

3. **Manual Validation**
   - Run sentence-polish skill with MiniMax
   - Check generated record has all new fields
   - Verify cost calculation matches OpenRouter dashboard

---

## Future Enhancements (Out of Scope)

1. **Logging System**
   - Full execution trace to `vault/logs/agent.{timestamp}.log`
   - Controlled by `ENABLE_LOGGING=true` env var
   - Log format: `[timestamp] Event: details`

2. **Real-time Pricing**
   - Some APIs (OpenRouter) return actual cost in response
   - Use that instead of estimates when available

3. **Cost Analytics Dashboard**
   - Export records to CSV
   - Aggregate costs by skill/model/date
   - Identify expensive patterns

---

## Success Criteria

- ✅ All new records include `llm` and `usage` fields
- ✅ Token counts match API responses
- ✅ Duration measured in milliseconds
- ✅ Cost estimation within 10% of actual (for known models)
- ✅ No performance degradation (< 5ms overhead)
- ✅ Existing records still readable

---

## Risks

1. **API Response Variations**
   - Not all providers return token usage in same format
   - Mitigation: Default to 0 if field missing, add tests per provider

2. **Pricing Drift**
   - Model prices change over time
   - Mitigation: Document pricing table update process, use API-provided costs when available

3. **Cached Records**
   - Cached responses don't trigger LLM calls
   - Mitigation: Cached records keep original metadata (no re-calculation)
