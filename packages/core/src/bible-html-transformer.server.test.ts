/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { transformBibleHtml } from './bible-html-transformer-server';

describe('server transformBibleHtml', () => {
  it('connects the jsdom adapter to the shared transformer', () => {
    const result = transformBibleHtml(
      '<p><span class="yv-v" v="1"></span>Text<span class="yv-n f">Note</span></p>',
    );

    expect(result.html).toContain('data-verse-footnote="1"');
    expect(result.html).toContain('data-verse-footnote-content="Note"');
  });
});
