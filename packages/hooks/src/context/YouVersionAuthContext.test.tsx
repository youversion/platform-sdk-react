import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useYouVersionAuthContext } from './YouVersionAuthContext';

describe('YouVersionAuthContext', () => {
  it('fails clearly outside an auth provider', () => {
    expect(() => {
      renderHook(() => useYouVersionAuthContext());
    }).toThrow('useYouVersionAuthContext must be used within an auth provider');
  });
});
