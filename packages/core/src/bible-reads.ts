import * as z from 'zod/mini';
import type { ApiClient } from './client';
import {
  assertUsableVersion,
  parseBibleBookId,
  parseBibleChapter,
  parseBibleVersionId,
} from './bible-chapter';
import type { BibleBook, BibleChapter, BibleVerse, CANON, Collection, VOTD } from './types';

const verseSchema = z
  .int({ error: 'Verse must be an integer' })
  .check(z.positive('Verse must be a positive integer'));

export async function getBooks(
  client: ApiClient,
  versionId: number,
  canon?: CANON,
): Promise<Collection<BibleBook>> {
  parseBibleVersionId(versionId);
  await assertUsableVersion(client, versionId);
  return client.get<Collection<BibleBook>>(`/v1/bibles/${versionId}/books`, {
    ...(canon && { canon }),
  });
}

export async function getBook(
  client: ApiClient,
  versionId: number,
  book: string,
): Promise<BibleBook> {
  parseBibleVersionId(versionId);
  parseBibleBookId(book);
  await assertUsableVersion(client, versionId);
  return client.get<BibleBook>(`/v1/bibles/${versionId}/books/${book}`);
}

export async function getChapters(
  client: ApiClient,
  versionId: number,
  book: string,
): Promise<Collection<BibleChapter>> {
  parseBibleVersionId(versionId);
  parseBibleBookId(book);
  await assertUsableVersion(client, versionId);
  return client.get<Collection<BibleChapter>>(`/v1/bibles/${versionId}/books/${book}/chapters`);
}

export async function getVerses(
  client: ApiClient,
  versionId: number,
  book: string,
  chapter: number,
): Promise<Collection<BibleVerse>> {
  parseBibleVersionId(versionId);
  parseBibleBookId(book);
  parseBibleChapter(chapter);
  await assertUsableVersion(client, versionId);
  return client.get<Collection<BibleVerse>>(
    `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses`,
  );
}

export async function getVerse(
  client: ApiClient,
  versionId: number,
  book: string,
  chapter: number,
  verse: number,
): Promise<BibleVerse> {
  parseBibleVersionId(versionId);
  parseBibleBookId(book);
  parseBibleChapter(chapter);
  verseSchema.parse(verse);
  await assertUsableVersion(client, versionId);
  return client.get<BibleVerse>(
    `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses/${verse}`,
  );
}

export async function getAllVOTDs(client: ApiClient): Promise<Collection<VOTD>> {
  return client.get<Collection<VOTD>>(`/v1/verse_of_the_days`);
}

export async function getVOTD(client: ApiClient, day: number): Promise<VOTD> {
  z.int().check(z.gte(1), z.lte(366)).parse(day);
  return client.get<VOTD>(`/v1/verse_of_the_days/${day}`);
}
