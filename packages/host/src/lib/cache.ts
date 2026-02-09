import { join } from 'path';
import { normalize } from '../utils/normalize';
import { sha256 } from '../utils/hash';
import type { CacheEntry } from '../types';

/**
 * Compute cache key from skill ID, version, and primary input
 */
export function computeCacheKey(
  skillId: string,
  skillVersion: string,
  primaryInput: string
): string {
  const normalized = normalize(primaryInput);
  const keyString = `${skillId}@${skillVersion}\n${normalized}`;
  return sha256(keyString);
}

/**
 * Load the cache index from _cache/index.json
 */
export async function loadCacheIndex(vaultDir: string): Promise<Map<string, CacheEntry>> {
  const indexPath = join(vaultDir, '_cache', 'index.json');
  const file = Bun.file(indexPath);

  if (!(await file.exists())) {
    return new Map();
  }

  try {
    const data = await file.json();
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}

/**
 * Save the cache index to _cache/index.json
 */
export async function saveCacheIndex(
  vaultDir: string,
  index: Map<string, CacheEntry>
): Promise<void> {
  const indexPath = join(vaultDir, '_cache', 'index.json');
  const data = Object.fromEntries(index);
  await Bun.write(indexPath, JSON.stringify(data, null, 2));
}

/**
 * Get cached record content if it exists
 */
export async function getCachedRecord(
  vaultDir: string,
  cacheKey: string,
  index: Map<string, CacheEntry>
): Promise<string | null> {
  const entry = index.get(cacheKey);
  if (!entry) {
    return null;
  }

  const recordPath = join(vaultDir, entry.recordPath);
  const file = Bun.file(recordPath);

  if (!(await file.exists())) {
    return null;
  }

  return await file.text();
}

/**
 * Update cache index with new record
 */
export function updateCacheIndex(
  index: Map<string, CacheEntry>,
  cacheKey: string,
  recordPath: string,
  skillId: string,
  skillVersion: string
): void {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');

  index.set(cacheKey, {
    recordPath,
    skillId,
    skillVersion,
    updatedAt: timestamp,
  });
}
