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
 *
 * The YouVersion auth server encodes the request/response permission lists using
 * PHP/Rails-style bracket-array notation (observed live as `requested_permissions[]`
 * in the hosted consent redirect it builds). `URLSearchParams` treats
 * `granted_permissions[]` (and indexed `granted_permissions[0]`) as keys distinct
 * from bare `granted_permissions`, so we accept every `granted_permissions`,
 * `granted_permissions[]`, and `granted_permissions[<n>]` key. This keeps the
 * reader symmetric with what the server emits; a plain `granted_permissions` still
 * works unchanged.
 */
export function parseGrantedPermissions(params: URLSearchParams): string[] {
  const values: string[] = [];
  for (const [key, value] of params) {
    if (isGrantedPermissionsKey(key)) {
      values.push(value);
    }
  }
  return mergePermissionValues(values);
}

/** Matches `granted_permissions`, `granted_permissions[]`, or `granted_permissions[<index>]`. */
function isGrantedPermissionsKey(key: string): boolean {
  return key === 'granted_permissions' || /^granted_permissions\[\d*\]$/.test(key);
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
