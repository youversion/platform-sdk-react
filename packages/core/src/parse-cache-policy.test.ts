import { describe, expect, it } from 'vitest';
import { parseCachePolicy } from './parse-cache-policy';
import type { CachePolicy } from './parse-cache-policy';

const NOW_MS = 1_700_000_000_000;

const SEVEN_DAY_FALLBACK: CachePolicy = {
  allowsCaching: true,
  maxAgeSeconds: 604800,
  ageSeconds: 0,
  remainingMs: 604800000,
  expiresAt: 1_700_604_800_000,
};

const UNCACHEABLE: CachePolicy = {
  allowsCaching: false,
  maxAgeSeconds: 604800,
  ageSeconds: 0,
  remainingMs: 0,
  expiresAt: NOW_MS,
};

describe('parseCachePolicy', () => {
  it('maps Cache-Control and Age into remaining lifetime', () => {
    const rows: Array<{
      name: string;
      cacheControl: string | null | undefined;
      age: string | null | undefined;
      expected: CachePolicy;
    }> = [
      {
        name: 'max-age only, no Age',
        cacheControl: 'max-age=3600',
        age: undefined,
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 3600,
          ageSeconds: 0,
          remainingMs: 3600000,
          expiresAt: 1_700_003_600_000,
        },
      },
      {
        name: 'Age subtracted from max-age',
        cacheControl: 'max-age=3600',
        age: '100',
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 3600,
          ageSeconds: 100,
          remainingMs: 3500000,
          expiresAt: 1_700_003_500_000,
        },
      },
      {
        name: 'Age missing is 0',
        cacheControl: 'max-age=3600',
        age: null,
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 3600,
          ageSeconds: 0,
          remainingMs: 3600000,
          expiresAt: 1_700_003_600_000,
        },
      },
      {
        name: 'Age unparseable is 0',
        cacheControl: 'max-age=3600',
        age: 'foo',
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 3600,
          ageSeconds: 0,
          remainingMs: 3600000,
          expiresAt: 1_700_003_600_000,
        },
      },
      {
        name: 'max-age missing (public) is 7 days',
        cacheControl: 'public',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'max-age unparseable is 7 days',
        cacheControl: 'max-age=nope',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'no-cache is uncacheable',
        cacheControl: 'no-cache',
        age: undefined,
        expected: UNCACHEABLE,
      },
      {
        name: 'no-store is uncacheable',
        cacheControl: 'no-store',
        age: undefined,
        expected: UNCACHEABLE,
      },
      {
        name: 'no-cache wins over max-age',
        cacheControl: 'public, max-age=60, no-cache',
        age: undefined,
        expected: {
          allowsCaching: false,
          maxAgeSeconds: 60,
          ageSeconds: 0,
          remainingMs: 0,
          expiresAt: NOW_MS,
        },
      },
      {
        name: 'empty header is 7-day fallback',
        cacheControl: '',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'null Cache-Control is 7-day fallback',
        cacheControl: null,
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'No-Cache is case-insensitive',
        cacheControl: 'No-Cache',
        age: undefined,
        expected: UNCACHEABLE,
      },
      {
        name: 'MAX-AGE is case-insensitive',
        cacheControl: 'MAX-AGE=10',
        age: undefined,
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 10,
          ageSeconds: 0,
          remainingMs: 10000,
          expiresAt: 1_700_000_010_000,
        },
      },
      {
        name: 'remaining lifetime floors at 0',
        cacheControl: 'max-age=10',
        age: '50',
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 10,
          ageSeconds: 50,
          remainingMs: 0,
          expiresAt: NOW_MS,
        },
      },
      {
        name: 'empty max-age value is 7-day fallback',
        cacheControl: 'max-age=',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'comma-only header is 7-day fallback',
        cacheControl: ',,,',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'negative max-age is 7-day fallback',
        cacheControl: 'max-age=-1',
        age: undefined,
        expected: SEVEN_DAY_FALLBACK,
      },
      {
        name: 'quoted max-age is accepted',
        cacheControl: 'max-age="3600"',
        age: undefined,
        expected: {
          allowsCaching: true,
          maxAgeSeconds: 3600,
          ageSeconds: 0,
          remainingMs: 3600000,
          expiresAt: 1_700_003_600_000,
        },
      },
    ];

    for (const row of rows) {
      expect(parseCachePolicy(row.cacheControl, row.age, NOW_MS), row.name).toEqual(row.expected);
    }
  });
});
