import type { ApiClient } from './client';
import { parsePublic } from './parse-public';
import { LanguageIdSchema } from './schemas/language';
import type { Language } from './types';

export async function getLanguage(client: ApiClient, languageId: string): Promise<Language> {
  parsePublic(LanguageIdSchema, languageId);
  return client.get<Language>(`/v1/languages/${languageId}`);
}
