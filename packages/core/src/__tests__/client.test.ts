import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus } from '../client';
import { server } from './setup';

describe('ApiClient contracts', () => {
  it('serializes query arrays and sends default or overridden SDK headers', async () => {
    // The live-API command disables shared MSW setup, but this transport contract
    // must still use its placeholder host only through the mocked handler.
    if (process.env.INTEGRATION_TESTS) server.listen();
    try {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) =>
          HttpResponse.json({
            search: new URL(request.url).search,
            appKey: request.headers.get('x-yvp-app-key'),
            sdk: request.headers.get('x-yvp-sdk'),
          }),
        ),
      );
      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
      });

      const result = await client.get<{ search: string; appKey: string; sdk: string }>('/test', {
        scalar: 'value',
        list: ['one', 'two'],
      });
      expect(result.search).toBe('?scalar=value&list=one&list=two');
      expect(result.appKey).toBe('test-app');
      expect(result.sdk).toMatch(/^ReactSDK=.+$/);

      const wrapper = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        additionalHeaders: { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' },
      });
      const overridden = await wrapper.get<{ sdk: string }>('/test');
      expect(overridden.sdk).toBe('ReactNativeSDK=1.2.3');
    } finally {
      if (process.env.INTEGRATION_TESTS) {
        server.resetHandlers();
        server.close();
      }
    }
  });

  it('only exposes numeric status values from unknown failures', () => {
    expect(getHttpStatus(Object.assign(new Error('forbidden'), { status: 403 }))).toBe(403);
    expect(getHttpStatus({ status: '403' })).toBeUndefined();
    expect(getHttpStatus(null)).toBeUndefined();
  });
});
