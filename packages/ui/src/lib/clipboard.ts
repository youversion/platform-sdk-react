export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
  } catch {
    // Clipboard failure must not interrupt dismissing the verse action popover.
  }
}
