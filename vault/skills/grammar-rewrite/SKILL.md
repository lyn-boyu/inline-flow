---
id: grammar-rewrite
name: Grammar · Rewrite
description: Rewrite sentences to be more natural and grammatically correct
version: 0.1.0
tags: [grammar, rewrite, english]

inputs:
  selectionText:
    required: true

llm:
  provider: anthropic
  model: claude-sonnet-4-5-20250929
  temperature: 0.3

secrets:
  apiKeyEnv: ANTHROPIC_API_KEY
---

# System
You are an English writing coach. Rewrite the user's sentence to be more natural, clear, and grammatically correct. Explain what you changed and why.

Format your response in Markdown with:
- The rewritten sentence
- Explanation of changes

# User
Original sentence: {{selectionText}}
