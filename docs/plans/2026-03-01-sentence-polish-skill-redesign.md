# Sentence Polish Skill Redesign - Pattern-First Learning

**Date:** 2026-03-01
**Status:** Approved
**Model Selected:** MiniMax M2.5 (via OpenRouter)

---

## Context

The original `sentence-polish` skill was designed for quick Slack message corrections. However, the actual user need is **learning natural English patterns** for workplace communication, not just getting corrected text.

**Key Insight:** Users want to absorb reusable chunks/patterns, not just fix individual sentences.

---

## Requirements

### User Needs (Priority Order)
1. **Workplace communication** (Slack, email, documentation)
2. **Daily expression practice** (general conversation)
3. **Writing practice** (deliberate skill building)

### Learning Constraints
- **Cognitive load limit:** 1 core pattern per response (avoid overload)
- **Diagnostic focus:** Explain WHY it sounds non-native, not just WHAT to change
- **Transfer learning:** Show where else the pattern applies
- **Chinese-to-English awareness:** Identify translation patterns specifically

---

## Design

### Output Format (Approved)

```markdown
## ✅ Polished Version
[Corrected sentence, ready for immediate use]

---

## 🎯 Core Pattern (The ONE thing to learn)

**Pattern**: [Reusable chunk/phrase structure]

### Your Usage vs Native Speaker
```diff
- Your version: [problematic part]
+ Native version: [natural alternative]
```

### Why This Sounds Non-Native
[Specific non-native signal: Chinese translation pattern, overly formal, etc.]

### Where Else You Can Use This
- Scenario 1: [Example]
- Scenario 2: [Example]

---

## 📝 Other Improvements (Optional)
[Only if critical issues exist beyond core pattern]

**Spelling/Grammar:** [if exists]
**Simpler Alternatives:** [if exists]
```

### Key Principles
1. **Pattern-First Learning** - Teach reusable structures, not corrections
2. **Limit to 1 Core Pattern** - Avoid cognitive overload
3. **Explain Non-Native Signals** - Identify Chinese-to-English translation patterns
4. **Provide Transfer Examples** - Show where pattern applies in other contexts
5. **Prioritize Structure > Words** - Fix sentence structure before word choice

---

## Model Selection

### Testing Results

| Model | Structure Detection | Cost/Call | Score |
|-------|-------------------|-----------|-------|
| **MiniMax M2.5** ⭐ | ✅✅✅✅✅ Identified "It's from X to V" as Chinese translation | ~$0.003 | **15/15** |
| Grok 4.1 Fast | ✅✅ Identified verbose expressions | ~$0.015 | 9/15 |
| Claude 3.5 Sonnet | ✅✅ Identified verbose expressions | ~$0.10 | 7/15 |
| Gemini 3 Flash | ❌ Only word-level issues | ~$0.015 | 3/15 |

### Winner: MiniMax M2.5

**Why:**
- ✅ **Perfect structural analysis** - Correctly identified "It's from X to V" as Chinese "从...来..." translation
- ✅ **Deep Chinese-English understanding** - Chinese company, likely trained on translation patterns
- ✅ **Extreme cost-efficiency** - ~$0.003/call (1/30th of Claude)
- ✅ **High usage validation** - 1.66T tokens on OpenRouter = proven quality

**Configuration:**
```yaml
llm:
  provider: openrouter
  model: minimax/minimax-m2.5
  temperature: 0.4

secrets:
  apiKeyEnv: OPENROUTER_API_KEY
```

---

## Example Output

**Input:**
> It's basically from the backend to share how to use dynatrace to understand and investigate problems. It shows the usage of the filter conditions, span list view and trace view; it is a useful tool for us to identify problems.

**MiniMax M2.5 Output:**

### ✅ Polished Version
The backend team created this to share how to use Dynatrace for understanding and investigating problems. It covers filter conditions, the span list view, and trace view—it's a useful tool for identifying issues.

### 🎯 Core Pattern
**Pattern**: `[Source] created this to [verb]` (not "It's from [source] to [verb]")

**Your Usage vs Native:**
```diff
- It's basically from the backend to share...
+ The backend team created this to share...
```

**Why Non-Native:**
"It's from X to V" is a direct translation of Chinese "从...来..." (cóng... lái...). English doesn't use "from" to indicate creator's purpose.

**Transfer Examples:**
- "The docs team created this to explain our API" ✅
- "Our QA team built this demo to show debugging" ✅

---

## Future Enhancements (Deferred)

### Record Metadata Enhancement
Add LLM tracking to vault records:

```yaml
---
llm:
  provider: openrouter
  model: minimax/minimax-m2.5
  temperature: 0.4
performance:
  duration: 2.3  # seconds
  tokensUsed: 450  # if available
---
```

**Benefits:** Cost tracking, performance comparison, reproducibility

**Status:** Recorded as future improvement, not blocking this design

---

## Success Criteria

1. ✅ User can identify 1 core pattern to learn from each use
2. ✅ Explanation includes WHY it sounds non-native (not just WHAT)
3. ✅ Examples show pattern transferability to other contexts
4. ✅ Cost per use < $0.01 (achieved: ~$0.003)
5. ✅ Correctly identifies structural issues, not just word choice

---

## Implementation

See implementation plan: (to be created via writing-plans skill)

**Key Files:**
- `vault/skills/sentence-polish/SKILL.md` - Skill definition
- Testing conducted with 5 models to validate design decisions
