import type { Context } from 'hono';
import type { RunRequest, RunResponse, RecordMetadata } from '../types';
import { skillLoader } from '../lib/skill-loader';
import { resolvePrimaryInput } from '../lib/input-resolver';
import { renderTemplate } from '../lib/template';
import { computeCacheKey, loadCacheIndex, saveCacheIndex, getCachedRecord, updateCacheIndex } from '../lib/cache';
import { ensureVaultDirs, generateRecordPath, writeRecord, computeTargetPath, renameRecord, extractSlugFromPath } from '../lib/vault';
import { callLLM } from '../lib/llm-client';
import { join } from 'path';
import { unlink } from 'fs/promises';

/**
 * Handle POST /api/run requests
 */
export async function runHandler(c: Context) {
  const vaultDir = process.env.VAULT_DIR || '~/Documents/InlineFlow';
  const expandedVaultDir = vaultDir.replace('~', process.env.HOME || '');

  try {
    // Parse request body
    const body: RunRequest = await c.req.json();
    const { skillId, selectionText, clipboardText, frontmostApp, force } = body;

    // Load full skill definition (Level 2 - triggered execution)
    const skill = await skillLoader.loadFullSkill(skillId, expandedVaultDir);

    // Resolve primary input
    const { primaryInput, error } = resolvePrimaryInput(skill, selectionText, clipboardText);

    if (error || !primaryInput) {
      return c.json({ ok: false, error: error || 'No valid input' }, 400);
    }

    // Compute cache key
    const cacheKey = computeCacheKey(skill.id, skill.version, primaryInput);

    // Load cache index (per-skill file)
    const cacheIndex = await loadCacheIndex(expandedVaultDir, skill.id);

    // Check cache (if force=false)
    if (!force) {
      const cachedContent = await getCachedRecord(expandedVaultDir, cacheKey, cacheIndex);
      if (cachedContent) {
        const entry = cacheIndex.get(cacheKey)!;
        let finalPath = entry.recordPath;

        // LRU rename: if lruRename: true, rename file to today's date prefix if needed
        if (skill.record?.lruRename && skill.record?.filename) {
          const slug = extractSlugFromPath(entry.recordPath);
          const todayPath = computeTargetPath(skill.id, skill.record.filename, slug);
          if (todayPath !== entry.recordPath) {
            await renameRecord(expandedVaultDir, entry.recordPath, todayPath);
            updateCacheIndex(cacheIndex, cacheKey, todayPath, skill.id, skill.version);
            await saveCacheIndex(expandedVaultDir, cacheIndex, skill.id);
            finalPath = todayPath;
          }
        }

        const response: RunResponse = {
          ok: true,
          cached: true,
          finalPath,
          content: cachedContent,
        };
        return c.json(response);
      }
    }

    // Ensure vault directories exist
    await ensureVaultDirs(expandedVaultDir, skill.id);

    // Render templates
    const systemPrompt = renderTemplate(skill.prompt.system, {
      selectionText: primaryInput,
      clipboardText,
      frontmostApp,
    });

    const userPrompt = renderTemplate(skill.prompt.user, {
      selectionText: primaryInput,
      clipboardText,
      frontmostApp,
    });

    // Call LLM
    const llmResponse = await callLLM(skill, systemPrompt, userPrompt);

    // Generate record path
    const recordPath = await generateRecordPath(expandedVaultDir, skill, primaryInput);

    // Create metadata
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');

    const metadata: RecordMetadata = {
      createdAt: timestamp,
      skillId: skill.id,
      skillVersion: skill.version,
      tags: skill.tags,
      source: {
        ...(frontmostApp ? { frontmostApp } : {}),
      },
      input: {
        selectionText: primaryInput,
      },
      cachedFrom: '',
    };

    // Clean up old file if lruRename is on and the path changed (e.g. new date prefix)
    if (skill.record?.lruRename) {
      const existingEntry = cacheIndex.get(cacheKey);
      if (existingEntry && existingEntry.recordPath !== recordPath) {
        const oldFullPath = join(expandedVaultDir, existingEntry.recordPath);
        if (await Bun.file(oldFullPath).exists()) {
          await unlink(oldFullPath);
        }
      }
    }

    // Write record
    await writeRecord(expandedVaultDir, recordPath, metadata, llmResponse);

    // Update cache index
    updateCacheIndex(cacheIndex, cacheKey, recordPath, skill.id, skill.version);
    await saveCacheIndex(expandedVaultDir, cacheIndex, skill.id);

    // Read the written file to get the full content with frontmatter
    const fullContent = await Bun.file(expandedVaultDir + '/' + recordPath).text();

    const response: RunResponse = {
      ok: true,
      cached: false,
      finalPath: recordPath,
      content: fullContent,
    };

    return c.json(response);

  } catch (error) {
    console.error('Error in runHandler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ ok: false, error: errorMessage }, 500);
  }
}
