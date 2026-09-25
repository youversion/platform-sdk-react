import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../client';
import { BibleClient } from '../bible';

function createClient(): BibleClient {
  return new BibleClient(
    new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    }),
  );
}

describe('BibleClient runtime contracts', () => {
  it('routes the direct book and verse reads not exercised by browser journeys', async () => {
    const api = new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    });
    const get = vi.spyOn(api, 'get');
    const client = new BibleClient(api);

    expect((await client.getBook(111, 'GEN')).id).toBe('GEN');
    expect(get).toHaveBeenCalledWith('/v1/bibles/111/books/GEN');
    expect((await client.getChapters(111, 'GEN')).data[0]?.passage_id).toBe('GEN.1');
    expect(get).toHaveBeenCalledWith('/v1/bibles/111/books/GEN/chapters');
    expect((await client.getVerses(111, 'GEN', 1)).data[0]?.passage_id).toBe('GEN.1.1');
    expect(get).toHaveBeenCalledWith('/v1/bibles/111/books/GEN/chapters/1/verses');
    expect((await client.getVerse(111, 'GEN', 1, 1)).passage_id).toBe('GEN.1.1');
    expect(get).toHaveBeenCalledWith('/v1/bibles/111/books/GEN/chapters/1/verses/1');
    expect((await client.getAllVOTDs()).data[0]?.day).toBe(1);
    expect(get).toHaveBeenCalledWith('/v1/verse_of_the_days');
  });

  it('rejects malformed Bible coordinates before making a request', async () => {
    const client = createClient();

    await expect(client.getVersion(0)).rejects.toThrow('Version ID must be a positive integer');
    await expect(client.getBook(1, 'AB')).rejects.toThrow('Book ID must be exactly 3 characters');
    await expect(client.getChapter(1, 'GEN', 0)).rejects.toThrow(
      'Chapter must be a positive integer',
    );
    await expect(client.getVerse(1, 'GEN', 1, 0)).rejects.toThrow(
      'Verse must be a positive integer',
    );
  });

  it('enforces the API field limit when requesting every version', async () => {
    const client = createClient();

    await expect(client.getVersions('en*', undefined, { page_size: '*' })).rejects.toThrow(
      'page_size="*" requires 1-3 fields to be specified',
    );
  });

  it('forwards multiple language ranges and only requests all available versions when enabled', async () => {
    const api = new ApiClient({ apiHost: 'api.youversion.com', appKey: 'test-app' });
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [], next_page_token: null });
    const client = new BibleClient(api);

    await client.getVersions(['en*', 'es*'], undefined, { all_available: true });
    expect(get).toHaveBeenLastCalledWith('/v1/bibles', {
      'language_ranges[]': ['en*', 'es*'],
      all_available: 'true',
    });

    await client.getVersions(['en*', 'es*'], undefined, { all_available: false });
    expect(get).toHaveBeenLastCalledWith('/v1/bibles', {
      'language_ranges[]': ['en*', 'es*'],
    });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('enforces the verse-of-the-day calendar boundary', async () => {
    const client = createClient();

    await expect(client.getVOTD(0)).rejects.toThrow();
    await expect(client.getVOTD(367)).rejects.toThrow();
  });
});
