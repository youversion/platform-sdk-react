import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus } from '../client';
import { server } from './setup';

describe('ApiClient contracts', () => {
  it('serializes array query values as repeated keys', async () => {
    server.use(
      http.get('https://test_placeholder.youversion.com/test', ({ request }) =>
        HttpResponse.json({ search: new URL(request.url).search }),
      ),
    );
    const client = new ApiClient({
      apiHost: 'test_placeholder.youversion.com',
      appKey: 'test-app',
    });

    const result = await client.get<{ search: string }>('/test', {
      scalar: 'value',
      list: ['one', 'two'],
    });

    expect(result.search).toBe('?scalar=value&list=one&list=two');
  });

  it('sends the configured app key and React SDK identity by default', async () => {
    server.use(
      http.get('https://test_placeholder.youversion.com/test', ({ request }) =>
        HttpResponse.json({
          appKey: request.headers.get('x-yvp-app-key'),
          sdk: request.headers.get('x-yvp-sdk'),
        }),
      ),
    );
    const client = new ApiClient({
      apiHost: 'test_placeholder.youversion.com',
      appKey: 'test-app',
    });

    const headers = await client.get<{ appKey: string; sdk: string }>('/test');
    expect(headers.appKey).toBe('test-app');
    expect(headers.sdk).toMatch(/^ReactSDK=.+$/);
  });

  it('allows platform wrappers to override the SDK identity header', async () => {
    server.use(
      http.get('https://test_placeholder.youversion.com/test', ({ request }) =>
        HttpResponse.json({ sdk: request.headers.get('x-yvp-sdk') }),
      ),
    );
    const client = new ApiClient({
      apiHost: 'test_placeholder.youversion.com',
      appKey: 'test-app',
      additionalHeaders: { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' },
    });

    await expect(client.get('/test')).resolves.toEqual({ sdk: 'ReactNativeSDK=1.2.3' });
  });

  it('only exposes numeric status values from unknown failures', () => {
    expect(getHttpStatus(Object.assign(new Error('forbidden'), { status: 403 }))).toBe(403);
    expect(getHttpStatus({ status: '403' })).toBeUndefined();
    expect(getHttpStatus(null)).toBeUndefined();
  });
});
