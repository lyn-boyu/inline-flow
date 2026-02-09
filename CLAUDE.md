# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
你是一个资深 Raycast Extension 工程师。
请你实现一个完整可运行的 Raycast Extension，名称为 Inline Flow。

这是一个 v1 产品级实现，不是 demo。

## Project Overview

**Inline Flow** is a system consisting of two components:
1. A Raycast Extension (input/display layer)
2. A Bun.js WebApp Host (capability/execution layer)

The core concept: Execute versioned skills on current context (selected text or clipboard) through Raycast shortcuts, with results displayed inline without disrupting workflow.

## Architecture Principles

### Component Boundaries

**Raycast Extension responsibilities:**
- Capture input (selection/clipboard/frontmost app)
- Manage skill selection state
- Call local Host via HTTP
- Display Markdown results returned by Host

**Raycast Extension does NOT:**
- Call LLMs directly
- Manage prompts or skill definitions
- Handle caching
- Write files to disk
- Parse skill files
- Store LLM API keys

**Bun Host responsibilities:**
- Parse skill definitions from `skills/*.md`
- Execute skills (LLM/MCP calls)
- Manage cache (based on cacheKey)
- Generate and persist Markdown records to Vault
- Return complete Markdown content via HTTP API

### Key Design Principles

1. **Inline First** - No app switching, no attention disruption
2. **Host-Centric** - Raycast has no business logic; all intelligence lives in local Host
3. **Skill as Contract** - Skills are stable, versioned interfaces
4. **Fast Path > Configurability** - Default behavior must be fast

## Vault Directory Structure

```
InlineFlow/
  records/
    vocab-pronunciation/
      2026-02-08_01-02-33__weasel.md
      2026-02-08_01-02-33__weasel__2.md
    grammar-rewrite/
      ...
  skills/
    vocab-pronunciation.md
    grammar-rewrite.md
  _cache/
    index.json
```

## Skill Definition Format

Skills are defined in Markdown files with frontmatter:

```markdown
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
  model: gpt-4.1-mini
  temperature: 0.2

secrets:
  apiKeyEnv: OPENAI_API_KEY
---

# System
You are a precise English tutor.

# User
Input: {{selectionText}}
Clipboard: {{clipboardText}}
App: {{frontmostApp}}
```

## Host HTTP API

### Endpoint: `POST /api/run`

**Request:**
```json
{
  "skillId": "vocab.pronunciation",
  "selectionText": "weasel",
  "clipboardText": "...",
  "frontmostApp": "Google Chrome",
  "force": false
}
```

**Response:**
```json
{
  "ok": true,
  "cached": true,
  "finalPath": "records/vocab-pronunciation/2026-02-08_01-02-33__weasel.md",
  "content": "---\n...\n---\n\n## Result\n..."
}
```

**Authentication:** `Authorization: Bearer <HOST_API_KEY>`

## Cache Mechanism

**Cache Key Formula:**
```
cacheKey = sha256(skillId + "@" + skillVersion + "\n" + normalize(primaryInput))
```

Where `normalize()` trims and compresses whitespace without changing case.

- `force=false` + cache hit → return cached content
- `force=true` → re-execute, generate new file with suffix `__2`, `__3`, etc., update index

## Input Decision Logic

The Host (not Raycast) determines primary input:

```
if selectionText exists:
  primaryInput = selectionText
else if clipboardText exists and allowAsPrimary != false:
  primaryInput = clipboardText
else:
  return 400 ("This skill requires selected text")
```

`primaryInput` is used for template rendering and cacheKey calculation. `clipboardText` provides supplemental context but does NOT participate in cacheKey.

## Raycast Commands

Three fixed commands:

1. **Run Last Skill** - Execute current skill; fallback to Picker if none selected
2. **Cycle Skill** - Switch to next skill without executing (shows toast)
3. **Run Skill (Picker)** - Display skill list (max 9), select and execute

## Security Constraints

- Host only listens on `127.0.0.1`
- API key required for all requests
- No LLM keys stored in Raycast
- All file writes confined to `VAULT_DIR`
- No path traversal allowed

## V1 Scope

**Included:**
- 3 fixed commands (Run/Cycle/Picker)
- Selection + clipboard input collection
- HTTP call to local Host
- Markdown result display
- Re-run with force flag

**Excluded (V1):**
- Dynamic skill registration
- Skill Marketplace
- Web UI management
- Cloud sync
- MCP Server integration (reserved for future)

## Development Notes

When implementing this system:
- Raycast Extension is purely a trigger and display layer
- The Extension should gracefully fail when Host is unavailable
- Never make up skill IDs - they must match what's defined in Host
- Skills are limited to ≤9 for V1
- Always collect both selectionText and clipboardText; let Host decide which to use
- Respect the separation of concerns: input collection in Raycast, intelligence in Host
