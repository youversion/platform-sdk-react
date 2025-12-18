import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { ApiClient } from '../client';
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
