/**
 * Splits a passage HTML into an array of verse HTML strings.
 * Expects markers like: <span class="yv-v" v="N"></span><span class="yv-vlbl">N</span>
 */
export function extractVersesFromHTML(
  html: string | null | undefined,
): { verse: number; html: string }[] {
  if (!html) return [];

  const results: { verse: number; html: string }[] = [];
  const pattern = /<span class="yv-v" v="(\d+)"><\/span><span class="yv-vlbl">\d+<\/span>/g;

  let execResult: RegExpExecArray | null;
  const indices: { verse: number; index: number }[] = [];

  while ((execResult = pattern.exec(html)) !== null) {
    const verseNumString = execResult[1]!;
    indices.push({ verse: parseInt(verseNumString, 10), index: execResult.index });
  }

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i]!;
    const next = indices[i + 1];
    const start = current.index;
    const end = next ? next.index : html.length;
    const slice = html.slice(start, end).trim();
    results.push({ verse: current.verse, html: slice });
  }

  return results;
}
