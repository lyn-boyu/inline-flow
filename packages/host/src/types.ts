// Core type definitions for Inline Flow Host

export interface Skill {
  id: string;
  name: string;
  version: string;
  tags: string[];
  inputs: {
    selectionText?: {
      required?: boolean;
      optional?: boolean;
      allowAsPrimary?: boolean;
    };
    clipboardText?: {
      required?: boolean;
      optional?: boolean;
      allowAsPrimary?: boolean;
    };
  };
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
