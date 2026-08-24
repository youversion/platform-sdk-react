import { useRef } from 'react';
import { isVersionIdDecidablyUnusable } from '@youversion/platform-core';
import { IS_PRODUCTION } from '@/lib/constants';

const warnedVersionIds = new Set<number>();

export function useVersionFilterWarning(versionId: number): void {
  const warnedThisMount = useRef(warnedVersionIds);

  if (IS_PRODUCTION) return;
  if (!isVersionIdDecidablyUnusable(versionId)) return;
  if (warnedThisMount.current.has(versionId)) return;

  warnedThisMount.current.add(versionId);
  console.warn(
    `YouVersion SDK: versionId ${versionId} is excluded by the configured version filter and will not be loaded.`,
  );
}
