# OpenRouter Provider Guide

## Overview

OpenRouter provides unified access to multiple LLM models through a single API. This allows you to:
- Switch between models without changing providers
- Access models not available through direct APIs
- Compare outputs across different models
- Reduce vendor lock-in

## Setup

### 1. Get API Key

1. Visit https://openrouter.ai/keys
2. Sign in or create an account
3. Generate a new API key
4. Copy the key (starts with `sk-or-v1-...`)

### 2. Add to Environment

In `packages/host/.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

### 3. Configure Skill

In your skill's frontmatter:

```yaml
llm:
  provider: openrouter
  model: anthropic/claude-3.5-sonnet  # Or any supported model
  temperature: 0.7

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
```

## Supported Models

OpenRouter supports 100+ models. Popular choices:

### Anthropic Claude
- `anthropic/claude-3.5-sonnet` - Latest Claude (recommended)
- `anthropic/claude-3-opus` - Most capable
- `anthropic/claude-3-haiku` - Fastest, cheapest

### OpenAI GPT
- `openai/gpt-4o` - Latest GPT-4
- `openai/gpt-4o-mini` - Faster, cheaper
- `openai/gpt-3.5-turbo` - Legacy, cheapest

### Google Gemini
- `google/gemini-2.0-flash-exp` - Latest Gemini
- `google/gemini-1.5-pro` - Most capable
- `google/gemini-3-flash-preview` - Preview model

### Meta Llama
- `meta-llama/llama-3.1-405b-instruct` - Largest open model
- `meta-llama/llama-3.1-70b-instruct` - Balanced
- `meta-llama/llama-3.1-8b-instruct` - Fast, free

### Other Models
- `mistralai/mistral-large` - Mistral's flagship
- `cohere/command-r-plus` - Cohere's best
- `perplexity/llama-3.1-sonar-huge-128k-online` - With web search

Full list: https://openrouter.ai/models

## Pricing

OpenRouter pricing varies by model:
- Check current rates: https://openrouter.ai/models
- Add credits: https://openrouter.ai/credits
- Monitor usage: https://openrouter.ai/activity

## Example Skills

### Multi-Model Comparison Skill

```yaml
---
id: multi-model-test
name: Multi-Model Test
description: Test same prompt across multiple models
version: 0.1.0

llm:
  provider: openrouter
  model: anthropic/claude-3.5-sonnet
  temperature: 0.7

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
---

# System
Compare these models:
- Claude 3.5 Sonnet
- GPT-4o
- Gemini 2.0 Flash

# User
Task: {{selectionText}}
```

## Troubleshooting

### "API key not found"
- Ensure `OPENROUTER_API_KEY` is set in `.env`
- Restart Bun Host after adding key

### "Invalid model"
- Check model name format: `provider/model-name`
- Verify model exists: https://openrouter.ai/models
- Some models require credits

### "Insufficient credits"
- Add credits: https://openrouter.ai/credits
- Use free models: Llama 3.1 8B, etc.

## Benefits vs Direct APIs

| Feature | Direct API | OpenRouter |
|---------|-----------|------------|
| Single API key | ❌ | ✅ |
| Model switching | Requires provider change | Just change model name |
| Access to all models | Limited to provider | 100+ models |
| Pricing | Fixed per provider | Pay per use |
| Rate limits | Per provider | Unified |

## Best Practices

1. **Start with free models** for testing (Llama 3.1 8B)
2. **Monitor costs** in OpenRouter dashboard
3. **Use model fallbacks** if primary unavailable
4. **Set reasonable temperature** (0.3-0.8)
5. **Check model capabilities** before use

## Comparison: OpenRouter vs Direct Google API

You can access Gemini models through either OpenRouter or Google's direct API:

### Using Google Direct
```yaml
llm:
  provider: google
  model: gemini-3-flash-preview
  temperature: 0.7

secrets:
  apiKeyEnv: GOOGLE_API_KEY
```

### Using OpenRouter
```yaml
llm:
  provider: openrouter
  model: google/gemini-3-flash-preview
  temperature: 0.7

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
```

**When to use which:**
- **Google Direct**: Free tier, lower latency, Google-specific features
- **OpenRouter**: Unified billing, model comparison, fallback options
