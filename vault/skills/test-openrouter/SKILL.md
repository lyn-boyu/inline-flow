---
id: test-openrouter
name: Test · OpenRouter Gemini
description: Test OpenRouter provider with Gemini model
version: 0.1.0
tags: [test, openrouter, gemini]

inputs:
  selectionText:
    required: true

llm:
  provider: openrouter
  model: google/gemini-3-flash-preview
  temperature: 0.7

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
---

# System
You are a helpful assistant. Respond concisely.

# User
Input: {{selectionText}}

Please provide a brief explanation.
