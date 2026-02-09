---
id: vocab.pronunciation
name: Vocab · Pronunciation
version: 0.1.0
tags: [vocab, pronunciation, english]

inputs:
  selectionText:
    required: true
  clipboardText:
    optional: true
    allowAsPrimary: true

llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.2

secrets:
  apiKeyEnv: OPENAI_API_KEY
---

# System
You are a precise English pronunciation tutor. For the given word, provide:
1. IPA pronunciation
2. Simple English explanation
3. 2-3 example sentences

Format your response in clear Markdown with headers and bullet points.

# User
Word: {{selectionText}}
Context from clipboard: {{clipboardText}}
Source app: {{frontmostApp}}
