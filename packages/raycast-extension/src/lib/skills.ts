import { callHostApi } from "./host";
import type { Skill } from "../types";

let skillsCache: Skill[] | null = null;

/**
 * Load skills from Host API
 * @param refresh - If true, force refresh from API and clear cache
 */
export async function loadSkills(refresh = false): Promise<Skill[]> {
  if (!refresh && skillsCache) {
    return skillsCache;
  }

  const response = await callHostApi<{ ok: boolean; skills: Skill[] }>(
    `/api/skills${refresh ? "?refresh=true" : ""}`
  );

  skillsCache = response.skills;
  return skillsCache;
}

/**
 * Get cached skills or load from API
 */
export async function getSkills(): Promise<Skill[]> {
  return skillsCache || loadSkills();
}

/**
 * Clear local skills cache
 */
export function clearSkillsCache(): void {
  skillsCache = null;
}
