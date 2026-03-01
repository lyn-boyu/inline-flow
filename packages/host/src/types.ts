// Core type definitions for Inline Flow Host

// Pre-tool command configuration
export interface PreToolCmd {
  script: string; // Path relative to skill directory
  input_map: Record<string, string>; // Parameter mapping: { paramName: "{{inputField}}" }
  optional?: boolean; // If true, script failure doesn't abort request (default: false)
}

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
    provider: 'openai' | 'anthropic' | 'google' | 'azure-openai' | 'cohere' | 'openrouter';
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
  record?: {
    filename?: string;    // Template: supports {date}, {timestamp}, {slug}. Default: "{timestamp}__{slug}"
    overwrite?: boolean;  // If true, overwrite same-named file. Default: false (append __2, __3)
    lruRename?: boolean;  // If true, rename file to today's date prefix on each access ("touch on access")
  };
  pre_tool_cmds?: PreToolCmd[]; // Scripts to execute before LLM call
  skillDir?: string; // Absolute path to skill directory (set by loader)
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
