import * as z from 'zod/mini';
import type { ApiClient } from './client';
import type { Language } from './types';

const languageIdSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Language ID must be a non-empty string'),
    z.regex(
      /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/,
      'Language ID must match BCP 47 format (language or language+script)',
    ),
  );

export async function getLanguage(client: ApiClient, languageId: string): Promise<Language> {
  languageIdSchema.parse(languageId);
  return client.get<Language>(`/v1/languages/${languageId}`);
}
