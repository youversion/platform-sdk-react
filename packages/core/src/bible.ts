import type { ApiClient } from './client';
import { assertUsableVersion, getChapter, getVersion, parseBibleVersionId } from './bible-chapter';
import { getPassage } from './bible-passage';
import {
  getAllVOTDs,
  getBook,
  getBooks,
  getChapters,
  getVerse,
  getVerses,
  getVOTD,
} from './bible-reads';
import { getVersions, type GetVersionsOptions } from './bible-versions';
import type {
  BibleBook,
  BibleChapter,
  BibleIndex,
  BiblePassage,
  BibleVerse,
  BibleVersion,
  CANON,
  Collection,
  VOTD,
} from './types';

/**
 * Client for interacting with Bible API endpoints.
 */
export class BibleClient {
  private client: ApiClient;

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
   * @param language_ranges - One or more language codes or ranges to filter the versions (required).
   * @param license_id - Optional license ID to filter versions by license.
   * @returns A promise that resolves to a collection of BibleVersion objects.
   */
  async getVersions(
    language_ranges: string | string[],
    license_id?: string | number,
    options?: GetVersionsOptions,
  ): Promise<Collection<BibleVersion>> {
    return getVersions(this.client, language_ranges, license_id, options);
  }

  /**
   * Fetches a Bible version by its ID.
   * @param id The version ID.
   * @returns The requested BibleVersion object.
   */
  async getVersion(id: number): Promise<BibleVersion> {
    return getVersion(this.client, id);
  }

  /**
   * Fetches all books for a given Bible version.
   * @param versionId The version ID.
   * @param canon Optional canon filter ("old_testament", 'new_testament', 'deuterocanon').
   * @returns An array of BibleBook objects. Each book may include an optional `intro` field
   *          containing metadata (id, passage_id, title) for the book's introduction when
   *          available in the Bible version.
   */
  async getBooks(versionId: number, canon?: CANON): Promise<Collection<BibleBook>> {
    return getBooks(this.client, versionId, canon);
  }

  /**
   * Fetches a specific book by USFM code for a given version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book.
   * @returns The requested BibleBook object, which may include an optional `intro` field
   *          containing metadata (id, passage_id, title) for the book's introduction when
   *          available. Use the `passage_id` with `getPassage()` to fetch intro content.
   */
  async getBook(versionId: number, book: string): Promise<BibleBook> {
    return getBook(this.client, versionId, book);
  }

  /**
   * Fetches all chapters for a specific book in a version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book.
   * @returns An array of BibleChapter objects.
   */
  async getChapters(versionId: number, book: string): Promise<Collection<BibleChapter>> {
    return getChapters(this.client, versionId, book);
  }

  /**
   * Fetches a specific chapter for a book in a version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book (3 characters, e.g., "MAT").
   * @param chapter The chapter number
   * @returns The requested BibleChapter object.
   */
  async getChapter(versionId: number, book: string, chapter: number): Promise<BibleChapter> {
    return getChapter(this.client, versionId, book, chapter);
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
    return getVerses(this.client, versionId, book, chapter);
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
    return getVerse(this.client, versionId, book, chapter, verse);
  }

  /**
   * Fetches a passage (range of verses) from the Bible using the passages endpoint.
   *
   * When format is "html" (the default), the returned content is automatically
   * sanitized and transformed — verse content is wrapped for CSS targeting,
   * footnotes are extracted into data attributes, and verse labels get
   * non-breaking spaces. No manual call to `transformBibleHtml` is needed.
   *
   * @param versionId The version ID.
   * @param usfm The USFM reference (e.g., "JHN.3.1-2", "GEN.1", "JHN.3.16").
   * @param format The format to return ("html" or "text", default: "html").
   * @param include_headings Whether to include headings in the content.
   * @param include_notes Whether to include notes in the content.
   * @param transform Whether to auto-transform HTML content (default: `true`).
   *   Set to `false` to receive the original, untransformed HTML from the API.
   *   Raw HTML is sufficient for simple display (e.g., verse-of-the-day) where
   *   verse-level interactivity like highlighting or footnote popovers isn't
   *   needed. Also avoids the `jsdom` dependency on the server.
   * @returns The requested BiblePassage object.
   *
   * @example
   * ```ts
   * // Get a single verse
   * const verse = await bibleClient.getPassage(3034, "JHN.3.16");
   *
   * // Get a range of verses
   * const verses = await bibleClient.getPassage(3034, "JHN.3.1-5");
   *
   * // Get an entire chapter
   * const chapter = await bibleClient.getPassage(3034, "GEN.1");
   *
   * // Get plain text (no transformation applied)
   * const text = await bibleClient.getPassage(3034, "JHN.3.16", "text");
   *
   * // Get raw, untransformed HTML (no jsdom needed on server)
   * const raw = await bibleClient.getPassage(3034, "JHN.3.16", "html", undefined, undefined, false);
   * ```
   */
  async getPassage(
    versionId: number,
    usfm: string,
    format: 'html' | 'text' = 'html',
    include_headings?: boolean,
    include_notes?: boolean,
    transform?: boolean,
  ): Promise<BiblePassage> {
    return getPassage(
      this.client,
      versionId,
      usfm,
      format,
      include_headings,
      include_notes,
      transform,
    );
  }

  /**
   * Fetches the indexing structure for a Bible version.
   * @param versionId The version ID.
   * @returns The BibleIndex object containing full hierarchy of books, chapters, and verses.
   */
  async getIndex(versionId: number): Promise<BibleIndex> {
    parseBibleVersionId(versionId);
    await assertUsableVersion(this.client, versionId);
    return this.client.get<BibleIndex>(`/v1/bibles/${versionId}/index`);
  }

  /**
   * Fetches the verse of the day calendar for an entire year.
   * @returns A collection of VOTD objects for all days of the year.
   */
  async getAllVOTDs(): Promise<Collection<VOTD>> {
    return getAllVOTDs(this.client);
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
    return getVOTD(this.client, day);
  }
}
