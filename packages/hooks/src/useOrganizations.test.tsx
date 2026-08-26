import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, it } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganizations } from './useOrganizations';
import { useOrganization } from './useOrganization';
import { type Organization } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import type { HookOverrides } from './hook-overrides';
import { createOrganizationsClientStub } from './test/utils';

const ORG_A = '798d8fa4-f640-4155-8cfb-fa91d1d8a06c';
const ORG_B = '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff';

function makeOrg(id: string): Organization {
  return {
    id,
    name: `Org ${id}`,
    primary_language: 'en',
    website_url: `https://example.com/${id}`,
  };
}

type SetupOptions = {
  getOrganization?: (id: string) => Promise<Organization>;
  hookOverrides?: HookOverrides;
  strict?: boolean;
};

/**
 * Builds a ready-to-run wrapper whose QueryClient lives outside the wrapper
 * component, so remounting a hook under it reads the same cache the previous
 * mount filled. `appKey` is settable because it is the first segment of every
 * query key.
 */
function setup({ getOrganization, hookOverrides, strict }: SetupOptions = {}) {
  const mockGetOrganization = vi.fn(
    getOrganization ?? ((id: string) => Promise.resolve(makeOrg(id))),
  );
  const organizationsClient = createOrganizationsClientStub({
    getOrganization: mockGetOrganization,
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function wrapperWithAppKey(appKey: string) {
    return ({ children }: { children: ReactNode }) => {
      const tree = (
        <YouVersionContext.Provider value={{ appKey, organizationsClient, hookOverrides }}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </YouVersionContext.Provider>
      );
      return strict ? <StrictMode>{tree}</StrictMode> : tree;
    };
  }

  return { mockGetOrganization, wrapper: wrapperWithAppKey('test-app-key'), wrapperWithAppKey };
}

describe('useOrganizations', () => {
  it('fetches each unique id once, ignoring blank and duplicate entries', async () => {
    const { mockGetOrganization, wrapper } = setup();

    const { result } = renderHook(() => useOrganizations([ORG_A, ORG_A, ORG_B, null, '', '   ']), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(2);
    });

    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(2);
    expect.soft(result.current.organizations.get(ORG_A)?.id).toBe(ORG_A);
    expect.soft(result.current.organizations.get(ORG_B)?.id).toBe(ORG_B);
  });

  it('keeps successful results when some fetches fail', async () => {
    const { result } = renderHook(() => useOrganizations([ORG_A, ORG_B]), {
      wrapper: setup({
        getOrganization: (id) =>
          id === ORG_B ? Promise.reject(new Error('boom')) : Promise.resolve(makeOrg(id)),
      }).wrapper,
    });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(1);
    });

    expect.soft(result.current.organizations.has(ORG_A)).toBe(true);
    expect.soft(result.current.organizations.has(ORG_B)).toBe(false);
  });

  it('fetches only the new ids when the list grows, and reuses the Map when it only reorders', async () => {
    const { mockGetOrganization, wrapper } = setup();

    const { rerender, result } = renderHook(({ ids }) => useOrganizations(ids), {
      wrapper,
      initialProps: { ids: [ORG_A] },
    });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(1);
    });
    expect(mockGetOrganization).toHaveBeenCalledTimes(1);

    rerender({ ids: [ORG_A, ORG_B] });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(2);
    });
    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(2);
    expect.soft(mockGetOrganization).toHaveBeenNthCalledWith(2, ORG_B);

    // Consumers hold this Map across renders; a fresh instance per render would
    // churn every memo downstream of it.
    const settled = result.current.organizations;
    rerender({ ids: [ORG_B, ORG_A, ORG_A] });
    expect.soft(result.current.organizations).toBe(settled);
    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(2);
  });

  it('renders a remount from the shared cache and fetches once per id under StrictMode', async () => {
    const { mockGetOrganization, wrapper } = setup({ strict: true });

    const first = renderHook(() => useOrganizations([ORG_A, ORG_B]), { wrapper });
    await waitFor(() => {
      expect(first.result.current.organizations.size).toBe(2);
    });
    // StrictMode invokes effects twice; both passes share one request per id.
    expect(mockGetOrganization).toHaveBeenCalledTimes(2);
    first.unmount();

    // Reopening the version picker shows the publishers on the first render,
    // then revalidates each id once in the background.
    const second = renderHook(() => useOrganizations([ORG_A, ORG_B]), { wrapper });
    expect(second.result.current.organizations.size).toBe(2);

    await waitFor(() => {
      expect(mockGetOrganization).toHaveBeenCalledTimes(4);
    });
    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(4);
  });

  it('shares cache entries with useOrganization', async () => {
    const { mockGetOrganization, wrapper } = setup();

    const { result } = renderHook(
      () => ({
        single: useOrganization(ORG_A),
        batch: useOrganizations([ORG_A, ORG_B]),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.batch.organizations.size).toBe(2);
    });

    expect.soft(result.current.single.organization?.id).toBe(ORG_A);
    // ORG_A is one cache entry for both hooks, so only ORG_A and ORG_B are fetched.
    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(2);
  });

  it('refetches under a new appKey instead of serving the previous key’s data', async () => {
    const { mockGetOrganization, wrapperWithAppKey } = setup();

    const first = renderHook(() => useOrganizations([ORG_A]), {
      wrapper: wrapperWithAppKey('app-key-one'),
    });
    await waitFor(() => {
      expect(first.result.current.organizations.size).toBe(1);
    });
    expect(mockGetOrganization).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useOrganizations([ORG_A]), {
      wrapper: wrapperWithAppKey('app-key-two'),
    });

    await waitFor(() => {
      expect(mockGetOrganization).toHaveBeenCalledTimes(2);
    });
    expect.soft(mockGetOrganization).toHaveBeenNthCalledWith(2, ORG_A);
    await waitFor(() => {
      expect(second.result.current.organizations.get(ORG_A)?.id).toBe(ORG_A);
    });
  });

  it('returns the override result and fetches nothing when an override is set', async () => {
    const overridden = new Map([[ORG_A, makeOrg(ORG_A)]]);
    const { mockGetOrganization, wrapper } = setup({
      hookOverrides: { useOrganizations: () => ({ organizations: overridden }) },
    });

    const { result } = renderHook(() => useOrganizations([ORG_A, ORG_B]), { wrapper });

    await waitFor(() => {
      expect(result.current.organizations).toBe(overridden);
    });
    expect(mockGetOrganization).not.toHaveBeenCalled();
  });
});
