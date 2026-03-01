# Sentence Polish Skill - Design Expectations

## Purpose

This skill is **not a grammar checker**. It's a **learning tool** designed to help Mandarin L1 speakers working in North American tech companies acquire natural English expression patterns through their own writing.

---

## Core Philosophy

### What This Skill SHOULD Do

1. **Teach Patterns, Not Corrections**
   - Extract 1 reusable chunk/phrase structure
   - Show how to use it in other contexts
   - Focus on structural issues, not word-level fixes

2. **Identify Non-Native Signals**
   - Detect Chinese-to-English translation patterns (e.g., "It's from X to do...")
   - Point out overly formal or outdated expressions
   - Explain WHY it sounds non-native (linguistic reasoning)

3. **Limit Cognitive Load**
   - **Exactly 1 core pattern** per response
   - Other issues go in "Optional" section
   - Each explanation ≤ 30 words

4. **Enable Transfer Learning**
   - Provide 2 examples showing pattern in different scenarios
   - Use tech workplace contexts (Slack, PRs, docs, standups)

### What This Skill SHOULD NOT Do

❌ List every grammar mistake
❌ Provide multiple pattern suggestions
❌ Focus on spelling before structural issues
❌ Give vague advice like "sounds better"
❌ Rewrite completely (preserve user's intent)

---

## Model Selection: MiniMax M2.5

**Provider:** OpenRouter
**Model:** `minimax/minimax-m2.5`
**Temperature:** 0.4

### Why This Model

1. **Superior Chinese-English Pattern Detection**
   - Correctly identifies "It's from X to V" as "从...来..." translation
   - Understands structural differences between languages
   - 15/15 score in comparative testing (vs Claude: 7/15, Gemini: 3/15)

2. **Cost Efficiency**
   - ~$0.003 per call (1/30th of Claude Sonnet)
   - Fits within $0.10 budget constraint
   - High usage (1.66T tokens) = proven reliability

3. **Test Results**
   - ✅ Identifies sentence structure issues
   - ✅ Provides clear Chinese-English mapping
   - ✅ Gives practical transfer examples
   - ✅ Maintains focus on 1 pattern

### Alternative Models (If MiniMax Unavailable)

| Model | Pros | Cons | Cost |
|-------|------|------|------|
| Grok 4.1 Fast | Good verbosity detection | Misses structure issues | ~$0.015 |
| Claude 3.5 Sonnet | High quality | Expensive, misses Chinese patterns | ~$0.10 |
| Gemini 3 Flash | Fast | Only catches word-level issues | ~$0.015 |

---

## Expected Output Format

### Structure

```markdown
## ✅ Polished Version
[Ready-to-use corrected text]

---

## 🎯 Core Pattern (The ONE thing to learn)

**Pattern**: [Reusable structure in brackets]

### Your Usage vs Native Speaker
```diff
- Your version: [problematic part]
+ Native version: [natural alternative]
```

### Why This Sounds Non-Native
[Linguistic explanation with Chinese-English mapping if applicable]

### Where Else You Can Use This
- Scenario 1: [Tech workplace example]
- Scenario 2: [Tech workplace example]

---

## 📝 Other Improvements (Optional)
[Only if critical issues exist]
```

### Quality Indicators

**Good Output:**
- ✅ Identifies structural problem (e.g., "from X to V")
- ✅ Maps to Chinese pattern (e.g., "从...来...")
- ✅ Provides reusable pattern with variables
- ✅ Examples use tech scenarios
- ✅ Explanation under 30 words

**Poor Output:**
- ❌ Only fixes words (e.g., "use 'walkthrough' not 'share'")
- ❌ No linguistic explanation
- ❌ Multiple patterns listed
- ❌ Generic examples
- ❌ Long-winded explanations

---

## Testing & Validation

### Test Input

```
It's basically from the backend to share how to use dynatrace to understand
and investigate problems. It shows the usage of the filter conditions, span
list view and trace view; it is a useful tool for us to identify problems.
```

### Expected Pattern Detection

**Primary Issue:** "It's from X to share..." (Chinese "从...来..." translation)
**NOT:** Word choice ("share" vs "walkthrough")

### Validation Checklist

- [ ] Core pattern is structural, not lexical
- [ ] Chinese-English mapping provided (if applicable)
- [ ] Pattern uses variables/placeholders
- [ ] Transfer examples are tech-workplace relevant
- [ ] Only 1 pattern in "Core Pattern" section
- [ ] Other issues relegated to "Optional" section

---

## Configuration Parameters

```yaml
llm:
  provider: openrouter
  model: minimax/minimax-m2.5
  temperature: 0.4  # Balance between consistency and naturalness

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
```

### Temperature Rationale

- **0.4**: Sweet spot for language teaching
  - Low enough for consistent pattern extraction
  - High enough for natural explanations
  - Tested vs 0.3 (too rigid) and 0.7 (too creative)

---

## Common Failure Modes

### 1. Surface-Level Fixes

**Problem:** Only changes words, ignores structure
**Example:** "use 'covers' instead of 'shows the usage of'"
**Fix:** Prompt emphasizes "structural issues BEFORE word choice"

### 2. Multiple Patterns

**Problem:** Lists 3-5 things to learn
**Example:** "Fix 1: subject clarity, Fix 2: verb choice, Fix 3: ..."
**Fix:** Prompt states "ALWAYS limit to 1 core pattern"

### 3. Generic Examples

**Problem:** "You can use this in emails" (not specific)
**Example:** Transfer scenarios lack context
**Fix:** Prompt requires "tech workplace examples"

### 4. Missing Linguistic Reasoning

**Problem:** "This sounds better" without explanation
**Example:** No mention of translation patterns
**Fix:** Prompt requires "explain WHY non-native"

---

## Future Improvements

### Planned

1. **Usage Tracking** (In Progress)
   - Track tokens, cost, duration per call
   - Analyze which patterns are most common
   - Identify expensive edge cases

2. **Logging System** (Deferred)
   - Full execution trace to `vault/logs/`
   - Enabled via `ENABLE_LOGGING=true`

### Wishlist

1. **Pattern Library**
   - Catalog learned patterns
   - Suggest related patterns
   - Track mastery level

2. **Multi-Model Ensemble**
   - Use MiniMax for structure detection
   - Use Claude for nuanced explanations
   - Combine strengths

3. **Adaptive Difficulty**
   - Track user's improvement
   - Adjust pattern complexity
   - Graduate from basic to advanced

---

## Maintenance

### When to Update Prompt

- User feedback indicates missed structural issues
- New Chinese-English patterns discovered
- Model behavior drifts over time

### When to Switch Models

- MiniMax quality degrades
- Pricing changes make it cost-prohibitive
- Better Chinese-aware model emerges

### How to Test Changes

1. Run test suite: `vault/skills/sentence-polish/tests/`
2. Compare output against baseline examples
3. Verify cost stays under $0.01/call
4. Check pattern quality (structural > lexical)

---

## Design History

- **v0.1.0** (2026-02-XX): Slack message correction tool
  - Model: OpenAI GPT-5-mini
  - Focus: Quick fixes for workplace messages
  - Problem: Too many corrections, cognitive overload

- **v0.2.0** (2026-03-01): Pattern-first learning redesign
  - Model: OpenRouter MiniMax M2.5
  - Focus: 1 structural pattern + transfer learning
  - Testing: 5 models compared, MiniMax selected
  - Result: Successfully identifies Chinese translation patterns

---

## References

- Design doc: `docs/plans/2026-03-01-sentence-polish-skill-redesign.md`
- Model comparison: See design doc testing section
- Pricing table: `src/lib/pricing.ts` (when implemented)
