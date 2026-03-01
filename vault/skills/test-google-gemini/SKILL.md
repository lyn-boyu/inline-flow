---
id: test-google-gemini
name: Test · Google Gemini Direct
description: Test Google provider directly with Gemini model
version: 0.1.0
tags: [test, google, gemini]

inputs:
  selectionText:
    required: true

llm:
  provider: google
  model: gemini-3-flash-preview
  temperature: 0.7

secrets:
  apiKeyEnv: GOOGLE_API_KEY
---

# System
You are a helpful assistant. Respond concisely.

# User
Input: {{selectionText}}

Please provide a brief explanation.
