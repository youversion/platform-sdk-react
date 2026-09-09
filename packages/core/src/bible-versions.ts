import * as z from 'zod/mini';
import type { ApiClient } from './client';
import { parsePublic } from './parse-public';
import {
  LanguageRangeSchema,
  GetVersionsOptionsSchema,
  type GetVersionsOptions,
} from './schemas/version';
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

export async function getVersions(
  client: ApiClient,
  language_ranges: string | string[],
  license_id?: string | number,
  options?: GetVersionsOptions,
): Promise<Collection<BibleVersion>> {
  const languageRangeArray = Array.isArray(language_ranges) ? language_ranges : [language_ranges];

  const parsedLanguageRanges = parsePublic(
    z.array(LanguageRangeSchema).check(z.minLength(1, 'At least one language range is required')),
    languageRangeArray,
  );

  const params: VersionListQuery = {
    'language_ranges[]': parsedLanguageRanges,
  };

  if (license_id) {
    params.license_id = license_id;
  }

  if (options?.page_size === '*') {
    const fieldsCount = options.fields?.length ?? 0;
    if (fieldsCount < 1 || fieldsCount > 3) {
      throw new Error('page_size="*" requires 1-3 fields to be specified');
    }
  }
  parsePublic(GetVersionsOptionsSchema, options);
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
