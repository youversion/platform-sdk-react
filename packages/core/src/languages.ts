import { z } from 'zod';
import type { ApiClient } from './client';
import type { Collection, Language } from './types';
import { LanguageSchema } from './schemas';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import {
  collectFilteredPage,
  fieldsNeededForLanguageFilter,
  isUsableLanguageTag,
} from './version-filters';

/**
 * Options for getting languages collection.
 */
export type GetLanguagesOptions = {
  page_size?: number | '*';
  fields?: (keyof Language)[];
  page_token?: string;
  country?: string; // ISO 3166-1 alpha-2 country code
};

/**
 * Client for interacting with Languages API endpoints.
 */
export class LanguagesClient {
  private client: ApiClient;

  private static readonly languageIdSchema = z
    .string()
    .trim()
    .min(1, 'Language ID must be a non-empty string')
    .regex(
      /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/,
      'Language ID must match BCP 47 format (language or language+script)',
    );
  private static readonly countrySchema = z
    .string()
    .trim()
    .length(2, 'Country code must be a 2-character ISO 3166-1 alpha-2 code')
    .toUpperCase();

  private static readonly GetLanguagesOptionsSchema = z
    .object({
      page_size: z.union([z.number(), z.literal('*')]).optional(),
      fields: z.array(LanguageSchema.keyof()).optional(),
      page_token: z.string().optional(),
      country: LanguagesClient.countrySchema,
    })
    .refine(
      (data) => {
        if (data.page_size === '*') {
          return data.fields && data.fields?.length >= 1 && data.fields?.length <= 3;
        }
        return true;
      },
      {
        message: 'page_size="*" required 1-3 fields to be specified',
        path: ['page_size', 'fields'],
      },
    );

  /**
   * Creates a new LanguagesClient instance.
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Fetches a collection of languages supported in the Platform.
   * @param options Query parameters for pagination and filtering.
   * @returns A collection of Language objects.
   */
  async getLanguages(options: GetLanguagesOptions = {}): Promise<Collection<Language>> {
    const params: Record<string, string | number | (keyof Language)[]> = {};

    if (options.country !== undefined) {
      const country = LanguagesClient.countrySchema.parse(options.country);
      params.country = country;
    }

    if (options.fields !== undefined) {
      const fieldsSchema = z.array(LanguageSchema.keyof());
      fieldsSchema.parse(options.fields);
      params['fields[]'] = options.fields;
    }

    if (options.page_size !== undefined) {
      const pageSizeSchema = z.union([z.number().int().positive(), z.literal('*')]);
      pageSizeSchema.parse(options.page_size);

      if (options.page_size === '*') {
        const fieldsCount = options.fields?.length ?? 0;
        if (fieldsCount < 1 || fieldsCount > 3) {
          throw new Error('page_size="*" requires 1-3 fields to be specified');
        }
      }

      params.page_size = options.page_size;
    }

    if (options.page_token !== undefined) {
      params.page_token = options.page_token;
    }

    const filterFields = fieldsNeededForLanguageFilter(options.fields);
    let pageSize = options.page_size;
    if (filterFields) {
      params['fields[]'] = filterFields;
      if (pageSize === '*' && filterFields.length > 3) {
        delete params.page_size;
        pageSize = undefined;
      }
    }

    const fetchPage = (pageToken?: string) => {
      const pageParams = pageToken ? { ...params, page_token: pageToken } : params;
      return this.client.get<Collection<Language>>(`/v1/languages`, pageParams);
    };

    if (YouVersionPlatformConfiguration.permittedLanguageTags === undefined) {
      return fetchPage(options.page_token);
    }

    return collectFilteredPage(
      (pageToken) => fetchPage(pageToken ?? options.page_token),
      (language) => isUsableLanguageTag(language.id),
      pageSize,
    );
  }

  /**
   * Fetches details about a specific language in the Platform.
   * @param languageId The BCP 47 language code (optionally including script, e.g., "en" or "sr-Latn").
   * @returns The requested Language object.
   */
  async getLanguage(languageId: string): Promise<Language> {
    LanguagesClient.languageIdSchema.parse(languageId);
    return this.client.get<Language>(`/v1/languages/${languageId}`);
  }
}
