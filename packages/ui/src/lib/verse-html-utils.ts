export const NON_BREAKING_SPACE = '\u00A0';

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

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
 * This function assumes verses are already wrapped in `.yv-v[v]` elements (by wrapVerseContent).
 * It uses `.closest('.yv-v[v]')` to find which verse each footnote belongs to.
 *
 * @returns Notes data for popovers, keyed by verse number
 */
export function extractNotesFromWrappedHtml(doc: Document): Record<string, VerseNotes> {
  const footnotes = Array.from(doc.querySelectorAll('.yv-n.f'));
  if (!footnotes.length) return {};

  // Group footnotes by verse number using closest wrapper
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

  const notes: Record<string, VerseNotes> = {};
  const NEEDS_SPACE_BEFORE = /^[^\s.,;:!?)}\]'"»›]/

  footnotesByVerse.forEach((fns, verseNum) => {
    // Find all wrappers for this verse (could be multiple if verse spans paragraphs)
    const verseWrappers = Array.from(doc.querySelectorAll(`.yv-v[v="${verseNum}"]`));

    // Build verse HTML with A/B/C markers for popover display
    let verseHtml = '';
    let noteIdx = 0;

    verseWrappers.forEach((wrapper, wrapperIdx) => {
      if (wrapperIdx > 0) verseHtml += ' ';

      const walker = doc.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let lastWasFootnote = false;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Element) {
          if (node.classList.contains('yv-n') && node.classList.contains('f')) {
            node.setAttribute("data-verse-footnote", verseNum);
            // node.innerHTML = '';
            verseHtml += `<sup class="yv:text-muted-foreground">${LETTERS[noteIdx++] || noteIdx}</sup>`;
            lastWasFootnote = true;
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (parent?.closest('.yv-n.f') || parent?.closest('.yv-h')) continue;
          if (parent?.classList.contains('yv-vlbl')) continue;
          let text = node.textContent || '';
          // Insert space after footnote marker if text doesn't start with whitespace/punctuation
          // (same fix as footnote removal - see World English Bible, version ID 206)
          if (lastWasFootnote && text && NEEDS_SPACE_BEFORE.test(text)) {
            text = ' ' + text;
          }
          verseHtml += text;
          lastWasFootnote = false;
        }
      }
    });

    notes[verseNum] = {
      verseHtml,
      notes: fns.map((fn) => fn.innerHTML),
    };

    // Insert placeholder after last verse wrapper (sibling, not child)
    const lastWrapper = verseWrappers[verseWrappers.length - 1];
    if (lastWrapper?.parentNode) {
      const placeholder = doc.createElement('span');
      placeholder.setAttribute('data-verse-footnote', verseNum);
      lastWrapper.parentNode.insertBefore(placeholder, lastWrapper.nextSibling);
    }
  });

  // Remove all footnotes from DOM, inserting space if needed to prevent word concatenation.
  //
  // Some Bible versions (e.g., World English Bible, version ID 206) have malformed HTML where
  // there's no whitespace between a word, the footnote element, and the next word:
  //
  //   ...hasn't overcome<span class="yv-n f">...</span>it.
  //
  // When we remove the footnote, "overcome" + "it" would become "overcomeit".
  // We detect this case and insert a space, but only if the next character isn't punctuation.
  footnotes.forEach((fn) => {
    fn.classList.remove("yv-n")
    // const prev = fn.previousSibling;
    // const next = fn.nextSibling;

    // const prevNeedsSpace =
    //   prev?.nodeType === Node.TEXT_NODE && prev.textContent && !/\s$/.test(prev.textContent);
    // const nextNeedsSpace =
    //   next?.nodeType === Node.TEXT_NODE &&
    //   next.textContent &&
    //   NEEDS_SPACE_BEFORE.test(next.textContent);

    // if (prevNeedsSpace && nextNeedsSpace) {
    //   fn.parentNode?.insertBefore(doc.createTextNode(' '), next);
    // }
    // fn.remove();
  });

  return notes;
}
