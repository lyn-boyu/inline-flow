/**
 * Normalize text for cache key computation
 * - Trim whitespace
 * - Compress multiple spaces into single space
 * - Does NOT change case (preserve original)
 */
export function normalize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ');
}
