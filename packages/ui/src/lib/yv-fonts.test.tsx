/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { YouVersionProvider } from '@/components/YouVersionProvider';
import { YvFonts } from '@/lib/yv-fonts';

const FONT_LINK_SELECTOR = 'link[rel="stylesheet"][data-precedence="yv-sdk-fonts"]';
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

function fontLinks(ownerDocument: Document = document): HTMLLinkElement[] {
  return Array.from(ownerDocument.head.querySelectorAll<HTMLLinkElement>(FONT_LINK_SELECTOR));
}

function hrefsFor(appKey: string): string[] {
  return fontLinks()
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.includes(`app_key=${appKey}`));
}

function googleFontLinks(ownerDocument: Document = document): HTMLLinkElement[] {
  return fontLinks(ownerDocument).filter(
    (link) => link.getAttribute('href') === GOOGLE_FONTS_HREF,
  );
}

function brandFontLinks(ownerDocument: Document = document): HTMLLinkElement[] {
  return fontLinks(ownerDocument).filter((link) =>
    link.getAttribute('href')?.includes('/v1/fonts/1/stylesheet'),
  );
}

// React hoists these into <head> keyed by href and keeps its own resource map, so
// a removed node is never re-inserted for the same href. Every test therefore uses
// a distinct app key and asserts only on its own link.
describe('Font stylesheet injection via YouVersionProvider', () => {
  it('loads the base and gated font stylesheets without host-app setup', () => {
    render(
      <YouVersionProvider appKey="key-basic">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    expect(hrefsFor('key-basic')).toEqual([
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key-basic',
    ]);
    expect(googleFontLinks()).toHaveLength(1);

    // React can suspend a commit on <link rel="stylesheet" precedence> until the
    // sheet loads, and jsdom never fires `load` for it. Assert children still
    // commit, so a plain synchronous mount can't blank a consumer's tree. This
    // covers the sync path only — a mount inside a transition is not exercised
    // here; see the caveat in yv-fonts.tsx.
    expect(document.body.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
  });

  it('percent-encodes the app key', () => {
    render(
      <YouVersionProvider appKey="key encode/+chars">
        <div />
      </YouVersionProvider>,
    );

    expect(hrefsFor('key%20encode%2F%2Bchars')).toEqual([
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key%20encode%2F%2Bchars',
    ]);
  });

  it('respects a custom apiHost', () => {
    render(
      <YouVersionProvider appKey="key-host" apiHost="api-staging.youversion.com">
        <div />
      </YouVersionProvider>,
    );

    expect(hrefsFor('key-host')).toEqual([
      'https://api-staging.youversion.com/v1/fonts/1/stylesheet?app_key=key-host',
    ]);
  });

  it('still loads the base fonts when the app key is missing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ownerDocument = document.implementation.createHTMLDocument();
    const container = ownerDocument.createElement('div');
    ownerDocument.body.append(container);

    render(
      <YouVersionProvider appKey="   ">
        <div />
      </YouVersionProvider>,
      { container },
    );

    expect(googleFontLinks(ownerDocument)).toHaveLength(1);
    expect(brandFontLinks(ownerDocument)).toHaveLength(0);
    consoleError.mockRestore();
  });

  it('deduplicates the font <link> when multiple providers are rendered', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    const root1 = createRoot(container1);
    const root2 = createRoot(container2);

    act(() => {
      root1.render(<YouVersionProvider appKey="key-dedupe">{null}</YouVersionProvider>);
      root2.render(<YouVersionProvider appKey="key-dedupe">{null}</YouVersionProvider>);
    });

    expect(hrefsFor('key-dedupe')).toHaveLength(1);
    expect(googleFontLinks()).toHaveLength(1);

    act(() => {
      root1.unmount();
      root2.unmount();
    });
    container1.remove();
    container2.remove();
  });
});

describe('YvFonts', () => {
  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('loads only the base fonts for an %s app key', (_label, appKey) => {
    const ownerDocument = document.implementation.createHTMLDocument();
    const container = ownerDocument.createElement('div');
    ownerDocument.body.append(container);

    render(<YvFonts appKey={appKey} />, { container });

    expect(googleFontLinks(ownerDocument)).toHaveLength(1);
    expect(brandFontLinks(ownerDocument)).toHaveLength(0);
  });
});
