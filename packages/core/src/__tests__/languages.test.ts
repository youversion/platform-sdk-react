import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { LanguagesClient } from '../languages';
import { server } from './setup';

function createClient(): LanguagesClient {
  return new LanguagesClient(
    new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    }),
  );
}

describe('LanguagesClient runtime contracts', () => {
  it('fetches a script-specific language that list journeys do not request', async () => {
    const language = await createClient().getLanguage('sr-Latn');
    expect(language.id).toBe('sr-Latn');
    expect(language.script).toBe('Latn');
  });

  it('normalizes a lowercase country code in the language-list request', async () => {
    if (process.env.INTEGRATION_TESTS) server.listen();
    try {
      let requestedCountry: string | null = null;
      server.use(
        http.get('https://test_placeholder.youversion.com/v1/languages', ({ request }) => {
          requestedCountry = new URL(request.url).searchParams.get('country');
          return HttpResponse.json({ data: [], next_page_token: null });
        }),
      );
      const client = new LanguagesClient(
        new ApiClient({ apiHost: 'test_placeholder.youversion.com', appKey: 'test-app' }),
      );

      await client.getLanguages({ country: 'us' });
      expect(requestedCountry).toBe('US');
    } finally {
      if (process.env.INTEGRATION_TESTS) {
        server.resetHandlers();
        server.close();
      }
    }
  });

  it('rejects malformed BCP 47 language ids and country codes', async () => {
    const client = createClient();

    await expect(client.getLanguage('sr-latn')).rejects.toThrow(
      'Language ID must match BCP 47 format',
    );
    await expect(client.getLanguages({ country: 'USA' })).rejects.toThrow(
      'Country code must be a 2-character ISO 3166-1 alpha-2 code',
    );
  });

  it('enforces the API field limit when requesting every language', async () => {
    const client = createClient();

    await expect(client.getLanguages({ page_size: '*' })).rejects.toThrow(
      'page_size="*" requires 1-3 fields to be specified',
    );
  });
});
