'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BiblePassage } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export type UsePassageProps = {
  versionId: number;
  usfm: string;
  format?: 'html' | 'text';
  include_headings?: boolean;
  include_notes?: boolean;
  /**
   * Whether to auto-transform HTML content (default: `true`). Set to `false`
   * to receive the original, untransformed HTML from the API — useful when
   * running outside a DOM environment without the optional `jsdom` peer.
   */
  transform?: boolean;
  options?: UseApiDataOptions;
};

export type UsePassageResult = UseNamedQueryResult<'passage', BiblePassage>;

export function usePassage({
  versionId,
  usfm,
  format = 'html',
  include_headings = false,
  include_notes = false,
  transform = true,
  options,
}: UsePassageProps): UsePassageResult {
  const override = useHookOverride('usePassage');
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  // Don't attempt to fetch if usfm is invalid
  const isValidUsfm = Boolean(usfm) && usfm !== 'undefined' && usfm !== 'null';

  const { data, loading, error, refetch } = useApiData<BiblePassage>(
    [...keyBase, 'passage', versionId, usfm, format, include_headings, include_notes, transform],
    () =>
      bibleClient.getPassage(versionId, usfm, format, include_headings, include_notes, transform),
    { enabled: !override && options?.enabled !== false && isValidUsfm },
  );

  if (override) {
    return override({
      versionId,
      usfm,
      format,
      include_headings,
      include_notes,
      transform,
      options,
    });
  }

  return { passage: data, loading, error, refetch };
}
