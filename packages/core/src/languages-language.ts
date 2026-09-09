import type { ApiClient } from './client';
import { LanguageIdSchema } from './schemas/language';
import type { Language } from './types';

export async function getLanguage(client: ApiClient, languageId: string): Promise<Language> {
  LanguageIdSchema.parse(languageId);
  return client.get<Language>(`/v1/languages/${languageId}`);
}
