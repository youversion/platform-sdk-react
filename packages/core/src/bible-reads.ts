import type { ApiClient } from './client';
import {
  assertUsableVersion,
  parseBibleBookId,
  parseBibleChapter,
  parseBibleVersionId,
} from './bible-chapter';
import { BibleVerseNumberSchema } from './schemas/verse';
import {
  VOTDCollectionWireSchema,
  VOTDRecordWireSchema,
  parseVOTDDay,
  parseVOTDLanguageQuery,
  type GetVOTDOptions,
} from './schemas/votd';
import type { BibleBook, BibleChapter, BibleVerse, CANON, Collection, VOTD } from './types';

export type { GetVOTDOptions };

const VOTD_COLLECTION_PATH = '/v1/verse-of-the-days';

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
  BibleVerseNumberSchema.parse(verse);
  await assertUsableVersion(client, versionId);
  return client.get<BibleVerse>(
    `/v1/bibles/${versionId}/books/${book}/chapters/${chapter}/verses/${verse}`,
  );
}

export async function getAllVOTDs(
  client: ApiClient,
  options?: GetVOTDOptions,
): Promise<Collection<VOTD>> {
  const params = parseVOTDLanguageQuery(options);
  const body = await client.get<unknown>(VOTD_COLLECTION_PATH, params);
  const parsed = VOTDCollectionWireSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected verse-of-the-day API response: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function getVOTD(
  client: ApiClient,
  day: number,
  options?: GetVOTDOptions,
): Promise<VOTD> {
  const parsedDay = parseVOTDDay(day);
  const path = `${VOTD_COLLECTION_PATH}/${parsedDay}`;
  const params = parseVOTDLanguageQuery(options);
  const body = await client.get<unknown>(path, params);
  const parsed = VOTDRecordWireSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected verse-of-the-day API response: ${parsed.error.message}`);
  }
  return parsed.data;
}
