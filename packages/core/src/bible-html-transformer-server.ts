import { JSDOM } from 'jsdom';

import {
  transformBibleHtml as transformBibleHtmlWithAdapters,
  type TransformedBibleHtml,
} from './bible-html-transformer';

/**
 * Transforms Bible HTML for server environments using jsdom.
 *
 * Import from `@youversion/platform-core/server` to avoid bundling jsdom
 * in client-side builds.
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
  return transformBibleHtmlWithAdapters(html, {
    parseHtml: (h: string) =>
      new JSDOM(`<!DOCTYPE html><html><body>${h}</body></html>`).window.document,
    serializeHtml: (doc: Document) => doc.body.innerHTML,
  });
}
