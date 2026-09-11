import type { ApiClient } from './client';
import { getVersion } from './bible-chapter';
import { getBibleStylesheets } from './bible-display-resources';
import { getPassageForValidatedVersion } from './bible-passage';
import {
  BiblePassageDisplaySchema,
  GetPassageDisplayOptionsSchema,
  type BiblePassageDisplay,
  type GetPassageDisplayOptions,
  type PassageAttribution,
} from './schemas/passage-display';
import { BiblePassageSchema } from './schemas/passage';
import { BibleVersionSchema } from './schemas/version';
import type { BibleVersion } from './types';
import {
  isLanguageFilterActive,
  isVersionIdDecidablyUnusable,
  throwUnusableBibleVersion,
} from './version-filters';

/** Attributes that scope Bible CSS to a passage container. */
export const BIBLE_CONTAINER_ATTRIBUTES = Object.freeze({
  'data-yv-sdk': '',
  'data-slot': 'yv-bible-renderer' as const,
});

export class MissingPassageAttributionError extends Error {
  readonly code = 'missing_passage_attribution' as const;
  readonly versionId: number;

  constructor(versionId: number) {
    super(`Bible version ${versionId} has no display attribution.`);
    this.name = 'MissingPassageAttributionError';
    this.versionId = versionId;
  }
}

function getPassageAttribution(version: BibleVersion): PassageAttribution {
  if (version.copyright?.trim()) {
    return { text: version.copyright, source: 'copyright' };
  }
  if (version.promotional_content?.trim()) {
    return { text: version.promotional_content, source: 'promotionalContent' };
  }
  throw new MissingPassageAttributionError(version.id);
}

async function fetchDisplayResources(client: ApiClient, options: GetPassageDisplayOptions) {
  const fetchPassage = () =>
    getPassageForValidatedVersion(
      client,
      options.versionId,
      options.passageId,
      'html',
      options.includeHeadings,
      options.includeNotes,
      true,
    );

  if (isLanguageFilterActive()) {
    const version = await getVersion(client, options.versionId);
    const passage = await fetchPassage();
    return { passage, version };
  }

  if (isVersionIdDecidablyUnusable(options.versionId)) {
    throwUnusableBibleVersion();
  }

  const [passage, version] = await Promise.all([
    fetchPassage(),
    getVersion(client, options.versionId),
  ]);
  return { passage, version };
}

/**
 * Fetches transformed passage HTML, current attribution, and declarative
 * rendering resources without modifying the DOM or caching attribution.
 */
export async function getPassageDisplay(
  client: ApiClient,
  input: GetPassageDisplayOptions,
): Promise<BiblePassageDisplay> {
  const options = GetPassageDisplayOptionsSchema.parse(input);

  const resources = await fetchDisplayResources(client, options);
  const passage = BiblePassageSchema.parse(resources.passage);
  const version = BibleVersionSchema.parse(resources.version);
  const display = {
    passage,
    version,
    html: passage.content,
    attribution: getPassageAttribution(version),
    stylesheets: getBibleStylesheets(client.config),
    containerAttributes: BIBLE_CONTAINER_ATTRIBUTES,
  };

  return BiblePassageDisplaySchema.parse(display);
}
