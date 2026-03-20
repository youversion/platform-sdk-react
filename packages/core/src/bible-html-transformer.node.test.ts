/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { transformBibleHtmlForNode } from './bible-html-transformer';

describe('transformBibleHtmlForNode', () => {
  it('should transform HTML using linkedom', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">Note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toBeDefined();
    expect(result.notes).toBeDefined();
    expect(result.notes['1']).toBeDefined();
    expect(result.html).toContain('data-verse-footnote="1"');
  });

  it('should handle empty HTML', () => {
    const result = transformBibleHtmlForNode('');

    expect(result.html).toBeDefined();
    expect(result.notes).toEqual({});
  });

  it('should extract footnotes correctly', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text<span class="yv-n f"><span class="ft">First note</span></span>.
          <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>More text<span class="yv-n f"><span class="ft">Second note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.notes['1']).toBeDefined();
    expect(result.notes['2']).toBeDefined();
    expect(result.notes['1']!.notes).toHaveLength(1);
    expect(result.notes['2']!.notes).toHaveLength(1);
    expect(result.notes['1']!.notes[0]).toContain('First note');
    expect(result.notes['2']!.notes[0]).toContain('Second note');
  });

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

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toMatch(/<span class="yv-v" v="1">/);
    expect(result.html).toMatch(/<span class="yv-v" v="2">/);
    expect(result.html).not.toContain('<span class="yv-v" v="1"></span>');
  });

  it('should add non-breaking space after verse labels', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toContain('1\u00A0');
  });

  it('should handle intro chapter footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.notes['intro-0']).toBeDefined();
    expect(result.notes['intro-1']).toBeDefined();
    expect(result.notes['intro-0']!.verseHtml).toBe('');
    expect(result.notes['intro-0']!.hasVerseContext).toBe(false);
  });

  it('should include data-verse-footnote-content attribute', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">See Rashi</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('See Rashi');
  });

  it('should return html and notes properties', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtmlForNode(html);

    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('notes');
    expect(typeof result.html).toBe('string');
    expect(typeof result.notes).toBe('object');
  });
});
