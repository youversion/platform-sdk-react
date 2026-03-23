import {
  transformBibleHtml as transformBibleHtmlWithAdapters,
  type TransformedBibleHtml,
} from './bible-html-transformer';

/**
 * Transforms Bible HTML for server environments using linkedom.
 *
 * Import from `@youversion/platform-core/server` to avoid bundling linkedom
 * in client-side builds.
 *
 * linkedom requires HTML to be wrapped in body tags for `doc.body.innerHTML`
 * to work correctly, so this function handles that wrapping automatically.
 *
 * @param html - The raw Bible HTML from the YouVersion API
 * @returns The transformed HTML
 *
 * @example
 * ```ts
 * import { transformBibleHtml } from '@youversion/platform-core/server';
 *
 * const result = transformBibleHtml(rawHtml);
 * console.log(result.html); // Clean HTML with self-contained footnote anchors
 * ```
 */
export function transformBibleHtml(html: string): TransformedBibleHtml {
  let DOMParser: new () => { parseFromString(html: string, type: string): Document };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ DOMParser } = require('linkedom') as { DOMParser: typeof DOMParser });
  } catch {
    throw new Error(
      'linkedom is required for transformBibleHtml in server environments. Install it with: npm install linkedom',
    );
  }

  return transformBibleHtmlWithAdapters(html, {
    parseHtml: (h: string) =>
      new DOMParser().parseFromString(`<html><body>${h}</body></html>`, 'text/html'),
    serializeHtml: (doc: Document) => doc.body.innerHTML,
  });
}
