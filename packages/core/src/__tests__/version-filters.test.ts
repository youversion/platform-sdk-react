import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { BibleClient } from '../bible';
import { LanguagesClient } from '../languages';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { isVersionPermitted } from '../version-filters';
import { server } from './setup';
import { mockVersions } from './MockVersions';

/**
 * Every test sets all three filters, so no case can inherit another's state.
 * Omitted keys are written back as `undefined` (the unrestricted default).
 */
function configureVersionFilters(
  filters: {
    permittedVersionIds?: number[];
    excludedVersionIds?: number[];
    permittedLanguageTags?: string[];
  } = {},
): void {
  YouVersionPlatformConfiguration.permittedVersionIds = filters.permittedVersionIds;
  YouVersionPlatformConfiguration.excludedVersionIds = filters.excludedVersionIds;
  YouVersionPlatformConfiguration.permittedLanguageTags = filters.permittedLanguageTags;
}

// One source for both the client and the per-test MSW overrides below, so a
// handler can never be registered against a different host than the client calls.
const apiHost = process.env.YVP_API_HOST || 'api.youversion.com';

function createApiClient(): ApiClient {
  return new ApiClient({
    apiHost,
    appKey: process.env.YVP_APP_KEY || '',
    installationId: 'test-installation',
  });
}

describe('version filters', () => {
  it('permits every version when no filters are configured', () => {
    configureVersionFilters();

    expect(isVersionPermitted(111, 'en')).toBe(true);
    expect(isVersionPermitted(3034)).toBe(true);
  });

  it('excludes a version id even when the same id is permitted', () => {
    configureVersionFilters({ permittedVersionIds: [111, 3034], excludedVersionIds: [111] });

    expect(isVersionPermitted(111, 'en')).toBe(false);
    expect(isVersionPermitted(3034, 'en')).toBe(true);
  });

  it('permits nothing when a permitted list is empty, for ids and for language tags', () => {
    configureVersionFilters({ permittedVersionIds: [] });
    expect(isVersionPermitted(111, 'en')).toBe(false);

    configureVersionFilters({ permittedLanguageTags: [] });
    expect(isVersionPermitted(111, 'en')).toBe(false);
    expect(isVersionPermitted(111)).toBe(false);
  });

  it('rejects a version whose language tag is unlisted or missing', () => {
    configureVersionFilters({ permittedLanguageTags: ['en'] });

    expect(isVersionPermitted(111, 'en')).toBe(true);
    expect(isVersionPermitted(111, 'es')).toBe(false);
    expect(isVersionPermitted(111)).toBe(false);
  });

  it('ANDs permitted version ids with permitted language tags', () => {
    configureVersionFilters({ permittedVersionIds: [111, 222], permittedLanguageTags: ['en'] });

    expect(isVersionPermitted(111, 'en')).toBe(true);
    expect(isVersionPermitted(222, 'es')).toBe(false);
    expect(isVersionPermitted(333, 'en')).toBe(false);
  });

  it('drops excluded versions from getVersions while still fetching one by id', async () => {
    configureVersionFilters({ excludedVersionIds: [111] });
    const bibleClient = new BibleClient(createApiClient());

    const versions = await bibleClient.getVersions('en*', undefined, { page_size: 25 });

    expect(versions.data.length).toBe(mockVersions.length - 1);
    expect(versions.data.some((version) => version.id === 111)).toBe(false);

    // Lists are "what we offer", not "what we forbid" (ADR-0005): fetching an
    // excluded version directly still works.
    const excluded = await bibleClient.getVersion(111);
    expect(excluded.id).toBeDefined();
  });

  it('asks the API for the fields the filters key off when a projection omits them', async () => {
    configureVersionFilters({ permittedLanguageTags: ['en'] });
    let requestedFields: string[] = [];
    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        requestedFields = new URL(request.url).searchParams.getAll('fields[]');
        return HttpResponse.json({
          data: [
            { ...mockVersions[0]!, id: 111, language_tag: 'en' },
            { ...mockVersions[0]!, id: 999, language_tag: 'es' },
          ],
          next_page_token: null,
          total_size: 2,
        });
      }),
    );
    const bibleClient = new BibleClient(createApiClient());

    const versions = await bibleClient.getVersions('en*', undefined, {
      fields: ['abbreviation'],
    });

    expect(requestedFields).toContain('language_tag');
    expect(requestedFields).toContain('abbreviation');
    expect(versions.data.map((version) => version.id)).toEqual([111]);
  });

  it('asks for `id` when a version id filter is active and the projection omits it', async () => {
    configureVersionFilters({ excludedVersionIds: [999] });
    let requestedFields: string[] = [];
    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        requestedFields = new URL(request.url).searchParams.getAll('fields[]');
        return HttpResponse.json({
          data: [
            { ...mockVersions[0]!, id: 111, language_tag: 'en' },
            { ...mockVersions[0]!, id: 999, language_tag: 'en' },
          ],
          next_page_token: null,
          total_size: 2,
        });
      }),
    );
    const bibleClient = new BibleClient(createApiClient());

    const versions = await bibleClient.getVersions('en*', undefined, {
      fields: ['abbreviation'],
    });

    expect(requestedFields).toContain('id');
    // No language filter is active, so `language_tag` is not asked for.
    expect(requestedFields).not.toContain('language_tag');
    expect(versions.data.map((version) => version.id)).toEqual([111]);
  });

  it('asks getLanguages for `id` when the projection omits it', async () => {
    configureVersionFilters({ permittedLanguageTags: ['en'] });
    let requestedFields: string[] = [];
    server.use(
      http.get(`https://${apiHost}/v1/languages`, ({ request }) => {
        requestedFields = new URL(request.url).searchParams.getAll('fields[]');
        return HttpResponse.json({
          data: [
            { id: 'en', display_names: { en: 'English' } },
            { id: 'es', display_names: { en: 'Spanish' } },
          ],
          next_page_token: null,
          total_size: 2,
        });
      }),
    );
    const languagesClient = new LanguagesClient(createApiClient());

    const languages = await languagesClient.getLanguages({ fields: ['display_names'] });

    expect(requestedFields).toContain('id');
    expect(requestedFields).toContain('display_names');
    expect(languages.data.map((language) => language.id)).toEqual(['en']);
  });

  it('drops languages whose tag is not permitted from getLanguages', async () => {
    configureVersionFilters({ permittedLanguageTags: ['en', 'es'] });
    const languagesClient = new LanguagesClient(createApiClient());

    const languages = await languagesClient.getLanguages({ page_size: 99 });

    expect(languages.data.map((language) => language.id).sort()).toEqual(['en', 'es']);
  });

  it('leaves getLanguages unfiltered when no language filter is configured', async () => {
    configureVersionFilters();
    const languagesClient = new LanguagesClient(createApiClient());

    const languages = await languagesClient.getLanguages({ page_size: 99 });

    expect(languages.data.length).toBeGreaterThan(2);
  });
});
