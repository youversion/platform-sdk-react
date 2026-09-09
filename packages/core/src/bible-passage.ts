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
  if (include_headings !== undefined) {
    booleanSchema.parse(include_headings);
  }
  if (include_notes !== undefined) {
    booleanSchema.parse(include_notes);
  }
  const params: PassageQuery = {
    format,
  };
  if (include_headings !== undefined) {
    params.include_headings = include_headings;
  }
  if (include_notes !== undefined) {
    params.include_notes = include_notes;
  }
  await assertUsableVersion(client, versionId);
  const passage = await client.get<BiblePassage>(
    `/v1/bibles/${versionId}/passages/${usfm}`,
    params,
  );

  if (format === 'html' && transform !== false) {
    const adapters = await getHtmlAdapters();
    const { html } = transformBibleHtml(passage.content, adapters);
    return { ...passage, content: html };
  }

  return passage;
}
