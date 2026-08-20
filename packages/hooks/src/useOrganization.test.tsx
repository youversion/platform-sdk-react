import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useOrganization } from './useOrganization';
import { type Organization } from '@youversion/platform-core';
import { createOrganizationsClientStub, createYVWrapper } from './test/utils';

describe('useOrganization', () => {
  const mockGetOrganization = vi.fn();
  const organizationsClient = createOrganizationsClientStub({
    getOrganization: mockGetOrganization,
  });
  const wrapper = createYVWrapper('test-app-key', { organizationsClient });

  const mockOrganization: Organization = {
    id: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
    name: 'The Lockman Foundation',
    primary_language: 'en',
    website_url: 'https://www.lockman.org',
  };

  beforeEach(() => {
    mockGetOrganization.mockResolvedValue(mockOrganization);
  });

  describe('fetching organization', () => {
    it('should fetch organization by ID', async () => {
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
      const error = new Error('Failed to fetch organization');
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
