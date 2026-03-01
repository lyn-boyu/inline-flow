import type { Context } from 'hono';
import type { RunRequest, RunResponse, RecordMetadata } from '../types';
import { skillLoader } from '../lib/skill-loader';
import { resolvePrimaryInput } from '../lib/input-resolver';
import { renderTemplate } from '../lib/template';
import { computeCacheKey, loadCacheIndex, saveCacheIndex, getCachedRecord, updateCacheIndex } from '../lib/cache';
import { ensureVaultDirs, generateRecordPath, writeRecord, computeTargetPath, renameRecord, extractSlugFromPath } from '../lib/vault';
import { callLLM } from '../lib/llm-client';
import { estimateCost } from '../lib/pricing';
import { runPreToolCmds } from '../lib/pre-tool-executor';
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

    // Execute pre-tool commands if configured
    let preToolOutput = '';
    if (skill.pre_tool_cmds && skill.pre_tool_cmds.length > 0 && skill.skillDir) {
      try {
        preToolOutput = await runPreToolCmds(skill.skillDir, skill.pre_tool_cmds, {
          selectionText: primaryInput,
          clipboardText,
          frontmostApp,
        });
      } catch (error) {
        console.error('[pre_tool_cmds] Execution failed:', error);
        return c.json({
          ok: false,
          error: `Pre-tool script execution failed: ${error instanceof Error ? error.message : String(error)}`
        }, 500);
      }
    }

    // Render templates
    const baseSystemPrompt = renderTemplate(skill.prompt.system, {
      selectionText: primaryInput,
      clipboardText,
      frontmostApp,
    });

    // Inject pre-tool output into system prompt
    const systemPrompt = preToolOutput
      ? `${baseSystemPrompt}\n\n${preToolOutput}`
      : baseSystemPrompt;

    const userPrompt = renderTemplate(skill.prompt.user, {
      selectionText: primaryInput,
      clipboardText,
      frontmostApp,
    });

    // Call LLM
    const llmResponse = await callLLM(skill, systemPrompt, userPrompt);

    // Calculate cost
    const estimatedCost = estimateCost(
      skill.llm.provider,
      skill.llm.model,
      llmResponse.usage
    );

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

      // LLM configuration
      llm: {
        provider: skill.llm.provider,
        model: skill.llm.model,
        temperature: skill.llm.temperature,
      },

      // Usage metrics
      usage: {
        durationMs: llmResponse.durationMs,
        promptTokens: llmResponse.usage.promptTokens,
        completionTokens: llmResponse.usage.completionTokens,
        totalTokens: llmResponse.usage.totalTokens,
        estimatedCost,
      },

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
    await writeRecord(expandedVaultDir, recordPath, metadata, llmResponse.content);

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
