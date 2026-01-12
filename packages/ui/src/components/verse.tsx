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

function extractNotesFromHtml(html: string): ExtractedNotes {
  if (typeof window === 'undefined') return { html, notes: {} };

  const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHtml, 'text/html');
  const noteElements = doc.querySelectorAll('span.yv-n.f');
  const verseData: Record<string, { verseHtml: string; notes: string[]; elements: Element[] }> = {};

  // Build the verse html, and store notes for the footnotes popover
  noteElements.forEach((element) => {
    let label: Element | null = null;
    let node: Node | null = element.previousSibling;
    while (node) {
      if (node instanceof Element && node.classList.contains('yv-vlbl')) {
        label = node;
        break;
      }
      node = node.previousSibling;
    }

    const verseNum = label?.textContent?.trim() || '0';

    if (!verseData[verseNum]) {
      let verseHtml = `<sup>${verseNum}</sup> `;
      let current: Node | null = label?.nextSibling || null;
      let noteIdx = 0;

      while (current) {
        if (current instanceof Element && current.classList.contains('yv-v')) break;
        if (current instanceof Element) {
          if (current.classList.contains('yv-n') && current.classList.contains('f')) {
            verseHtml += `<sup>${LETTERS[noteIdx] || noteIdx + 1}</sup>`;
            noteIdx++;
          } else {
            verseHtml += current.outerHTML;
          }
        } else if (current.nodeType === Node.TEXT_NODE) {
          verseHtml += current.textContent || '';
        }
        current = current.nextSibling;
      }

      verseData[verseNum] = {
        verseHtml,
        notes: [],
        elements: [],
      };
    }

    verseData[verseNum].notes.push(element.innerHTML || '');
    verseData[verseNum].elements.push(element);
  });

  // Place the popovers at the end of the verse if notes exist in the verse
  // and remove the note elements from the DOM as they are now in the popover
  // element.
  Object.entries(verseData).forEach(([verseNum, { elements }]) => {
    const lastElement = elements[elements.length - 1];
    let endNode: Node | null = lastElement || null;
    let current: Node | null = lastElement?.nextSibling || null;

    while (current) {
      if (current instanceof Element && current.classList.contains('yv-v')) break;
      endNode = current;
      current = current.nextSibling;
    }

    const placeholder = doc.createElement('span');
    placeholder.setAttribute('data-verse-footnote', verseNum);
    if (endNode?.parentNode) {
      endNode.parentNode.insertBefore(placeholder, endNode.nextSibling);
    }

    elements.forEach((el) => {
      el.remove();
    });
  });

  const notes: Record<string, VerseNotes> = {};
  Object.entries(verseData).forEach(([verseNum, { verseHtml, notes: noteContents }]) => {
    notes[verseNum] = { verseHtml, notes: noteContents };
  });

  return { html: doc.body.innerHTML, notes };
}

const VerseFootnoteButton = memo(function VerseFootnoteButton({
  verseNum,
  verseNotes,
  reference,
}: {
  verseNum: string;
  verseNotes: VerseNotes;
  reference?: string;
}) {
  const verseReference = reference ? `${reference}:${verseNum}` : `Verse ${verseNum}`;
  return (
    <Popover>
      <PopoverTrigger data-yv-sdk asChild>
        <button
          type="button"
          className="yv:inline-flex yv:align-super yv:cursor-pointer yv:ml-1 yv:text-(--yv-gray-20)"
        >
          <Footnote />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="yv:flex yv:flex-col yv:bg-background yv:p-0 yv:sm:w-sm yv:overflow-hidden yv:rounded-2xl yv:border-0 yv:shadow-lg"
        heading="Footnotes"
      >
        <div className="yv:p-3">
          <div className="yv:font-bold yv:mb-2">{verseReference}</div>
          <div
            className="yv:mb-3 yv:font-serif yv:text-xl"
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
}: {
  html: string;
  notes: Record<string, VerseNotes>;
  reference?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [placeholders, setPlaceholders] = useState<Map<string, Element>>(new Map());

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
          <VerseFootnoteButton verseNum={verseNum} verseNotes={verseNotes} reference={reference} />,
          el,
        );
      })}
    </>
  );
}

// Configure DOMPurify to allow specific attributes safe for Bible content
const DOMPURIFY_CONFIG = {
  ALLOWED_ATTR: ['class', 'style', 'id'],
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
      }: VerseHtmlProps,
      ref,
    ): ReactNode => {
      const [transformedData, setTransformedData] = useState<ExtractedNotes>({ html, notes: {} });

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
