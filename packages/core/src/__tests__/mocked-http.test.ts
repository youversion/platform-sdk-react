import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../client';
import { server } from './setup';

describe.skipIf(process.env.INTEGRATION_TESTS)('mocked HTTP', () => {
  const host = '127.0.0.1:49179';
  const client = new ApiClient({ apiHost: host, appKey: 'test' });
  const notFound = http.get(`https://${host}/item`, () => new HttpResponse(null, { status: 404 }));

  it('allows a handled 404', async () => {
    server.use(notFound);
    await expect(client.get('/item')).rejects.toMatchObject({ status: 404 });
  });

  it.fails(
    'fails the test for a misspelled route even when the caller catches the error',
    async () => {
      server.use(notFound);
      await client.get('/itme').catch(() => undefined);
    },
  );
});
