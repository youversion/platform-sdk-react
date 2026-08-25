import { YouVersionUserInfo, type Collection, type Highlight } from '@youversion/platform-core';
import {
  YouVersionAuthContext,
  YouVersionContext,
  type HookOverrides,
} from '@youversion/platform-react-hooks';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { TestQueryClientProvider } from './hook-overrides';

/** Wraps a highlight list in the paginated collection envelope the clients return. */
export function collection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

function idleHighlights(): ReturnType<NonNullable<HookOverrides['useHighlights']>> {
  return {
    highlights: collection([]),
    loading: false,
    error: null,
    refetch: () => undefined,
    createHighlight: () => Promise.reject(new Error('createHighlight not stubbed')),
    deleteHighlight: () => Promise.resolve(),
  };
}

/** `useHighlights` hookOverride that returns idle highlights plus any overrides. */
export function stubUseHighlights(
  overrides: Partial<ReturnType<NonNullable<HookOverrides['useHighlights']>>> = {},
): NonNullable<HookOverrides['useHighlights']> {
  const result = { ...idleHighlights(), ...overrides };
  return () => result;
}

/** Multi-verse YVDOM used by controlled-mode highlight tests (`.yv-v[v]` wrappers). */
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
export const mockUserInfo = new YouVersionUserInfo({ id: 'user-1', name: 'Test User' });

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

/** A promise whose resolution the test controls, so async timing is deterministic. */
export function deferred<T>(): Deferred<T> {
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
  hookOverrides,
}: {
  children: ReactNode;
  userInfo?: YouVersionUserInfo | null;
  hookOverrides?: HookOverrides;
}): ReactElement {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key', hookOverrides }}>
      <YouVersionAuthContext.Provider
        value={{ userInfo, setUserInfo: vi.fn(), isLoading: false, error: null }}
      >
        <TestQueryClientProvider>{children}</TestQueryClientProvider>
      </YouVersionAuthContext.Provider>
    </YouVersionContext.Provider>
  );
}
