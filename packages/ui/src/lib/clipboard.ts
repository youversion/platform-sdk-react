/** Resolves with whether the text was copied, including when clipboard access is denied or unavailable. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
