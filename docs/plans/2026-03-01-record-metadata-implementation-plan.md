# Record Metadata Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add LLM configuration and usage tracking to vault record metadata for cost analysis and performance monitoring.

**Architecture:** Modify `callLLM` to return structured response with content + usage metrics. Update all provider functions to extract token counts and measure duration. Add cost estimation function with pricing table. Integrate into run handler to write enhanced metadata.

**Tech Stack:** TypeScript, Bun.js runtime

---

## Current State

**What exists:**
- Basic record metadata: skillId, version, timestamp, input
- LLM client supporting 6 providers (OpenAI, Anthropic, Google, Azure, Cohere, OpenRouter)
- Type definitions in `src/types.ts`
- Provider functions in `src/lib/llm-client.ts`

**What needs to be added:**
1. New type definitions for TokenUsage, LLMResponse
2. Cost estimation function with pricing table
3. Updated callLLM and all provider functions
4. Enhanced RecordMetadata with llm + usage fields
5. Integration in run handler

---

## Task 1: Add Type Definitions

**Files:**
- Modify: `packages/host/src/types.ts:1-10`
- Modify: `packages/host/src/types.ts:72-84`

**Step 1: Add TokenUsage and LLMResponse interfaces**

After the imports, add these interfaces near the top:

```typescript
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
```

**Step 2: Update RecordMetadata interface**

Modify the RecordMetadata interface to add llm and usage fields:

```typescript
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
    estimatedCost: number;
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

**Step 3: Verify TypeScript compilation**

Run: `cd packages/host && bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TokenUsage, LLMResponse types and enhance RecordMetadata"
```

---

## Task 2: Create Cost Estimation Function

**Files:**
- Create: `packages/host/src/lib/pricing.ts`

**Step 1: Create pricing.ts file**

```typescript
import type { TokenUsage } from '../types';

/**
 * Model pricing table
 * Prices in USD per 1K tokens
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenRouter models
  'openrouter/minimax/minimax-m2.5': {
    input: 0.001 / 1000,
    output: 0.002 / 1000,
  },
  'openrouter/anthropic/claude-3.5-sonnet': {
    input: 0.003 / 1000,
    output: 0.015 / 1000,
  },
  'openrouter/x-ai/grok-4.1-fast': {
    input: 0.01 / 1000,
    output: 0.02 / 1000,
  },

  // Google models (direct)
  'google/gemini-3-flash-preview': {
    input: 0.01 / 1000,
    output: 0.02 / 1000,
  },
  'google/gemini-2.0-flash-exp': {
    input: 0.01 / 1000,
    output: 0.02 / 1000,
  },

  // Anthropic models (direct)
  'anthropic/claude-sonnet-4-5-20250929': {
    input: 0.003 / 1000,
    output: 0.015 / 1000,
  },

  // OpenAI models (direct)
  'openai/gpt-4o': {
    input: 0.0025 / 1000,
    output: 0.01 / 1000,
  },
  'openai/gpt-4o-mini': {
    input: 0.00015 / 1000,
    output: 0.0006 / 1000,
  },
};

/**
 * Estimate cost based on token usage
 * @param provider - LLM provider name
 * @param model - Model identifier
 * @param usage - Token usage metrics
 * @returns Estimated cost in USD
 */
export function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage
): number {
  // Build key: provider/model
  const key = `${provider}/${model}`;
  const pricing = PRICING[key];

  // If pricing unknown, return 0
  if (!pricing) {
    console.warn(`[pricing] No pricing data for ${key}, cost will be $0`);
    return 0;
  }

  const inputCost = usage.promptTokens * pricing.input;
  const outputCost = usage.completionTokens * pricing.output;

  // Round to 6 decimal places
  return Math.round((inputCost + outputCost) * 1000000) / 1000000;
}
```

**Step 2: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/pricing.ts
git commit -m "feat: add cost estimation function with pricing table"
```

---

## Task 3: Update LLM Client - callLLM Function

**Files:**
- Modify: `packages/host/src/lib/llm-client.ts:1-11`
- Modify: `packages/host/src/lib/llm-client.ts:6-36`

**Step 1: Update imports**

Add LLMResponse import at the top:

```typescript
import type { Skill, LLMResponse } from '../types';
```

**Step 2: Update callLLM function signature**

Change the return type from `Promise<string>` to `Promise<LLMResponse>`:

```typescript
export async function callLLM(
  skill: Skill,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const apiKey = process.env[skill.secrets.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`API key not found: ${skill.secrets.apiKeyEnv}`);
  }

  switch (skill.llm.provider) {
    case 'openai':
      return await callOpenAI(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'anthropic':
      return await callAnthropic(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'google':
      return await callGoogle(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'azure-openai':
      return await callAzureOpenAI(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'cohere':
      return await callCohere(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'openrouter':
      return await callOpenRouter(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    default:
      throw new Error(`Unsupported LLM provider: ${skill.llm.provider}`);
  }
}
```

**Step 3: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: Errors about return type mismatch in provider functions (expected)

**Step 4: Commit**

```bash
git add src/lib/llm-client.ts
git commit -m "feat: update callLLM to return LLMResponse"
```

---

## Task 4: Update Provider Functions - OpenRouter

**Files:**
- Modify: `packages/host/src/lib/llm-client.ts:260-293`

**Step 1: Update callOpenRouter function**

Replace the entire function:

```typescript
async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/inline-flow/inline-flow',
      'X-Title': 'Inline Flow',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
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

**Step 2: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: Fewer errors (OpenRouter provider now matches)

**Step 3: Commit**

```bash
git add src/lib/llm-client.ts
git commit -m "feat: update callOpenRouter to return LLMResponse with usage"
```

---

## Task 5: Update Provider Functions - Google

**Files:**
- Modify: `packages/host/src/lib/llm-client.ts:110-169`

**Step 1: Update callGoogle function**

Replace the function to measure time and extract usage:

```typescript
async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: combinedPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Google API returned no candidates');
  }

  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Google API returned invalid response structure');
  }

  // Extract usage metadata if available
  const usage = data.usageMetadata || {};

  return {
    content: candidate.content.parts[0].text,
    usage: {
      promptTokens: usage.promptTokenCount || 0,
      completionTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    },
    durationMs,
  };
}
```

**Step 2: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: Fewer errors

**Step 3: Commit**

```bash
git add src/lib/llm-client.ts
git commit -m "feat: update callGoogle to return LLMResponse with usage"
```

---

## Task 6: Update Provider Functions - Anthropic, OpenAI, Azure, Cohere

**Files:**
- Modify: `packages/host/src/lib/llm-client.ts:38-108`
- Modify: `packages/host/src/lib/llm-client.ts:171-250`

**Step 1: Update callOpenAI**

```typescript
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
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

**Step 2: Update callAnthropic**

```typescript
async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    durationMs,
  };
}
```

**Step 3: Update callAzureOpenAI**

```typescript
async function callAzureOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT environment variable is required for Azure OpenAI');
  }

  const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
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

**Step 4: Update callCohere**

```typescript
async function callCohere(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<LLMResponse> {
  const startTime = Date.now();

  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      message: userPrompt,
      preamble: systemPrompt,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cohere API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  return {
    content: data.text,
    usage: {
      promptTokens: data.meta?.tokens?.input_tokens || 0,
      completionTokens: data.meta?.tokens?.output_tokens || 0,
      totalTokens: (data.meta?.tokens?.input_tokens || 0) + (data.meta?.tokens?.output_tokens || 0),
    },
    durationMs,
  };
}
```

**Step 5: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: No errors in llm-client.ts (errors may remain in run.ts)

**Step 6: Commit**

```bash
git add src/lib/llm-client.ts
git commit -m "feat: update all provider functions to return LLMResponse"
```

---

## Task 7: Update Run Handler

**Files:**
- Modify: `packages/host/src/api/run.ts:8-9`
- Modify: `packages/host/src/api/run.ts:109-145`

**Step 1: Add pricing import**

At the top of the file, add:

```typescript
import { estimateCost } from '../lib/pricing';
```

**Step 2: Update LLM call and metadata creation**

Replace lines 109-145 with:

```typescript
    // Call LLM
    const llmResult = await callLLM(skill, systemPrompt, userPrompt);

    // Calculate cost
    const estimatedCost = estimateCost(
      skill.llm.provider,
      skill.llm.model,
      llmResult.usage
    );

    // Generate record path
    const recordPath = await generateRecordPath(expandedVaultDir, skill, primaryInput);

    // Create metadata
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');

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

      source: {
        ...(frontmostApp ? { frontmostApp } : {}),
      },
      input: {
        selectionText: primaryInput,
      },
      cachedFrom: '',
    };

    // Clean up old file if lruRename is on and the path changed (e.g. new date prefix)
    if (skill.record?.lruRename) {
      const existingEntry = cacheIndex.get(cacheKey);
      if (existingEntry && existingEntry.recordPath !== recordPath) {
        const oldFullPath = join(expandedVaultDir, existingEntry.recordPath);
        if (await Bun.file(oldFullPath).exists()) {
          await unlink(oldFullPath);
        }
      }
    }

    // Write record (use llmResult.content instead of llmResponse)
    await writeRecord(expandedVaultDir, recordPath, metadata, llmResult.content);
```

**Step 3: Verify TypeScript compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/api/run.ts
git commit -m "feat: integrate LLM usage tracking in run handler"
```

---

## Task 8: Manual End-to-End Testing

**Files:**
- Manual testing via HTTP API

**Step 1: Ensure OpenRouter API key is set**

Check `.env` has: `OPENROUTER_API_KEY=sk-or-v1-...`

**Step 2: Start the dev server**

Run: `bun run dev`
Expected: Server starts on http://127.0.0.1:8787

**Step 3: Test sentence-polish skill**

```bash
curl -X POST http://127.0.0.1:8787/api/run \
  -H "Authorization: Bearer $HOST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "sentence-polish",
    "selectionText": "It is basically from the backend to share how to use dynatrace",
    "force": true
  }' | jq '.'
```

Expected:
- `ok: true`
- Response contains `content` field with LLM output

**Step 4: Check generated record**

```bash
ls -lt vault/records/sentence-polish/ | head -3
cat vault/records/sentence-polish/<latest-file>.md
```

Expected metadata:
```yaml
---
createdAt: 2026-03-01_XX-XX-XX
skillId: sentence-polish
skillVersion: 0.2.0
tags: [polish, learning, workplace-english]
llm:
  provider: openrouter
  model: minimax/minimax-m2.5
  temperature: 0.4
usage:
  durationMs: 2000-3000 (reasonable range)
  promptTokens: >0
  completionTokens: >0
  totalTokens: >0
  estimatedCost: 0.002-0.005 (for MiniMax)
---
```

**Step 5: Verify cost calculation**

Check that:
- `totalTokens` = `promptTokens` + `completionTokens`
- `estimatedCost` is reasonable for the model
- `durationMs` is between 1000-5000ms (normal API latency)

**Step 6: Test with different provider (if available)**

If you have `GOOGLE_API_KEY` set, test vocab-pronunciation:

```bash
curl -X POST http://127.0.0.1:8787/api/run \
  -H "Authorization: Bearer $HOST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "vocab-pronunciation",
    "selectionText": "hello",
    "force": true
  }' | jq '.ok, .cached'
```

Check the record has Google-specific metadata:
```yaml
llm:
  provider: google
  model: gemini-3-flash-preview
  temperature: 0.3
usage:
  durationMs: ...
  promptTokens: ...
  ...
```

**Step 7: Stop the server**

Ctrl+C to stop

**Step 8: Document test results**

No commit needed - verification complete

---

## Task 9: Update Documentation

**Files:**
- Modify: `docs/plans/2026-03-01-record-metadata-enhancement.md`

**Step 1: Add implementation completion note**

At the end of the design doc, add:

```markdown
---

## Implementation Status

✅ **Completed:** 2026-03-01

**Changes:**
- Added `TokenUsage` and `LLMResponse` types
- Created `pricing.ts` with cost estimation
- Updated all 6 provider functions to return usage data
- Enhanced `RecordMetadata` with `llm` and `usage` fields
- Integrated usage tracking in run handler

**Testing:**
- ✅ TypeScript compilation passes
- ✅ Manual E2E test with OpenRouter/MiniMax
- ✅ Manual E2E test with Google/Gemini
- ✅ Cost estimation verified
- ✅ Token counts match API responses

**Example Record:**
See `vault/records/sentence-polish/2026-03-01_XX-XX-XX__example.md` for real output.
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-01-record-metadata-enhancement.md
git commit -m "docs: mark record metadata enhancement as complete"
```

---

## Summary

This plan implements:

1. ✅ **Type System** - `TokenUsage`, `LLMResponse`, enhanced `RecordMetadata`
2. ✅ **Cost Estimation** - Pricing table for 10+ models
3. ✅ **LLM Client** - All 6 providers return usage + duration
4. ✅ **Integration** - Run handler writes enhanced metadata
5. ✅ **Testing** - Manual E2E validation

**Key Features:**
- 📊 Track tokens: prompt + completion + total
- ⏱️ Measure API latency in milliseconds
- 💰 Estimate cost per API call
- 🏷️ Record LLM config (provider, model, temperature)

**Execution Time Estimate:** ~45-60 minutes

**Dependencies:**
- OpenRouter API key for testing
- Google API key for additional validation (optional)

---

## Post-Completion Checklist

- [ ] TypeScript compiles without errors
- [ ] All provider functions return `LLMResponse`
- [ ] Cost estimation works for known models
- [ ] Records contain `llm` and `usage` fields
- [ ] Token counts are non-zero for successful calls
- [ ] Duration is measured in milliseconds
- [ ] Estimated cost is reasonable
- [ ] Ready for production use
