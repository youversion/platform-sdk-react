const NON_BREAKING_SPACE = '\u00A0';

const FOOTNOTE_KEY_ATTR = 'data-footnote-key';

const NEEDS_SPACE_BEFORE = /^[^\s.,;:!?)}\]'"»›]/;

const ALLOWED_TAGS = new Set([
  'DIV',
  'P',
  'SPAN',
  'SUP',
  'SUB',
  'EM',
  'STRONG',
  'I',
  'B',
  'SMALL',
  'BR',
  'SECTION',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TD',
  'TH',
]);

const DROP_ENTIRELY_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'TEMPLATE',
  'LINK',
  'META',
  'BASE',
  'NOSCRIPT',
]);

const ALLOWED_ATTRS = new Set(['class', 'v', 'colspan', 'rowspan', 'dir']);

function sanitizeBibleHtmlDocument(doc: Document): void {
  const root = doc.body ?? doc.documentElement;
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const tag = el.tagName;

    if (DROP_ENTIRELY_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (!ALLOWED_ATTRS.has(name) && !name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

/**
 * Options for transforming Bible HTML. Requires DOM adapter functions
 * to parse and serialize HTML, making the transformer runtime-agnostic.
 */
export type TransformBibleHtmlOptions = {
  /** Parses an HTML string into a DOM Document */
  parseHtml: (html: string) => Document;
  /** Serializes a Document back to an HTML string */
  serializeHtml: (doc: Document) => string;
};

/**
 * The result of transforming Bible HTML.
 *
 * The returned HTML is self-contained — footnote data is embedded as attributes:
 * - `data-verse-footnote="KEY"` marks the footnote position
 * - `data-verse-footnote-content="HTML"` contains the footnote's inner HTML
 *
 * Consumers can access verse context by walking up from a footnote anchor
 * to `.closest('.yv-v[v]')`.
 */
export type TransformedBibleHtml = {
  /** The transformed HTML with footnotes replaced by marker elements */
  html: string;
};

function wrapVerseContent(doc: Document): void {
  function wrapParagraphContent(doc: Document, paragraph: Element, verseNum: string): void {
    const children = Array.from(paragraph.childNodes);
    if (children.length === 0) return;

    const wrapper = doc.createElement('span');
    wrapper.className = 'yv-v';
    wrapper.setAttribute('v', verseNum);

    const firstChild = children[0];
    if (firstChild) {
      paragraph.insertBefore(wrapper, firstChild);
    }
    children.forEach((child) => {
      wrapper.appendChild(child);
    });
  }

  function wrapParagraphsUntilBoundary(
    doc: Document,
    verseNum: string,
    startParagraph: Element | null,
    endParagraph?: Element | null,
  ): void {
    if (!startParagraph) return;

    let currentP: Element | null = startParagraph.nextElementSibling;

    while (currentP && currentP !== endParagraph) {
      const isHeading =
        currentP.classList.contains('yv-h') ||
        currentP.matches('.s1, .s2, .s3, .s4, .ms, .ms1, .ms2, .ms3, .ms4, .mr, .sp, .sr, .qa, .r');
      if (isHeading) {
        currentP = currentP.nextElementSibling;
        continue;
      }

      if (currentP.querySelector('.yv-v[v]')) break;

      if (currentP.classList.contains('p') || currentP.tagName === 'P') {
        wrapParagraphContent(doc, currentP, verseNum);
      }

      currentP = currentP.nextElementSibling;
    }
  }

  function handleParagraphWrapping(
    doc: Document,
    currentParagraph: Element | null,
    nextParagraph: Element | null,
    verseNum: string,
  ): void {
    if (!currentParagraph) return;

    if (!nextParagraph) {
      wrapParagraphsUntilBoundary(doc, verseNum, currentParagraph);
      return;
    }

    if (currentParagraph !== nextParagraph) {
      wrapParagraphsUntilBoundary(doc, verseNum, currentParagraph, nextParagraph);
    }
  }

  function processVerseMarker(marker: Element, index: number, markers: Element[]): void {
    const verseNum = marker.getAttribute('v');
    if (!verseNum) return;

    const nextMarker = markers[index + 1];

    const nodesToWrap = collectNodesBetweenMarkers(marker, nextMarker);
    if (nodesToWrap.length === 0) return;

    const currentParagraph = marker.closest('.p, p, div.p');
    const nextParagraph = nextMarker?.closest('.p, p, div.p') || null;
    const doc = marker.ownerDocument;

    wrapNodesInVerse(marker, verseNum, nodesToWrap);
    handleParagraphWrapping(doc, currentParagraph, nextParagraph, verseNum);
  }

  function wrapNodesInVerse(marker: Element, verseNum: string, nodes: Node[]): void {
    const wrapper = marker.ownerDocument.createElement('span');
    wrapper.className = 'yv-v';
    wrapper.setAttribute('v', verseNum);

    const firstNode = nodes[0];
    if (firstNode) {
      marker.parentNode?.insertBefore(wrapper, firstNode);
    }

    nodes.forEach((node) => {
      wrapper.appendChild(node);
    });
    marker.remove();
  }

  function shouldStopCollecting(node: Node, endMarker: Element | undefined): boolean {
    if (node === endMarker) return true;
    if (endMarker && node.nodeType === 1 && (node as Element).contains(endMarker)) return true;
    return false;
  }

  function shouldSkipNode(node: Node): boolean {
    return node.nodeType === 1 && (node as Element).classList.contains('yv-h');
  }

  function collectNodesBetweenMarkers(
    startMarker: Element,
    endMarker: Element | undefined,
  ): Node[] {
    const nodes: Node[] = [];
    let current: Node | null = startMarker.nextSibling;

    while (current && !shouldStopCollecting(current, endMarker)) {
      if (shouldSkipNode(current)) {
        current = current.nextSibling;
        continue;
      }
      nodes.push(current);
      current = current.nextSibling;
    }

    return nodes;
  }

  const verseMarkers = Array.from(doc.querySelectorAll('.yv-v[v]'));
  verseMarkers.forEach(processVerseMarker);
}

function assignFootnoteKeys(doc: Document): void {
  let introIdx = 0;
  doc.querySelectorAll('.yv-n.f').forEach((fn) => {
    const verseNum = fn.closest('.yv-v[v]')?.getAttribute('v');
    fn.setAttribute(FOOTNOTE_KEY_ATTR, verseNum ?? `intro-${introIdx++}`);
  });
}

function replaceFootnotesWithAnchors(doc: Document, footnotes: Element[]): void {
  for (const fn of footnotes) {
    const key = fn.getAttribute(FOOTNOTE_KEY_ATTR);
    if (!key) continue;

    const prev = fn.previousSibling;
    const next = fn.nextSibling;

    const prevText = prev?.textContent ?? '';
    const nextText = next?.textContent ?? '';

    const prevNeedsSpace = prevText.length > 0 && !/\s$/.test(prevText);
    const nextNeedsSpace = nextText.length > 0 && NEEDS_SPACE_BEFORE.test(nextText);

    if (prevNeedsSpace && nextNeedsSpace && fn.parentNode) {
      fn.parentNode.insertBefore(doc.createTextNode(' '), fn);
    }

    const anchor = doc.createElement('span');
    anchor.setAttribute('data-verse-footnote', key);
    anchor.setAttribute('data-verse-footnote-content', fn.innerHTML);
    fn.replaceWith(anchor);
  }
}

function addNbspToVerseLabels(doc: Document): void {
  doc.querySelectorAll('.yv-vlbl').forEach((label) => {
    const text = label.textContent || '';
    if (!text.endsWith(NON_BREAKING_SPACE)) {
      label.textContent = text + NON_BREAKING_SPACE;
    }
  });
}

function fixIrregularTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    let maxColumns = 0;
    rows.forEach((row) => {
      let count = 0;
      row.querySelectorAll('td, th').forEach((cell) => {
        count += parseInt(cell.getAttribute('colspan') || '1', 10);
      });
      maxColumns = Math.max(maxColumns, count);
    });

    if (maxColumns > 1) {
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 1) {
          const existing = parseInt(cells[0]!.getAttribute('colspan') || '1', 10);
          if (existing < maxColumns) {
            cells[0]!.setAttribute('colspan', maxColumns.toString());
          }
        }
      });
    }
  });
}

/**
 * Transforms Bible HTML by cleaning up verse structure, extracting footnotes,
 * and replacing them with self-contained anchor elements.
 *
 * Footnote data is embedded directly in the HTML via attributes:
 * - `data-verse-footnote="KEY"` — the footnote key (verse number or `intro-N`)
 * - `data-verse-footnote-content="HTML"` — the footnote's inner HTML content
 *
 * Verse context is available by walking up from a footnote anchor:
 * `anchor.closest('.yv-v[v]')` returns the verse wrapper (null for intro footnotes).
 *
 * @param html - The raw Bible HTML from the YouVersion API
 * @param options - DOM adapter options for parsing and serializing HTML
 * @returns The transformed HTML
 *
 * @example
 * ```ts
 * import { transformBibleHtml } from '@youversion/platform-core';
 *
 * const result = transformBibleHtml(rawHtml, {
 *   parseHtml: (html) => new DOMParser().parseFromString(html, 'text/html'),
 *   serializeHtml: (doc) => doc.body.innerHTML,
 * });
 *
 * console.log(result.html); // Clean HTML with self-contained footnote anchors
 * ```
 */
export function transformBibleHtml(
  html: string,
  options: TransformBibleHtmlOptions,
): TransformedBibleHtml {
  const doc = options.parseHtml(html);

  sanitizeBibleHtmlDocument(doc);
  wrapVerseContent(doc);
  assignFootnoteKeys(doc);

  const footnotes = Array.from(doc.querySelectorAll('.yv-n.f'));
  replaceFootnotesWithAnchors(doc, footnotes);

  addNbspToVerseLabels(doc);
  fixIrregularTables(doc);

  const transformedHtml = options.serializeHtml(doc);
  return { html: transformedHtml };
}

/**
 * Transforms Bible HTML for browser environments using the native DOMParser API.
 *
 * @param html - The raw Bible HTML from the YouVersion API
 * @returns The transformed HTML
 */
export function transformBibleHtmlForBrowser(html: string): TransformedBibleHtml {
  if (typeof globalThis.DOMParser === 'undefined') {
    throw new Error('DOMParser is required to transform Bible HTML in browser environments');
  }

  return transformBibleHtml(html, {
    parseHtml: (h) => new DOMParser().parseFromString(h, 'text/html'),
    serializeHtml: (doc) => doc.body.innerHTML,
  });
}

/**
 * Transforms Bible HTML for Node.js environments using linkedom.
 *
 * linkedom requires HTML to be wrapped in body tags for `doc.body.innerHTML`
 * to work correctly, so this function handles that wrapping automatically.
 *
 * @param html - The raw Bible HTML from the YouVersion API
 * @returns The transformed HTML
 */
export function transformBibleHtmlForNode(html: string): TransformedBibleHtml {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DOMParser } = require('linkedom') as {
    DOMParser: new () => { parseFromString(html: string, type: string): Document };
  };

  return transformBibleHtml(html, {
    parseHtml: (h: string) =>
      new DOMParser().parseFromString(`<html><body>${h}</body></html>`, 'text/html'),
    serializeHtml: (doc: Document) => doc.body.innerHTML,
  });
}
