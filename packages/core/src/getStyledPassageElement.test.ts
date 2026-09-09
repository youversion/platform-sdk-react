/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from './client';
import { BibleClient } from './bible';
import { getFontStylesheetUrl } from './getFontStylesheetUrl';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { mockVersionKJV } from './__tests__/MockVersions';
import { mockNIVGen1Verse1PassageHTML } from './__tests__/MockPassages';
import { server } from './__tests__/setup';

const apiHost = process.env.YVP_API_HOST || 'api.youversion.com';
const appKey = 'test-styled-passage-app-key';
const BIBLE_CSS_HREF = 'https://cdn.youversion.com/platform/1/bible.css';

function bibleClient(overrides?: { apiHost?: string; appKey?: string }): BibleClient {
  return new BibleClient(
    new ApiClient({
      apiHost: overrides?.apiHost ?? apiHost,
      appKey: overrides?.appKey ?? appKey,
      installationId: 'test-installation',
    }),
  );
}

function stylesheetHrefs(): string[] {
  return [...document.head.querySelectorAll('link[rel="stylesheet"]')].map(
    (link) => link.getAttribute('href') ?? '',
  );
}

function clearHeadStylesheets(): void {
  for (const link of document.head.querySelectorAll('link[rel="stylesheet"]')) {
    link.remove();
  }
}

function clearVersionFilters(): void {
  YouVersionPlatformConfiguration.permittedVersionIds = undefined;
  YouVersionPlatformConfiguration.excludedVersionIds = undefined;
  YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
}

describe('BibleClient.getStyledPassageElement', () => {
  it('returns a detached element with reader tokens, passage HTML, copyright text, and injects stylesheets once', async () => {
    clearHeadStylesheets();

    const client = bibleClient();
    const el = await client.getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' });

    expect(el.isConnected).toBe(false);
    expect(el.hasAttribute('data-yv-sdk')).toBe(true);
    expect(el.getAttribute('data-slot')).toBe('yv-bible-renderer');
    expect(el.innerHTML).toContain('data-yv-transformed');
    expect(el.innerHTML).toContain('In the beginning God created the heavens and the earth');

    const copyrightChild = el.lastElementChild;
    expect(copyrightChild).not.toBeNull();
    expect(copyrightChild?.textContent).toBe(mockVersionKJV.copyright);

    const fontHref = getFontStylesheetUrl({ fontId: 1, appKey, apiHost });
    expect(stylesheetHrefs()).toEqual([BIBLE_CSS_HREF, fontHref]);

    const second = await client.getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' });
    expect(second).not.toBe(el);
    expect(second.isConnected).toBe(false);
    expect(stylesheetHrefs()).toEqual([BIBLE_CSS_HREF, fontHref]);
    expect(stylesheetHrefs().filter((href) => href === BIBLE_CSS_HREF)).toHaveLength(1);
    expect(stylesheetHrefs().filter((href) => href === fontHref)).toHaveLength(1);
  });

  it('sets copyright via textContent even when the API copyright string contains markup', async () => {
    clearHeadStylesheets();
    const markupCopyright = 'Rights <script>alert(1)</script> & more <b>bold</b>';
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () => {
        return HttpResponse.json({ ...mockVersionKJV, copyright: markupCopyright });
      }),
    );

    const el = await bibleClient().getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' });
    const copyrightChild = el.lastElementChild;
    expect(copyrightChild?.textContent).toBe(markupCopyright);
    expect(copyrightChild?.querySelector('script')).toBeNull();
    expect(copyrightChild?.querySelector('b')).toBeNull();
    expect(copyrightChild?.childNodes).toHaveLength(1);
    expect(copyrightChild?.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('uses an empty copyright text child when version.copyright is missing', async () => {
    clearHeadStylesheets();
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () => {
        return HttpResponse.json({ ...mockVersionKJV, copyright: null });
      }),
    );

    const el = await bibleClient().getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' });
    expect(el.lastElementChild?.textContent).toBe('');
  });

  it('throws a clear browser-only error when document is unavailable', async () => {
    clearHeadStylesheets();
    const originalDocument = globalThis.document;
    // Simulate a non-browser runtime while keeping the rest of the globals.
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: undefined,
    });

    try {
      await expect(
        bibleClient().getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' }),
      ).rejects.toThrow(/browser document/i);
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  it('propagates version-refuse without calling the passage endpoint', async () => {
    clearHeadStylesheets();
    clearVersionFilters();
    YouVersionPlatformConfiguration.excludedVersionIds = [111];

    let passageCalls = 0;
    server.use(
      http.get(`https://${apiHost}/v1/bibles/111/passages/:usfm`, () => {
        passageCalls += 1;
        return HttpResponse.json(mockNIVGen1Verse1PassageHTML);
      }),
    );

    try {
      await expect(
        bibleClient().getStyledPassageElement({ versionId: 111, usfm: 'GEN.1.1' }),
      ).rejects.toMatchObject({ status: 403 });
      expect(passageCalls).toBe(0);
    } finally {
      clearVersionFilters();
    }
  });

  it('propagates API errors from getPassage', async () => {
    clearHeadStylesheets();
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:bible_id/passages/GEN.1.1`, () => {
        return HttpResponse.json(
          { error: 'not_found', error_description: 'Passage not found' },
          { status: 404 },
        );
      }),
    );

    await expect(
      bibleClient().getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('optional fontId changes only the font stylesheet href', async () => {
    clearHeadStylesheets();
    const client = bibleClient();

    await client.getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1' });
    const defaultFontHref = getFontStylesheetUrl({ fontId: 1, appKey, apiHost });
    expect(stylesheetHrefs()).toEqual([BIBLE_CSS_HREF, defaultFontHref]);

    await client.getStyledPassageElement({ versionId: 1, usfm: 'GEN.1.1', fontId: 7 });
    const altFontHref = getFontStylesheetUrl({ fontId: 7, appKey, apiHost });
    expect(stylesheetHrefs()).toEqual([BIBLE_CSS_HREF, defaultFontHref, altFontHref]);
    expect(stylesheetHrefs().filter((href) => href === BIBLE_CSS_HREF)).toHaveLength(1);
    expect(altFontHref).toContain('/v1/fonts/7/stylesheet');
    expect(altFontHref).not.toBe(defaultFontHref);
  });
});
