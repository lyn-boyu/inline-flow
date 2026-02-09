/**
 * Generate a slug from text for use in filenames
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Truncate to maxLength
 */
export function generateSlug(text: string, maxLength = 40): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, maxLength);
}
