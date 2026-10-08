import { describe, expect, it, vi } from 'vitest';
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

  it('aborts a pending request at the configured deadline, not before it', async () => {
    if (process.env.INTEGRATION_TESTS) server.listen();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let releaseResponse: ((response: Response) => void) | undefined;
    try {
      const started = new Promise<AbortSignal>((resolveStarted) => {
        server.use(
          http.get('https://test_placeholder.youversion.com/slow', ({ request }) => {
            const response = new Promise<Response>((resolve) => {
              releaseResponse = resolve;
            });
            resolveStarted(request.signal);
            return response;
          }),
        );
      });
      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
        timeout: 40,
      });
      // Observe rejection immediately, including when cancellation is too early.
      const outcome = client.get('/slow').catch((cause: unknown) => cause);
      const signal = await started;
      await vi.advanceTimersByTimeAsync(39);
      expect(signal.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const abortedAtDeadline = signal.aborted;
      releaseResponse?.(HttpResponse.json({ late: true }));
      const error = await outcome;
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('message', 'Request timeout after 40ms');
      expect(abortedAtDeadline).toBe(true);
    } finally {
      releaseResponse?.(HttpResponse.json({ late: true }));
      vi.useRealTimers();
      if (process.env.INTEGRATION_TESTS) {
        server.resetHandlers();
        server.close();
      }
    }
  });

  it('decodes text responses and keeps server error details private in production', async () => {
    if (process.env.INTEGRATION_TESTS) server.listen();
    vi.stubEnv('NODE_ENV', 'production');
    const detail = 'Internal account diagnostic: private-session-value';
    try {
      server.use(
        http.get('https://test_placeholder.youversion.com/text', () =>
          HttpResponse.text('plain response'),
        ),
        http.get('https://test_placeholder.youversion.com/denied-json', () =>
          HttpResponse.json({ message: detail }, { status: 403 }),
        ),
        http.get('https://test_placeholder.youversion.com/denied-text', () =>
          HttpResponse.text(detail, { status: 401 }),
        ),
      );
      const client = new ApiClient({
        apiHost: 'test_placeholder.youversion.com',
        appKey: 'test-app',
      });
      expect(await client.get<string>('/text')).toBe('plain response');

      for (const [path, status] of [
        ['/denied-json', 403],
        ['/denied-text', 401],
      ] as const) {
        const error = await client.get(path).catch((cause: unknown) => cause);
        expect(error).toBeInstanceOf(Error);
        expect(getHttpStatus(error)).toBe(status);
        expect(error).toHaveProperty('message', expect.not.stringContaining(detail));
      }
    } finally {
      vi.unstubAllEnvs();
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
