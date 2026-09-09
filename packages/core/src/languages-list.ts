import type { ApiClient } from './client';
import { parsePublic } from './parse-public';
import { GetLanguagesOptionsSchema, type GetLanguagesOptions } from './schemas/language';
import type { Collection, Language } from './types';
import {
  fetchFilteredCollection,
  fieldsNeededForLanguageFilter,
  isLanguageFilterActive,
  isUsableLanguageTag,
} from './version-filters';

export type { GetLanguagesOptions };

const PAGE_SIZE_STAR_FIELDS_MESSAGE = 'page_size="*" requires 1-3 fields to be specified';

export async function getLanguages(
  client: ApiClient,
  options: GetLanguagesOptions = {},
): Promise<Collection<Language>> {
  if (options.page_size === '*') {
    const fieldsCount = options.fields?.length ?? 0;
    if (fieldsCount < 1 || fieldsCount > 3) {
      throw new Error(PAGE_SIZE_STAR_FIELDS_MESSAGE);
    }
  }
  const parsed = parsePublic(GetLanguagesOptionsSchema, options);
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
