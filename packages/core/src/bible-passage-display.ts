import type { ApiClient } from './client';
import { getVersion, parseBibleVersionId } from './bible-chapter';
import { getPassageForValidatedVersion } from './bible-passage';
import {
  BiblePassageDisplaySchema,
  GetPassageDisplayOptionsSchema,
  type BiblePassageDisplay,
  type GetPassageDisplayOptions,
  type PassageAttribution,
  type PassageStylesheet,
} from './schemas/passage-display';
import { BiblePassageSchema } from './schemas/passage';
import { BibleVersionSchema } from './schemas/version';
import type { ApiConfig, BibleVersion } from './types';
import {
  isLanguageFilterActive,
  isVersionIdDecidablyUnusable,
  throwUnusableBibleVersion,
} from './version-filters';

/** The versioned YouVersion stylesheet for Bible HTML. */
export const BIBLE_CSS_STYLESHEET_URL = 'https://cdn.youversion.com/platform/1/bible.css';

/** The permanent Fonts API identifier for Untitled Serif. */
export const UNTITLED_SERIF_FONT_ID = 1;

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

/** Returns the ordered stylesheet resources for displaying Bible HTML. */
export function getBibleStylesheets(
  config: Pick<ApiConfig, 'appKey' | 'apiHost'>,
): readonly PassageStylesheet[] {
  const apiHost = config.apiHost || 'api.youversion.com';
  return [
    {
      kind: 'bible',
      rel: 'stylesheet',
      href: BIBLE_CSS_STYLESHEET_URL,
    },
    {
      kind: 'font',
      rel: 'stylesheet',
      href: `https://${apiHost}/v1/fonts/${UNTITLED_SERIF_FONT_ID}/stylesheet?app_key=${encodeURIComponent(config.appKey)}`,
    },
  ];
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
  parseBibleVersionId(options.versionId);

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
