/**
 * Compute SHA-256 hash of text using Bun's crypto
 */
export function sha256(text: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(text);
  return hasher.digest('hex');
}
