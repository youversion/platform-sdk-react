import type { ApiClient } from './client';
import type { Collection, Language } from './types';
import { GetLanguagesOptionsSchema, type GetLanguagesOptions } from './schemas';
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
    if (parsed.page_size === '*') {
      const fieldsCount = parsed.fields?.length ?? 0;
      if (fieldsCount < 1 || fieldsCount > 3) {
        throw new Error('page_size="*" requires 1-3 fields to be specified');
      }
    }

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
