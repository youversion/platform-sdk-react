import DOMPurify from 'isomorphic-dompurify';
import { transformBibleHtml as coreTransform, type VerseNotes } from '@youversion/platform-core';
export type { VerseNotes };

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

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

export const INTER_FONT = '"Inter", sans-serif' as const;
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily = typeof INTER_FONT | typeof SOURCE_SERIF_FONT | (string & {});

const DOMPURIFY_CONFIG = {
  ALLOWED_ATTR: ['class', 'style', 'id', 'v', 'usfm'],
  ALLOW_DATA_ATTR: true,
};

export function transformBibleHtml(html: string): { html: string; notes: Record<string, VerseNotes> } {
  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    return { html, notes: {} };
  }

  const result = coreTransform(html, {
    sanitize: (h) => DOMPurify.sanitize(h, DOMPURIFY_CONFIG),
    parseHtml: (h) => new DOMParser().parseFromString(h, 'text/html'),
    serializeHtml: (doc) => doc.body.innerHTML,
  });

  return { html: result.html, notes: result.notes };
}
