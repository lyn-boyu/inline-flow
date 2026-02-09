import type { Context } from 'hono';
import type { RunRequest, RunResponse, RecordMetadata } from '../types';
import { parseSkill } from '../lib/skill-parser';
import { resolvePrimaryInput } from '../lib/input-resolver';
import { renderTemplate } from '../lib/template';
import { computeCacheKey, loadCacheIndex, saveCacheIndex, getCachedRecord, updateCacheIndex } from '../lib/cache';
import { ensureVaultDirs, generateRecordPath, writeRecord } from '../lib/vault';
import { callLLM } from '../lib/llm-client';

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

    // Load skill definition
    const skill = await parseSkill(expandedVaultDir, skillId);

    // Resolve primary input
    const { primaryInput, error } = resolvePrimaryInput(skill, selectionText, clipboardText);

    if (error || !primaryInput) {
      return c.json({ ok: false, error: error || 'No valid input' }, 400);
    }

    // Compute cache key
    const cacheKey = computeCacheKey(skill.id, skill.version, primaryInput);

    // Load cache index
    const cacheIndex = await loadCacheIndex(expandedVaultDir);

    // Check cache (if force=false)
    if (!force) {
      const cachedContent = await getCachedRecord(expandedVaultDir, cacheKey, cacheIndex);
      if (cachedContent) {
        const entry = cacheIndex.get(cacheKey)!;
        const response: RunResponse = {
          ok: true,
          cached: true,
          finalPath: entry.recordPath,
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
        frontmostApp,
      },
      input: {
        selectionText: primaryInput,
      },
      cachedFrom: '',
    };

    // Write record
    await writeRecord(expandedVaultDir, recordPath, metadata, llmResponse);

    // Update cache index
    updateCacheIndex(cacheIndex, cacheKey, recordPath, skill.id, skill.version);
    await saveCacheIndex(expandedVaultDir, cacheIndex);

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
