import { join } from 'path';
import { mkdir } from 'fs/promises';
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
 * Generate a unique record path
 * Format: records/<skill-folder>/<timestamp>__<slug>.md
 * If file exists, add suffix __2, __3, etc.
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

  let filename = `${timestamp}__${slug}.md`;
  let fullPath = join(vaultDir, 'records', skillFolder, filename);
  let counter = 2;

  // Check if file exists and add suffix if needed
  while (await Bun.file(fullPath).exists()) {
    filename = `${timestamp}__${slug}__${counter}.md`;
    fullPath = join(vaultDir, 'records', skillFolder, filename);
    counter++;
  }

  return join('records', skillFolder, filename);
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
