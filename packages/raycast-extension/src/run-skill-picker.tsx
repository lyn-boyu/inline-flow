import { List, ActionPanel, Action, showToast, Toast, Detail, openCommandPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getSkills } from "./lib/skills";
import { getCurrentSkillIndex, setCurrentSkillIndex, setLastSkillId } from "./lib/state";
import { collectInput } from "./lib/input";
import { callHostRun } from "./lib/host";
import { removeFrontmatter } from "./lib/markdown";
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

export default function Command() {
  const [currentIndex, setLocalIndex] = useState<number | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [validationError, setValidationError] = useState<ValidationResult | null>(null);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [currentInput, setCurrentInput] = useState<{ selectionText?: string; clipboardText?: string; frontmostApp?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const loadedSkills = await getSkills();
      setSkills(loadedSkills);
      const index = await getCurrentSkillIndex();
      setLocalIndex(index);
    }
    loadData();
  }, []);

  async function runSkill(index: number) {
    setIsLoading(true);
    try {
      await setCurrentSkillIndex(index);
      const skill = skills[index];
      await setLastSkillId(skill.id);

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${skill.name}...`,
      });

      const input = await collectInput();

      // Validate input on client side
      const validation = validateInput(skill, input.selectionText, input.clipboardText);
      if (!validation.valid) {
        // If clipboard is available, show enhanced error UI instead of toast
        if (validation.canUseClipboard) {
          setValidationError(validation);
          setCurrentSkill(skill);
          setCurrentInput(input);
          setIsLoading(false);
          return;
        }

        // Otherwise show toast for simple errors
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
                  setLocalIndex(skills.findIndex(s => s.id === currentSkill.id));

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
                  setValidationError(null);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
            <Action
              title="Back to Picker"
              onAction={() => {
                setValidationError(null);
                setCurrentSkill(null);
                setCurrentInput(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
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
                  const skill = skills[currentIdx!];
                  const input = await collectInput();

                  // Validate input
                  const validation = validateInput(skill, input.selectionText, input.clipboardText);
                  if (!validation.valid) {
                    // Show enhanced error UI if clipboard available
                    if (validation.canUseClipboard) {
                      setValidationError(validation);
                      setCurrentSkill(skill);
                      setCurrentInput(input);
                      setIsLoading(false);
                      setResult(null);
                      return;
                    }

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

  return (
    <List isLoading={isLoading}>
      {skills.map((skill, index) => (
        <List.Item
          key={skill.id}
          title={skill.name}
          subtitle={skill.description}
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
