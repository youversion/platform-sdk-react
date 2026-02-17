export const NON_BREAKING_SPACE = '\u00A0';

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

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
export function wrapVerseContent(doc: Document): void {
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
 * Extracts footnotes from wrapped verse HTML and prepares data for footnote popovers.
 *
 * Assumes verses are already wrapped in `.yv-v[v]` elements (by wrapVerseContent).
 *
 * Performance characteristics:
 * - Group footnotes by verse in one pass
 * - Build verse-wrapper lookup in one pass
 * - Traverse each verse wrapper subtree once via TreeWalker
 *
 * `.closest('.yv-v[v]')` is used only during initial footnote grouping.
 *
 * @returns Notes data for popovers, keyed by verse number
 */
export function extractNotesFromWrappedHtml(doc: Document): Record<string, VerseNotes> {
  /**
   * Matches text that needs a space inserted before it (not whitespace or punctuation).
   * Used when removing footnotes to prevent word concatenation.
   */
  const NEEDS_SPACE_BEFORE = /^[^\s.,;:!?)}\]'"»›]/;

  /**
   * Creates a TreeWalker scoped to a verse wrapper that yields only:
   * - footnote elements (`.yv-n.f`) used as inline marker positions
   * - text nodes that contribute to rendered verse content
   *
   * Traversal rules:
   * - `FILTER_REJECT` headings/labels to skip whole structural subtrees
   * - `FILTER_ACCEPT` footnote elements so we can place a marker/anchor there
   * - skip text nested in footnotes/headings/labels via `parent.closest(...)`
   */
  function createVerseWalker(root: Element): TreeWalker {
    return doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node instanceof Element) {
          if (node.classList.contains('yv-h')) return NodeFilter.FILTER_REJECT;
          if (node.classList.contains('yv-vlbl')) return NodeFilter.FILTER_REJECT;
          if (node.classList.contains('yv-n') && node.classList.contains('f')) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_ACCEPT;

          if (parent.closest('.yv-n.f')) return NodeFilter.FILTER_SKIP;
          if (parent.closest('.yv-h')) return NodeFilter.FILTER_SKIP;
          if (parent.closest('.yv-vlbl')) return NodeFilter.FILTER_SKIP;

          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_SKIP;
      },
    });
  }

  const footnotes = Array.from(doc.querySelectorAll('.yv-n.f'));
  if (!footnotes.length) return {};

  // Group footnotes by verse number in a single pass.
  const footnotesByVerse = new Map<string, Element[]>();

  footnotes.forEach((fn) => {
    const verseNum = fn.closest('.yv-v[v]')?.getAttribute('v');
    if (verseNum) {
      let arr = footnotesByVerse.get(verseNum);
      if (!arr) {
        arr = [];
        footnotesByVerse.set(verseNum, arr);
      }
      arr.push(fn);
    }
  });

  // Build a verse -> wrappers lookup once to avoid repeated selector traversal per verse.
  const wrappersByVerse = new Map<string, Element[]>();
  doc.querySelectorAll('.yv-v[v]').forEach((el) => {
    const verseNum = el.getAttribute('v');
    if (!verseNum) return;

    const arr = wrappersByVerse.get(verseNum);
    if (arr) arr.push(el);
    else wrappersByVerse.set(verseNum, [el]);
  });

  const notes: Record<string, VerseNotes> = {};

  footnotesByVerse.forEach((fns, verseNum) => {
    const verseWrappers = wrappersByVerse.get(verseNum) ?? [];

    // Build verse HTML with alphabetic markers for popover display.
    // Marker sequence is: a, b, ... z, aa, ab, ...
    const verseHtmlParts: string[] = [];
    let noteIdx = 0;
    let hasInlineAnchor = false;

    verseWrappers.forEach((wrapper, wrapperIdx) => {
      if (wrapperIdx > 0) verseHtmlParts.push(' ');

      const walker = createVerseWalker(wrapper);
      let lastWasFootnote = false;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Element) {
          if (node.classList.contains('yv-n') && node.classList.contains('f')) {
            // Attach the portal anchor to the first inline footnote position for this verse.
            // If a verse has no inline footnote element available, we create a fallback
            // placeholder after the last verse wrapper (see below).
            if (!hasInlineAnchor) {
              node.setAttribute('data-verse-footnote', verseNum);
              hasInlineAnchor = true;
            }
            verseHtmlParts.push(
              `<sup class="yv:text-muted-foreground">${getFootnoteMarker(noteIdx++)}</sup>`,
            );
            lastWasFootnote = true;
          }
          continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent ?? '';
          // Preserve spacing when marker is immediately followed by a word.
          if (lastWasFootnote && text && NEEDS_SPACE_BEFORE.test(text)) {
            text = ` ${text}`;
          }
          verseHtmlParts.push(text);
          lastWasFootnote = false;
        }
      }
    });

    notes[verseNum] = {
      verseHtml: verseHtmlParts.join(''),
      notes: fns.map((fn) => fn.innerHTML),
    };

    // Fallback: if no inline anchor was found, insert one after the last wrapper.
    if (!hasInlineAnchor) {
      const lastWrapper = verseWrappers[verseWrappers.length - 1];
      if (lastWrapper?.parentNode) {
        const placeholder = doc.createElement('span');
        placeholder.setAttribute('data-verse-footnote', verseNum);
        lastWrapper.parentNode.insertBefore(placeholder, lastWrapper.nextSibling);
      }
    }
  });

  // Gut footnotes in place: keep the element for inline portal anchoring, but remove its
  // visible content. Before clearing, insert a literal space only when adjacent text would
  // otherwise merge (e.g., "overcome" + "it" -> "overcomeit"), excluding punctuation cases.
  // The first gutted footnote per verse remains the `[data-verse-footnote]` anchor.
  footnotes.forEach((fn) => {
    const prev = fn.previousSibling;
    const next = fn.nextSibling;

    const prevText = prev?.nodeType === Node.TEXT_NODE ? (prev.textContent ?? '') : '';
    const nextText = next?.nodeType === Node.TEXT_NODE ? (next.textContent ?? '') : '';

    const prevNeedsSpace = prevText.length > 0 && !/\s$/.test(prevText);
    const nextNeedsSpace = nextText.length > 0 && NEEDS_SPACE_BEFORE.test(nextText);

    if (prevNeedsSpace && nextNeedsSpace && fn.parentNode) {
      fn.parentNode.insertBefore(doc.createTextNode(' '), fn.nextSibling);
    }

    fn.classList.remove('yv-n');
    // DEBUG: comment this out to render raw footnote content inline for anchor debugging.
    fn.textContent = '';
  });

  return notes;
}
