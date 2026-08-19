/**
 * Extracts readable text from an HTML string, focusing on content spans.
 * This is needed because verses include markup for labels, footnotes, etc.
 *
 * @param html - The HTML content to extract text from
 * @returns Plain text with normalized whitespace
 */
export function extractTextFromHtml(html: string | null | undefined): string {
  if (!html) return '';

  const container = document.createElement('div');
  container.innerHTML = html;

  // Extract text from content spans and join with spaces
  const contentText = Array.from(container.querySelectorAll<HTMLElement>('span.content'))
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean)
    .join(' ');

  // Normalize whitespace
  return contentText.replace(/\s+/g, ' ').trim();
}
