import type { Skill } from '../types';

/**
 * Resolve the primary input based on skill requirements and available inputs
 * Returns the primary input text or an error message
 */
export function resolvePrimaryInput(
  skill: Skill,
  selectionText?: string,
  clipboardText?: string
): { primaryInput?: string; error?: string } {
  const selectionConfig = skill.inputs.selectionText;

  // 1. If selectionText is required, check it first
  if (selectionConfig?.required) {
    if (!selectionText) {
      return {
        error: `Selection required. "${skill.name}" requires selected text as input.`
      };
    }
    return { primaryInput: selectionText };
  }

  // 2. If selectionText is not required, use priority order
  if (selectionText) {
    return { primaryInput: selectionText };
  }

  if (clipboardText) {
    return { primaryInput: clipboardText };
  }

  // 3. No valid input available
  return {
    error: `No valid input. Please select text or copy content to clipboard.`
  };
}
