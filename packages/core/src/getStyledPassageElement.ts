import type { ApiClient } from './client';
import { getFontStylesheetUrl } from './getFontStylesheetUrl';

/** CDN major matches `packages/ui/CDN_CSS_MAJOR_VERSION` (bible.css upload path). */
const BIBLE_CSS_STYLESHEET_HREF = 'https://cdn.youversion.com/platform/1/bible.css';

export type GetStyledPassageElementOptions = {
  versionId: number;
  usfm: string;
  /** Fonts API font id. Defaults to 1 (Untitled Serif). */
  fontId?: number;
};

function assertBrowserDocument(): Document {
  const doc = globalThis.document;
  if (!doc?.createElement || !doc.head) {
    throw new Error(
      'getStyledPassageElement requires a browser document. It cannot run where document is unavailable (for example Node without a DOM).',
    );
  }
  return doc;
}

function ensureStylesheetLink(doc: Document, href: string): void {
  for (const link of doc.head.querySelectorAll('link[rel="stylesheet"]')) {
    if (link.getAttribute('href') === href) {
      return;
    }
  }
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  doc.head.append(link);
}

function ensureStyledPassageStylesheets(client: ApiClient, fontId: number): void {
  const doc = assertBrowserDocument();
  const fontHref = getFontStylesheetUrl({
    fontId,
    appKey: client.config.appKey,
    apiHost: client.config.apiHost ?? 'api.youversion.com',
  });
  ensureStylesheetLink(doc, BIBLE_CSS_STYLESHEET_HREF);
  ensureStylesheetLink(doc, fontHref);
}

function createStyledPassageElement(
  passageContent: string,
  copyright: string | null | undefined,
): HTMLElement {
  const doc = assertBrowserDocument();
  const root = doc.createElement('div');
  root.setAttribute('data-yv-sdk', '');
  root.setAttribute('data-slot', 'yv-bible-renderer');
  root.innerHTML = passageContent;

  const copyrightEl = doc.createElement('div');
  copyrightEl.textContent = copyright ?? '';
  root.append(copyrightEl);

  return root;
}

/** Throws if `document` is missing; call before fetching so failures stay browser-local. */
export function requireStyledPassageDocument(): void {
  assertBrowserDocument();
}

/** Inject stylesheets (deduped) and build the detached passage element. */
export function assembleStyledPassageElement(
  client: ApiClient,
  passageContent: string,
  copyright: string | null | undefined,
  fontId: number,
): HTMLElement {
  ensureStyledPassageStylesheets(client, fontId);
  return createStyledPassageElement(passageContent, copyright);
}
