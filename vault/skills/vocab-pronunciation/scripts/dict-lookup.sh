#!/usr/bin/env bash
set -euo pipefail

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed" >&2
  echo "Install with: brew install jq" >&2
  exit 1
fi

# Read JSON input from stdin
INPUT=$(cat)
WORD=$(echo "$INPUT" | jq -r '.word // empty')

if [[ -z "$WORD" ]]; then
  echo "Error: 'word' field is required in input" >&2
  exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Setup Python venv if needed
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON="$VENV_DIR/bin/python3"

if [[ ! -f "$PYTHON" ]]; then
  echo "Setting up Python virtual environment..." >&2
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet pyobjc-framework-CoreServices
  echo "Virtual environment ready." >&2
fi

# Call dict-original.py and capture output
RAW_OUTPUT=$("$PYTHON" "$SCRIPT_DIR/dict-original.py" "$WORD" 2>&1)

# Check if lookup succeeded
if echo "$RAW_OUTPUT" | grep -q "Not found"; then
  echo "## Dictionary Lookup"
  echo "> No dictionary entry found for \"$WORD\". Provide pronunciation guidance based on general English phonology rules."
  exit 0
fi

# Parse the output into structured Markdown
SYLLABLES=$(echo "$RAW_OUTPUT" | grep "^Syllables" | cut -d: -f2- | xargs)
IPA_US=$(echo "$RAW_OUTPUT" | grep "^IPA (US)" | cut -d: -f2- | xargs)
DEFINITION=$(echo "$RAW_OUTPUT" | grep "^Definition" | cut -d: -f2- | xargs)

# Output structured Markdown for LLM
cat <<EOF
## Dictionary Lookup Result

> Authoritative dictionary data for "$WORD" from macOS Dictionary.
> Use this as ground truth. DO NOT re-query or guess pronunciation.

**Word:** $WORD

**Syllabification:** $SYLLABLES

**IPA (US):** $IPA_US

**Definition:** $DEFINITION

**Instructions:**
- Use the syllabification above as the baseline
- Use the IPA above as the authoritative pronunciation
- Create syllable anchors based on this IPA
- Validate your output matches this ground truth
EOF
