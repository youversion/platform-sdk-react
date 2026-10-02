import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createMockPassage } from './__tests__/mocks/bibles';
import { usePassage, type UsePassageProps, type UsePassageResult } from './usePassage';
import { createBibleClientStub, createYVWrapper } from './test/utils';

it('forwards passage rendering options, including opting out of HTML transformation', async () => {
  const getPassage = vi.fn().mockResolvedValue({});
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getPassage }),
  });

  renderHook(
    () =>
      usePassage({
        versionId: 3034,
        usfm: 'JHN.3',
        format: 'text',
        include_headings: true,
        include_notes: true,
        transform: false,
      }),
    { wrapper },
  );

  await waitFor(() =>
    expect(getPassage).toHaveBeenCalledWith(3034, 'JHN.3', 'text', true, true, false),
  );
});

it('loads the new passage when the version or format changes without changing USFM', async () => {
  const getPassage = vi
    .fn()
    .mockResolvedValueOnce(createMockPassage({ id: 'version-111-html' }))
    .mockResolvedValueOnce(createMockPassage({ id: 'version-206-html' }))
    .mockResolvedValueOnce(createMockPassage({ id: 'version-206-text' }));
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getPassage }),
  });

  const { result, rerender } = renderHook<
    UsePassageResult,
    Pick<UsePassageProps, 'versionId' | 'format'>
  >(({ versionId, format }) => usePassage({ versionId, usfm: 'JHN.3.16', format }), {
    wrapper,
    initialProps: { versionId: 111, format: 'html' },
  });
  await waitFor(() => expect(result.current.passage?.id).toBe('version-111-html'));

  rerender({ versionId: 206, format: 'html' });
  await waitFor(() => expect(result.current.passage?.id).toBe('version-206-html'));
  expect(getPassage).toHaveBeenLastCalledWith(206, 'JHN.3.16', 'html', false, false, true);

  rerender({ versionId: 206, format: 'text' });
  await waitFor(() => expect(result.current.passage?.id).toBe('version-206-text'));
  expect(getPassage).toHaveBeenLastCalledWith(206, 'JHN.3.16', 'text', false, false, true);
  expect(getPassage).toHaveBeenCalledTimes(3);
});

it.each(['', 'undefined', 'null'])('does not request the invalid USFM value %j', (usfm) => {
  const getPassage = vi.fn();
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getPassage }),
  });

  const { result } = renderHook(() => usePassage({ versionId: 3034, usfm }), { wrapper });

  expect(getPassage).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});
