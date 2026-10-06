import type { BibleVersion } from '@youversion/platform-core';

export function getBibleVersionAttribution(
  version: BibleVersion | null | undefined,
): string | null {
  if (version?.copyright?.trim()) return version.copyright;
  if (version?.promotional_content?.trim()) return version.promotional_content;
  return null;
}
