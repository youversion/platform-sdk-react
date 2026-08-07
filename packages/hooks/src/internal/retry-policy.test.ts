import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  backoffMs,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BUDGET_MS,
  isRetryableRequestError,
} from './retry-policy';

/** The shape `ApiClient` throws for a non-2xx response. */
function httpError(status: number, message = `Request failed with status ${status}`): Error {
  return Object.assign(new Error(message), { status });
}

describe('isRetryableRequestError', () => {
  it('retries a request timeout, which carries no status', () => {
    expect(isRetryableRequestError(new Error('Request timeout after 10000ms'))).toBe(true);
  });

  it('retries a transport failure, which carries no status', () => {
    expect(isRetryableRequestError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('retries a 429', () => {
    expect(isRetryableRequestError(httpError(429))).toBe(true);
  });

  it('retries a 500', () => {
    expect(isRetryableRequestError(httpError(500))).toBe(true);
  });

  it('retries a 503', () => {
    expect(isRetryableRequestError(httpError(503))).toBe(true);
  });

  it('does not retry a 401', () => {
    expect(isRetryableRequestError(httpError(401))).toBe(false);
  });

  it('does not retry a 403', () => {
    expect(isRetryableRequestError(httpError(403))).toBe(false);
  });

  it('does not retry a 404', () => {
    expect(isRetryableRequestError(httpError(404))).toBe(false);
  });

  it('does not retry a 400, since the request itself is the problem', () => {
    expect(isRetryableRequestError(httpError(400))).toBe(false);
  });

  it('does not retry a ZodError, even though it carries no status', () => {
    // Input validation throws before any request goes out. Sending the same
    // invalid input again produces the same error.
    const zodError = Object.assign(new Error('Invalid input'), {
      name: 'ZodError',
      issues: [{ code: 'invalid_type', path: ['versionId'], message: 'Expected number' }],
    });

    expect(isRetryableRequestError(zodError)).toBe(false);
  });

  it('retries an error whose name only looks like a ZodError without issues', () => {
    // Guards against a plain Error being renamed; the issues array is what
    // makes it a real validation failure.
    const impostor = Object.assign(new Error('Failed to fetch'), { name: 'ZodError' });

    expect(isRetryableRequestError(impostor)).toBe(true);
  });

  it('retries a non-Error rejection with no status', () => {
    expect(isRetryableRequestError('something went wrong')).toBe(true);
  });
});

describe('backoffMs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays inside the 500ms window on the first attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(backoffMs(0)).toBeLessThan(500);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffMs(0)).toBe(0);
  });

  it('stays inside the 1500ms window on the second attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(backoffMs(1)).toBeLessThan(1500);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffMs(1)).toBe(0);
  });

  it('applies full jitter rather than a fixed delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffMs(0)).toBe(250);
    expect(backoffMs(1)).toBe(750);
  });

  it('clamps an attempt index past the last window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffMs(7)).toBe(750);
    expect(backoffMs(-1)).toBe(250);
  });

  it('never returns a negative delay across many draws', () => {
    for (let i = 0; i < 100; i++) {
      expect(backoffMs(i % 3)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('retry budget constants', () => {
  it('allows two extra attempts inside a 20 second wall clock', () => {
    expect(DEFAULT_MAX_RETRIES).toBe(2);
    expect(DEFAULT_RETRY_BUDGET_MS).toBe(20_000);
  });
});
