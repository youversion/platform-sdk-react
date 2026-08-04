import type { TransformBibleHtmlOptions } from './bible-html-transformer';

// linkedom's typed return is a union of document kinds that is not assignable
// to the lib DOM `Document`. Call sites cast the parse result.
type DomParserInstance = {
  parseFromString(html: string, type: string): unknown;
};
type DomParserConstructor = new () => DomParserInstance;

/**
 * Native browser / DOMParser-global adapters.
 */
export function createDomParserAdapters(): TransformBibleHtmlOptions {
  if (typeof globalThis.DOMParser === 'undefined') {
    throw new Error('DOMParser is required to transform Bible HTML in browser environments');
  }

  return {
    parseHtml: (h) =>
      new globalThis.DOMParser().parseFromString(h, 'text/html') as unknown as Document,
    serializeHtml: (doc) => doc.body.innerHTML,
  };
}

/**
 * linkedom adapters. Wrap fragment HTML in `<body>` so `doc.body.innerHTML`
 * serializes correctly.
 */
export function createLinkedomAdapters(
  DOMParserCtor: DomParserConstructor,
): TransformBibleHtmlOptions {
  return {
    parseHtml: (h) =>
      new DOMParserCtor().parseFromString(
        `<html><body>${h}</body></html>`,
        'text/html',
      ) as Document,
    serializeHtml: (doc) => doc.body.innerHTML,
  };
}

/**
 * Runtime detection for `getPassage` auto-transform:
 * native `DOMParser` when present, otherwise dynamic `linkedom`.
 */
export async function resolveHtmlAdapters(): Promise<TransformBibleHtmlOptions> {
  if (typeof globalThis.DOMParser !== 'undefined') {
    return createDomParserAdapters();
  }

  let linkedom: { DOMParser: DomParserConstructor };
  try {
    linkedom = await import('linkedom');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      'Server-side HTML transformation requires "linkedom". ' +
        'Install it as a dependency or pass transform: false to skip transformation. ' +
        `Original error: ${detail}`,
      { cause: err },
    );
  }

  return createLinkedomAdapters(linkedom.DOMParser);
}
