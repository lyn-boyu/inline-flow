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
    return {
      error: `请先选中文本。\n\n"${skill.name}" 需要选中的文本作为输入。\n\n提示：如果某些应用无法获取选中内容，可以先复制文本到剪贴板。`
    };
  }

  return {
    error: `没有可用的输入。\n\n请选中文本或复制内容到剪贴板后再试。`
  };
}
