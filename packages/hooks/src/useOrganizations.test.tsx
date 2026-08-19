import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import type { ReactNode } from 'react';
import { useOrganizations } from './useOrganizations';
import { type Organization } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { createOrganizationsClientStub } from './test/utils';

const ORG_A = '798d8fa4-f640-4155-8cfb-fa91d1d8a06c';
const ORG_B = '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff';

function makeOrg(id: string, name: string): Organization {
  return { id, name, primary_language: 'en', website_url: `https://example.com/${id}` };
}

describe('useOrganizations', () => {
  const mockGetOrganization = vi.fn();
  const organizationsClient = createOrganizationsClientStub({
    getOrganization: mockGetOrganization,
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <YouVersionContext.Provider value={{ appKey: 'test-app-key', organizationsClient }}>
        {children}
      </YouVersionContext.Provider>
    );
  }

  beforeEach(() => {
    mockGetOrganization.mockReset();
    mockGetOrganization.mockImplementation((id: string) =>
      Promise.resolve(makeOrg(id, `Org ${id}`)),
    );
  });

  it('fetches each unique id once, deduplicating', async () => {
    const { result } = renderHook(() => useOrganizations([ORG_A, ORG_A, ORG_B, null, '']), {
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
    mockGetOrganization.mockImplementation((id: string) =>
      id === ORG_B ? Promise.reject(new Error('boom')) : Promise.resolve(makeOrg(id, 'A')),
    );

    const { result } = renderHook(() => useOrganizations([ORG_A, ORG_B]), { wrapper });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(1);
    });

    expect.soft(result.current.organizations.has(ORG_A)).toBe(true);
    expect.soft(result.current.organizations.has(ORG_B)).toBe(false);
  });

  it('does not refetch ids already cached when the id set grows', async () => {
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

    // Only ORG_B is fetched on the second pass; ORG_A served from cache.
    expect.soft(mockGetOrganization).toHaveBeenCalledTimes(2);
    expect.soft(mockGetOrganization).toHaveBeenNthCalledWith(2, ORG_B);
  });

  it('invalidates the cache and refetches when the client identity changes', async () => {
    let currentClient = organizationsClient;
    const swappingWrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider
        value={{ appKey: 'test-app-key', organizationsClient: currentClient }}
      >
        {children}
      </YouVersionContext.Provider>
    );

    const { rerender, result } = renderHook(({ ids }) => useOrganizations(ids), {
      wrapper: swappingWrapper,
      initialProps: { ids: [ORG_A] },
    });

    await waitFor(() => {
      expect(result.current.organizations.size).toBe(1);
    });
    expect(mockGetOrganization).toHaveBeenCalledTimes(1);

    // Swap in a new client object (same id set) — e.g. appKey/host change.
    currentClient = createOrganizationsClientStub({ getOrganization: mockGetOrganization });

    rerender({ ids: [ORG_A] });

    // Same id set, but the cache must be invalidated and ORG_A refetched.
    await waitFor(() => {
      expect(mockGetOrganization).toHaveBeenCalledTimes(2);
    });
    expect(mockGetOrganization).toHaveBeenNthCalledWith(2, ORG_A);

    await waitFor(() => {
      expect(result.current.organizations.get(ORG_A)?.id).toBe(ORG_A);
    });
  });
});
