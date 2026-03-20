const NON_BREAKING_SPACE = '\u00A0';

const FOOTNOTE_KEY_ATTR = 'data-footnote-key';

const NEEDS_SPACE_BEFORE = /^[^\s.,;:!?)}\]'"»›]/;

export type VerseNotes = {
  verseHtml: string;
  notes: string[];
  hasVerseContext: boolean;
};

export type TransformBibleHtmlOptions = {
  parseHtml: (html: string) => Document;
  serializeHtml: (doc: Document) => string;
  sanitize?: (html: string) => string;
};

export type TransformedBibleHtml = {
  html: string;
  rawHtml: string;
  notes: Record<string, VerseNotes>;
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

function buildVerseHtml(wrappers: Element[]): string {
  const parts: string[] = [];

  for (let i = 0; i < wrappers.length; i++) {
    if (i > 0) parts.push(' ');

    const clone = wrappers[i]!.cloneNode(true) as Element;
    const ownerDoc = wrappers[i]!.ownerDocument;

    clone.querySelectorAll('.yv-h, .yv-vlbl').forEach((el) => {
      el.remove();
    });

    clone.querySelectorAll('.yv-n.f').forEach((fn) => {
      const key = fn.getAttribute(FOOTNOTE_KEY_ATTR) ?? '';
      const span = ownerDoc.createElement('span');
      span.setAttribute('data-verse-footnote', key);
      span.setAttribute('data-verse-footnote-content', fn.innerHTML);
      fn.replaceWith(span);
    });

    parts.push(clone.innerHTML);
  }

  return parts.join('');
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
    const key = fn.getAttribute(FOOTNOTE_KEY_ATTR)!;

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

function extractNotesFromWrappedHtml(doc: Document): Record<string, VerseNotes> {
  const footnotes = Array.from(doc.querySelectorAll('.yv-n.f'));
  if (!footnotes.length) return {};

  const footnotesByKey = new Map<string, Element[]>();
  for (const fn of footnotes) {
    const key = fn.getAttribute(FOOTNOTE_KEY_ATTR)!;
    let arr = footnotesByKey.get(key);
    if (!arr) {
      arr = [];
      footnotesByKey.set(key, arr);
    }
    arr.push(fn);
  }

  const wrappersByVerse = new Map<string, Element[]>();
  doc.querySelectorAll('.yv-v[v]').forEach((el) => {
    const verseNum = el.getAttribute('v');
    if (!verseNum) return;
    const arr = wrappersByVerse.get(verseNum);
    if (arr) arr.push(el);
    else wrappersByVerse.set(verseNum, [el]);
  });

  const notes: Record<string, VerseNotes> = {};
  for (const [key, fns] of footnotesByKey) {
    const wrappers = wrappersByVerse.get(key);
    notes[key] = {
      verseHtml: wrappers ? buildVerseHtml(wrappers) : '',
      notes: fns.map((fn) => fn.innerHTML),
      hasVerseContext: !!wrappers,
    };
  }

  replaceFootnotesWithAnchors(doc, footnotes);

  return notes;
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

export function transformBibleHtml(
  html: string,
  options: TransformBibleHtmlOptions,
): TransformedBibleHtml {
  const rawHtml = html;
  const sanitizedHtml = options.sanitize ? options.sanitize(html) : html;
  const doc = options.parseHtml(sanitizedHtml);

  wrapVerseContent(doc);
  assignFootnoteKeys(doc);
  const notes = extractNotesFromWrappedHtml(doc);
  addNbspToVerseLabels(doc);
  fixIrregularTables(doc);

  const transformedHtml = options.serializeHtml(doc);
  return { html: transformedHtml, rawHtml, notes };
}
