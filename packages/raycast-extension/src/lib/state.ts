import { LocalStorage } from "@raycast/api";

export async function getCurrentSkillIndex(): Promise<number | null> {
  const index = await LocalStorage.getItem<string>("currentSkillIndex");
  return index ? parseInt(index, 10) : null;
}

export async function setCurrentSkillIndex(index: number): Promise<void> {
  await LocalStorage.setItem("currentSkillIndex", index.toString());
}

export async function getLastSkillId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>("lastSkillId")) ?? null;
}

export async function setLastSkillId(skillId: string): Promise<void> {
  await LocalStorage.setItem("lastSkillId", skillId);
}
