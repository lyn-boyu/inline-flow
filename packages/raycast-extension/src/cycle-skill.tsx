import { showHUD } from "@raycast/api";
import { getCurrentSkillIndex, setCurrentSkillIndex } from "./lib/state";
import { getSkills } from "./lib/skills";

export default async function Command() {
  const skills = await getSkills();
  const currentIndex = await getCurrentSkillIndex();
  const nextIndex = currentIndex !== null ? (currentIndex + 1) % skills.length : 0;

  await setCurrentSkillIndex(nextIndex);
  const skill = skills[nextIndex];

  await showHUD(`Selected: ${skill.name} (${nextIndex + 1}/${skills.length})`);
}
