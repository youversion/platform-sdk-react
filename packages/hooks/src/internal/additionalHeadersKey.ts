/**
 * @internal
 * Converts `additionalHeaders` to stable text.
 *
 * Two header sets with the same entries produce the same text, because the
 * entries are sorted before serialization. Key insertion order does not change
 * the result.
 *
 * `YouVersionProvider` uses this text to keep the `ApiClient` memo stable.
 * `useQueryKeyBase` uses it as a cache key segment, so two header sets never
 * share one cache entry. Both call this function, so the two values agree.
 */
export function serializeAdditionalHeaders(
  additionalHeaders: Record<string, string> | undefined,
): string | null {
  if (!additionalHeaders) return null;
  return JSON.stringify(Object.entries(additionalHeaders).sort(([a], [b]) => a.localeCompare(b)));
}
