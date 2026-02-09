---
id: sentence.polish
name: Sentence · Polish
version: 0.1.0
tags: [polish, writing]

inputs:
  selectionText:
    required: true

llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.4

secrets:
  apiKeyEnv: OPENAI_API_KEY
---

# System
Polish the user's sentence for clarity, conciseness, and impact. Provide both the polished version and a brief explanation.

Format in Markdown with:
- **Polished**: The improved sentence
- **Explanation**: Why the changes improve the text

# User
{{selectionText}}
