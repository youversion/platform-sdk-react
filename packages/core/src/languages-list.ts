import * as z from 'zod/mini';
import type { ApiClient } from './client';
import type { Collection, Language } from './types';
import { LanguageSchema } from './schemas';
import {
  collectFilteredPage,
  fieldsNeededForLanguageFilter,
  isLanguageFilterActive,
  isUsableLanguageTag,
} from './version-filters';

export type GetLanguagesOptions = {
  page_size?: number | '*';
  fields?: (keyof Language)[];
  page_token?: string;
  country?: string; // ISO 3166-1 alpha-2 country code
};

const countrySchema = z
  .string()
  .check(
    z.trim(),
    z.length(2, 'Country code must be a 2-character ISO 3166-1 alpha-2 code'),
    z.toUpperCase(),
  );

export async function getLanguages(
  client: ApiClient,
  options: GetLanguagesOptions = {},
): Promise<Collection<Language>> {
  const params: Record<string, string | number | (keyof Language)[]> = {};

  if (options.country !== undefined) {
    const country = countrySchema.parse(options.country);
    params.country = country;
  }

  if (options.fields !== undefined) {
    z.array(z.keyof(LanguageSchema)).parse(options.fields);
    params['fields[]'] = options.fields;
  }

  if (options.page_size !== undefined) {
    z.union([z.int().check(z.positive()), z.literal('*')]).parse(options.page_size);

    if (options.page_size === '*') {
      const fieldsCount = options.fields?.length ?? 0;
      if (fieldsCount < 1 || fieldsCount > 3) {
        throw new Error('page_size="*" requires 1-3 fields to be specified');
      }
    }

    params.page_size = options.page_size;
  }

  const filterFields = fieldsNeededForLanguageFilter(options.fields);
  const pageSize = options.page_size;
  if (filterFields) {
    params['fields[]'] = filterFields;
    if (isLanguageFilterActive() && pageSize === '*' && filterFields.length > 3) {
      // API rejects page_size=* with more than 3 fields. Keep pageSize='*' so
      // collectFilteredPage still walks every server page. Unfiltered *+>3
      // stays a loud reject — do not drop * on that path.
      delete params.page_size;
    }
  }

  const fetchPage = (pageToken?: string) => {
    const pageParams = { ...params };
    if (pageToken) {
      pageParams.page_token = pageToken;
    }
    return client.get<Collection<Language>>(`/v1/languages`, pageParams);
  };

  if (!isLanguageFilterActive()) {
    return fetchPage(options.page_token);
  }

  return collectFilteredPage(
    fetchPage,
    (language) => isUsableLanguageTag(language.id),
    pageSize,
    options.page_token,
  );
}
