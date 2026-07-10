/**
 * YouVersion data-exchange permissions are open-ended strings (not enums): the
 * `highlights` permission ships now, more (e.g. verse notes) arrive later. The
 * server communicates granted permissions back to the app on the sign-in and
 * data-exchange callbacks via `granted_permissions` query param(s).
 *
 * These helpers are pure (no DOM/storage), so they can be unit-tested and reused
 * by both the sign-in callback handler and the data-exchange callback handler.
 */

/**
 * Parses `granted_permissions` from a set of callback query params.
 *
 * The param may repeat and each value may pack several permissions separated by
 * a comma or whitespace (mirrors the Swift SDK's split on `,`/` `). Returns a
 * de-duplicated list, order-preserving on first appearance.
 */
export function parseGrantedPermissions(params: URLSearchParams): string[] {
  const seen = new Set<string>();
  for (const value of params.getAll('granted_permissions')) {
    for (const part of value.split(/[,\s]+/)) {
      const trimmed = part.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  return [...seen];
}
