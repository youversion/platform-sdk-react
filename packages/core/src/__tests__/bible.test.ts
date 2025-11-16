import { describe, it, expect, beforeEach } from 'vitest';
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

describe('BibleClient', () => {
  let apiClient: ApiClient;
  let bibleClient: BibleClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    });
    bibleClient = new BibleClient(apiClient);
  });

  describe('getVersions', () => {
    it('should fetch Bible versions with language ranges', async () => {
      const versions = await bibleClient.getVersions('en*');

      const { success } = BibleVersionSchema.safeParse(versions.data[0]);
      expect(success).toBe(true);

      const hasNIV = versions.data.some((version) => version.id === 111);
      expect(hasNIV).toBe(true);
    });

    it('should throw an error for invalid language ranges', async () => {
      await expect(bibleClient.getVersions('')).rejects.toThrow(
        'Language ranges must be a non-empty string',
      );
      await expect(bibleClient.getVersions('   ')).rejects.toThrow(
        'Language ranges must be a non-empty string',
      );
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
      const books = await bibleClient.getBooks(1);

      const { success } = BibleBookSchema.safeParse(books.data[0]);
      expect(success).toBe(true);

      expect(books.data).toHaveLength(66);
      expect(books.data[0]).toHaveProperty('id', 'GEN');
      expect(books.data[0]).toHaveProperty('title', 'Genesis');
      expect(books.data[0]).toHaveProperty('abbreviation', 'Gen');
      expect(books.data[0]).toHaveProperty('canon', 'ot');
    });
  });

  describe('getBook', () => {
    it('should fetch a specific book', async () => {
      const book = await bibleClient.getBook(1, 'GEN');

      const { success } = BibleBookSchema.safeParse(book);
      expect(success).toBe(true);

      expect(book.chapters).toHaveLength(50);
      expect(book).toHaveProperty('id', 'GEN');
      expect(book).toHaveProperty('title', 'Genesis');
      expect(book).toHaveProperty('abbreviation', 'Gen');
      expect(book).toHaveProperty('canon', 'ot');
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
      expect(chapters.data[0]).toHaveProperty('book_id', 'GEN');
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
      expect(chapter).toHaveProperty('book_id', 'GEN');
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

      expect(verses.data).toHaveLength(24);
      expect(verses.data[0]).toHaveProperty('id', '1');
      expect(verses.data[0]).toHaveProperty('reference', 'Genesis 1:1');
      expect(verses.data[0]).toHaveProperty('book_id', 'GEN');
      expect(verses.data[0]).toHaveProperty('chapter_id', '1');
      expect(verses.data[0]).toHaveProperty('passage_id', 'GEN.1.1');
    });
  });

  describe('getVerse', () => {
    it('should fetch a specific verse', async () => {
      const verse = await bibleClient.getVerse(1, 'GEN', 1, 1);

      const { success } = BibleVerseSchema.safeParse(verse);
      expect(success).toBe(true);

      expect(verse).toHaveProperty('id', '1');
      expect(verse).toHaveProperty('reference', 'Genesis 1:1');
      expect(verse).toHaveProperty('book_id', 'GEN');
      expect(verse).toHaveProperty('chapter_id', '1');
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
    it('should fetch a passage for a verse', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1');

      const { success } = BiblePassageSchema.safeParse(passage);
      expect(success).toBe(true);

      expect(passage).toEqual({
        id: 'GEN.1.1',
        content:
          '<div><div class="pi"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning God created the heavens and the earth. </div></div>',
        bible_id: 111,
        human_reference: 'Genesis 1:1',
      });
    });

    it('should fetch a passage for a chapter', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1');

      const { success } = BiblePassageSchema.safeParse(passage);
      expect(success).toBe(true);

      expect(passage).toHaveProperty('id', 'GEN.1');
      expect(passage).toHaveProperty('bible_id', 111);
      expect(passage).toHaveProperty('human_reference', 'Genesis 1');
    });

    it('should fetch a passage with html format by default', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1');

      expect(passage.content).toContain('<div>');
    });

    it('should fetch a passage with text format', async () => {
      const passage = await bibleClient.getPassage(111, 'GEN.1.1', 'text');

      expect(passage.content).not.toContain('<div>');
    });

    it('should fetch a passage with include_headings', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', true);

      expect(passage.id).toBe('ROM.1');
      expect(passage.bible_id).toBe(111);
      expect(passage.content).toContain('yv-h');
      expect(passage.content).not.toContain('yv-n');
    });

    it('should fetch a passage with include_notes', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', undefined, true);

      expect(passage.id).toBe('ROM.1');
      expect(passage.bible_id).toBe(111);
      expect(passage.content).toContain('yv-n');
      expect(passage.content).not.toContain('yv-h');
    });

    it('should fetch a passage with both include_headings and include_notes', async () => {
      const passage = await bibleClient.getPassage(111, 'ROM.1', 'html', true, true);

      expect(passage.id).toBe('ROM.1');
      expect(passage.bible_id).toBe(111);
      expect(passage.content).toContain('yv-n');
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
