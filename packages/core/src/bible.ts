import { z } from 'zod';
import type { ApiClient } from './client';
import { transformBibleHtml, type TransformBibleHtmlOptions } from './bible-html-transformer';
import { BibleVersionSchema } from './schemas';
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

type VersionListQuery = {
  'language_ranges[]': string[];
  license_id?: string | number;
  page_size?: number | '*';
  'fields[]'?: string[];
  page_token?: string;
  all_available?: string;
};

type PassageQuery = {
  format: 'html' | 'text';
  include_headings?: boolean;
  include_notes?: boolean;
};

async function getHtmlAdapters(): Promise<TransformBibleHtmlOptions> {
  if (globalThis.DOMParser) {
    return {
      parseHtml: (h) => new globalThis.DOMParser().parseFromString(h, 'text/html'),
      serializeHtml: (doc) => doc.body.innerHTML,
    };
  }
  let jsdom;
  try {
    // Literal dynamic import is fine in Node. Client bundlers must not pull
    // jsdom into browser graphs — see package.json "browser": { "jsdom": false }.
    jsdom = await import('jsdom');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      'Server-side HTML transformation requires "jsdom". ' +
        'Install it as a dependency or pass transform: false to skip transformation. ' +
        `Original error: ${detail}`,
      { cause: err },
    );
  }
  return {
    parseHtml: (h) =>
      new jsdom.JSDOM(`<!DOCTYPE html><html><body>${h}</body></html>`).window.document,
    serializeHtml: (doc) => doc.body.innerHTML,
  };
}

/**
 * Client for interacting with Bible API endpoints.
 */
export class BibleClient {
  private client: ApiClient;

  // Validation schemas
  private static readonly versionIdSchema = z
    .number()
    .int()
    .positive('Version ID must be a positive integer');
  private static readonly bookSchema = z
    .string()
    .trim()
    .min(3, 'Book ID must be exactly 3 characters')
    .max(3, 'Book ID must be exactly 3 characters');
  private static readonly chapterSchema = z
    .number()
    .int('Chapter must be an integer')
    .positive('Chapter must be a positive integer');
  private static readonly verseSchema = z
    .number()
    .int('Verse must be an integer')
    .positive('Verse must be a positive integer');
  private static readonly languageRangesSchema = z
    .string()
    .trim()
    .min(1, 'Language ranges must be a non-empty string');
  private static readonly booleanSchema = z.boolean();
  private static readonly GetVersionsOptionsSchema = z
    .object({
      page_size: z.union([z.number().int().positive(), z.literal('*')]).optional(),
      page_token: z.string().optional(),
      fields: z.array(BibleVersionSchema.keyof()).optional(),
      all_available: z.boolean().optional(),
    })
    .optional()
    .refine(
      (data) => {
        if (data?.page_size === '*') {
          return data.fields && data.fields.length >= 1 && data.fields.length <= 3;
        }
        return true;
      },
      {
        message: 'page_size="*" required 1-3 fields to be specified',
        path: ['page_size', 'fields'],
      },
    );

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
    options?: z.infer<typeof BibleClient.GetVersionsOptionsSchema>,
  ): Promise<Collection<BibleVersion>> {
    const languageRangeArray = Array.isArray(language_ranges) ? language_ranges : [language_ranges];

    const parsedLanguageRanges = z
      .array(BibleClient.languageRangesSchema)
      .nonempty('At least one language range is required')
      .parse(languageRangeArray);

    const params: VersionListQuery = {
      'language_ranges[]': parsedLanguageRanges,
    };

    if (license_id) {
      params.license_id = license_id;
    }

    BibleClient.GetVersionsOptionsSchema.parse(options);
    if (options?.page_size) {
      params.page_size = options.page_size;
    }

    if (options?.fields) {
      params['fields[]'] = options.fields;
    }

    if (options?.page_token) {
      params.page_token = options.page_token;
    }

    if (options?.all_available) {
      params.all_available = 'true';
    }
    return this.client.get<Collection<BibleVersion>>(`/v1/bibles`, params);
  }

  /**
   * Fetches a Bible version by its ID.
   * @param id The version ID.
   * @returns The requested BibleVersion object.
   */
  async getVersion(id: number): Promise<BibleVersion> {
    BibleClient.versionIdSchema.parse(id);
    return this.client.get<BibleVersion>(`/v1/bibles/${id}`);
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
    BibleClient.versionIdSchema.parse(versionId);
    return this.client.get<Collection<BibleBook>>(`/v1/bibles/${versionId}/books`, {
      ...(canon && { canon }),
    });
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
    BibleClient.versionIdSchema.parse(versionId);
    BibleClient.bookSchema.parse(book);
    return this.client.get<BibleBook>(`/v1/bibles/${versionId}/books/${book}`);
  }

  /**
   * Fetches all chapters for a specific book in a version.
   * @param versionId The version ID.
   * @param book The Book Identifier code of the book.
   * @returns An array of BibleChapter objects.
   */
  async getChapters(versionId: number, book: string): Promise<Collection<BibleChapter>> {
    BibleClient.versionIdSchema.parse(versionId);
    BibleClient.bookSchema.parse(book);
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
    BibleClient.versionIdSchema.parse(versionId);
    BibleClient.bookSchema.parse(book);
    BibleClient.chapterSchema.parse(chapter);

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
    BibleClient.versionIdSchema.parse(versionId);
    BibleClient.bookSchema.parse(book);
    BibleClient.chapterSchema.parse(chapter);

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
    BibleClient.versionIdSchema.parse(versionId);
    BibleClient.bookSchema.parse(book);
    BibleClient.chapterSchema.parse(chapter);
    BibleClient.verseSchema.parse(verse);

    return this.client.get<BibleVerse>(
      `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses/${verse}`,
    );
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
    BibleClient.versionIdSchema.parse(versionId);
    if (include_headings !== undefined) {
      BibleClient.booleanSchema.parse(include_headings);
    }
    if (include_notes !== undefined) {
      BibleClient.booleanSchema.parse(include_notes);
    }
    const params: PassageQuery = {
      format,
    };
    if (include_headings !== undefined) {
      params.include_headings = include_headings;
    }
    if (include_notes !== undefined) {
      params.include_notes = include_notes;
    }
    const passage = await this.client.get<BiblePassage>(
      `/v1/bibles/${versionId}/passages/${usfm}`,
      params,
    );

    if (format === 'html' && transform !== false) {
      const adapters = await getHtmlAdapters();
      const { html } = transformBibleHtml(passage.content, adapters);
      return { ...passage, content: html };
    }

    return passage;
  }

  /**
   * Fetches the indexing structure for a Bible version.
   * @param versionId The version ID.
   * @returns The BibleIndex object containing full hierarchy of books, chapters, and verses.
   */
  async getIndex(versionId: number): Promise<BibleIndex> {
    BibleClient.versionIdSchema.parse(versionId);
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
