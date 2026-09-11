import * as z from 'zod/mini';
import type { ApiClient } from './client';
import { transformBibleHtml, type TransformBibleHtmlOptions } from './bible-html-transformer';
import { assertUsableVersion, parseBibleVersionId } from './bible-chapter';
import type { BiblePassage } from './types';

type PassageQuery = {
  format: 'html' | 'text';
  include_headings?: boolean;
  include_notes?: boolean;
};

const booleanSchema = z.boolean();

function buildPassageQuery(
  format: 'html' | 'text',
  includeHeadings?: boolean,
  includeNotes?: boolean,
): PassageQuery {
  if (includeHeadings !== undefined) {
    booleanSchema.parse(includeHeadings);
  }
  if (includeNotes !== undefined) {
    booleanSchema.parse(includeNotes);
  }
  const params: PassageQuery = { format };
  if (includeHeadings !== undefined) {
    params.include_headings = includeHeadings;
  }
  if (includeNotes !== undefined) {
    params.include_notes = includeNotes;
  }
  return params;
}

async function getHtmlAdapters(): Promise<TransformBibleHtmlOptions> {
  if (globalThis.DOMParser) {
    return {
      parseHtml: (h) => new globalThis.DOMParser().parseFromString(h, 'text/html'),
      serializeHtml: (doc) => doc.body.innerHTML,
    };
  }
  let jsdom;
  try {
    // Literal dynamic import is fine in Node. Client bundlers must not pull
    // jsdom into browser graphs — see package.json "browser": { "jsdom": false }.
    jsdom = await import('jsdom');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      'Server-side HTML transformation requires "jsdom". ' +
        'Install it as a dependency or pass transform: false to skip transformation. ' +
        `Original error: ${detail}`,
      { cause: err },
    );
  }
  return {
    parseHtml: (h) =>
      new jsdom.JSDOM(`<!DOCTYPE html><html><body>${h}</body></html>`).window.document,
    serializeHtml: (doc) => doc.body.innerHTML,
  };
}

export async function getPassage(
  client: ApiClient,
  versionId: number,
  usfm: string,
  format: 'html' | 'text' = 'html',
  include_headings?: boolean,
  include_notes?: boolean,
  transform?: boolean,
): Promise<BiblePassage> {
  parseBibleVersionId(versionId);
  const params = buildPassageQuery(format, include_headings, include_notes);
  await assertUsableVersion(client, versionId);
  return fetchPassage(client, versionId, usfm, params, transform);
}

/** @internal Fetches a passage after the caller has enforced the version filter. */
export async function getPassageForValidatedVersion(
  client: ApiClient,
  versionId: number,
  usfm: string,
  format: 'html' | 'text' = 'html',
  include_headings?: boolean,
  include_notes?: boolean,
  transform?: boolean,
): Promise<BiblePassage> {
  parseBibleVersionId(versionId);
  const params = buildPassageQuery(format, include_headings, include_notes);
  return fetchPassage(client, versionId, usfm, params, transform);
}

async function fetchPassage(
  client: ApiClient,
  versionId: number,
  usfm: string,
  params: PassageQuery,
  transform?: boolean,
): Promise<BiblePassage> {
  const passage = await client.get<BiblePassage>(
    `/v1/bibles/${versionId}/passages/${usfm}`,
    params,
  );

  if (params.format === 'html' && transform !== false) {
    const adapters = await getHtmlAdapters();
    const { html } = transformBibleHtml(passage.content, adapters);
    return { ...passage, content: html };
  }

  return passage;
}
