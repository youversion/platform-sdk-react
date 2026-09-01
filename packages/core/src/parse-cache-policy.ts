const SEVEN_DAY_SECONDS = 604800;

export type CachePolicy = {
  allowsCaching: boolean;
  maxAgeSeconds: number;
  ageSeconds: number;
  remainingMs: number;
  expiresAt: number;
};

/**
 * Parses Cache-Control and Age into remaining cache lifetime.
 * Missing or unparseable max-age is 7 days. Unparseable Age is 0.
 * `no-cache` / `no-store` never allow caching. Parsing errors fail open.
 */
export function parseCachePolicy(
  cacheControl: string | null | undefined,
  age: string | null | undefined,
  nowMs: number = Date.now(),
): CachePolicy {
  try {
    return readCachePolicy(cacheControl, age, nowMs);
  } catch {
    return {
      allowsCaching: false,
      maxAgeSeconds: 0,
      ageSeconds: 0,
      remainingMs: 0,
      expiresAt: nowMs,
    };
  }
}

function readCachePolicy(
  cacheControl: string | null | undefined,
  age: string | null | undefined,
  nowMs: number,
): CachePolicy {
  const directives = parseDirectives(cacheControl);
  const allowsCaching = !directives.has('no-cache') && !directives.has('no-store');
  const maxAgeSeconds = parseMaxAgeSeconds(directives.get('max-age'));
  const ageSeconds = parseAgeSeconds(age);
  const remainingMs = allowsCaching ? Math.max(0, (maxAgeSeconds - ageSeconds) * 1000) : 0;

  return {
    allowsCaching,
    maxAgeSeconds,
    ageSeconds,
    remainingMs,
    expiresAt: nowMs + remainingMs,
  };
}

function parseDirectives(cacheControl: string | null | undefined): Map<string, string | undefined> {
  const directives = new Map<string, string | undefined>();
  if (!cacheControl) return directives;

  for (const part of cacheControl.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      directives.set(trimmed.toLowerCase(), undefined);
      continue;
    }

    const name = trimmed.slice(0, eq).trim().toLowerCase();
    if (!name) continue;
    directives.set(name, trimmed.slice(eq + 1).trim());
  }

  return directives;
}

function parseMaxAgeSeconds(value: string | undefined): number {
  const parsed = parseNonNegativeInteger(value);
  return parsed ?? SEVEN_DAY_SECONDS;
}

function parseAgeSeconds(value: string | null | undefined): number {
  return parseNonNegativeInteger(value) ?? 0;
}

function parseNonNegativeInteger(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/^"|"$/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
