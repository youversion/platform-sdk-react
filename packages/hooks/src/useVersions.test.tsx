import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useVersions, type UseVersionsOptions } from './useVersions';
import { createBibleClientStub, createYVWrapper } from './test/utils';

it('forwards the complete version filter contract', async () => {
  const getVersions = vi.fn().mockResolvedValue({ data: [], next_page_token: null });
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getVersions }),
  });

  renderHook(
    () =>
      useVersions(['en', 'es'], 'license-abc', {
        page_size: '*',
        page_token: 'next',
        fields: ['id', 'title'],
        all_available: true,
      }),
    { wrapper },
  );

  await waitFor(() =>
    expect(getVersions).toHaveBeenCalledWith(['en', 'es'], 'license-abc', {
      page_size: '*',
      page_token: 'next',
      fields: ['id', 'title'],
      all_available: true,
    }),
  );
});

it('uses array contents in the cache key', async () => {
  const getVersions = vi.fn().mockResolvedValue({ data: [], next_page_token: null });
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getVersions }),
  });
  const { rerender } = renderHook(({ ranges }) => useVersions(ranges), {
    wrapper,
    initialProps: { ranges: ['en', 'es'] },
  });
  await waitFor(() => expect(getVersions).toHaveBeenCalledTimes(1));

  rerender({ ranges: ['en', 'fr'] });

  await waitFor(() => expect(getVersions).toHaveBeenCalledTimes(2));
  expect(getVersions).toHaveBeenLastCalledWith(['en', 'fr'], undefined, undefined);
});

const firstOptions: UseVersionsOptions = {
  page_size: 10,
  page_token: 'first',
  fields: ['id'],
  all_available: false,
};

it.each([
  { name: 'license', licenseId: 'license-b', options: firstOptions },
  { name: 'page size', licenseId: 'license-a', options: { ...firstOptions, page_size: 20 } },
  {
    name: 'page token',
    licenseId: 'license-a',
    options: { ...firstOptions, page_token: 'second' },
  },
  { name: 'fields', licenseId: 'license-a', options: { ...firstOptions, fields: ['id', 'title'] } },
  {
    name: 'availability',
    licenseId: 'license-a',
    options: { ...firstOptions, all_available: true },
  },
] satisfies { name: string; licenseId: string; options: UseVersionsOptions }[])(
  'loads a distinct result when $name changes on the same mount',
  async ({ licenseId, options }) => {
    const getVersions = vi
      .fn()
      .mockResolvedValueOnce({ data: [], next_page_token: 'first-result' })
      .mockResolvedValueOnce({ data: [], next_page_token: 'second-result' });
    const wrapper = createYVWrapper('test-app-key', {
      bibleClient: createBibleClientStub({ getVersions }),
    });

    const { result, rerender } = renderHook(
      ({ licenseId, options }: { licenseId: string; options: UseVersionsOptions }) =>
        useVersions('en', licenseId, options),
      { wrapper, initialProps: { licenseId: 'license-a', options: firstOptions } },
    );
    await waitFor(() => expect(result.current.versions?.next_page_token).toBe('first-result'));

    rerender({ licenseId, options });
    await waitFor(() => expect(result.current.versions?.next_page_token).toBe('second-result'));
    expect(getVersions).toHaveBeenCalledTimes(2);
    expect(getVersions).toHaveBeenLastCalledWith('en', licenseId, {
      page_size: options.page_size,
      page_token: options.page_token,
      fields: options.fields,
      all_available: options.all_available,
    });
  },
);
