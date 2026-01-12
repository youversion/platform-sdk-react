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
 * Checks if a node should be excluded from verse text reconstruction.
 * Excludes: verse markers (.yv-v), verse labels (.yv-vlbl), headers (.yv-h), and footnotes (.yv-n).
 */
function isExcludedNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  if (node.classList.contains('yv-v') || node.classList.contains('yv-vlbl')) return true;
  if (node.classList.contains('yv-h') || node.closest('.yv-h')) return true;
  if (node.classList.contains('yv-n') || node.closest('.yv-n')) return true;
  return false;
}

/**
 * Extracts footnotes from Bible HTML and prepares data for footnote popovers.
 *
 * This function does three things:
 * 1. Identifies verse boundaries using `.yv-v[v]` markers (verses can span multiple paragraphs)
 * 2. For each verse with footnotes, builds a plain-text version with A/B/C markers for the popover
 * 3. Inserts placeholder spans at the end of each verse (where the footnote icon will render)
 *
 * The challenge: verses don't respect paragraph boundaries. A verse starts at `.yv-v[v="X"]`
 * and ends at the next `.yv-v[v]` marker, potentially spanning multiple `<div class="p">` elements.
 * We use a TreeWalker to flatten the DOM into document order, then use index ranges to define verses.
 *
 * @returns Modified HTML with footnotes removed and placeholders inserted, plus notes data for popovers
 */
function extractNotesFromHtml(html: string): ExtractedNotes {
  if (typeof window === 'undefined') return { html, notes: {} };

  const doc = new DOMParser().parseFromString(
    DOMPurify.sanitize(html, DOMPURIFY_CONFIG),
    'text/html',
  );
  const verseMarkers = Array.from(doc.querySelectorAll('.yv-v[v]'));
  if (!verseMarkers.length) return { html: doc.body.innerHTML, notes: {} };

  // Flatten DOM into document order so we can define verse boundaries by index ranges
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const allNodes: Node[] = [];
  do {
    allNodes.push(walker.currentNode);
  } while (walker.nextNode());

  const nodeIndex = new Map(allNodes.map((n, i) => [n, i]));
  const footnotes = doc.querySelectorAll('.yv-n.f');

  // Define verse boundaries: each verse spans from its marker to the next marker (or end of content)
  const verses = verseMarkers.map((marker, i) => {
    const nextMarker = verseMarkers[i + 1];
    return {
      num: marker.getAttribute('v') || '0',
      start: nodeIndex.get(marker) ?? 0,
      end: nextMarker ? (nodeIndex.get(nextMarker) ?? allNodes.length) : allNodes.length,
      fns: [] as Element[],
    };
  });

  // Assign each footnote to its containing verse (find verse whose range contains the footnote)
  footnotes.forEach((fn) => {
    const idx = nodeIndex.get(fn);
    if (idx !== undefined) {
      const verse = [...verses].reverse().find((v) => idx > v.start);
      if (verse) verse.fns.push(fn);
    }
  });

  const withNotes = verses.filter((v) => v.fns.length > 0);

  const notes: Record<string, VerseNotes> = {};
  withNotes.forEach((verse) => {
    // Build plain-text verse content for popover, replacing footnotes with A/B/C markers
    let text = '';
    let noteIdx = 0;
    let lastP: Element | null = null;

    for (let i = verse.start; i < verse.end; i++) {
      const node = allNodes[i];
      if (!node) continue;
      const parent = node.parentNode as Element | null;

      if (node instanceof Element) {
        if (node.classList.contains('yv-h') || node.closest('.yv-h')) continue;
        if (node.classList.contains('yv-n') && node.classList.contains('f')) {
          text += `<sup class="yv:text-muted-foreground">${LETTERS[noteIdx++] || noteIdx}</sup>`;
        }
      } else if (node.nodeType === Node.TEXT_NODE && parent) {
        if (parent.closest('.yv-h') || parent.closest('.yv-n.f')) continue;
        if (parent.classList.contains('yv-v') || parent.classList.contains('yv-vlbl')) continue;
        // Add space when transitioning between paragraphs (verses can span multiple <p> elements)
        const curP = parent.closest('.p, p, div.p');
        if (lastP && curP && lastP !== curP) text += ' ';
        text += node.textContent || '';
        if (curP) lastP = curP;
      }
    }

    notes[verse.num] = { verseHtml: text, notes: verse.fns.map((fn) => fn.innerHTML) };

    // Insert placeholder at end of verse content (walk backwards to find last text node)
    for (let i = verse.end - 1; i > verse.start; i--) {
      const node = allNodes[i];
      if (!node) continue;
      const parent = node.parentNode as Element | null;
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.trim() &&
        parent &&
        !isExcludedNode(parent) &&
        !parent.closest('.yv-n') &&
        !parent.closest('.yv-h')
      ) {
        const placeholder = doc.createElement('span');
        placeholder.setAttribute('data-verse-footnote', verse.num);
        parent.insertBefore(placeholder, node.nextSibling);
        break;
      }
    }
  });

  footnotes.forEach((fn) => {
    fn.remove();
  });

  return { html: doc.body.innerHTML, notes };
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

  let extractedNotes: Record<string, VerseNotes> = {};
  let processedHtml = html;

  if (extractNotes) {
    const result = extractNotesFromHtml(html);
    processedHtml = result.html;
    extractedNotes = result.notes;
  } else {
    processedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  }

  // Safely parse and modify HTML to add spaces to paragraph elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(processedHtml, 'text/html');

  // Adds non-breaking space to the end of verse labels for better copying and pasting
  // (i.e. "3For God so loved..." to "3 For God so loved...")
  const paragraphs = doc.querySelectorAll('.yv-vlbl');
  paragraphs.forEach((p) => {
    const text = p.textContent || '';
    if (!text.endsWith(NON_BREAKING_SPACE)) {
      p.textContent = text + NON_BREAKING_SPACE;
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
      />
    </div>
  );
};
