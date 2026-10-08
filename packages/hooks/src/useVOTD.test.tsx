import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { YouVersionContext } from './context';
import { createBibleClientStub, TestQueryClientProvider } from './test/utils';
import { useVerseOfTheDay } from './useVOTD';

it('separates cached VOTD data when provider configuration changes', async () => {
  const getVOTD = vi.fn().mockResolvedValue({ day: 1, passage_id: 'ISA.43.19' });
  const bibleClient = createBibleClientStub({ getVOTD });
  let appKey = 'first-app';
  const wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionContext.Provider value={{ appKey, bibleClient }}>
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </YouVersionContext.Provider>
  );
  const { rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });
  await waitFor(() => expect(getVOTD).toHaveBeenCalledTimes(1));

  appKey = 'second-app';
  rerender();

  await waitFor(() => expect(getVOTD).toHaveBeenCalledTimes(2));
});
