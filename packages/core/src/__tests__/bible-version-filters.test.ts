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

    const firstServerPage = {
      data: [
        { id: 1, language_tag: 'en' },
        { id: 2, language_tag: 'en' },
      ],
      next_page_token: 'p2',
    };
    const secondServerPage = {
      data: [
        { id: 3, language_tag: 'en' },
        { id: 5, language_tag: 'en' },
      ],
      next_page_token: 'p3',
    };
    const thirdServerPage = { data: [{ id: 4, language_tag: 'en' }], next_page_token: null };

    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('page_token') ?? '';
        if (token === 'p2') return HttpResponse.json(secondServerPage);
        if (token === 'p3') return HttpResponse.json(thirdServerPage);
        return HttpResponse.json(
          token === '' ? firstServerPage : { data: [], next_page_token: null },
        );
      }),
    );

    const versions = await bibleClient().getVersions('en*', undefined, { page_size: 2 });
    expect(versions.data.map((version) => version.id)).toEqual([3, 4]);

    const overflowFirstPage = {
      data: [
        { id: 1, language_tag: 'en' },
        { id: 2, language_tag: 'en' },
        { id: 3, language_tag: 'en' },
        { id: 4, language_tag: 'en' },
      ],
      next_page_token: 'p2',
    };
    const overflowLaterPage = { data: [{ id: 5, language_tag: 'en' }], next_page_token: null };
    const requestedTokens: string[] = [];

    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('page_token') ?? '';
        requestedTokens.push(token);
        expect(token.startsWith('yv-vf1:')).toBe(false);
        if (token === 'p2') return HttpResponse.json(overflowLaterPage);
        return HttpResponse.json(
          token === '' ? overflowFirstPage : { data: [], next_page_token: null },
        );
      }),
    );

    YouVersionPlatformConfiguration.permittedVersionIds = [1, 2, 3, 4, 5];
    const firstPage = await bibleClient().getVersions('en*', undefined, { page_size: 2 });
    expect(firstPage.data.map((version) => version.id)).toEqual([1, 2]);
    expect(firstPage.next_page_token).toMatch(/^yv-vf1:/);

    const secondPage = await bibleClient().getVersions('en*', undefined, {
      page_size: 2,
      page_token: firstPage.next_page_token ?? undefined,
    });
    expect(secondPage.data.map((version) => version.id)).toEqual([3, 4]);
    expect(secondPage.next_page_token).toBe('p2');
    expect(requestedTokens).toEqual(['', '']);

    clearFilters();
  });

  it('keeps every usable version across pages when page_size is * and a filter injects fields', async () => {
    YouVersionPlatformConfiguration.permittedVersionIds = [3, 4, 5];

    const firstServerPage = {
      data: [
        { id: 3, title: 'Permitted first' },
        { id: 1, title: 'Excluded' },
      ],
      next_page_token: 'p2',
    };
    const secondServerPage = {
      data: [{ id: 4, title: 'Permitted second' }],
      next_page_token: 'p3',
    };
    const thirdServerPage = { data: [{ id: 5, title: 'Permitted third' }], next_page_token: null };

    server.use(
      http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('page_token') ?? '';
        if (token === 'p2') return HttpResponse.json(secondServerPage);
        if (token === 'p3') return HttpResponse.json(thirdServerPage);
        return HttpResponse.json(
          token === '' ? firstServerPage : { data: [], next_page_token: null },
        );
      }),
    );

    const versions = await bibleClient().getVersions('en*', undefined, {
      page_size: '*',
      fields: ['title', 'abbreviation', 'localized_title'],
    });
    expect(versions.data.map((version) => version.id)).toEqual([3, 4, 5]);

    clearFilters();
  });

  it('keeps every usable language across pages when page_size is * and a filter injects fields', async () => {
    YouVersionPlatformConfiguration.permittedLanguageTags = ['en', 'fr', 'ko'];

    const firstServerPage = {
      data: [
        { id: 'en', language: 'en' },
        { id: 'es', language: 'es' },
      ],
      next_page_token: 'p2',
    };
    const secondServerPage = { data: [{ id: 'fr', language: 'fr' }], next_page_token: 'p3' };
    const thirdServerPage = { data: [{ id: 'ko', language: 'ko' }], next_page_token: null };

    server.use(
      http.get(`https://${apiHost}/v1/languages`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('page_token') ?? '';
        if (token === 'p2') return HttpResponse.json(secondServerPage);
        if (token === 'p3') return HttpResponse.json(thirdServerPage);
        return HttpResponse.json(
          token === '' ? firstServerPage : { data: [], next_page_token: null },
        );
      }),
    );

    const languages = new LanguagesClient(
      new ApiClient({ apiHost, appKey: 'test-app', installationId: 'test-installation' }),
    );
    const filtered = await languages.getLanguages({
      page_size: '*',
      fields: ['language', 'text_direction', 'speaking_population'],
    });
    expect(filtered.data.map((language) => language.id)).toEqual(['en', 'fr', 'ko']);

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
