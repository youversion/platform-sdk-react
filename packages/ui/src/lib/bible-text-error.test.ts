/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { isRetryableBibleTextError, type BibleTextError } from './bible-text-error';

function createError(message: string, status?: number): BibleTextError {
  return Object.assign(new Error(message), status === undefined ? {} : { status });
}

describe('isRetryableBibleTextError', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  function setOffline() {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { ...originalNavigator, onLine: false },
    });
  }

  it('should not retry a 401', () => {
    expect(isRetryableBibleTextError(createError('Request failed with status 401', 401))).toBe(
      false,
    );
  });

  it('should not retry a 403', () => {
    expect(isRetryableBibleTextError(createError('Request failed with status 403', 403))).toBe(
      false,
    );
  });

  it('should not retry a 404', () => {
    expect(
      isRetryableBibleTextError(
        createError('Bible passage PRO.30.1 for version 2530 not found', 404),
      ),
    ).toBe(false);
  });

  it('should retry a 429', () => {
    expect(isRetryableBibleTextError(createError('Request failed with status 429', 429))).toBe(true);
  });

  it('should retry a 500', () => {
    expect(isRetryableBibleTextError(createError('Request failed with status 500', 500))).toBe(true);
  });

  it('should retry a 503', () => {
    expect(isRetryableBibleTextError(createError('Request failed with status 503', 503))).toBe(true);
  });

  it('should prioritize a 5xx status over "not found" in the message', () => {
    expect(
      isRetryableBibleTextError(
        createError('Upstream dependency not found while handling request', 503),
      ),
    ).toBe(true);
  });

  it('should not retry a statusless "not found" message', () => {
    expect(isRetryableBibleTextError(createError('Passage not found'))).toBe(false);
  });

  it('should retry when navigator reports offline', () => {
    setOffline();
    expect(isRetryableBibleTextError(createError('Unexpected connection state'))).toBe(true);
  });

  it('should not retry a 401 even when navigator reports offline', () => {
    setOffline();
    expect(isRetryableBibleTextError(createError('Request failed with status 401', 401))).toBe(
      false,
    );
  });

  it('should retry the SDK request timeout message', () => {
    expect(isRetryableBibleTextError(createError('Request timeout after 10000ms'))).toBe(true);
  });

  it('should retry the Chrome transport failure message', () => {
    expect(isRetryableBibleTextError(createError('Failed to fetch'))).toBe(true);
  });

  it('should retry the Firefox transport failure message', () => {
    expect(
      isRetryableBibleTextError(
        createError('NetworkError when attempting to fetch resource'),
      ),
    ).toBe(true);
  });

  it('should retry the Safari transport failure message', () => {
    expect(isRetryableBibleTextError(createError('Load failed'))).toBe(true);
  });

  it('should retry the React Native transport failure message', () => {
    expect(isRetryableBibleTextError(createError('Network request failed'))).toBe(true);
  });

  it('should not retry an unrecognized error', () => {
    expect(isRetryableBibleTextError(createError('Something unexpected happened'))).toBe(false);
  });
});
