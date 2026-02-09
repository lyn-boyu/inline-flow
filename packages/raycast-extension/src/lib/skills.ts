import type { Skill } from "../types";

export const SKILLS: Skill[] = [
  { id: "vocab.pronunciation", name: "Vocab · Pronunciation" },
  { id: "grammar.rewrite", name: "Grammar · Rewrite" },
  { id: "sentence.polish", name: "Sentence · Polish" },
] as const;
