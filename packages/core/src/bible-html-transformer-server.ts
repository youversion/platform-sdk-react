import { DOMParser } from 'linkedom';

import { createLinkedomAdapters } from './bible-html-adapters';
import {
  transformBibleHtml as transformBibleHtmlWithAdapters,
  type TransformedBibleHtml,
} from './bible-html-transformer';

/**
 * Transforms Bible HTML for server / edge environments using linkedom.
 *
 * Import from `@youversion/platform-core/server` to avoid bundling linkedom
 * in client-side builds.
 *
 * linkedom requires HTML to be wrapped in body tags for `doc.body.innerHTML`
 * to work correctly; the shared adapters handle that wrapping.
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
  return transformBibleHtmlWithAdapters(html, createLinkedomAdapters(DOMParser));
}
