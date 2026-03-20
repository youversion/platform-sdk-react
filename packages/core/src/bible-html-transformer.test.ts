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
  it('should return notes keyed by "intro-0", "intro-1" for orphaned footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.notes['intro-0']).toBeDefined();
    expect(result.notes['intro-1']).toBeDefined();
    expect(Object.keys(result.notes)).toHaveLength(2);
  });

  it('should set verseHtml to empty string for intro footnotes', () => {
    const html = `
      <div>
        <div class="ip">Text with a<span class="yv-n f"><span class="ft">A footnote</span></span> note.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.notes['intro-0']!.verseHtml).toBe('');
    expect(result.notes['intro-0']!.hasVerseContext).toBe(false);
  });

  it('should extract correct note content for intro footnotes', () => {
    const html = `
      <div>
        <div class="ip">Text<span class="yv-n f"><span class="ft">See Rashi</span></span> more.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.notes['intro-0']!.notes).toHaveLength(1);
    expect(result.notes['intro-0']!.notes[0]).toContain('See Rashi');
  });

  it('should create data-verse-footnote anchors with intro keys in the output HTML', () => {
    const html = `
      <div>
        <div class="ip">Before<span class="yv-n f"><span class="ft">Note A</span></span> after<span class="yv-n f"><span class="ft">Note B</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('Note A');
    expect(result.html).toContain('data-verse-footnote="intro-1"');
    expect(result.html).toContain('Note B');
    expect(result.html).not.toContain('yv-n f');
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

    expect(result.notes['intro-0']).toBeDefined();
    expect(result.notes['intro-0']!.verseHtml).toBe('');
    expect(result.notes['intro-0']!.hasVerseContext).toBe(false);
    expect(result.notes['intro-0']!.notes[0]).toContain('Intro note');

    expect(result.notes['1']).toBeDefined();
    expect(result.notes['1']!.verseHtml).not.toBe('');
    expect(result.notes['1']!.hasVerseContext).toBe(true);
    expect(result.notes['1']!.notes[0]).toContain('Verse note');
    expect(result.notes['1']!.verseHtml).toContain('data-verse-footnote-content=');
    expect(result.notes['1']!.verseHtml).toContain('Verse note');
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

  it('should preserve footnote HTML structure in data-verse-footnote-content', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text<span class="yv-n f"><span class="ft"><em>Emphasized</em> note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html, createAdapters());

    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const anchor = doc.querySelector('[data-verse-footnote="1"]');
    expect(anchor).not.toBeNull();
    const content = anchor!.getAttribute('data-verse-footnote-content');
    expect(content).toContain('<em>');
    expect(content).toContain('Emphasized');
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
    expect(result.notes).toBeDefined();
    expect(result.notes['1']).toBeDefined();
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
    expect(result1.notes).toEqual(result2.notes);
  });

  it('should handle empty HTML', () => {
    const result = transformBibleHtmlForBrowser('');

    expect(result.html).toBeDefined();
    expect(result.notes).toEqual({});
  });
});

describe('transformBibleHtml - return type', () => {
  it('should return html and notes properties', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('notes');
    expect(typeof result.html).toBe('string');
    expect(typeof result.notes).toBe('object');
  });

  it('should not have rawHtml property in return type', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtml(html, createAdapters());

    expect(result).not.toHaveProperty('rawHtml');
  });
});
