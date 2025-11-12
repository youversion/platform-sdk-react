import type { BibleVersion } from '@youversion/platform-core';

export function getISOFromVersion(version: BibleVersion): string {
  return version?.language_tag || 'unknown';
}
