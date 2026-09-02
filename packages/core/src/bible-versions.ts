import * as z from 'zod/mini';
import type { ApiClient } from './client';
import { BibleVersionSchema } from './schemas';
import type { BibleVersion, Collection } from './types';
import {
  collectFilteredPage,
  fieldsNeededForVersionFilter,
  isUsableBibleVersion,
  isVersionFilterActive,
} from './version-filters';

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

export const GetVersionsOptionsSchema = z
  .optional(
    z.object({
      page_size: z.optional(z.union([z.int().check(z.positive()), z.literal('*')])),
      page_token: z.optional(z.string()),
      fields: z.optional(z.array(z.keyof(BibleVersionSchema))),
      all_available: z.optional(z.boolean()),
    }),
  )
  .check(
    z.refine(
      (data) => {
        if (data?.page_size === '*') {
          return data.fields && data.fields.length >= 1 && data.fields.length <= 3;
        }
        return true;
      },
      {
        error: 'page_size="*" required 1-3 fields to be specified',
        path: ['page_size', 'fields'],
      },
    ),
  );

export type GetVersionsOptions = z.infer<typeof GetVersionsOptionsSchema>;

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
  const pageSize = options?.page_size;
  if (filterFields) {
    params['fields[]'] = filterFields;
    if (isVersionFilterActive() && pageSize === '*' && filterFields.length > 3) {
      // API rejects page_size=* with more than 3 fields. Keep pageSize='*' so
      // collectFilteredPage still walks every server page. Unfiltered *+>3
      // stays a loud schema reject — do not drop * on that path.
      delete params.page_size;
    }
  }

  const fetchPage = (pageToken?: string) => {
    const pageParams = { ...params };
    if (pageToken) {
      pageParams.page_token = pageToken;
    }
    return client.get<Collection<BibleVersion>>(`/v1/bibles`, pageParams);
  };

  if (!isVersionFilterActive()) {
    return fetchPage(options?.page_token);
  }

  return collectFilteredPage(
    fetchPage,
    (version) => isUsableBibleVersion({ id: version.id, languageTag: version.language_tag }),
    pageSize,
    options?.page_token,
  );
}
