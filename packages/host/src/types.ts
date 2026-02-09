// Core type definitions for Inline Flow Host

// Level 1: Lightweight metadata for skill selection (used by GET /api/skills)
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  inputs: {
    selectionText?: {
      required?: boolean;
    };
    clipboardText?: {
      required?: boolean;
    };
  };
}

// Level 2: Complete skill definition (used by POST /api/run)
export interface Skill extends SkillMetadata {
  tags: string[];
  llm: {
    provider: 'openai' | 'anthropic';
    model: string;
    temperature: number;
  };
  secrets: {
    apiKeyEnv: string;
  };
  prompt: {
    system: string;
    user: string;
  };
}

export interface RunRequest {
  skillId: string;
  selectionText?: string;
  clipboardText?: string;
  frontmostApp?: string;
  force: boolean;
}

export interface RunResponse {
  ok: boolean;
  cached: boolean;
  finalPath: string;
  content: string;
}

export interface CacheEntry {
  recordPath: string;
  skillId: string;
  skillVersion: string;
  updatedAt: string;
}

export interface RecordMetadata {
  createdAt: string;
  skillId: string;
  skillVersion: string;
  tags: string[];
  source: {
    frontmostApp?: string;
  };
  input: {
    selectionText?: string;
  };
  cachedFrom: string;
}
