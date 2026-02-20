/**
 * USFM book code → human-readable display name for reference formatting.
 * Covers standard Protestant canon; unknown codes are shown as-is.
 */
const USFM_BOOK_DISPLAY_NAMES = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  EST: 'Esther',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  EZK: 'Ezekiel',
  DAN: 'Daniel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
} as const;

/** A valid USFM book code (e.g. "GEN", "JHN", "1CO"). */
export type UsfmBookCode = keyof typeof USFM_BOOK_DISPLAY_NAMES;

/**
 * A USFM reference string. Provides autocomplete for known book codes
 * while still accepting arbitrary strings (e.g. from API responses).
 *
 * Valid patterns:
 * - Book only: `"GEN"`, `"JHN"`
 * - Book + chapter: `"PSA.23"`
 * - Book + chapter + verse: `"JHN.3.16"`, `"GEN.1.1-3"`
 */
export type UsfmReference = `${UsfmBookCode}` | `${UsfmBookCode}.${string}` | (string & {});

/**
 * Checks whether a string is a known USFM book code.
 */
function isUsfmBookCode(code: string): code is UsfmBookCode {
  return code in USFM_BOOK_DISPLAY_NAMES;
}

/**
 * Converts a USFM reference to an uppercase display string.
 *
 * Supported formats:
 * - Book + chapter + verse: `"JHN.3.16"` → `"JOHN 3:16"`
 * - Verse range:            `"GEN.1.1-3"` → `"GENESIS 1:1-3"`
 * - Chapter only:           `"PSA.23"` → `"PSALMS 23"`
 * - Book only:              `"ROM"` → `"ROMANS"`
 *
 * Unknown book codes are returned as-is in uppercase.
 * Use when the API passage is unavailable (e.g. loading / error state)
 * and you still need to show a human-readable reference.
 *
 * @param usfm - USFM reference string (e.g. "JHN.3.16", "GEN.1.1-3")
 * @returns Human-readable reference in uppercase, or the original string uppercased if unparseable
 */
export function formatUsfmForDisplay(usfm: UsfmReference): string {
  const parts = usfm.split('.');
  const bookCode = parts[0];

  if (!bookCode) return usfm.toUpperCase();

  const book = isUsfmBookCode(bookCode) ? USFM_BOOK_DISPLAY_NAMES[bookCode] : bookCode;

  const chapter = parts[1];
  const verse = parts[2];

  // Book + chapter + verse (e.g. "JHN.3.16" or "GEN.1.1-3")
  if (chapter && verse) {
    return `${book} ${chapter}:${verse}`.toUpperCase();
  }

  // Book + chapter only (e.g. "PSA.23")
  if (chapter) {
    return `${book} ${chapter}`.toUpperCase();
  }

  // Book only (e.g. "ROM")
  return book.toUpperCase();
}
