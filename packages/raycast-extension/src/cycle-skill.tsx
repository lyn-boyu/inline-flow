import { showHUD } from "@raycast/api";
import { getCurrentSkillIndex, setCurrentSkillIndex } from "./lib/state";
import { SKILLS } from "./lib/skills";

export default async function Command() {
  const currentIndex = await getCurrentSkillIndex();
  const nextIndex = currentIndex !== null ? (currentIndex + 1) % SKILLS.length : 0;

  await setCurrentSkillIndex(nextIndex);
  const skill = SKILLS[nextIndex];

  await showHUD(`Selected: ${skill.name} (${nextIndex + 1}/${SKILLS.length})`);
}
