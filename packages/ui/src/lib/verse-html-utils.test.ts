 /**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { transformBibleHtmlForBrowser } from '@youversion/platform-core';

describe('transformBibleHtmlForBrowser - intro chapter footnotes', () => {
  it('should create data-verse-footnote anchors with intro keys for orphaned footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtmlForBrowser(html);

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote="intro-1"');
    expect(result.html).not.toContain('yv-n f');
  });

  it('should preserve footnote content in data-verse-footnote-content', () => {
    const html = `
      <div>
        <div class="ip">Text with a<span class="yv-n f"><span class="ft">A footnote</span></span> note.</div>
      </div>
    `;

    const result = transformBibleHtmlForBrowser(html);

    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('A footnote');
  });

  it('should extract correct note content for intro footnotes', () => {
    const html = `
      <div>
        <div class="ip">Text<span class="yv-n f"><span class="ft">See Rashi</span></span> more.</div>
      </div>
    `;

    const result = transformBibleHtmlForBrowser(html);

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

    const result = transformBibleHtmlForBrowser(html);

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

    const result = transformBibleHtmlForBrowser(html);

    expect(result.html).toContain('overcome ');
    expect(result.html).not.toMatch(/overcome<span data-verse-footnote/);
  });

  it('should not insert space when orphaned footnote is followed by punctuation', () => {
    const html = `
      <div>
        <div class="ip">overcome<span class="yv-n f"><span class="ft">Note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtmlForBrowser(html);

    expect(result.html).not.toContain('overcome .');
  });
});
