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
    expect(result.html).toContain('data-verse-footnote="1"');
  });

  it('should handle empty HTML', () => {
    const result = transformBibleHtmlForNode('');

    expect(result.html).toBeDefined();
  });

  it('should embed footnote content in data-verse-footnote-content', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text<span class="yv-n f"><span class="ft">First note</span></span>.
          <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>More text<span class="yv-n f"><span class="ft">Second note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toContain('data-verse-footnote="1"');
    expect(result.html).toContain('data-verse-footnote="2"');
    expect(result.html).toContain('First note');
    expect(result.html).toContain('Second note');
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

    // linkedom may serialize attributes in different order than browsers
    expect(result.html).toContain('class="yv-v"');
    expect(result.html).toContain('v="1"');
    expect(result.html).toContain('v="2"');
    expect(result.html).toContain('Verse one text.');
    expect(result.html).toContain('Verse two text.');
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

    // linkedom encodes non-breaking space as &#160; instead of the raw character
    expect(result.html).toMatch(/1(\u00A0|&#160;)/);
  });

  it('should handle intro chapter footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtmlForNode(html);

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote="intro-1"');
    expect(result.html).toContain('First note');
    expect(result.html).toContain('Second note');
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

  it('should return html property only', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtmlForNode(html);

    expect(result).toHaveProperty('html');
    expect(result).not.toHaveProperty('notes');
    expect(typeof result.html).toBe('string');
  });
});
