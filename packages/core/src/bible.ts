import { z } from 'zod';
import type { ApiClient } from './client';
import type {
  BibleBook,
  BibleChapter,
  Collection,
  BibleVerse,
  BibleVersion,
  BiblePassage,
  VOTD,
  BibleIndex,
  CANON,
} from './types';

/**
 * Client for interacting with Bible API endpoints.
 */
export class BibleClient {
  private client: ApiClient;

  // Validation schemas
  private versionIdSchema = z.number().int().positive('Version ID must be a positive integer');
  private bookSchema = z
    .string()
    .trim()
    .min(3, 'Book ID must be exactly 3 characters')
    .max(3, 'Book ID must be exactly 3 characters');
  private chapterSchema = z
    .number()
    .int('Chapter must be an integer')
    .positive('Chapter must be a positive integer');
  private verseSchema = z
    .number()
    .int('Verse must be an integer')
    .positive('Verse must be a positive integer');
  private languageRangesSchema = z
    .string()
    .trim()
    .min(1, 'Language ranges must be a non-empty string');
  private booleanSchema = z.boolean();

  /**
   * Creates a new BibleClient instance.
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Fetches a collection of Bible versions filtered by language ranges.
   *
   * @param language_ranges - A comma-separated list of language codes or ranges to filter the versions (required).
   * @param license_id - Optional license ID to filter versions by license.
   * @returns A promise that resolves to a collection of BibleVersion objects.
   */
  async getVersions(
    language_ranges: string,
    license_id?: string | number,
  ): Promise<Collection<BibleVersion>> {
    this.languageRangesSchema.parse(language_ranges);
    const params: Record<string, string | number> = {
      'language_ranges[]': language_ranges,
    };
    if (license_id !== undefined) {
      params.license_id = license_id;
    }
    return this.client.get<Collection<BibleVersion>>(`/v1/bibles`, params);
  }

  /**
   * Fetches a Bible version by its ID.
   * @param id The version ID.
   * @returns The requested BibleVersion object.
   */
  async getVersion(id: number): Promise<BibleVersion> {
    this.versionIdSchema.parse(id);
    return this.client.get<BibleVersion>(`/v1/bibles/${id}`);
  }

  /**
   * Fetches all books for a given Bible version.
   * @param versionId The version ID.
   * @param canon Optional canon filter ('ot', 'nt', 'deuterocanon').
   * @returns An array of BibleBook objects.
   */
  async getBooks(versionId: number, canon?: CANON): Promise<Collection<BibleBook>> {
    this.versionIdSchema.parse(versionId);
    return this.client.get<Collection<BibleBook>>(`/v1/bibles/${versionId}/books`, {
      ...(canon && { canon }),
    });
  }

  /**
   * Fetches a specific book by USFM code for a given version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book.
   * @returns The requested BibleBook object.
   */
  async getBook(versionId: number, book: string): Promise<BibleBook> {
    this.versionIdSchema.parse(versionId);
    this.bookSchema.parse(book);
    return this.client.get<BibleBook>(`/v1/bibles/${versionId}/books/${book}`);
  }

  /**
   * Fetches all chapters for a specific book in a version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book.
   * @returns An array of BibleChapter objects.
   */
  async getChapters(versionId: number, book: string): Promise<Collection<BibleChapter>> {
    this.versionIdSchema.parse(versionId);
    this.bookSchema.parse(book);
    return this.client.get<Collection<BibleChapter>>(
      `/v1/bibles/${versionId}/books/${book}/chapters`,
    );
  }

  /**
   * Fetches a specific chapter for a book in a version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book (3 characters, e.g., "MAT").
   * @param chapter The chapter number
   * @returns The requested BibleChapter object.
   */
  async getChapter(versionId: number, book: string, chapter: number): Promise<BibleChapter> {
    this.versionIdSchema.parse(versionId);
    this.bookSchema.parse(book);
    this.chapterSchema.parse(chapter);

    return this.client.get<BibleChapter>(
      `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}`,
    );
  }

  /**
   * Fetches all verses for a specific chapter in a book and version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book (3 characters, e.g., "MAT").
   * @param chapter The chapter number.
   * @returns An array of BibleVerse objects.
   */
  async getVerses(
    versionId: number,
    book: string,
    chapter: number,
  ): Promise<Collection<BibleVerse>> {
    this.versionIdSchema.parse(versionId);
    this.bookSchema.parse(book);
    this.chapterSchema.parse(chapter);

    return this.client.get<Collection<BibleVerse>>(
      `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses`,
    );
  }

  /**
   * Fetches a specific verse from a chapter, book, and version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book (3 characters, e.g., "MAT").
   * @param chapter The chapter number.
   * @param verse The verse number.
   * @returns The requested BibleVerse object.
   */
  async getVerse(
    versionId: number,
    book: string,
    chapter: number,
    verse: number,
  ): Promise<BibleVerse> {
    this.versionIdSchema.parse(versionId);
    this.bookSchema.parse(book);
    this.chapterSchema.parse(chapter);
    this.verseSchema.parse(verse);

    return this.client.get<BibleVerse>(
      `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses/${verse}`,
    );
  }

  /**
   * Fetches a passage (range of verses) from the Bible using the passages endpoint.
   * This is the new API format that returns HTML-formatted content.
   * @param versionId The version ID.
   * @param usfm The USFM reference (e.g., "JHN.3.1-2", "GEN.1", "JHN.3.16").
   * @param format The format to return ("html" or "text", default: "html").
   * @param include_headings Whether to include headings in the content.
   * @param include_notes Whether to include notes in the content.
   * @returns The requested BiblePassage object with HTML content.
   * @example
   * ```ts
   * // Get a single verse
   * const verse = await bibleClient.getPassage(111, "JHN.3.16");
   *
   * // Get a range of verses
   * const verses = await bibleClient.getPassage(111, "JHN.3.1-5");
   *
   * // Get an entire chapter
   * const chapter = await bibleClient.getPassage(111, "GEN.1");
   * ```
   */
  async getPassage(
    versionId: number,
    usfm: string,
    format: 'html' | 'text' = 'html',
    include_headings?: boolean,
    include_notes?: boolean,
  ): Promise<BiblePassage> {
    this.versionIdSchema.parse(versionId);
    if (include_headings !== undefined) {
      this.booleanSchema.parse(include_headings);
    }
    if (include_notes !== undefined) {
      this.booleanSchema.parse(include_notes);
    }
    const params: Record<string, string | number | boolean> = {
      format,
    };
    if (include_headings !== undefined) {
      params.include_headings = include_headings;
    }
    if (include_notes !== undefined) {
      params.include_notes = include_notes;
    }
    return this.client.get<BiblePassage>(`/v1/bibles/${versionId}/passages/${usfm}`, params);
  }

  /**
   * Fetches the indexing structure for a Bible version.
   * @param versionId The version ID.
   * @returns The BibleIndex object containing full hierarchy of books, chapters, and verses.
   */
  async getIndex(versionId: number): Promise<BibleIndex> {
    this.versionIdSchema.parse(versionId);
    return this.client.get<BibleIndex>(`/v1/bibles/${versionId}/index`);
  }

  /**
   * Fetches the verse of the day calendar for an entire year.
   * @returns A collection of VOTD objects for all days of the year.
   */
  async getAllVOTDs(): Promise<Collection<VOTD>> {
    return this.client.get<Collection<VOTD>>(`/v1/verse_of_the_days`);
  }

  /**
   * Fetches the passage_id for the Verse Of The Day.
   * @param day The day of the year (1-366).
   * @returns The day of the year and the passage_id for that day of the year
   * @example
   * ```ts
   * // Get the passageId for the verse of the first day of the year.
   * const passageId = await bibleClient.getVOTD(1);
   *
   * // Get the passageId for the verse of the 100th day of the year.
   * const passageId = await bibleClient.getVOTD(100);
   * ```
   */
  async getVOTD(day: number): Promise<VOTD> {
    const daySchema = z.number().int().min(1).max(366);
    daySchema.parse(day);
    return this.client.get<VOTD>(`/v1/verse_of_the_days/${day}`);
  }
}
