/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { transformBibleHtml } from './bible-html-transformer-server';

describe('server transformBibleHtml', () => {
  it('connects the jsdom adapter to transformation and sanitization', () => {
    const result = transformBibleHtml(
      '<p onclick="alert(1)"><span class="yv-v" v="1"></span>Text' +
        '<script>alert(2)</script><span class="wj" onmouseover="alert(3)">Words</span>' +
        '<span class="yv-n f">Note</span></p>',
    );

    expect(result.html).toContain('data-verse-footnote="1"');
    expect(result.html).toContain('data-verse-footnote-content="Note"');
    expect(result.html).toContain('Text');
    expect(result.html).toContain('<span class="wj">Words</span>');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toMatch(/\bon(?:click|mouseover)=/i);
    expect(result.html).not.toContain('alert(');
  });
});
