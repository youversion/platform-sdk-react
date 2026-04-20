import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { BibleClient } from '../bible';
import {
  BibleBookSchema,
  BibleChapterSchema,
  BiblePassageSchema,
  BibleVerseSchema,
  BibleVersionSchema,
  VOTDSchema,
} from '../schemas';
import { server } from './setup';
import { mockVersions } from './MockVersions';

describe('BibleClient', () => {
  let apiClient: ApiClient;
  let bibleClient: BibleClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    });
    bibleClient = new BibleClient(apiClient);
  });

  describe('getVersions', () => {
    it('should fetch number of Bible versions specified by page_size param', async () => {
      const versions = await bibleClient.getVersions('en*', undefined, { page_size: 11 });

      expect(versions.data.length).toEqual(11);
    });

    it('should fetch next page using page_token from first response', async () => {
      const firstPage = await bibleClient.getVersions('en*', undefined, { page_size: 5 });

      expect(firstPage.data.length).toEqual(5);
      expect(firstPage.next_page_token).toBeDefined();

      const secondPage = await bibleClient.getVersions('en*', undefined, {
        page_size: 5,
        page_token: firstPage.next_page_token!,
      });

      expect(secondPage.data.length).toEqual(5);
      expect(secondPage.data[0]?.id).not.toEqual(firstPage.data[0]?.id);
    });

    it('should fetch Bible versions with language ranges', async () => {
      const versions = await bibleClient.getVersions('en*');

      const { success } = BibleVersionSchema.safeParse(versions.data[0]);
      expect(success).toBe(true);

      const hasNIV = versions.data.some((version) => version.id === 111);
      expect(hasNIV).toBe(true);
    });

    it('should send multiple language ranges when provided', async () => {
      server.use(
        http.get('https://api.youversion.com/v1/bibles', ({ request }) => {
          const url = new URL(request.url);
          const languageRanges = url.searchParams.getAll('language_ranges[]');

          expect(languageRanges).toEqual(['en*', 'es*']);

          return HttpResponse.json({
            data: mockVersions,
            next_page_token: null,
            total_size: mockVersions.length,
          });
        }),
      );

      const versions = await bibleClient.getVersions(['en*', 'es*']);

      const { success } = BibleVersionSchema.safeParse(versions.data[0]);
      expect(success).toBe(true);
    });

    it('should accept a wildcard language range', async () => {
      server.use(
        http.get('https://api.youversion.com/v1/bibles', ({ request }) => {
          const url = new URL(request.url);
          const languageRanges = url.searchParams.getAll('language_ranges[]');

          expect(languageRanges).toEqual(['*']);

          return HttpResponse.json({
            data: mockVersions,
            next_page_token: null,
            total_size: mockVersions.length,
          });
        }),
      );

      const versions = await bibleClient.getVersions('*');

      const { success } = BibleVersionSchema.safeParse(versions.data[0]);
      expect(success).toBe(true);
    });

    it('should throw an error for invalid language ranges', async () => {
      await expect(bibleClient.getVersions('')).rejects.toThrow(
        'Language ranges must be a non-empty string',
      );
      await expect(bibleClient.getVersions('   ')).rejects.toThrow(
        'Language ranges must be a non-empty string',
      );
      await expect(bibleClient.getVersions([])).rejects.toThrow(
        'At least one language range is required',
      );
    });

    describe('options validation', () => {
      it('should accept valid page_size as positive integer', async () => {
        const versions = await bibleClient.getVersions('en*', undefined, { page_size: 10 });
        expect(versions.data.length).toBeLessThanOrEqual(10);
      });

      it('should accept page_size as "*" with 1-3 fields specified', async () => {
        server.use(
          http.get('*/v1/bibles', () => {
            return HttpResponse.json({
              data: mockVersions.map(({ id, title }) => ({ id, title })),
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {
          page_size: '*',
          fields: ['id', 'title'],
        });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should accept page_size as "*" with exactly 1 field', async () => {
        server.use(
          http.get('*/v1/bibles', () => {
            return HttpResponse.json({
              data: mockVersions.map(({ id }) => ({ id })),
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {
          page_size: '*',
          fields: ['id'],
        });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should accept page_size as "*" with exactly 3 fields', async () => {
        server.use(
          http.get('*/v1/bibles', () => {
            return HttpResponse.json({
              data: mockVersions.map(({ id, title, abbreviation }) => ({
                id,
                title,
                abbreviation,
              })),
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {
          page_size: '*',
          fields: ['id', 'title', 'abbreviation'],
        });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should throw when page_size is "*" but no fields specified', async () => {
        await expect(bibleClient.getVersions('en*', undefined, { page_size: '*' })).rejects.toThrow(
          /required 1-3 fields to be specified/,
        );
      });

      it('should throw when page_size is "*" with empty fields array', async () => {
        await expect(
          bibleClient.getVersions('en*', undefined, { page_size: '*', fields: [] }),
        ).rejects.toThrow(/required 1-3 fields to be specified/);
      });

      it('should throw when page_size is "*" with more than 3 fields', async () => {
        await expect(
          bibleClient.getVersions('en*', undefined, {
            page_size: '*',
            fields: ['id', 'title', 'abbreviation', 'language_tag'],
          }),
        ).rejects.toThrow(/required 1-3 fields to be specified/);
      });

      it('should throw for page_size of zero', async () => {
        await expect(bibleClient.getVersions('en*', undefined, { page_size: 0 })).rejects.toThrow();
      });

      it('should throw for negative page_size', async () => {
        await expect(
          bibleClient.getVersions('en*', undefined, { page_size: -1 }),
        ).rejects.toThrow();
      });

      it('should throw for non-integer page_size', async () => {
        await expect(
          bibleClient.getVersions('en*', undefined, { page_size: 1.5 }),
        ).rejects.toThrow();
      });

      it('should throw for invalid page_size string', async () => {
        await expect(
          // @ts-expect-error - testing invalid input
          bibleClient.getVersions('en*', undefined, { page_size: 'invalid' }),
        ).rejects.toThrow();
      });

      it('should accept valid page_token string', async () => {
        server.use(
          http.get('*/v1/bibles', () => {
            return HttpResponse.json({
              data: mockVersions,
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {
          page_token: 'some-token-value',
        });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should accept valid fields array with BibleVersionSchema keys', async () => {
        server.use(
          http.get('*/v1/bibles', () => {
            return HttpResponse.json({
              data: mockVersions,
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {
          fields: ['id', 'title', 'abbreviation'],
        });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should throw for invalid fields that are not BibleVersionSchema keys', async () => {
        await expect(
          bibleClient.getVersions('en*', undefined, {
            // @ts-expect-error - testing invalid input
            fields: ['invalid_field'],
          }),
        ).rejects.toThrow();
      });

      it('should accept undefined options', async () => {
        const versions = await bibleClient.getVersions('en*', undefined, undefined);
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should accept empty options object', async () => {
        const versions = await bibleClient.getVersions('en*', undefined, {});
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should send all_available param when set to true', async () => {
        server.use(
          http.get('*/v1/bibles', ({ request }) => {
            const url = new URL(request.url);
            const allAvailable = url.searchParams.get('all_available');

            expect(allAvailable).toBe('true');

            return HttpResponse.json({
              data: mockVersions,
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, { all_available: true });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should not send all_available param when set to false', async () => {
        server.use(
          http.get('*/v1/bibles', ({ request }) => {
            const url = new URL(request.url);
            const allAvailable = url.searchParams.get('all_available');

            expect(allAvailable).toBeNull();

            return HttpResponse.json({
              data: mockVersions,
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, { all_available: false });
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should not send all_available param when not specified', async () => {
        server.use(
          http.get('*/v1/bibles', ({ request }) => {
            const url = new URL(request.url);
            const allAvailable = url.searchParams.get('all_available');

            expect(allAvailable).toBeNull();

            return HttpResponse.json({
              data: mockVersions,
              next_page_token: null,
              total_size: mockVersions.length,
            });
          }),
        );

        const versions = await bibleClient.getVersions('en*', undefined, {});
        expect(versions.data.length).toBeGreaterThan(0);
      });

      it('should throw for invalid all_available type', async () => {
        await expect(
          // @ts-expect-error - testing invalid input
          bibleClient.getVersions('en*', undefined, { all_available: 'true' }),
        ).rejects.toThrow();
      });
    });
  });

  describe('getVersion', () => {
    it('should fetch a Bible version by ID', async () => {
      const version = await bibleClient.getVersion(1);

      const { success } = BibleVersionSchema.safeParse(version);
      expect(success).toBe(true);
      expect(version).toHaveProperty('id', 1);
    });

    it('should throw an error for invalid version ID', async () => {
      await expect(bibleClient.getVersion(0)).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(bibleClient.getVersion(-1)).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(bibleClient.getVersion(1.5)).rejects.toThrow();
      await expect(bibleClient.getVersion(NaN)).rejects.toThrow();
    });
  });

  describe('getBooks', () => {
    it('should fetch all books for a version', async () => {
      const books = await bibleClient.getBooks(111);

      const { success } = BibleBookSchema.safeParse(books.data[0]);
      expect(success).toBe(true);

      expect(books.data).toHaveLength(66);
      expect(books.data[0]).toHaveProperty('id', 'GEN');
      expect(books.data[0]).toHaveProperty('title', 'Genesis');
      expect(books.data[0]).toHaveProperty('full_title', 'Genesis');
      expect(books.data[0]).toHaveProperty('abbreviation', 'Gen.');
      expect(books.data[0]?.intro).toEqual({
        id: 'INTRO',
        passage_id: 'GEN.INTRO',
        title: 'Intro',
      });
      expect(books.data[0]).toHaveProperty('canon', 'old_testament');
      expect(books.data[0]?.chapters).toHaveLength(50);
    });
  });

  describe('getBook', () => {
    it('should fetch a specific book', async () => {
      const book = await bibleClient.getBook(111, 'GEN');

      const { success } = BibleBookSchema.safeParse(book);
      expect(success).toBe(true);

      expect(book.chapters).toHaveLength(50);
      expect(book).toHaveProperty('id', 'GEN');
      expect(book).toHaveProperty('title', 'Genesis');
      expect(book).toHaveProperty('abbreviation', 'Gen.');
      expect(book).toHaveProperty('intro');
      expect(book.intro).toEqual({
        id: 'INTRO',
        passage_id: 'GEN.INTRO',
        title: 'Intro',
      });
      expect(book).toHaveProperty('canon', 'old_testament');
    });

    it('should throw an error for invalid inputs', async () => {
      await expect(bibleClient.getBook(0, 'GEN')).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(bibleClient.getBook(1, 'AB')).rejects.toThrow(
        'Book ID must be exactly 3 characters',
      );
      await expect(bibleClient.getBook(1, 'ABCD')).rejects.toThrow(
        'Book ID must be exactly 3 characters',
      );
    });
  });

  describe('getChapters', () => {
    it('should fetch all chapters for a book', async () => {
      const chapters = await bibleClient.getChapters(1, 'GEN');

      const { success } = BibleChapterSchema.safeParse(chapters.data[0]);
      expect(success).toBe(true);

      expect(chapters.data).toHaveLength(50);
      expect(chapters.data[0]).toHaveProperty('id', '1');
      expect(chapters.data[0]).toHaveProperty('passage_id', 'GEN.1');
      expect(chapters.data[0]).toHaveProperty('title', '1');
      expect(chapters.data[0]?.verses).toHaveLength(31);
    });
  });

  describe('getChapter', () => {
    it('should fetch a specific chapter', async () => {
      const chapter = await bibleClient.getChapter(1, 'GEN', 1);

      const { success } = BibleChapterSchema.safeParse(chapter);
      expect(success).toBe(true);

      expect(chapter).toHaveProperty('id', '1');
      expect(chapter).toHaveProperty('passage_id', 'GEN.1');
      expect(chapter).toHaveProperty('title', '1');
      expect(chapter.verses).toHaveLength(31);
    });

    it('should reject invalid chapter numbers', async () => {
      await expect(bibleClient.getChapter(1, 'GEN', 0)).rejects.toThrow(
        'Chapter must be a positive integer',
      );
      await expect(bibleClient.getChapter(1, 'GEN', -1)).rejects.toThrow(
        'Chapter must be a positive integer',
      );
    });
  });

  describe('getVerses', () => {
    it('should fetch all verses for a chapter', async () => {
      const verses = await bibleClient.getVerses(1, 'GEN', 1);

      const { success } = BibleVerseSchema.safeParse(verses.data[0]);
      expect(success).toBe(true);

      expect(verses.data).toHaveLength(31);
      expect(verses.data[0]).toHaveProperty('id', '1');
      expect(verses.data[0]).toHaveProperty('title', '1');
      expect(verses.data[0]).toHaveProperty('passage_id', 'GEN.1.1');
    });
  });

  describe('getVerse', () => {
    it('should fetch a specific verse', async () => {
      const verse = await bibleClient.getVerse(1, 'GEN', 1, 1);

      const { success } = BibleVerseSchema.safeParse(verse);
      expect(success).toBe(true);

      expect(verse).toHaveProperty('id', '1');
      expect(verse).toHaveProperty('title', '1');
      expect(verse).toHaveProperty('passage_id', 'GEN.1.1');
    });

    it('should throw an error for invalid inputs', async () => {
      await expect(bibleClient.getVerse(0, 'GEN', 1, 1)).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(bibleClient.getVerse(1, 'AB', 1, 1)).rejects.toThrow(
        'Book ID must be exactly 3 characters',
      );
      await expect(bibleClient.getVerse(1, 'GEN', 0, 1)).rejects.toThrow(
        'Chapter must be a positive integer',
      );
      await expect(bibleClient.getVerse(1, 'GEN', 1, 0)).rejects.toThrow(
        'Verse must be a positive integer',
      );
      await expect(bibleClient.getVerse(1, 'GEN', -1, 1)).rejects.toThrow(
        'Chapter must be a positive integer',
      );
      await expect(bibleClient.getVerse(1, 'GEN', 1, -1)).rejects.toThrow(
        'Verse must be a positive integer',
      );
    });
  });

  describe('getPassage', () => {
    it('should fetch a passage for a verse and auto-transform HTML', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1');

      const { success } = BiblePassageSchema.safeParse(passage);
      expect(success).toBe(true);

      expect(passage.id).toBe('GEN.1.1');
      expect(passage.reference).toBe('Genesis 1:1');
      expect(passage.content).toContain('data-yv-transformed');
      expect(passage.content).toContain('In the beginning God created');
    });

    it('should fetch a passage for a chapter', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1');

      const { success } = BiblePassageSchema.safeParse(passage);
      expect(success).toBe(true);

      expect(passage).toHaveProperty('id', 'GEN.1');
      expect(passage).toHaveProperty('reference', 'Genesis 1');
    });

    it('should fetch a passage with html format by default', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1');

      expect(passage.content).toContain('<div');
      expect(passage.content).toContain('data-yv-transformed');
    });

    it('should not transform text format', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1', 'text');

      expect(passage.content).not.toContain('<div>');
      expect(passage.content).not.toContain('data-yv-transformed');
    });

    it('should fetch a passage with include_headings', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', true);

      expect(passage.id).toBe('ROM.1');
      expect(passage.content).toContain('yv-h');
      expect(passage.content).not.toContain('data-verse-footnote');
    });

    it('should fetch a passage with include_notes and transform footnotes', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', undefined, true);

      expect(passage.id).toBe('ROM.1');
      // Footnotes are transformed into data-verse-footnote anchors
      expect(passage.content).toContain('data-verse-footnote');
      expect(passage.content).not.toContain('yv-h');
    });

    it('should fetch a passage with both include_headings and include_notes', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', true, true);

      expect(passage.id).toBe('ROM.1');
      expect(passage.content).toContain('data-verse-footnote');
      expect(passage.content).toContain('yv-h');
    });

    it('should throw an error for invalid version ID', async () => {
      await expect(bibleClient.getPassage(0, 'GEN.1.1')).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(bibleClient.getPassage(-1, 'GEN.1.1')).rejects.toThrow(
        'Version ID must be a positive integer',
      );
    });

    it('should throw an error for invalid include_headings', async () => {
      // @ts-expect-error - we want to test the error case
      await expect(bibleClient.getPassage(1, 'GEN.1.1', 'html', 'true')).rejects.toThrow();
    });

    it('should throw an error for invalid include_notes', async () => {
      await expect(
        // @ts-expect-error - we want to test the error case
        bibleClient.getPassage(1, 'GEN.1.1', 'html', undefined, 'true'),
      ).rejects.toThrow();
    });
  });

  describe('getVOTD', () => {
    it('should fetch VOTD for day 1', async () => {
      const votd = await bibleClient.getVOTD(1);

      const { success } = VOTDSchema.safeParse(votd);
      expect(success).toBe(true);

      expect(votd).toEqual({
        day: 1,
        passage_id: 'ISA.43.19',
      });
    });

    it('should fetch VOTD for day 100', async () => {
      const votd = await bibleClient.getVOTD(100);

      const { success } = VOTDSchema.safeParse(votd);
      expect(success).toBe(true);

      expect(votd.day).toBe(100);
      expect(votd.passage_id).toBeDefined();
    });

    it('should fetch VOTD for day 366', async () => {
      const votd = await bibleClient.getVOTD(366);

      const { success } = VOTDSchema.safeParse(votd);
      expect(success).toBe(true);

      expect(votd.day).toBe(366);
      expect(votd.passage_id).toBeDefined();
    });

    it('should throw an error for day less than 1', async () => {
      await expect(bibleClient.getVOTD(0)).rejects.toThrow();
      await expect(bibleClient.getVOTD(-1)).rejects.toThrow();
    });

    it('should throw an error for day greater than 366', async () => {
      await expect(bibleClient.getVOTD(367)).rejects.toThrow();
    });

    it('should throw an error for non-integer day', async () => {
      await expect(bibleClient.getVOTD(1.5)).rejects.toThrow();
    });

    it('should throw an error for NaN', async () => {
      await expect(bibleClient.getVOTD(NaN)).rejects.toThrow();
    });
  });

  describe('getAllVOTDs', () => {
    it('should fetch all VOTDs', async () => {
      const votds = await bibleClient.getAllVOTDs();

      const { success } = VOTDSchema.safeParse(votds.data[0]);
      expect(success).toBe(true);

      expect(votds.data).toHaveLength(366);
      expect(votds.data[0]).toEqual({
        day: 1,
        passage_id: 'ISA.43.19',
      });
    });
  });
});
