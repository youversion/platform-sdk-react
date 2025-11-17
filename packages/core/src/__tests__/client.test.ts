import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../client';
import { http, HttpResponse } from 'msw';
import { server } from './setup';

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
