export interface Skill {
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
