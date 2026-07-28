import type { Collection, Highlight, YouVersionUserInfo } from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';

/** Wraps a highlight list in the paginated collection envelope the clients return. */
export function collection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

/** Minimal signed-in user the auth context needs; only `id`/`name` are read. */
export const mockUserInfo = { id: 'user-1', name: 'Test User' } as unknown as YouVersionUserInfo;

/** A promise whose resolution the test controls, so async timing is deterministic. */
export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * Provider stack for the highlights hooks. Signed-in by default; pass
 * `userInfo={null}` (or a toggled value) for the signed-out variant.
 */
export function Providers({
  children,
  userInfo = mockUserInfo,
}: {
  children: ReactNode;
  userInfo?: YouVersionUserInfo | null;
}): ReactElement {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key' }}>
      <YouVersionAuthContext.Provider
        value={{ userInfo, setUserInfo: vi.fn(), isLoading: false, error: null }}
      >
        {children}
      </YouVersionAuthContext.Provider>
    </YouVersionContext.Provider>
  );
}
