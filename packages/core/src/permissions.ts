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
  return mergePermissionValues(params.getAll('granted_permissions'));
}

/**
 * Splits a permission list string the way Swift's `permissions(from:)` does
 * (comma or whitespace). Used for token `scope` and stashed grant lists.
 */
export function parsePermissionList(value: string | null | undefined): string[] {
  if (!value) return [];
  return mergePermissionValues([value]);
}

function mergePermissionValues(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    for (const part of value.split(/[,\s]+/)) {
      if (part) seen.add(part);
    }
  }
  return [...seen];
}
