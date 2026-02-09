/**
 * Render a template with provided variables
 * Replaces {{variableName}} with actual values
 * If a variable is not provided, the template tag is removed
 */
export function renderTemplate(
  template: string,
  variables: {
    selectionText?: string;
    clipboardText?: string;
    frontmostApp?: string;
  }
): string {
  let rendered = template;

  // Replace each variable
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value || '');
  });

  // Clean up any remaining unreplaced variables (remove the line if the variable is undefined)
  rendered = rendered.replace(/^.*\{\{.*?\}\}.*$\n?/gm, '');

  return rendered.trim();
}
