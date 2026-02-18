import DOMPurify from 'isomorphic-dompurify';

const NON_BREAKING_SPACE = '\u00A0';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Converts a 0-based footnote index into an alphabetic marker.
 *
 * Examples with LETTERS = "abcdefghijklmnopqrstuvwxyz":
 * 0 -> "a", 25 -> "z", 26 -> "aa", 27 -> "ab"
 *
 * This uses spreadsheet-style indexing and derives its base from
 * LETTERS.length so there are no hardcoded numeric assumptions.
 */
export function getFootnoteMarker(index: number): string {
  const base = LETTERS.length;
  if (base === 0) return String(index + 1);

  let value = index;
  let marker = '';

  do {
    marker = LETTERS[value % base] + marker;
    value = Math.floor(value / base) - 1;
  } while (value >= 0);

  return marker;
}

export type VerseNotes = {
  verseHtml: string;
  notes: string[];
};

export const INTER_FONT = '"Inter", sans-serif' as const;
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily = typeof INTER_FONT | typeof SOURCE_SERIF_FONT | (string & {});

/**
 * Wraps verse content in `yv-v` elements for easier CSS targeting.
 *
 * Transforms empty verse markers into wrapping containers. When a verse spans
 * multiple paragraphs, creates duplicate wrappers in each paragraph (Bible.com pattern).
 *
 * Before: <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text...
 * After:  <span class="yv-v" v="1"><span class="yv-vlbl">1</span>Text...</span>
 *
 * This enables simple CSS selectors like `.yv-v[v="1"] { background: yellow; }`
 */
function wrapVerseContent(doc: Document): void {
  /**
   * Wraps all content in a paragraph with a verse span.
   */
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

  /**
   * Wraps paragraphs between startParagraph and an optional endParagraph boundary.
   * If no endParagraph is provided, wraps until a verse marker is found or siblings are exhausted.
   */
  function wrapParagraphsUntilBoundary(
    doc: Document,
    verseNum: string,
    startParagraph: Element | null,
    endParagraph?: Element | null,
  ): void {
    if (!startParagraph) return;

    let currentP: Element | null = startParagraph.nextElementSibling;

    while (currentP && currentP !== endParagraph) {
      // Skip heading elements - these are structural, not verse content
      // See iOS implementation: https://github.com/youversion/platform-sdk-swift/blob/main/Sources/YouVersionPlatformUI/Views/Rendering/BibleVersionRendering.swift
      const isHeading =
        currentP.classList.contains('yv-h') ||
        currentP.matches('.s1, .s2, .s3, .s4, .ms, .ms1, .ms2, .ms3, .ms4, .mr, .sp, .sr, .qa, .r');
      if (isHeading) {
        currentP = currentP.nextElementSibling;
        continue;
      }

      if (currentP.querySelector('.yv-v[v]')) break;

      if (
        currentP.classList.contains('p') ||
        currentP.tagName === 'P'
      ) {
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
    if (endMarker && node instanceof Element && node.contains(endMarker)) return true;
    return false;
  }

  function shouldSkipNode(node: Node): boolean {
    return node instanceof Element && node.classList.contains('yv-h');
  }

  function collectNodesBetweenMarkers(startMarker: Element, endMarker: Element | undefined): Node[] {
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

/**
 * Matches text that needs a space inserted before it (not whitespace or punctuation).
 * Used when replacing footnotes to prevent word concatenation.
 */
const NEEDS_SPACE_BEFORE = /^[^\s.,;:!?)}\]'"»›]/;

/**
 * Builds the verse text shown inside the footnote popover.
 *
 * Works on clones of the verse wrappers so it never mutates the real DOM.
 * Strips headings and labels, replaces each footnote with a superscript
 * marker (a, b, … z, aa, ab, …).
 */
function buildVerseHtml(wrappers: Element[]): string {
  const parts: string[] = [];
  let noteIdx = 0;

  for (let i = 0; i < wrappers.length; i++) {
    if (i > 0) parts.push(' ');

    const clone = wrappers[i]!.cloneNode(true) as Element;
    const ownerDoc = wrappers[i]!.ownerDocument;

    // Remove structural elements that shouldn't appear in the popover.
    clone.querySelectorAll('.yv-h, .yv-vlbl').forEach((el) => el.remove());

    // Replace each footnote with a superscript marker.
    clone.querySelectorAll('.yv-n.f').forEach((fn) => {
      const marker = ownerDoc.createElement('sup');
      marker.className = 'yv:text-muted-foreground';
      marker.textContent = getFootnoteMarker(noteIdx++);
      fn.replaceWith(marker);
    });

    parts.push(clone.innerHTML);
  }

  return parts.join('');
}

/**
 * Replaces each footnote element in the real DOM with a clean anchor span
 * that React portals can target.
 *
 * Also inserts a space when the removal of the footnote would cause two
 * adjacent words to merge (e.g., "overcome" + "it" → "overcomeit").
 */
function replaceFootnotesWithAnchors(doc: Document, footnotes: Element[]): void {
  for (const fn of footnotes) {
    const verseNum = fn.closest('.yv-v[v]')?.getAttribute('v');
    if (!verseNum) continue;

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
    anchor.setAttribute('data-verse-footnote', verseNum);
    fn.replaceWith(anchor);
  }
}

/**
 * Extracts footnotes from wrapped verse HTML and prepares data for footnote popovers.
 *
 * Assumes verses are already wrapped in `.yv-v[v]` elements (by wrapVerseContent).
 *
 * Two-phase approach:
 * 1. Build popover data (verseHtml + note content) using cloned DOM — no side effects.
 * 2. Replace footnotes in the real DOM with clean anchor spans for React portals.
 *
 * @returns Notes data for popovers, keyed by verse number.
 */
function extractNotesFromWrappedHtml(doc: Document): Record<string, VerseNotes> {
  const footnotes = Array.from(doc.querySelectorAll('.yv-n.f'));
  if (!footnotes.length) return {};

  // Group footnotes by verse number.
  const footnotesByVerse = new Map<string, Element[]>();
  for (const fn of footnotes) {
    const verseNum = fn.closest('.yv-v[v]')?.getAttribute('v');
    if (!verseNum) continue;
    let arr = footnotesByVerse.get(verseNum);
    if (!arr) {
      arr = [];
      footnotesByVerse.set(verseNum, arr);
    }
    arr.push(fn);
  }

  // Build verse-wrapper lookup.
  const wrappersByVerse = new Map<string, Element[]>();
  doc.querySelectorAll('.yv-v[v]').forEach((el) => {
    const verseNum = el.getAttribute('v');
    if (!verseNum) return;
    const arr = wrappersByVerse.get(verseNum);
    if (arr) arr.push(el);
    else wrappersByVerse.set(verseNum, [el]);
  });

  // Phase 1: Extract data (cloned DOM — no mutations).
  const notes: Record<string, VerseNotes> = {};
  for (const [verseNum, fns] of footnotesByVerse) {
    notes[verseNum] = {
      verseHtml: buildVerseHtml(wrappersByVerse.get(verseNum) ?? []),
      notes: fns.map((fn) => fn.innerHTML),
    };
  }

  // Phase 2: Replace footnotes with portal anchors (real DOM mutation).
  replaceFootnotesWithAnchors(doc, footnotes);

  return notes;
}

/**
 * Adds non-breaking space after verse labels for better copy/paste
 * (e.g., "3For God so loved..." → "3 For God so loved...").
 */
function addNbspToVerseLabels(doc: Document): void {
  doc.querySelectorAll('.yv-vlbl').forEach((label) => {
    const text = label.textContent || '';
    if (!text.endsWith(NON_BREAKING_SPACE)) {
      label.textContent = text + NON_BREAKING_SPACE;
    }
  });
}

/**
 * Fixes irregular tables by adding colspan to single-cell rows in multi-column tables.
 * (e.g., https://www.bible.com/bible/111/EZR.2.NIV)
 */
function fixIrregularTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    let maxColumns = 0;
    rows.forEach((row) => {
      let count = 0;
      row.querySelectorAll('td, th').forEach((cell) => {
        count +=
          cell instanceof HTMLTableCellElement
            ? parseInt(cell.getAttribute('colspan') || '1', 10)
            : 1;
      });
      maxColumns = Math.max(maxColumns, count);
    });

    if (maxColumns > 1) {
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 1 && cells[0] instanceof HTMLTableCellElement) {
          const existing = parseInt(cells[0].getAttribute('colspan') || '1', 10);
          if (existing < maxColumns) {
            cells[0].setAttribute('colspan', maxColumns.toString());
          }
        }
      });
    }
  });
}

const DOMPURIFY_CONFIG = {
  ALLOWED_ATTR: ['class', 'style', 'id', 'v', 'usfm'],
  ALLOW_DATA_ATTR: true,
};

/**
 * Full transformation pipeline for Bible HTML from the API.
 *
 * 1. Sanitize (DOMPurify)
 * 2. Wrap verse content in selectable spans
 * 3. Extract footnotes and replace with portal anchors
 * 4. Add non-breaking spaces to verse labels
 * 5. Fix irregular table layouts
 */
export function transformBibleHtml(html: string): { html: string; notes: Record<string, VerseNotes> } {
  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    return { html, notes: {} };
  }

  const doc = new DOMParser().parseFromString(
    DOMPurify.sanitize(html, DOMPURIFY_CONFIG),
    'text/html',
  );

  wrapVerseContent(doc);
  const notes = extractNotesFromWrappedHtml(doc);
  addNbspToVerseLabels(doc);
  fixIrregularTables(doc);

  return { html: doc.body.innerHTML, notes };
}
