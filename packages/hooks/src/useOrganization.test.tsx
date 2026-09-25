import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useOrganization } from './useOrganization';
import { createOrganizationsClientStub, createYVWrapper } from './test/utils';

it('does not request an organization for a blank identifier', () => {
  const getOrganization = vi.fn();
  const wrapper = createYVWrapper('test-app-key', {
    organizationsClient: createOrganizationsClientStub({ getOrganization }),
  });

  const { result } = renderHook(() => useOrganization('   '), { wrapper });

  expect(getOrganization).not.toHaveBeenCalled();
  expect(result.current.organization).toBeNull();
  expect(result.current.loading).toBe(false);
});
