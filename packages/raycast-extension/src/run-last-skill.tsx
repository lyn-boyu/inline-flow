import { Detail, ActionPanel, Action, showToast, Toast, LaunchProps, openCommandPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentSkillIndex, setLastSkillId } from "./lib/state";
import { collectInput } from "./lib/input";
import { callHostRun } from "./lib/host";
import { removeFrontmatter } from "./lib/markdown";
import { SKILLS } from "./lib/skills";
import type { RunResponse } from "./types";

export default function Command(props: LaunchProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const currentIndex = await getCurrentSkillIndex();

        if (currentIndex === null) {
          // Open picker instead
          await showToast({
            style: Toast.Style.Failure,
            title: "No skill selected",
            message: "Use 'Run Skill (Picker)' to select a skill first",
          });
          setIsLoading(false);
          return;
        }

        const skill = SKILLS[currentIndex];
        if (!skill) {
          throw new Error("Invalid skill index");
        }

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

        await setLastSkillId(skill.id);
        setResult(response);

        await showToast({
          style: Toast.Style.Success,
          title: "Done",
          message: response.cached ? "Used cached result" : "Generated new result",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    run();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Running skill..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (!result) {
    return <Detail markdown="No result" />;
  }

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
            title="Re-run (Force)"
            onAction={async () => {
              setIsLoading(true);
              try {
                const currentIndex = await getCurrentSkillIndex();
                const skill = SKILLS[currentIndex!];
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
