import matter from 'gray-matter';
import { join } from 'path';
import type { Skill } from '../types';

/**
 * Parse a skill definition from a Markdown file
 * Format: YAML frontmatter + markdown body with # System and # User sections
 */
export async function parseSkill(vaultDir: string, skillId: string): Promise<Skill> {
  // Convert skillId (dot notation) to filename (dash notation)
  const filename = skillId.replace(/\./g, '-') + '.md';
  const skillPath = join(vaultDir, 'skills', filename);

  // Read the file
  const fileContent = await Bun.file(skillPath).text();

  // Parse frontmatter
  const { data, content } = matter(fileContent);

  // Extract System and User prompts from markdown
  const systemMatch = content.match(/# System\s+([\s\S]*?)(?=# User|$)/);
  const userMatch = content.match(/# User\s+([\s\S]*?)$/);

  if (!systemMatch || !userMatch) {
    throw new Error(`Invalid skill format: ${skillId}. Must contain # System and # User sections.`);
  }

  const skill: Skill = {
    id: data.id,
    name: data.name,
    description: data.description,
    version: data.version,
    tags: data.tags || [],
    inputs: data.inputs || {},
    llm: data.llm,
    secrets: data.secrets,
    prompt: {
      system: systemMatch[1]!.trim(),
      user: userMatch[1]!.trim(),
    },
  };

  // Validate required fields
  if (!skill.id || !skill.name || !skill.version || !skill.llm) {
    throw new Error(`Invalid skill: ${skillId}. Missing required fields (id, name, version, llm).`);
  }

  return skill;
}
