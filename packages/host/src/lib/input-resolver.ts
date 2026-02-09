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
  // Check if selectionText is available
  if (selectionText) {
    return { primaryInput: selectionText };
  }

  // Check if clipboardText can be used as primary
  const clipboardConfig = skill.inputs.clipboardText;
  const allowAsPrimary = clipboardConfig?.allowAsPrimary !== false;

  if (clipboardText && allowAsPrimary) {
    return { primaryInput: clipboardText };
  }

  // Check if selectionText is required
  const selectionConfig = skill.inputs.selectionText;
  if (selectionConfig?.required) {
    return { error: 'This skill requires selected text' };
  }

  return { error: 'No valid input provided' };
}
