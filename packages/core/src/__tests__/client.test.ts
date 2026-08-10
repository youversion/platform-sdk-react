import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { ApiClient, getHttpStatus } from '../client';
import { delay, http, HttpResponse } from 'msw';
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

  describe('buildQueryString', () => {
    const buildQueryString = (params?: Parameters<ApiClient['get']>[1]) =>
      (
        apiClient as unknown as {
          buildQueryString: (params?: Parameters<ApiClient['get']>[1]) => string;
        }
      ).buildQueryString(params);

    it('should serialize single scalar parameter', () => {
      const query = buildQueryString({ param: 'value' });

      expect(query).toBe('?param=value');
    });

    it('should serialize an array of length 1 as repeated key', () => {
      const query = buildQueryString({ param: ['only'] });

      expect(query).toBe('?param=only');
    });

    it('should serialize an array of length 2 as repeated keys', () => {
      const query = buildQueryString({ param: ['one', 'two'] });

      expect(query).toBe('?param=one&param=two');
    });

    it('should serialize an array of length 3 as repeated keys', () => {
      const query = buildQueryString({ param: ['one', 'two', 'three'] });

      expect(query).toBe('?param=one&param=two&param=three');
    });

    it('should handle both scalar and array parameters together', () => {
      const query = buildQueryString({ param: 'value', list: ['one', 'two'] });

      expect(query).toBe('?param=value&list=one&list=two');
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

  describe('in-flight GET deduplication', () => {
    it('should issue one request when two GETs for the same URL overlap', async () => {
      let requestCount = 0;
      server.use(
        http.get('https://test_placeholder.youversion.com/books', async () => {
          requestCount += 1;
          await delay(20);
          return HttpResponse.json({ message: 'shared' });
        }),
      );

      const [first, second] = await Promise.all([
        apiClient.get<{ message: string }>('/books'),
        apiClient.get<{ message: string }>('/books'),
      ]);

      expect(requestCount).toBe(1);
      expect(first).toEqual({ message: 'shared' });
      expect(second).toEqual({ message: 'shared' });
    });

    it('should not share a request between two GETs with different query parameters', async () => {
      let requestCount = 0;
      server.use(
        http.get('https://test_placeholder.youversion.com/books', async ({ request }) => {
          requestCount += 1;
          await delay(20);
          const url = new URL(request.url);
          return HttpResponse.json({ param: url.searchParams.get('param') });
        }),
      );

      const [first, second] = await Promise.all([
        apiClient.get<{ param: string }>('/books', { param: 'one' }),
        apiClient.get<{ param: string }>('/books', { param: 'two' }),
      ]);

      expect(requestCount).toBe(2);
      expect(first).toEqual({ param: 'one' });
      expect(second).toEqual({ param: 'two' });
    });

    it('should not share a request between two GETs with different Authorization headers', async () => {
      const seenTokens: (string | null)[] = [];
      server.use(
        http.get('https://test_placeholder.youversion.com/highlights', async ({ request }) => {
          seenTokens.push(request.headers.get('authorization'));
          await delay(20);
          return HttpResponse.json({ token: request.headers.get('authorization') });
        }),
      );

      const [first, second] = await Promise.all([
        apiClient.get<{ token: string }>('/highlights', undefined, {
          Authorization: 'Bearer user-a',
        }),
        apiClient.get<{ token: string }>('/highlights', undefined, {
          Authorization: 'Bearer user-b',
        }),
      ]);

      expect(seenTokens).toHaveLength(2);
      expect(seenTokens).toContain('Bearer user-a');
      expect(seenTokens).toContain('Bearer user-b');
      expect(first).toEqual({ token: 'Bearer user-a' });
      expect(second).toEqual({ token: 'Bearer user-b' });
    });

    it('should issue a second request for a GET made after the first one settled', async () => {
      let requestCount = 0;
      server.use(
        http.get('https://test_placeholder.youversion.com/books', () => {
          requestCount += 1;
          return HttpResponse.json({ count: requestCount });
        }),
      );

      // Sharing is in-flight only. Once the first promise settles its entry is
      // gone, so a later GET hits the network again — this is not a cache.
      const first = await apiClient.get<{ count: number }>('/books');
      const second = await apiClient.get<{ count: number }>('/books');

      expect(requestCount).toBe(2);
      expect(first).toEqual({ count: 1 });
      expect(second).toEqual({ count: 2 });
    });

    it('should share a rejection with every caller waiting on it', async () => {
      let requestCount = 0;
      server.use(
        http.get('https://test_placeholder.youversion.com/books', async () => {
          requestCount += 1;
          await delay(20);
          return HttpResponse.json({ message: 'nope' }, { status: 503 });
        }),
      );

      const [first, second] = await Promise.allSettled([
        apiClient.get('/books'),
        apiClient.get('/books'),
      ]);

      expect(requestCount).toBe(1);
      expect(first.status).toBe('rejected');
      expect(second.status).toBe('rejected');
      expect(getHttpStatus((first as PromiseRejectedResult).reason)).toBe(503);
      expect(getHttpStatus((second as PromiseRejectedResult).reason)).toBe(503);
    });

    it('should not deduplicate POST requests', async () => {
      let requestCount = 0;
      server.use(
        http.post('https://test_placeholder.youversion.com/highlights', async () => {
          requestCount += 1;
          await delay(20);
          return HttpResponse.json({ ok: true });
        }),
      );

      await Promise.all([
        apiClient.post('/highlights', { color: 'fffe00' }),
        apiClient.post('/highlights', { color: 'fffe00' }),
      ]);

      expect(requestCount).toBe(2);
    });
  });

  describe('request timeout', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should abort and reject when a dispatched request is never answered', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/hangs', async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      );

      vi.useFakeTimers();

      // Capture the rejection before advancing so nothing is ever unhandled.
      const settled = apiClient.get('/hangs').catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(10_000);

      const error = await settled;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Request timeout after 10000ms');
    });

    it('should report the configured timeout rather than the default', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/hangs', async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      );

      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        timeout: 2000,
      });

      vi.useFakeTimers();

      const settled = client.get('/hangs').catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(2000);

      const error = await settled;
      expect((error as Error).message).toBe('Request timeout after 2000ms');
    });

    it('should keep the request pending until the timeout elapses', async () => {
      server.use(
        http.get('https://test_placeholder.youversion.com/hangs', async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      );

      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        timeout: 2000,
      });

      vi.useFakeTimers();

      let settled = false;
      const pending = client.get('/hangs').catch((error: unknown) => {
        settled = true;
        return error;
      });

      await vi.advanceTimersByTimeAsync(1999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(settled).toBe(true);
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
