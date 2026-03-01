---
id: test-openrouter
name: Test · OpenRouter
description: Test skill using OpenRouter with Claude model
version: 0.1.0
tags: [test, openrouter]

inputs:
  selectionText:
    required: true

llm:
  provider: openrouter
  model: anthropic/claude-3.5-sonnet
  temperature: 0.7

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
---

# System
You are a helpful assistant. Respond concisely.

# User
Input: {{selectionText}}

Please provide a brief explanation.
