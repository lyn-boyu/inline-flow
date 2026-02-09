import { getSelectedText, Clipboard, getFrontmostApplication } from "@raycast/api";

export async function collectInput() {
  const [selectionText, clipboardText, frontmostApp] = await Promise.all([
    getSelectedText().catch(() => ""),
    Clipboard.readText().catch(() => ""),
    getFrontmostApplication().catch(() => ({ name: "" })),
  ]);

  return {
    selectionText: selectionText || undefined,
    clipboardText: clipboardText || undefined,
    frontmostApp: frontmostApp.name || undefined,
  };
}
