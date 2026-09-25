import { describe, expect, it } from 'vitest';
import { ApiClient } from '../client';
import { LanguagesClient } from '../languages';

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
