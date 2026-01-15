'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePassage, useTheme } from '@youversion/platform-react-hooks';
import DOMPurify from 'isomorphic-dompurify';
import {
  forwardRef,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Footnote } from './icons/footnote';

const NON_BREAKING_SPACE = '\u00A0';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

type VerseNotes = {
  verseHtml: string;
  notes: string[];
};

type ExtractedNotes = {
  html: string;
  notes: Record<string, VerseNotes>;
};

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
  const verseMarkers = Array.from(doc.querySelectorAll('.yv-v[v]'));
  if (!verseMarkers.length) return;

  verseMarkers.forEach((marker, markerIndex) => {
    const verseNum = marker.getAttribute('v');
    if (!verseNum) return;

    const nextMarker = verseMarkers[markerIndex + 1];
    const markerParent = marker.parentElement;
    if (!markerParent) return;

    const nodesToWrap: Node[] = [];
    let currentNode: Node | null = marker.nextSibling;
    const currentParagraph = markerParent.closest('.p, p, div.p');

    while (currentNode) {
      if (currentNode === nextMarker) break;
      if (nextMarker && currentNode instanceof Element && currentNode.contains(nextMarker)) break;

      if (currentNode instanceof Element && currentNode.classList.contains('yv-h')) {
        currentNode = currentNode.nextSibling;
        continue;
      }

      nodesToWrap.push(currentNode);
      currentNode = currentNode.nextSibling;
    }

    if (nodesToWrap.length === 0) return;

    const wrapper = doc.createElement('span');
    wrapper.className = 'yv-v';
    wrapper.setAttribute('v', verseNum);

    const firstNode = nodesToWrap[0];
    if (firstNode) {
      marker.parentNode?.insertBefore(wrapper, firstNode);
    }
    nodesToWrap.forEach((node) => wrapper.appendChild(node));
    marker.remove();

    if (!nextMarker) {
      wrapParagraphsUntilBoundary(doc, verseNum, currentParagraph);
    } else {
      const nextMarkerParagraph = nextMarker.closest('.p, p, div.p');
      if (currentParagraph && nextMarkerParagraph && currentParagraph !== nextMarkerParagraph) {
        wrapParagraphsUntilBoundary(doc, verseNum, currentParagraph, nextMarkerParagraph);
      }
    }
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
      currentP.tagName === 'P' ||
      (currentP.tagName === 'DIV' && currentP.classList.contains('p'))
    ) {
      wrapParagraphContent(doc, currentP, verseNum);
    }

    currentP = currentP.nextElementSibling;
  }
}

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
  children.forEach((child) => wrapper.appendChild(child));
}

/**
 * Extracts footnotes from wrapped verse HTML and prepares data for footnote popovers.
 *
 * This function assumes verses are already wrapped in `.yv-v[v]` elements (by wrapVerseContent).
 * It uses `.closest('.yv-v[v]')` to find which verse each footnote belongs to.
 *
 * @returns Notes data for popovers, keyed by verse number
 */
function extractNotesFromWrappedHtml(doc: Document): Record<string, VerseNotes> {
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

  footnotesByVerse.forEach((fns, verseNum) => {
    // Find all wrappers for this verse (could be multiple if verse spans paragraphs)
    const verseWrappers = Array.from(doc.querySelectorAll(`.yv-v[v="${verseNum}"]`));

    // Build verse HTML with A/B/C markers for popover display
    let verseHtml = '';
    let noteIdx = 0;

    verseWrappers.forEach((wrapper, wrapperIdx) => {
      if (wrapperIdx > 0) verseHtml += ' ';

      const walker = doc.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Element) {
          if (node.classList.contains('yv-n') && node.classList.contains('f')) {
            verseHtml += `<sup class="yv:text-muted-foreground">${LETTERS[noteIdx++] || noteIdx}</sup>`;
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (parent?.closest('.yv-n.f') || parent?.closest('.yv-h')) continue;
          if (parent?.classList.contains('yv-vlbl')) continue;
          verseHtml += node.textContent || '';
        }
      }
    });

    notes[verseNum] = {
      verseHtml,
      notes: fns.map((fn) => fn.innerHTML),
    };

    // Insert placeholder at end of last verse wrapper
    const lastWrapper = verseWrappers[verseWrappers.length - 1]!;
    const placeholder = doc.createElement('span');
    placeholder.setAttribute('data-verse-footnote', verseNum);
    lastWrapper.appendChild(placeholder);
  });

  // Remove all footnotes from DOM
  footnotes.forEach((fn) => fn.remove());

  return notes;
}

const VerseFootnoteButton = memo(function VerseFootnoteButton({
  verseNum,
  verseNotes,
  reference,
  fontSize,
  theme,
}: {
  verseNum: string;
  verseNotes: VerseNotes;
  reference?: string;
  fontSize?: number;
  theme: 'light' | 'dark';
}) {
  const verseReference = reference ? `${reference}:${verseNum}` : `Verse ${verseNum}`;
  return (
    <Popover>
      <PopoverTrigger data-yv-sdk data-yv-theme={theme} asChild>
        <button
          type="button"
          className="yv:inline-flex yv:align-middle yv:cursor-pointer yv:ml-1! yv:text-(--yv-gray-20)"
        >
          <Footnote className="yv:size-[1.5em]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="yv:flex yv:flex-col yv:bg-background yv:p-0 yv:sm:w-sm yv:overflow-none yv:rounded-2xl yv:border-0 yv:shadow-lg"
        heading="Footnotes"
        theme={theme}
      >
        <div className="yv:p-3 yv:overflow-y-auto yv:max-h-[33svh]">
          <div className="yv:font-bold yv:mb-2">{verseReference}</div>
          <div
            className="yv:mb-3 yv:font-serif"
            style={{ fontSize: fontSize ? `${fontSize}px` : '1.25rem' }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML has been run through DOMPurify and is safe
            dangerouslySetInnerHTML={{ __html: verseNotes.verseHtml }}
          />
          <ul className="yv:list-none yv:p-0 yv:m-0 yv:space-y-1">
            {verseNotes.notes.map((note, index) => (
              <li
                key={LETTERS[index]}
                className="yv:flex yv:gap-2 yv:text-xs yv:border-b yv:border-border yv:py-2"
              >
                <span className="">{LETTERS[index] || index + 1}.</span>
                {/** biome-ignore lint/security/noDangerouslySetInnerHtml: HTML has been run through DOMPurify and is safe */}
                <span dangerouslySetInnerHTML={{ __html: note }} />
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
});

function HtmlWithNotes({
  html,
  notes,
  reference,
  fontSize,
  theme,
}: {
  html: string;
  notes: Record<string, VerseNotes>;
  reference?: string;
  fontSize?: number;
  theme?: 'light' | 'dark';
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [placeholders, setPlaceholders] = useState<Map<string, Element>>(new Map());
  const providerTheme = useTheme();
  const currentTheme = theme || providerTheme;

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;

    const map = new Map<string, Element>();
    Object.keys(notes).forEach((verseNum) => {
      const el = contentRef.current?.querySelector(`[data-verse-footnote="${verseNum}"]`);
      if (el) map.set(verseNum, el);
    });
    setPlaceholders(map);
  }, [html, notes]);

  return (
    <>
      <div ref={contentRef} />
      {Array.from(placeholders.entries()).map(([verseNum, el]) => {
        const verseNotes = notes[verseNum];
        if (!verseNotes) return null;
        return createPortal(
          <VerseFootnoteButton
            verseNum={verseNum}
            verseNotes={verseNotes}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
          />,
          el,
        );
      })}
    </>
  );
}

// Configure DOMPurify to allow specific attributes safe for Bible content
const DOMPURIFY_CONFIG = {
  ALLOWED_ATTR: ['class', 'style', 'id', 'v', 'usfm'],
  ALLOW_DATA_ATTR: true,
};

function yvDomTransformer(html: string, extractNotes: boolean = false): ExtractedNotes {
  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    return { html, notes: {} };
  }

  // Parse and sanitize HTML
  const doc = new DOMParser().parseFromString(
    DOMPurify.sanitize(html, DOMPURIFY_CONFIG),
    'text/html',
  );

  // Wrap verse content FIRST (enables simple footnote extraction)
  wrapVerseContent(doc);

  // Extract footnotes using the wrapped verse structure
  const extractedNotes = extractNotes ? extractNotesFromWrappedHtml(doc) : {};

  // Adds non-breaking space to the end of verse labels for better copying and pasting
  // (i.e. "3For God so loved..." to "3 For God so loved...")
  const verseLabels = doc.querySelectorAll('.yv-vlbl');
  verseLabels.forEach((label) => {
    const text = label.textContent || '';
    if (!text.endsWith(NON_BREAKING_SPACE)) {
      label.textContent = text + NON_BREAKING_SPACE;
    }
  });

  // Fix irregular tables - add colspan to single-cell rows in multi-column tables.
  // Test with https://www.bible.com/bible/111/EZR.2.NIV
  const tables = doc.querySelectorAll('table');
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    // Find maximum column count across all rows (accounting for existing colspan)
    let maxColumns = 0;
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      let rowColumnCount = 0;
      cells.forEach((cell) => {
        if (cell instanceof HTMLTableCellElement) {
          const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
          rowColumnCount += colspan;
        } else {
          rowColumnCount += 1;
        }
      });
      maxColumns = Math.max(maxColumns, rowColumnCount);
    });

    // If table has mixed column counts, add colspan to single-cell rows
    if (maxColumns > 1) {
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 1) {
          const cell = cells[0];
          if (cell instanceof HTMLTableCellElement) {
            const existingColspan = parseInt(cell.getAttribute('colspan') || '1', 10);
            // Only add colspan if cell doesn't already span all columns
            if (existingColspan < maxColumns) {
              cell.setAttribute('colspan', maxColumns.toString());
            }
          }
        }
      });
    }
  });

  // Serialize back to HTML
  const modifiedHtml = doc.body.innerHTML;
  return { html: modifiedHtml, notes: extractedNotes };
}

/**
 * Represents a single verse with its number, text, and optional size.
 */
type VerseProps = {
  /**
   * The reference of the verse.
   */
  number: number;
  /**
   * The text content of the verse.
   */
  text: string;
  /**
   * The visual size of the verse.
   */
  size?: 'default' | 'lg';
};

type VerseHtmlProps = {
  html: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  showVerseNumbers?: boolean;
  renderNotes?: boolean;
  reference?: string;
  theme?: 'light' | 'dark';
};

/**
 * Scripture text component.
 */
export const Verse = {
  /**
   * Renders a single verse with superscript number and text.
   *
   * @param props - The verse properties.
   * @param props.number - The verse number.
   * @param props.text - The verse text.
   * @param props.size - The size variant. Defaults to 'default'.
   * @returns The rendered verse element.
   */
  Text: ({ number, text, size = 'default' }: VerseProps): React.ReactElement => {
    if (size === 'lg') {
      return (
        <span className="yv:[&>p]:inline-block">
          <sup className="yv:text-muted-foreground yv:align-super yv:text-[0.6em]">{number}</sup>
          &nbsp;{/* This spacing is intentional */}
          <span className="yv:font-serif! yv:text-xl yv:text-primary">{text}</span>
          &nbsp;{/* This spacing is intentional */}
        </span>
      );
    }

    return (
      <span className="yv:[&>p]:inline-block">
        <sup className="yv:text-muted-foreground yv:align-super yv:text-[0.6em]">{number}</sup>
        &nbsp;{/* This spacing is intentional */}
        <span className="yv:text-primary">{text}</span>
        &nbsp;{/* This spacing is intentional */}
      </span>
    );
  },

  Html: forwardRef<HTMLDivElement, VerseHtmlProps>(
    (
      {
        html,
        fontFamily,
        fontSize,
        lineHeight,
        showVerseNumbers = true,
        renderNotes = true,
        reference,
        theme,
      }: VerseHtmlProps,
      ref,
    ): ReactNode => {
      const [transformedData, setTransformedData] = useState<ExtractedNotes>({ html, notes: {} });
      const providerTheme = useTheme();
      const currentTheme = theme || providerTheme;

      useEffect(() => {
        setTransformedData(yvDomTransformer(html, renderNotes));
      }, [html, renderNotes]);

      if (renderNotes) {
        return (
          <section
            ref={ref}
            style={
              {
                ...(fontFamily ? { '--yv-reader-font-family': fontFamily } : {}),
                ...(fontSize ? { '--yv-reader-font-size': `${fontSize}px` } : {}),
                ...(lineHeight ? { '--yv-reader-line-height': lineHeight } : {}),
              } as React.CSSProperties
            }
            data-show-verse-numbers={showVerseNumbers}
            data-slot="yv-bible-renderer"
          >
            <HtmlWithNotes
              html={transformedData.html}
              notes={transformedData.notes}
              reference={reference}
              fontSize={fontSize}
              theme={currentTheme}
            />
          </section>
        );
      }

      return (
        <section
          ref={ref}
          style={
            {
              ...(fontFamily ? { '--yv-reader-font-family': fontFamily } : {}),
              ...(fontSize ? { '--yv-reader-font-size': `${fontSize}px` } : {}),
              ...(lineHeight ? { '--yv-reader-line-height': lineHeight } : {}),
            } as React.CSSProperties
          }
          data-show-verse-numbers={showVerseNumbers}
          data-slot="yv-bible-renderer"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML has been run through DOMPurify and is safe
          dangerouslySetInnerHTML={{ __html: transformedData.html }}
        />
      );
    },
  ),
};

export type BibleTextViewProps = {
  reference: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  versionId: number;
  showVerseNumbers?: boolean;
  renderNotes?: boolean;
  theme?: 'light' | 'dark';
};

/**
 * A component that renders style Bible text.
 */
export const BibleTextView = ({
  reference,
  fontFamily,
  fontSize,
  lineHeight,
  versionId,
  showVerseNumbers,
  renderNotes,
  theme,
}: BibleTextViewProps): React.ReactElement => {
  const { passage, loading, error } = usePassage({
    versionId,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });
  const providerTheme = useTheme();
  const currentTheme = theme || providerTheme;

  if (loading) {
    return (
      <div data-yv-sdk data-yv-theme={currentTheme}>
        <Verse.Html
          html={'<span>Loading...</span>'}
          fontFamily={fontFamily}
          fontSize={fontSize}
          lineHeight={lineHeight}
          showVerseNumbers={showVerseNumbers}
          renderNotes={renderNotes}
          theme={currentTheme}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div data-yv-sdk data-yv-theme={currentTheme}>
        <Verse.Html
          html={'<span class="wj">We have run into an error...</span>'}
          fontFamily={fontFamily}
          fontSize={fontSize}
          lineHeight={lineHeight}
          showVerseNumbers={showVerseNumbers}
          renderNotes={renderNotes}
          theme={currentTheme}
        />
      </div>
    );
  }

  return (
    <div data-yv-sdk data-yv-theme={currentTheme}>
      <Verse.Html
        html={passage?.content || ''}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
        renderNotes={renderNotes}
        reference={passage?.reference}
        theme={currentTheme}
      />
    </div>
  );
};
