import * as z from 'zod/mini';
import type { ApiClient } from './client';
import { GetVersionsOptionsSchema, type GetVersionsOptions } from './schemas';
import type { BibleVersion, Collection } from './types';
import {
  fetchFilteredCollection,
  fieldsNeededForVersionFilter,
  isUsableBibleVersion,
  isVersionFilterActive,
} from './version-filters';

export { GetVersionsOptionsSchema };
export type { GetVersionsOptions };

type VersionListQuery = {
  'language_ranges[]': string[];
  license_id?: string | number;
  page_size?: number | '*';
  'fields[]'?: string[];
  page_token?: string;
  all_available?: string;
};

const languageRangesSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Language ranges must be a non-empty string'));

export async function getVersions(
  client: ApiClient,
  language_ranges: string | string[],
  license_id?: string | number,
  options?: GetVersionsOptions,
): Promise<Collection<BibleVersion>> {
  const languageRangeArray = Array.isArray(language_ranges) ? language_ranges : [language_ranges];

  const parsedLanguageRanges = z
    .array(languageRangesSchema)
    .check(z.minLength(1, 'At least one language range is required'))
    .parse(languageRangeArray);

  const params: VersionListQuery = {
    'language_ranges[]': parsedLanguageRanges,
  };

  if (license_id) {
    params.license_id = license_id;
  }

  GetVersionsOptionsSchema.parse(options);
  if (options?.page_size) {
    params.page_size = options.page_size;
  }

  if (options?.fields) {
    params['fields[]'] = options.fields;
  }

  if (options?.all_available) {
    params.all_available = 'true';
  }

  const filterFields = fieldsNeededForVersionFilter(options?.fields);
  return fetchFilteredCollection<BibleVersion>(params, options ?? {}, {
    fieldsNeeded: () => filterFields,
    isFilterActive: isVersionFilterActive,
    fetchPage: (pageToken) => {
      const pageParams = { ...params };
      if (pageToken) {
        pageParams.page_token = pageToken;
      }
      return client.get<Collection<BibleVersion>>(`/v1/bibles`, pageParams);
    },
    isUsable: (version) =>
      isUsableBibleVersion({ id: version.id, languageTag: version.language_tag }),
  });
}
