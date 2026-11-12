/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { Separator } from '@/components/ui/separator';
import { YouVersionProvider } from '@/components/YouVersionProvider';
import { Textarea } from '@/components/ui/textarea';
import { YvFonts } from '@/lib/yv-fonts';

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

function stylesheetLinks(ownerDocument: Document): HTMLLinkElement[] {
  return Array.from(ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
}

function hrefsFor(ownerDocument: Document, appKey: string): string[] {
  return stylesheetLinks(ownerDocument)
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.includes(`app_key=${appKey}`));
}

function googleFontLinks(ownerDocument: Document): HTMLLinkElement[] {
  return stylesheetLinks(ownerDocument).filter(
    (link) => link.getAttribute('href') === GOOGLE_FONTS_HREF,
  );
}

function brandFontLinks(ownerDocument: Document): HTMLLinkElement[] {
  return stylesheetLinks(ownerDocument).filter((link) =>
    link.getAttribute('href')?.includes('/v1/fonts/1/stylesheet'),
  );
}

function createTestDocument() {
  const ownerDocument = document.implementation.createHTMLDocument();
  const container = ownerDocument.createElement('div');
  ownerDocument.body.append(container);
  return { ownerDocument, container };
}

describe('Font stylesheet injection via YouVersionProvider', () => {
  it('inserts the base and gated font stylesheets without host-app setup', () => {
    const { ownerDocument, container } = createTestDocument();
    render(
      <YouVersionProvider appKey="key-basic">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
      { container },
    );

    expect(hrefsFor(ownerDocument, 'key-basic')).toEqual([
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key-basic',
    ]);
    expect(googleFontLinks(ownerDocument)).toHaveLength(1);

    // Font installation must not gate or blank the consumer tree.
    expect(ownerDocument.body.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
  });

  it('percent-encodes the app key', () => {
    const { ownerDocument, container } = createTestDocument();
    render(
      <YouVersionProvider appKey="key encode/+chars">
        <div />
      </YouVersionProvider>,
      { container },
    );

    expect(hrefsFor(ownerDocument, 'key%20encode%2F%2Bchars')).toEqual([
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key%20encode%2F%2Bchars',
    ]);
  });

  it('respects a custom apiHost', () => {
    const { ownerDocument, container } = createTestDocument();
    render(
      <YouVersionProvider appKey="key-host" apiHost="api-staging.youversion.com">
        <div />
      </YouVersionProvider>,
      { container },
    );

    expect(hrefsFor(ownerDocument, 'key-host')).toEqual([
      'https://api-staging.youversion.com/v1/fonts/1/stylesheet?app_key=key-host',
    ]);
  });

  it('still inserts the base font stylesheet when the app key is missing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { ownerDocument, container } = createTestDocument();

      render(<YouVersionProvider appKey="   ">{null}</YouVersionProvider>, { container });

      expect(googleFontLinks(ownerDocument)).toHaveLength(1);
      expect(brandFontLinks(ownerDocument)).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps the provider tree mounted when the base stylesheet fails', async () => {
    const { ownerDocument, container } = createTestDocument();

    render(
      <YouVersionProvider appKey="key-font-error">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
      { container },
    );

    const [googleFontLink] = googleFontLinks(ownerDocument);
    expect(googleFontLink).toBeDefined();
    googleFontLink!.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(ownerDocument.body.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('deduplicates the font <link> when multiple providers are rendered', () => {
    const { ownerDocument, container: container1 } = createTestDocument();
    const container2 = ownerDocument.createElement('div');
    ownerDocument.body.append(container2);
    const first = render(<YouVersionProvider appKey="key-dedupe">{null}</YouVersionProvider>, {
      container: container1,
    });
    const second = render(<YouVersionProvider appKey="key-dedupe">{null}</YouVersionProvider>, {
      container: container2,
    });

    expect(hrefsFor(ownerDocument, 'key-dedupe')).toHaveLength(1);
    expect(googleFontLinks(ownerDocument)).toHaveLength(1);

    first.unmount();
    second.unmount();
    container1.remove();
    container2.remove();
  });

  it('inserts the base font stylesheet for a standalone styled component', async () => {
    const { ownerDocument, container } = createTestDocument();

    render(<Textarea />, { container });

    await waitFor(() => expect(googleFontLinks(ownerDocument)).toHaveLength(1));
  });

  it('keeps one document-owned base stylesheet across provider and shadow components', async () => {
    const { ownerDocument, container } = createTestDocument();

    render(
      <YouVersionProvider appKey="key-mixed-tree">
        <Textarea />
        <Separator />
        <Separator />
      </YouVersionProvider>,
      { container },
    );

    await waitFor(() => {
      expect(googleFontLinks(ownerDocument)).toHaveLength(1);
      expect(
        Array.from(ownerDocument.querySelectorAll<HTMLLinkElement>('link[href]')).filter(
          (link) => link.getAttribute('href') === GOOGLE_FONTS_HREF,
        ),
      ).toHaveLength(1);
      const shadowRoots = Array.from(ownerDocument.querySelectorAll<HTMLElement>('*')).flatMap(
        (element) => (element.shadowRoot ? [element.shadowRoot] : []),
      );
      expect(shadowRoots).toHaveLength(2);
      const shadowFontLinks = shadowRoots.flatMap((shadowRoot) =>
        Array.from(shadowRoot.querySelectorAll<HTMLLinkElement>('link[href]')).filter(
          (link) => link.getAttribute('href') === GOOGLE_FONTS_HREF,
        ),
      );
      expect(shadowFontLinks).toHaveLength(0);
    });
  });

  it('emits base and gated stylesheets during server rendering with a DOM shim', () => {
    const html = renderToString(<YvFonts appKey="key-ssr" />);

    expect(html).toContain(
      `rel="stylesheet" href="${GOOGLE_FONTS_HREF.replaceAll('&', '&amp;')}"`,
    );
    expect(html).toContain(
      'rel="stylesheet" href="https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key-ssr"',
    );
    expect(html).toContain('data-precedence="yv-sdk-fonts"');
  });

  it('applies font stylesheets when a provider streams after the initial shell', async () => {
    let reveal!: () => void;
    let revealed = false;
    const pending = new Promise<void>((resolve) => {
      reveal = () => {
        revealed = true;
        resolve();
      };
    });
    function DelayedFonts(): React.ReactElement {
      if (!revealed) throw pending;
      return <YvFonts appKey="late-key" />;
    }

    const html = await new Promise<string>((resolve, reject) => {
      let output = '';
      const destination = new PassThrough();
      destination.setEncoding('utf8');
      destination.on('data', (chunk: string) => {
        output += chunk;
      });
      destination.once('data', reveal);
      destination.on('end', () => resolve(output));
      destination.on('error', reject);

      const stream = renderToPipeableStream(
        <main>
          <span>shell</span>
          <Suspense fallback={<div>loading</div>}>
            <DelayedFonts />
          </Suspense>
        </main>,
        {
          onShellReady() {
            stream.pipe(destination);
          },
          onError: reject,
        },
      );
    });

    expect(html).toContain(
      `["https://api.youversion.com/v1/fonts/1/stylesheet?app_key=late-key","yv-sdk-fonts"]`,
    );
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('inserts only the base font stylesheet for an %s app key', (_label, appKey) => {
    const { ownerDocument, container } = createTestDocument();

    render(<YvFonts appKey={appKey} />, { container });

    expect(googleFontLinks(ownerDocument)).toHaveLength(1);
    expect(brandFontLinks(ownerDocument)).toHaveLength(0);
  });
});
