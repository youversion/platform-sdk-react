import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { BibleClient } from '../bible';
import { LanguagesClient } from '../languages';
import { HighlightsClient } from '../highlights';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST || 'api.youversion.com';

function bibleClient(): BibleClient {
  return new BibleClient(
    new ApiClient({
      apiHost,
      appKey: 'test-app',
      installationId: 'test-installation',
    }),
  );
}

function clearFilters(): void {
  YouVersionPlatformConfiguration.permittedVersionIds = undefined;
  YouVersionPlatformConfiguration.excludedVersionIds = undefined;
  YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
}

describe('BibleClient version filter', () => {
  it('refuses an excluded version before fetching and walks pages for usable rows', async () => {
    YouVersionPlatformConfiguration.excludedVersionIds = [111];
    YouVersionPlatformConfiguration.permittedVersionIds = [111, 206];

    let passageCalls = 0;
    server.use(
      http.get(`https://${apiHost}/v1/bibles/111/passages/:usfm`, () => {
        passageCalls += 1;
        return HttpResponse.json({ content: 'leaked', reference: 'John 3:16' });
      }),
    );

    await expect(bibleClient().getPassage(111, 'JHN.3.16', 'text')).rejects.toMatchObject({
      status: 403,
    });
    expect(passageCalls).toBe(0);

    clearFilters();
    YouVersionPlatformConfiguration.permittedVersionIds = [3, 4];

    const pages: Record<
      string,
      { data: { id: number; language_tag: string }[]; next_page_token: string | null }
    > = {
      '': {
        data: [
          { id: 1, language_tag: 'en' },
          { id: 2, language_tag: 'en' },
        ],
        next_page_token: 'p2',
      },
      p2: {
        data: [
          { id: 3, language_tag: 'en' },
          { id: 5, language_tag: 'en' },
        ],
        next_page_token: 'p3',
      },
      p3: { data: [{ id: 4, language_tag: 'en' }], next_page_token: null },
    };

    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('page_token') ?? '';
        return HttpResponse.json(pages[token] ?? { data: [], next_page_token: null });
      }),
    );

    const versions = await bibleClient().getVersions('en*', undefined, { page_size: 2 });
    expect(versions.data.map((version) => version.id)).toEqual([3, 4]);

    clearFilters();
  });

  it('fetches version metadata for a language allowlist, then refuses the wrong tag', async () => {
    YouVersionPlatformConfiguration.permittedLanguageTags = ['en'];

    server.use(
      http.get(`https://${apiHost}/v1/bibles/206`, () =>
        HttpResponse.json({
          id: 206,
          language_tag: 'es',
          abbreviation: 'NVI',
          localized_abbreviation: 'NVI',
          localized_title: 'NVI',
          title: 'NVI',
          books: ['GEN'],
          youversion_deep_link: 'https://bible.com/versions/206',
        }),
      ),
    );

    await expect(bibleClient().getVersion(206)).rejects.toMatchObject({ status: 403 });
    await expect(bibleClient().getPassage(206, 'JHN.3.16', 'text')).rejects.toMatchObject({
      status: 403,
    });

    const languages = new LanguagesClient(
      new ApiClient({ apiHost, appKey: 'test-app', installationId: 'test-installation' }),
    );
    server.use(
      http.get(`https://${apiHost}/v1/languages`, () =>
        HttpResponse.json({
          data: [
            { id: 'en', language: 'en' },
            { id: 'es', language: 'es' },
          ],
          next_page_token: null,
        }),
      ),
    );
    const filtered = await languages.getLanguages();
    expect(filtered.data.map((language) => language.id)).toEqual(['en']);

    YouVersionPlatformConfiguration.excludedVersionIds = [111];
    const highlights = new HighlightsClient(
      new ApiClient({ apiHost, appKey: 'test-app', installationId: 'test-installation' }),
    );
    await expect(
      highlights.getHighlights({ version_id: 111, passage_id: 'JHN.3' }, 'token'),
    ).rejects.toMatchObject({ status: 403 });

    clearFilters();
  });
});
