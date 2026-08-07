import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useOrganization } from './useOrganization';
import { type Organization, type OrganizationsClient } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationsClient';
import { createYVWrapper } from './test/utils';
import { createFinalError } from './__tests__/mocks/errors';

vi.mock('./useOrganizationsClient');

describe('useOrganization', () => {
  const mockGetOrganization = vi.fn();

  const mockOrganization: Organization = {
    id: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
    name: 'The Lockman Foundation',
    primary_language: 'en',
    website_url: 'https://www.lockman.org',
  };

  beforeEach(() => {
    mockGetOrganization.mockResolvedValue(mockOrganization);

    const mockClient: Partial<OrganizationsClient> = { getOrganization: mockGetOrganization };
    vi.mocked(useOrganizationsClient).mockReturnValue(mockClient as OrganizationsClient);
  });

  describe('fetching organization', () => {
    it('should fetch organization by ID', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useOrganization('798d8fa4-f640-4155-8cfb-fa91d1d8a06c'), {
        wrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.organization).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetOrganization).toHaveBeenCalledWith('798d8fa4-f640-4155-8cfb-fa91d1d8a06c');
      expect.soft(result.current.organization).toEqual(mockOrganization);
    });

    it('should refetch when organizationId changes', async () => {
      const wrapper = createYVWrapper();
      const { rerender } = renderHook(({ organizationId }) => useOrganization(organizationId), {
        wrapper,
        initialProps: { organizationId: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c' },
      });

      await waitFor(() => {
        expect(mockGetOrganization).toHaveBeenCalledTimes(1);
      });

      rerender({ organizationId: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff' });

      await waitFor(() => {
        expect(mockGetOrganization).toHaveBeenCalledTimes(2);
      });

      expect(mockGetOrganization).toHaveBeenNthCalledWith(
        2,
        '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
      );
    });
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () => useOrganization('798d8fa4-f640-4155-8cfb-fa91d1d8a06c', { enabled: false }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetOrganization).not.toHaveBeenCalled();
      expect.soft(result.current.organization).toBe(null);
    });

    it('should not fetch when organizationId is empty', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useOrganization(''), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetOrganization).not.toHaveBeenCalled();
      expect.soft(result.current.organization).toBe(null);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const wrapper = createYVWrapper();
      const error = createFinalError('Failed to fetch organization');
      mockGetOrganization.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useOrganization('798d8fa4-f640-4155-8cfb-fa91d1d8a06c'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.organization).toBe(null);
    });
  });

  describe('manual refetch', () => {
    it('should support manual refetch', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useOrganization('798d8fa4-f640-4155-8cfb-fa91d1d8a06c'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetOrganization).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetOrganization).toHaveBeenCalledTimes(2);
      });
    });
  });
});
