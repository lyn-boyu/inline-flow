import type { Skill } from "../types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  canUseClipboard?: boolean;
  clipboardText?: string;
}

/**
 * Validate input based on skill requirements
 * Returns validation result with optional error message and clipboard info
 */
export function validateInput(
  skill: Skill,
  selectionText?: string,
  clipboardText?: string
): ValidationResult {
  const selectionConfig = skill.inputs.selectionText;

  // 1. If selectionText is required, check it first
  if (selectionConfig?.required) {
    if (!selectionText) {
      // Check if clipboard has content that could be used
      const hasClipboard = !!clipboardText && clipboardText.trim().length > 0;

      return {
        valid: false,
        error: `Selection required\n\n"${skill.name}" requires selected text as input.`,
        canUseClipboard: hasClipboard,
        clipboardText: hasClipboard ? clipboardText : undefined,
      };
    }
    return { valid: true };
  }

  // 2. If selectionText is not required, check if any input is available
  if (selectionText || clipboardText) {
    return { valid: true };
  }

  // 3. No valid input available
  return {
    valid: false,
    error: `No valid input\n\nPlease select text or copy content to clipboard.`,
  };
}
