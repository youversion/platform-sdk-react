import { render, renderHook } from '@testing-library/react';
import { ApiClient } from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { YouVersionContext } from '../context';
import { YouVersionProvider } from '../context/YouVersionProvider';
import { useApiClient } from './useApiClient';

vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
  };
});

const wrapperWith = (value: { appKey: string; timeout?: number }) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionContext.Provider value={value}>{children}</YouVersionContext.Provider>
  );
  return Wrapper;
};

describe('useApiClient', () => {
  it('leaves timeout undefined when the provider sets none, so ApiClient keeps its own default', () => {
    renderHook(() => useApiClient(), { wrapper: wrapperWith({ appKey: 'test-app-key' }) });

    expect(ApiClient).toHaveBeenCalledWith(
      expect.objectContaining({ appKey: 'test-app-key', timeout: undefined }),
    );
  });

  it('passes the context timeout into the ApiClient constructor', () => {
    renderHook(() => useApiClient(), {
      wrapper: wrapperWith({ appKey: 'test-app-key', timeout: 2500 }),
    });

    expect(ApiClient).toHaveBeenCalledWith(expect.objectContaining({ timeout: 2500 }));
  });

  it('builds a new client when the timeout changes', () => {
    let currentTimeout = 2500;

    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey: 'test-app-key', timeout: currentTimeout }}>
        {children}
      </YouVersionContext.Provider>
    );

    const { result, rerender } = renderHook(() => useApiClient(), { wrapper });
    const firstClient = result.current;
    expect(ApiClient).toHaveBeenCalledTimes(1);

    currentTimeout = 7500;
    rerender();

    expect(ApiClient).toHaveBeenCalledTimes(2);
    expect(ApiClient).toHaveBeenLastCalledWith(expect.objectContaining({ timeout: 7500 }));
    expect(result.current).not.toBe(firstClient);
  });

  it('keeps the same client when the timeout is unchanged', () => {
    const wrapper = wrapperWith({ appKey: 'test-app-key', timeout: 2500 });

    const { result, rerender } = renderHook(() => useApiClient(), { wrapper });
    const firstClient = result.current;

    rerender();

    expect(result.current).toBe(firstClient);
    expect(ApiClient).toHaveBeenCalledTimes(1);
  });

  it('carries the YouVersionProvider timeout prop through to the constructor', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionProvider appKey="test-app-key" timeout={4000}>
        {children}
      </YouVersionProvider>
    );

    renderHook(() => useApiClient(), { wrapper });

    expect(ApiClient).toHaveBeenCalledWith(
      expect.objectContaining({ appKey: 'test-app-key', timeout: 4000 }),
    );
  });

  it('returns null for the optional variant when no provider is mounted', () => {
    const { result } = renderHook(() => useApiClient({ optional: true }));

    expect(result.current).toBeNull();
    expect(ApiClient).not.toHaveBeenCalled();
  });

  it('throws for the non-optional variant when no provider is mounted', () => {
    // React logs the render error before rethrowing it; silence that, not the throw.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useApiClient())).toThrow(/YouVersion context not found/);

    consoleError.mockRestore();
  });

  it('throws for the non-optional variant when the context carries no app key', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      renderHook(() => useApiClient(), { wrapper: wrapperWith({ appKey: '' }) }),
    ).toThrow(/YouVersion context not found/);

    consoleError.mockRestore();
  });
});

describe('useApiClient sharing across siblings', () => {
  // The defect this guards: building the ApiClient in a useMemo inside
  // useApiClient gives every hook instance its own client, and the in-flight GET
  // dedup map is a private per-instance field. Siblings never shared a map, so
  // they never shared a request.
  function Sibling({ onClient }: { onClient: (client: unknown) => void }) {
    onClient(useApiClient());
    return null;
  }

  it('hands every sibling under one provider the same client instance', () => {
    const clients: unknown[] = [];

    render(
      <YouVersionProvider appKey="test-app-key">
        <Sibling onClient={(client) => clients.push(client)} />
        <Sibling onClient={(client) => clients.push(client)} />
        <Sibling onClient={(client) => clients.push(client)} />
      </YouVersionProvider>,
    );

    expect(ApiClient).toHaveBeenCalledTimes(1);
    expect(clients).toHaveLength(3);
    expect(clients[1]).toBe(clients[0]);
    expect(clients[2]).toBe(clients[0]);
  });

  it.each([
    ['appKey', { appKey: 'other-app-key' }],
    ['apiHost', { apiHost: 'staging.youversion.com' }],
    ['timeout', { timeout: 2500 }],
    ['additionalHeaders', { additionalHeaders: { 'X-YVP-Sdk': 'expo' } }],
  ])('rebuilds the shared client when %s changes', (_label, changedProps) => {
    const baseProps = {
      appKey: 'test-app-key',
      apiHost: 'api.youversion.com',
      timeout: 9000,
      additionalHeaders: { 'X-Trace': 'a' },
    };
    const clients: unknown[] = [];

    const { rerender } = render(
      <YouVersionProvider {...baseProps}>
        <Sibling onClient={(client) => clients.push(client)} />
      </YouVersionProvider>,
    );
    expect(ApiClient).toHaveBeenCalledTimes(1);

    rerender(
      <YouVersionProvider {...baseProps} {...changedProps}>
        <Sibling onClient={(client) => clients.push(client)} />
      </YouVersionProvider>,
    );

    expect(ApiClient).toHaveBeenCalledTimes(2);
    expect(clients.at(-1)).not.toBe(clients[0]);
  });

  it('keeps the shared client when the provider re-renders with equivalent props', () => {
    const clients: unknown[] = [];
    const tree = (
      <YouVersionProvider appKey="test-app-key" additionalHeaders={{ 'X-Trace': 'a' }}>
        <Sibling onClient={(client) => clients.push(client)} />
      </YouVersionProvider>
    );

    const { rerender } = render(tree);
    rerender(
      <YouVersionProvider appKey="test-app-key" additionalHeaders={{ 'X-Trace': 'a' }}>
        <Sibling onClient={(client) => clients.push(client)} />
      </YouVersionProvider>,
    );

    expect(ApiClient).toHaveBeenCalledTimes(1);
    expect(clients.at(-1)).toBe(clients[0]);
  });
});
