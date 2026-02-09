import { Detail, ActionPanel, Action, showToast, Toast, LaunchProps, openCommandPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentSkillIndex, setLastSkillId } from "./lib/state";
import { collectInput } from "./lib/input";
import { callHostRun } from "./lib/host";
import { removeFrontmatter } from "./lib/markdown";
import { getSkills } from "./lib/skills";
import { validateInput, type ValidationResult } from "./lib/input-validator";
import type { RunResponse, Skill } from "./types";

/**
 * Format clipboard preview text
 * Truncates to maxLength and shows "length/total"
 */
function formatClipboardPreview(text: string, maxLength = 100): string {
  const totalLength = text.length;
  const truncated = text.slice(0, maxLength);
  const preview = truncated.length < totalLength ? `${truncated}...` : truncated;
  return `> Total Length: ${totalLength} \n\n Preview (${Math.min(maxLength, totalLength)}/${totalLength}):\n\n${preview}`;
}

export default function Command(props: LaunchProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ValidationResult | null>(null);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [currentInput, setCurrentInput] = useState<{ selectionText?: string; clipboardText?: string; frontmostApp?: string } | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  useEffect(() => {
    async function run() {
      try {
        // Load skills dynamically
        const skills = await getSkills();
        const currentIndex = await getCurrentSkillIndex();

        if (currentIndex === null || currentIndex >= skills.length) {
          // Open picker instead
          await showToast({
            style: Toast.Style.Failure,
            title: "No skill selected",
            message: "Use 'Run Skill (Picker)' to select a skill first",
          });
          setIsLoading(false);
          return;
        }

        const skill = skills[currentIndex];
        if (!skill) {
          throw new Error("Invalid skill index");
        }

        // Collect input
        const input = await collectInput();

        // Validate input on client side
        const validation = validateInput(skill, input.selectionText, input.clipboardText);
        if (!validation.valid) {
          // Store validation error and context for enhanced error UI
          setValidationError(validation);
          setCurrentSkill(skill);
          setCurrentInput(input);
          setIsLoading(false);
          return;
        }

        await showToast({
          style: Toast.Style.Animated,
          title: `Running ${skill.name}...`,
        });

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

  // Enhanced error UI with clipboard preview
  if (validationError && !validationError.valid && validationError.canUseClipboard && currentSkill && currentInput) {
    const clipboardPreview = validationError.clipboardText
      ? formatClipboardPreview(validationError.clipboardText)
      : "";

    return (
      <Detail
        markdown={`# ${validationError.error}\n\n---\n\n## Clipboard Content Available\n\n${clipboardPreview}`}
        actions={
          <ActionPanel>
            <Action
              title="Use Clipboard Content"
              onAction={async () => {
                setIsLoading(true);
                setValidationError(null);
                try {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: `Running ${currentSkill.name}...`,
                  });

                  // Use clipboard as selectionText
                  const response = await callHostRun({
                    skillId: currentSkill.id,
                    selectionText: validationError.clipboardText,
                    clipboardText: currentInput.clipboardText,
                    frontmostApp: currentInput.frontmostApp,
                    force: false,
                  });

                  await setLastSkillId(currentSkill.id);
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
              }}
            />
            <Action title="Open Preferences" onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
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
                const skills = await getSkills();
                const currentIndex = await getCurrentSkillIndex();
                const skill = skills[currentIndex!];
                const input = await collectInput();

                // Validate input
                const validation = validateInput(skill, input.selectionText, input.clipboardText);
                if (!validation.valid) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Input Error",
                    message: validation.error,
                  });
                  setIsLoading(false);
                  return;
                }

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
