export interface Skill {
  id: string;
  name: string;
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
