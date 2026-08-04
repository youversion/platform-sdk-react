/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { transformBibleHtml, transformBibleHtmlForBrowser } from './bible-html-transformer';

function createAdapters() {
  return {
    parseHtml: (html: string) => new DOMParser().parseFromString(html, 'text/html'),
    serializeHtml: (doc: Document) => doc.body.innerHTML,
  };
}

describe('transformBibleHtml - intro chapter footnotes', () => {
  it('should create data-verse-footnote anchors with intro keys for orphaned footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote="intro-1"');
    expect(result.html).not.toContain('yv-n f');
  });

  it('should preserve footnote content in data-verse-footnote-content attribute', () => {
    const html = `
      <div>
        <div class="ip">Text<span class="yv-n f"><span class="ft">See Rashi</span></span> more.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('See Rashi');
  });

  it('should not interfere with regular verse footnotes when mixed', () => {
    const html = `
      <div>
        <div class="ip">Intro text<span class="yv-n f"><span class="ft">Intro note</span></span>.</div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">Verse note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote="1"');
    expect(result.html).toContain('Intro note');
    expect(result.html).toContain('Verse note');
  });

  it('should insert space when orphaned footnote is between two words', () => {
    const html = `
      <div>
        <div class="ip">overcome<span class="yv-n f"><span class="ft">Note</span></span>it.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('overcome ');
    expect(result.html).not.toMatch(/overcome<span data-verse-footnote/);
  });

  it('should not insert space when orphaned footnote is followed by punctuation', () => {
    const html = `
      <div>
        <div class="ip">overcome<span class="yv-n f"><span class="ft">Note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('overcome .');
  });
});

describe('transformBibleHtml - verse wrapping', () => {
  it('should wrap verse content in .yv-v[v] elements', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse one text.
        </div>
        <div class="p">
          <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Verse two text.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toMatch(/<span class="yv-v" v="1">/);
    expect(result.html).toMatch(/<span class="yv-v" v="2">/);
    expect(result.html).not.toContain('<span class="yv-v" v="1"></span>');
  });

  it('should not wrap heading elements inside verse content', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text before heading
        </div>
        <div class="s1">A Heading</div>
        <div class="p">
          <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Text after heading
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const heading = doc.querySelector('.s1');
    expect(heading).not.toBeNull();
    expect(heading!.closest('.yv-v')).toBeNull();
  });
});

describe('transformBibleHtml - addNbspToVerseLabels', () => {
  it('should add non-breaking space after verse labels', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const label = doc.querySelector('.yv-vlbl');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain('\u00A0');
  });

  it('should not duplicate non-breaking space if already present', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1\u00A0</span>Verse text.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const label = doc.querySelector('.yv-vlbl');
    const text = label!.textContent ?? '';
    const count = (text.match(/\u00A0/g) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });
});

describe('transformBibleHtml - fixIrregularTables', () => {
  it('should set colspan on single-cell rows in multi-column tables', () => {
    const html = `
      <div>
        <table>
          <tr><td>Header Col 1</td><td>Header Col 2</td></tr>
          <tr><td>Single cell spanning full width</td></tr>
        </table>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const singleCell = doc.querySelector('tr:nth-child(2) td');
    expect(singleCell).not.toBeNull();
    expect(singleCell!.getAttribute('colspan')).toBe('2');
  });
});

describe('transformBibleHtml - data attributes', () => {
  it('should include data-verse-footnote attribute with verse key', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">Note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote="1"');
  });

  it('should include data-verse-footnote-content attribute with footnote HTML', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">See Rashi</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('See Rashi');
  });

  it('should still run parseHtml when sanitize is not provided', () => {
    const html = '<div>Test</div>';
    let called = false;

    transformBibleHtml(html, {
      parseHtml: (h) => {
        called = true;
        return new DOMParser().parseFromString(h, 'text/html');
      },
      serializeHtml: (doc) => doc.body.innerHTML,
    });

    expect(called).toBe(true);
  });
});

describe('transformBibleHtmlForBrowser', () => {
  it('should transform HTML using native DOMParser', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">Note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForBrowser(html);

    expect(result.html).toBeDefined();
    expect(result.html).toContain('data-verse-footnote="1"');
  });

  it('should return same result as transformBibleHtml with browser adapters', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text.
        </div>
      </div>
    `;

    const result1 = transformBibleHtmlForBrowser(html);
    const result2 = transformBibleHtml(html, createAdapters());

    expect(result1.html).toBe(result2.html);
  });

  it('should handle empty HTML', () => {
    const result = transformBibleHtmlForBrowser('');

    expect(result.html).toBeDefined();
  });
});

describe('transformBibleHtml - return type', () => {
  it('should return html property', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result).toHaveProperty('html');
    expect(typeof result.html).toBe('string');
  });

  it('should not have notes or rawHtml properties', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result).not.toHaveProperty('notes');
    expect(result).not.toHaveProperty('rawHtml');
  });
});

describe('transformBibleHtml - sanitization', () => {
  it('should remove script tags entirely', () => {
    const html = '<p>Safe text</p><script>alert("XSS")</script>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('script');
    expect(result.html).not.toContain('alert');
    expect(result.html).toContain('Safe text');
  });

  it('should remove img tags (not in allowlist)', () => {
    const html = '<p>Text</p><img src="x" onerror="alert(\'XSS\')" />';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('img');
    expect(result.html).not.toContain('onerror');
    expect(result.html).toContain('Text');
  });

  it('should strip onclick attribute but preserve element and text', () => {
    const html = '<p onclick="alert(\'XSS\')">Click me</p>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('onclick');
    // Tag-boundary match so we don't accept a false positive like `<pre`.
    expect(result.html).toMatch(/<p(?:\s[^>]*)?>Click me<\/p>/);
  });

  it('should unwrap anchor tags (not in allowlist) preserving text', () => {
    const html = '<p><a href="javascript:alert(\'XSS\')">Link</a></p>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('<a');
    expect(result.html).not.toContain('href');
    expect(result.html).toContain('Link');
  });

  it('should remove svg tags entirely', () => {
    const html = '<p>Text</p><svg onload="alert(1)"><circle></circle></svg>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('svg');
    expect(result.html).not.toContain('onload');
    expect(result.html).not.toContain('circle');
    expect(result.html).toContain('Text');
  });

  it('should strip style attribute from allowed tags', () => {
    const html = '<div style="background:url(javascript:alert(1))">text</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('style');
    expect(result.html).toContain('<div');
    expect(result.html).toContain('text');
  });

  it('should preserve safe Bible HTML with allowed tags, classes, and attributes', () => {
    const html = `
      <div class="p">
        <span class="wj">Jesus said</span>
      </div>
      <table><tr><td colspan="2">Cell</td></tr></table>
    `;
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('class="p"');
    expect(result.html).toContain('class="wj"');
    expect(result.html).toContain('colspan="2"');
    expect(result.html).toContain('<table>');
  });

  it('should unwrap unknown custom elements preserving text', () => {
    const html = '<p><custom-element>text</custom-element></p>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('custom-element');
    expect(result.html).toContain('text');
  });

  it('should remove iframe tags entirely', () => {
    const html = '<p>Text</p><iframe src="https://evil.com"></iframe>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).not.toContain('iframe');
    expect(result.html).toContain('Text');
  });

  it('should preserve data-* attributes', () => {
    const html = '<div data-slot="verse-container" data-custom="value">Content</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-slot="verse-container"');
    expect(result.html).toContain('data-custom="value"');
  });

  it('should preserve dir attribute for RTL support', () => {
    const html = '<div dir="rtl"><p class="p">Hebrew text</p></div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('dir="rtl"');
  });
});

describe('transformBibleHtml - idempotency', () => {
  it('should add data-yv-transformed marker after transforming', () => {
    const html =
      '<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text.</div></div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-yv-transformed');
  });

  it('should short-circuit when HTML is already transformed', () => {
    const html =
      '<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text.</div></div>';
    const first = transformBibleHtml(html, createAdapters());
    const second = transformBibleHtml(first.html, createAdapters());

    expect(second.html).toBe(first.html);
  });

  it('should produce identical output when transformed twice (idempotent)', () => {
    const html =
      '<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">A note</span></span>.</div></div>';
    const first = transformBibleHtml(html, createAdapters());
    const second = transformBibleHtml(first.html, createAdapters());

    expect(second.html).toBe(first.html);
  });

  it('should not short-circuit on untrusted nested data-yv-transformed', () => {
    const html =
      '<div><span data-yv-transformed></span><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text<span class="yv-n f"><span class="ft">A note</span></span>.</div></div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote');
    expect(result.html).toMatch(/^<div\b[^>]*\bdata-yv-transformed\b/);
  });
});

describe('transformBibleHtmlForBrowser - DOMParser fallback', () => {
  it('should throw when DOMParser is unavailable', () => {
    const original = globalThis.DOMParser;
    try {
      // @ts-expect-error - intentionally removing DOMParser
      globalThis.DOMParser = undefined;
      expect(() => transformBibleHtmlForBrowser('<p>test</p>')).toThrow(
        'DOMParser is required to transform Bible HTML in browser environments',
      );
    } finally {
      globalThis.DOMParser = original;
    }
  });
});
