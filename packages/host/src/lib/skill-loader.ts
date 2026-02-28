import matter from 'gray-matter';
import { join } from 'path';
import type { Skill, SkillMetadata } from '../types';

/**
 * SkillLoader implements progressive disclosure for loading skills:
 * - Level 1: Metadata only (id, name, description, inputs) - lightweight for listing
 * - Level 2: Full skill (metadata + LLM config + prompts) - complete for execution
 */
export class SkillLoader {
  private metadataCache: Map<string, SkillMetadata> = new Map();
  private fullSkillCache: Map<string, Skill> = new Map();

  /**
   * Level 1: Load metadata for all skills
   * Scans skills directory and extracts lightweight metadata from frontmatter
   */
  async loadAllMetadata(vaultDir: string): Promise<SkillMetadata[]> {
    const skillsDir = join(vaultDir, 'skills');

    // Scan for skill directories
    const entries = await Array.fromAsync(
      new Bun.Glob('*/SKILL.md').scan({ cwd: skillsDir })
    );

    const metadata: SkillMetadata[] = [];

    for (const entry of entries) {
      const skillPath = join(skillsDir, entry);
      const fileContent = await Bun.file(skillPath).text();

      // Parse only frontmatter (not the full markdown content)
      const { data } = matter(fileContent);

      // Extract Level 1 metadata fields
      const meta: SkillMetadata = {
        id: data.id,
        name: data.name,
        description: data.description,
        version: data.version,
        inputs: data.inputs || {},
      };

      // Validate required metadata fields
      if (!meta.id || !meta.name || !meta.description || !meta.version) {
        console.warn(`Skipping skill ${entry}: missing required metadata fields`);
        continue;
      }

      // Cache it
      this.metadataCache.set(meta.id, meta);
      metadata.push(meta);
    }

    return metadata;
  }

  /**
   * Level 2: Load full skill definition for execution
   * Parses complete frontmatter + extracts prompts from markdown
   */
  async loadFullSkill(skillId: string, vaultDir: string): Promise<Skill> {
    // In development, always reload to pick up changes
    // In production, use cache for performance
    const isDev = process.env.NODE_ENV !== 'production';

    if (!isDev) {
      // Check if already in cache (production only)
      const cached = this.fullSkillCache.get(skillId);
      if (cached) {
        return cached;
      }
    }

    // Convert skillId (dot notation) to directory name (dash notation)
    const dirname = skillId.replace(/\./g, '-');
    const skillPath = join(vaultDir, 'skills', dirname, 'SKILL.md');

    // Read the file
    const fileContent = await Bun.file(skillPath).text();

    // Parse frontmatter
    const { data, content } = matter(fileContent);

    // Extract System and User prompts from markdown
    const systemMatch = content.match(/# System\s+([\s\S]*?)(?=# User|$)/);
    const userMatch = content.match(/# User\s+([\s\S]*?)$/);

    if (!systemMatch || !userMatch) {
      throw new Error(
        `Invalid skill format: ${skillId}. Must contain # System and # User sections.`
      );
    }

    const skill: Skill = {
      // Level 1 fields
      id: data.id,
      name: data.name,
      description: data.description,
      version: data.version,
      inputs: data.inputs || {},
      // Level 2 fields
      tags: data.tags || [],
      llm: data.llm,
      secrets: data.secrets,
      prompt: {
        system: systemMatch[1]!.trim(),
        user: userMatch[1]!.trim(),
      },
      record: data.record,
      pre_tool_cmds: data.pre_tool_cmds || [],
      skillDir: skillPath.replace(/\/SKILL\.md$/, ''),
    };

    // Validate required fields
    if (!skill.id || !skill.name || !skill.version || !skill.llm || !skill.description) {
      throw new Error(
        `Invalid skill: ${skillId}. Missing required fields (id, name, description, version, llm).`
      );
    }

    // Cache the full skill
    this.fullSkillCache.set(skill.id, skill);

    return skill;
  }

  /**
   * Clear all caches (useful for refresh operations)
   */
  clearCache(): void {
    this.metadataCache.clear();
    this.fullSkillCache.clear();
  }

  /**
   * Clear only metadata cache (keeps full skill cache)
   */
  clearMetadataCache(): void {
    this.metadataCache.clear();
  }

  /**
   * Get cached metadata (if available)
   */
  getCachedMetadata(skillId: string): SkillMetadata | undefined {
    return this.metadataCache.get(skillId);
  }
}

// Singleton instance
export const skillLoader = new SkillLoader();
