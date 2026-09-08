import type { ApiClient } from './client';
import { GetLanguagesOptionsSchema, type GetLanguagesOptions } from './schemas/language';
import type { Collection, Language } from './types';
import {
  fetchFilteredCollection,
  fieldsNeededForLanguageFilter,
  isLanguageFilterActive,
  isUsableLanguageTag,
} from './version-filters';

export type { GetLanguagesOptions };

export async function getLanguages(
  client: ApiClient,
  options: GetLanguagesOptions = {},
): Promise<Collection<Language>> {
  const parsed = GetLanguagesOptionsSchema.parse(options);
  const params: Record<string, string | number | (keyof Language)[]> = {};

  if (parsed.country !== undefined) {
    params.country = parsed.country;
  }

  if (parsed.fields !== undefined) {
    params['fields[]'] = parsed.fields;
  }

  if (parsed.page_size !== undefined) {
    params.page_size = parsed.page_size;
  }

  const filterFields = fieldsNeededForLanguageFilter(parsed.fields);
  return fetchFilteredCollection<Language>(params, options, {
    fieldsNeeded: () => filterFields,
    isFilterActive: isLanguageFilterActive,
    fetchPage: (pageToken) => {
      const pageParams = { ...params };
      if (pageToken) {
        pageParams.page_token = pageToken;
      }
      return client.get<Collection<Language>>(`/v1/languages`, pageParams);
    },
    isUsable: (language) => isUsableLanguageTag(language.id),
  });
}
