'use client';

import { usePassage, useTheme } from '@youversion/platform-react-hooks';
import DOMPurify from 'isomorphic-dompurify';
import {
  forwardRef,
  memo,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  extractNotesFromWrappedHtml,
  LETTERS,
  NON_BREAKING_SPACE,
  type VerseNotes,
  wrapVerseContent,
} from '@/lib/verse-html-utils';
import { Footnote } from './icons/footnote';

type ExtractedNotes = {
  html: string;
  notes: Record<string, VerseNotes>;
};

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

function BibleTextHtml({
  html,
  notes,
  reference,
  fontSize,
  theme,
  selectedVerses = [],
  onVerseSelect,
}: {
  html: string;
  notes: Record<string, VerseNotes>;
  reference?: string;
  fontSize?: number;
  theme?: 'light' | 'dark';
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
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

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const verseElements = contentRef.current.querySelectorAll('.yv-v[v]');
    verseElements.forEach((el) => {
      const verseNum = parseInt(el.getAttribute('v') || '0', 10);
      if (selectedVerses.includes(verseNum)) {
        el.classList.add('yv-v-selected');
      } else {
        el.classList.remove('yv-v-selected');
      }
    });
  }, [selectedVerses]);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || !onVerseSelect) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const verseEl = target.closest('.yv-v[v]');
      if (!verseEl) return;

      const verseNum = parseInt(verseEl.getAttribute('v') || '0', 10);
      if (verseNum === 0) return;

      const newSelected = selectedVerses.includes(verseNum)
        ? selectedVerses.filter((v) => v !== verseNum)
        : [...selectedVerses, verseNum].sort((a, b) => a - b);

      onVerseSelect(newSelected);
    };

    element.addEventListener('click', handleClick);
    return () => element.removeEventListener('click', handleClick);
  }, [selectedVerses, onVerseSelect]);

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
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
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
        selectedVerses,
        onVerseSelect,
      }: VerseHtmlProps,
      ref,
    ): ReactNode => {
      const [transformedData, setTransformedData] = useState<ExtractedNotes>({ html, notes: {} });
      const providerTheme = useTheme();
      const currentTheme = theme || providerTheme;

      useEffect(() => {
        // Always extract notes to keep DOM stable (visibility controlled via CSS)
        setTransformedData(yvDomTransformer(html, true));
      }, [html]);

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
          data-show-notes={renderNotes}
          data-slot="yv-bible-renderer"
        >
          <BibleTextHtml
            html={transformedData.html}
            notes={transformedData.notes}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
            selectedVerses={selectedVerses}
            onVerseSelect={onVerseSelect}
          />
        </section>
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
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
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
  selectedVerses,
  onVerseSelect,
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
        selectedVerses={selectedVerses}
        onVerseSelect={onVerseSelect}
      />
    </div>
  );
};
