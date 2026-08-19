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

function fontLinks(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>(FONT_LINK_SELECTOR));
}

function hrefsFor(appKey: string): string[] {
  return fontLinks()
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.includes(`app_key=${appKey}`));
}

// React hoists these into <head> keyed by href and keeps its own resource map, so
// a removed node is never re-inserted for the same href. Every test therefore uses
// a distinct app key and asserts only on its own link.
describe('Font stylesheet injection via YouVersionProvider', () => {
  it('renders a <link> to the gated Fonts API stylesheet with the app key', () => {
    render(
      <YouVersionProvider appKey="key-basic">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    expect(hrefsFor('key-basic')).toEqual([
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key-basic',
    ]);

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

  it('renders no font <link> when the app key is missing', () => {
    // A whitespace-only key trips the provider's missing-app-key guard, which
    // renders <YvStyles /> alone — <YvFonts /> is never reached. YvFonts' own
    // guard is covered separately below.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = fontLinks().length;

    render(
      <YouVersionProvider appKey="   ">
        <div />
      </YouVersionProvider>,
    );

    expect(fontLinks()).toHaveLength(before);
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

    act(() => {
      root1.unmount();
      root2.unmount();
    });
    container1.remove();
    container2.remove();
  });
});

// The provider guard means YvFonts is normally only reached with a real key, so
// its own defensive guard needs direct coverage — otherwise a regression there
// would only surface as a 401 in a consumer's network tab.
describe('YvFonts', () => {
  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('renders nothing for an %s app key', (_label, appKey) => {
    const before = fontLinks().length;

    render(<YvFonts appKey={appKey} />);

    expect(fontLinks()).toHaveLength(before);
  });
});
