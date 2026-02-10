import { join, basename } from 'path';
import { mkdir, rename } from 'fs/promises';
import { generateSlug } from '../utils/slug';
import type { Skill, RecordMetadata } from '../types';
import matter from 'gray-matter';

/**
 * Ensure vault directories exist
 */
export async function ensureVaultDirs(vaultDir: string, skillId: string): Promise<void> {
  const skillFolder = skillId.replace(/\./g, '-');
  const recordsDir = join(vaultDir, 'records', skillFolder);
  const cacheDir = join(vaultDir, '_cache');

  await mkdir(recordsDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });
}

/**
 * Generate a record path based on skill's record config.
 * Default format: records/<skill-folder>/<timestamp>__<slug>.md
 *
 * Configurable via skill.record:
 *   filename: template string with {timestamp} and {slug} variables
 *   overwrite: if true, skip collision detection (allows overwriting existing file)
 */
export async function generateRecordPath(
  vaultDir: string,
  skill: Skill,
  primaryInput: string
): Promise<string> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const slug = generateSlug(primaryInput);
  const skillFolder = skill.id.replace(/\./g, '-');

  // Resolve filename from template (default: "{timestamp}__{slug}")
  const date = now.toISOString().slice(0, 10); // "2026-02-09"
  const filenameTemplate = skill.record?.filename ?? '{timestamp}__{slug}';
  const basename = filenameTemplate
    .replace('{date}', date)
    .replace('{timestamp}', timestamp)
    .replace('{slug}', slug);
  const filename = `${basename}.md`;
  const fullPath = join(vaultDir, 'records', skillFolder, filename);

  // overwrite: true → return fixed path, allow file to be overwritten
  if (skill.record?.overwrite) {
    return join('records', skillFolder, filename);
  }

  // overwrite: false (default) → collision detection, append __2, __3
  let uniqueFilename = filename;
  let uniqueFullPath = fullPath;
  let counter = 2;

  while (await Bun.file(uniqueFullPath).exists()) {
    uniqueFilename = `${basename}__${counter}.md`;
    uniqueFullPath = join(vaultDir, 'records', skillFolder, uniqueFilename);
    counter++;
  }

  return join('records', skillFolder, uniqueFilename);
}

/**
 * Write a record file with frontmatter and content
 */
export async function writeRecord(
  vaultDir: string,
  recordPath: string,
  metadata: RecordMetadata,
  content: string
): Promise<void> {
  const fullPath = join(vaultDir, recordPath);

  // Generate markdown with frontmatter
  const markdown = matter.stringify(content, metadata);

  await Bun.write(fullPath, markdown);
}

/**
 * Read a record file
 */
export async function readRecord(vaultDir: string, recordPath: string): Promise<string> {
  const fullPath = join(vaultDir, recordPath);
  return await Bun.file(fullPath).text();
}

/**
 * Compute today's target path for a given skill + slug (used for LRU rename comparison).
 * Applies the same template resolution as generateRecordPath but uses the provided slug directly.
 */
export function computeTargetPath(
  skillId: string,
  filenameTemplate: string,
  slug: string
): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const skillFolder = skillId.replace(/\./g, '-');

  const base = filenameTemplate
    .replace('{date}', date)
    .replace('{timestamp}', timestamp)
    .replace('{slug}', slug);

  return join('records', skillFolder, `${base}.md`);
}

/**
 * Rename a record file (used for LRU "touch on access").
 */
export async function renameRecord(
  vaultDir: string,
  oldRelPath: string,
  newRelPath: string
): Promise<void> {
  const oldFullPath = join(vaultDir, oldRelPath);
  const newFullPath = join(vaultDir, newRelPath);
  await rename(oldFullPath, newFullPath);
}

/**
 * Extract slug from a record path.
 * e.g. "records/vocab-pronunciation/2026-02-08__weasel.md" → "weasel"
 * e.g. "records/vocab-pronunciation/weasel.md" → "weasel"
 * Uses __ as separator; takes the last part.
 */
export function extractSlugFromPath(recordPath: string): string {
  const filename = basename(recordPath, '.md');
  const parts = filename.split('__');
  return parts[parts.length - 1]!;
}
