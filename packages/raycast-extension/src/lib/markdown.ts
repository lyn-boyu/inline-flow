/**
 * Remove YAML frontmatter from markdown content
 * Frontmatter is the metadata section between --- delimiters
 */
export function removeFrontmatter(markdown: string): string {
  // Match frontmatter: starts with ---, followed by content, ends with ---
  const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  return markdown.replace(frontmatterRegex, '').trim();
}
