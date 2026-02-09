import { List, ActionPanel, Action, showToast, Toast, Detail, openCommandPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { SKILLS } from "./lib/skills";
import { getCurrentSkillIndex, setCurrentSkillIndex, setLastSkillId } from "./lib/state";
import { collectInput } from "./lib/input";
import { callHostRun } from "./lib/host";
import { removeFrontmatter } from "./lib/markdown";
import type { RunResponse } from "./types";

export default function Command() {
  const [currentIndex, setLocalIndex] = useState<number | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getCurrentSkillIndex().then(setLocalIndex);
  }, []);

  async function runSkill(index: number) {
    setIsLoading(true);
    try {
      await setCurrentSkillIndex(index);
      const skill = SKILLS[index];
      await setLastSkillId(skill.id);

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${skill.name}...`,
      });

      const input = await collectInput();
      const response = await callHostRun({
        skillId: skill.id,
        ...input,
        force: false,
      });

      setResult(response);
      setLocalIndex(index);

      await showToast({
        style: Toast.Style.Success,
        title: "Done",
        message: response.cached ? "Used cached result" : "Generated new result",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    return (
      <Detail
        markdown={removeFrontmatter(result.content)}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Cached" text={result.cached ? "Yes" : "No"} />
            <Detail.Metadata.Label title="File" text={result.finalPath} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Back to Picker"
              onAction={() => setResult(null)}
            />
            <Action
              title="Re-run (Force)"
              onAction={async () => {
                setIsLoading(true);
                try {
                  const currentIdx = await getCurrentSkillIndex();
                  const skill = SKILLS[currentIdx!];
                  const input = await collectInput();
                  const response = await callHostRun({
                    skillId: skill.id,
                    ...input,
                    force: true,
                  });
                  setResult(response);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Re-run complete",
                  });
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : "Unknown error";
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Error",
                    message: errorMessage,
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
            <Action.CopyToClipboard title="Copy Content" content={result.content} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {SKILLS.map((skill, index) => (
        <List.Item
          key={skill.id}
          title={skill.name}
          accessories={[{ text: currentIndex === index ? "✓" : "" }]}
          actions={
            <ActionPanel>
              <Action title="Run Skill" onAction={() => runSkill(index)} />
              <Action title="Open Preferences" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
