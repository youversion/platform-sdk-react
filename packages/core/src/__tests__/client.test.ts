import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { ApiClient, getHttpStatus } from '../client';
import { http, HttpResponse } from 'msw';
import { server } from './setup';

// We always want this test to hit msw since this is only testing
// the setup of and ApiClient instance and not actually hitting
// any real APIs.
if (process.env.INTEGRATION_TESTS) {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost: 'test_placeholder.youversion.com',
      appKey: 'test-app',
      installationId: 'test-installation',
    });
  });

  describe('constructor', () => {
    it('should set remember the appKey', () => {
      const client = new ApiClient({
        appKey: 'test-app1',
        installationId: 'test-installation',
      });

      expect(client.config.appKey).toBe('test-app1');
    });

    it('should use provided appKey', () => {
      const client = new ApiClient({
        appKey: 'test-app2',
        installationId: 'test-installation',
      });

      expect(client.config.appKey).toBe('test-app2');
    });
  });

  describe('query string serialization', () => {
    it('should serialize a single scalar parameter', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          return HttpResponse.json({ search: new URL(request.url).search });
        }),
      );

      const result = await apiClient.get<{ search: string }>('/test', { param: 'value' });
      expect(result.search).toBe('?param=value');
    });

    it('should serialize an array of length 1 as a repeated key', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          return HttpResponse.json({ search: new URL(request.url).search });
        }),
      );

      const result = await apiClient.get<{ search: string }>('/test', { param: ['only'] });
      expect(result.search).toBe('?param=only');
    });

    it('should serialize an array of length 2 as repeated keys', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          return HttpResponse.json({ search: new URL(request.url).search });
        }),
      );

      const result = await apiClient.get<{ search: string }>('/test', { param: ['one', 'two'] });
      expect(result.search).toBe('?param=one&param=two');
    });

    it('should serialize an array of length 3 as repeated keys', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          return HttpResponse.json({ search: new URL(request.url).search });
        }),
      );

      const result = await apiClient.get<{ search: string }>('/test', {
        param: ['one', 'two', 'three'],
      });
      expect(result.search).toBe('?param=one&param=two&param=three');
    });

    it('should handle both scalar and array parameters together', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          return HttpResponse.json({ search: new URL(request.url).search });
        }),
      );

      const result = await apiClient.get<{ search: string }>('/test', {
        param: 'value',
        list: ['one', 'two'],
      });
      expect(result.search).toBe('?param=value&list=one&list=two');
    });
  });

  describe('get', () => {
    it('should make GET request and return data', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', () => {
          return HttpResponse.json({ message: 'success' });
        }),
      );

      const result = await apiClient.get<{ message: string }>('/test');

      expect(result).toEqual({ message: 'success' });
    });

    it('should include query parameters', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          const url = new URL(request.url);
          const param = url.searchParams.get('param');
          return HttpResponse.json({ param });
        }),
      );

      const result = await apiClient.get<{ param: string }>('/test', {
        param: 'value',
      });

      expect(result).toEqual({ param: 'value' });
    });

    it('should include array query parameters as repeated keys', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          const url = new URL(request.url);
          const params = url.searchParams.getAll('param');
          return HttpResponse.json({ params });
        }),
      );

      const result = await apiClient.get<{ params: string[] }>('/test', {
        param: ['one', 'two'],
      });

      expect(result).toEqual({ params: ['one', 'two'] });
    });
  });

  describe('default headers', () => {
    it('should send X-YVP-Sdk header with ReactSDK identifier on every request', async () => {
      let receivedHeader: string | null = null;
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          receivedHeader = request.headers.get('x-yvp-sdk');
          return HttpResponse.json({});
        }),
      );

      await apiClient.get('/test');

      expect(receivedHeader).toMatch(/^ReactSDK=.+$/);
    });

    it('should send X-YVP-App-Key header on every request', async () => {
      let receivedAppKey: string | null = null;
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          receivedAppKey = request.headers.get('x-yvp-app-key');
          return HttpResponse.json({});
        }),
      );

      await apiClient.get('/test');

      expect(receivedAppKey).toBe('test-app');
    });
  });

  describe('additionalHeaders', () => {
    it('should send caller-supplied headers in addition to the built-in ones', async () => {
      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        additionalHeaders: { 'X-Custom': 'hello' },
      });

      let receivedCustom: string | null = null;
      let receivedAppKey: string | null = null;
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          receivedCustom = request.headers.get('x-custom');
          receivedAppKey = request.headers.get('x-yvp-app-key');
          return HttpResponse.json({});
        }),
      );

      await client.get('/test');

      expect(receivedCustom).toBe('hello');
      expect(receivedAppKey).toBe('test-app');
    });

    it('should let additionalHeaders override the built-in X-YVP-Sdk header', async () => {
      // Mirrors how a React Native Expo wrapper would replace the web SDK's
      // identifier with its own.
      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        additionalHeaders: { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' },
      });

      let receivedSdk: string | null = null;
      server.use(
        http.get('https://test_placeholder.youversion.com/test', ({ request }) => {
          receivedSdk = request.headers.get('x-yvp-sdk');
          return HttpResponse.json({});
        }),
      );

      await client.get('/test');

      expect(receivedSdk).toBe('ReactNativeSDK=1.2.3');
    });
  });

  describe('post', () => {
    it('should make POST request and return data', async () => {
      server.use(
        http.post('https://test_placeholder.youversion.com/test', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body });
        }),
      );

      const result = await apiClient.post<{ received: unknown }>('/test', {
        data: 'test',
      });

      expect(result).toEqual({ received: { data: 'test' } });
    });

    it('should include query parameters in POST request', async () => {
      server.use(
        http.post('https://test_placeholder.youversion.com/test', async ({ request }) => {
          const url = new URL(request.url);
          const param = url.searchParams.get('param');
          const body = await request.json();
          return HttpResponse.json({ param, body });
        }),
      );

      const result = await apiClient.post<{ param: string; body: unknown }>(
        '/test',
        { data: 'test' },
        { param: 'value' },
      );

      expect(result).toEqual({
        param: 'value',
        body: { data: 'test' },
      });
    });
  });
});

describe('getHttpStatus', () => {
  it('reads the status off an Error with a numeric status', () => {
    const error = Object.assign(new Error('nope'), { status: 403 });
    expect(getHttpStatus(error)).toBe(403);
  });

  it('reads the status off a thrown plain object', () => {
    expect(getHttpStatus({ status: 401 })).toBe(401);
  });

  it('returns undefined for objects without a numeric status', () => {
    expect(getHttpStatus({ status: '500' })).toBeUndefined();
    expect(getHttpStatus(new Error('network'))).toBeUndefined();
  });

  it('returns undefined for null and non-object values', () => {
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus(undefined)).toBeUndefined();
    expect(getHttpStatus(404)).toBeUndefined();
    expect(getHttpStatus('401')).toBeUndefined();
  });
});
