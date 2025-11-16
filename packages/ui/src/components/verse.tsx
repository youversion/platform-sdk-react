'use client';

import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { usePassage } from '@youversion/platform-react-hooks';

const NON_BREAKING_SPACE = '\u00A0';

// Configure DOMPurify to allow specific attributes safe for Bible content
const DOMPURIFY_CONFIG = {
  ALLOWED_ATTR: ['class', 'style', 'id'],
  ALLOW_DATA_ATTR: true,
};

function yvDomTransformer(html: string): string {
  if (!window || !('DOMParser' in window)) {
    return html;
  }

  // First, sanitize HTML to remove any XSS payloads
  const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);

  // Safely parse and modify HTML to add spaces to paragraph elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHtml, 'text/html');

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
  return modifiedHtml;
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

  Html: React.forwardRef<HTMLDivElement, VerseHtmlProps>((props, ref) => {
    const { html, fontFamily, fontSize, lineHeight, showVerseNumbers = true } = props;
    const [transformedHtml, setTransformedHtml] = React.useState(html);

    // Transform HTML client-side to avoid SSR hydration mismatch since DOMParser is not available on server
    React.useEffect(() => {
      setTransformedHtml(yvDomTransformer(html));
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
        data-slot="yv-bible-renderer"
        dangerouslySetInnerHTML={{ __html: transformedHtml }}
      />
    );
  }),
};

export type BibleTextViewProps = {
  reference: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  versionId: number;
  showVerseNumbers?: boolean;
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
}: BibleTextViewProps): React.ReactElement => {
  const { passage, loading, error } = usePassage({
    versionId,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });

  if (loading) {
    return (
      <Verse.Html
        html={'<span>Loading...</span>'}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
      />
    );
  }

  if (error) {
    return (
      <Verse.Html
        html={'<span class="wj">We have run into an error...</span>'}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
      />
    );
  }

  return (
    <Verse.Html
      html={passage?.content || ''}
      fontFamily={fontFamily}
      fontSize={fontSize}
      lineHeight={lineHeight}
      showVerseNumbers={showVerseNumbers}
    />
  );
};
