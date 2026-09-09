import type { ApiClient } from './client';
import { parsePublic } from './parse-public';
import { BibleBookIdSchema } from './schemas/book';
import { BibleChapterNumberSchema } from './schemas/chapter';
import { BibleVersionIdSchema } from './schemas/version';
import type { BibleChapter, BibleVersion } from './types';
import {
  isLanguageFilterActive,
  isUsableBibleVersion,
  isVersionIdDecidablyUnusable,
  throwUnusableBibleVersion,
} from './version-filters';

export function parseBibleVersionId(id: number): number {
  return parsePublic(BibleVersionIdSchema, id);
}

export function parseBibleBookId(book: string): string {
  return parsePublic(BibleBookIdSchema, book);
}

export function parseBibleChapter(chapter: number): number {
  return parsePublic(BibleChapterNumberSchema, chapter);
}

export async function getVersion(client: ApiClient, id: number): Promise<BibleVersion> {
  parseBibleVersionId(id);
  if (isVersionIdDecidablyUnusable(id)) {
    throwUnusableBibleVersion();
  }
  const version = await client.get<BibleVersion>(`/v1/bibles/${id}`);
  if (!isUsableBibleVersion({ id: version.id, languageTag: version.language_tag })) {
    throwUnusableBibleVersion();
  }
  return version;
}

export async function assertUsableVersion(client: ApiClient, versionId: number): Promise<void> {
  if (isVersionIdDecidablyUnusable(versionId)) {
    throwUnusableBibleVersion();
  }
  if (isLanguageFilterActive()) {
    await getVersion(client, versionId);
  }
}

export async function getChapter(
  client: ApiClient,
  versionId: number,
  book: string,
  chapter: number,
): Promise<BibleChapter> {
  parseBibleVersionId(versionId);
  parseBibleBookId(book);
  parseBibleChapter(chapter);
  await assertUsableVersion(client, versionId);
  return client.get<BibleChapter>(`/v1/bibles/${versionId}/books/${book}/chapters/${chapter}`);
}
