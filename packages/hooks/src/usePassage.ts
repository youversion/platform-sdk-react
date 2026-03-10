'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BiblePassage } from '@youversion/platform-core';

type usePassageProps = {
  versionId: number;
  usfm: string;
  format?: 'html' | 'text';
  include_headings?: boolean;
  include_notes?: boolean;
  options?: UseApiDataOptions;
};

export function usePassage({
  versionId,
  usfm,
  format = 'html',
  include_headings = true,
  include_notes = true,
  options,
}: usePassageProps): {
  passage: BiblePassage | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  // Don't attempt to fetch if usfm is invalid
  const isValidUsfm = Boolean(usfm) && usfm !== 'undefined' && usfm !== 'null';

  const { data, loading, error, refetch } = useApiData<BiblePassage>(
    () => bibleClient.getPassage(versionId, usfm, format, include_headings, include_notes),
    [bibleClient, versionId, usfm, format, include_headings, include_notes],
    { enabled: options?.enabled !== false && isValidUsfm },
  );

  return { passage: data, loading, error, refetch };
}
