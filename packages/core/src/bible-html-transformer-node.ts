import { transformBibleHtml, type TransformedBibleHtml } from './bible-html-transformer';

/**
 * Transforms Bible HTML for Node.js environments using linkedom.
 *
 * Import from `@youversion/platform-core/node` to avoid bundling linkedom
 * in client-side builds.
 *
 * linkedom requires HTML to be wrapped in body tags for `doc.body.innerHTML`
 * to work correctly, so this function handles that wrapping automatically.
 *
 * @param html - The raw Bible HTML from the YouVersion API
 * @returns The transformed HTML
 */
export function transformBibleHtmlForNode(html: string): TransformedBibleHtml {
  let DOMParser: new () => { parseFromString(html: string, type: string): Document };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ DOMParser } = require('linkedom') as { DOMParser: typeof DOMParser });
  } catch {
    throw new Error(
      'linkedom is required for transformBibleHtmlForNode. Install it with: npm install linkedom',
    );
  }

  return transformBibleHtml(html, {
    parseHtml: (h: string) =>
      new DOMParser().parseFromString(`<html><body>${h}</body></html>`, 'text/html'),
    serializeHtml: (doc: Document) => doc.body.innerHTML,
  });
}
