import type { Context } from 'hono';
import { skillLoader } from '../lib/skill-loader';

/**
 * Handle GET /api/skills requests
 * Returns lightweight metadata for all skills (Level 1)
 * Supports ?refresh=true to clear cache and reload
 */
export async function skillsHandler(c: Context) {
  const vaultDir = process.env.VAULT_DIR || '~/Documents/InlineFlow';
  const expandedVaultDir = vaultDir.replace('~', process.env.HOME || '');

  try {
    // Check for refresh parameter
    const refresh = c.req.query('refresh') === 'true';

    if (refresh) {
      // Clear metadata cache to force reload
      skillLoader.clearMetadataCache();
    }

    // Load all skill metadata (Level 1 - lightweight)
    const skills = await skillLoader.loadAllMetadata(expandedVaultDir);

    return c.json({
      ok: true,
      skills,
    });

  } catch (error) {
    console.error('Error in skillsHandler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ ok: false, error: errorMessage }, 500);
  }
}
