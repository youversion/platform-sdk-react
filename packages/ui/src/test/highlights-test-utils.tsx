import type { Collection, Highlight, YouVersionUserInfo } from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';

/** Wraps a highlight list in the paginated collection envelope the clients return. */
export function collection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

/** Multi-verse YVDOM used by paint-only highlight tests (`.yv-v[v]` wrappers). */
export const MULTI_VERSE_HTML = `
  <div class="p">
    <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning was the Word.
    <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He was with God in the beginning.
    <span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Through him all things were made.
  </div>
`;

export function getVerseEl(container: HTMLElement, verse: number): HTMLElement {
  const els = container.querySelectorAll<HTMLElement>(`.yv-v[v="${verse}"]`);
  const el = els[els.length - 1];
  if (!el) throw new Error(`Verse ${verse} not rendered`);
  return el;
}

/**
 * Color the renderer paints for a highlight fill in light mode (full opacity;
 * jsdom serializes a fully opaque color to `rgb(...)`).
 */
export function fillFor(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
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
