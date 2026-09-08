import * as z from 'zod/mini';
import type { ApiClient } from './client';
import type { BibleChapter, BibleVersion } from './types';
import {
  isLanguageFilterActive,
  isUsableBibleVersion,
  isVersionIdDecidablyUnusable,
  throwUnusableBibleVersion,
} from './version-filters';

const versionIdSchema = z.int().check(z.positive('Version ID must be a positive integer'));
const bookSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(3, 'Book ID must be exactly 3 characters'),
    z.maxLength(3, 'Book ID must be exactly 3 characters'),
  );
const chapterSchema = z
  .int({ error: 'Chapter must be an integer' })
  .check(z.positive('Chapter must be a positive integer'));

export function parseBibleVersionId(id: number): number {
  return versionIdSchema.parse(id);
}

export function parseBibleBookId(book: string): string {
  return bookSchema.parse(book);
}

export function parseBibleChapter(chapter: number): number {
  return chapterSchema.parse(chapter);
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
