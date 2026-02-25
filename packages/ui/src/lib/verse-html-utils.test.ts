 /**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { transformBibleHtml } from './verse-html-utils';

describe('transformBibleHtml - intro chapter footnotes', () => {
  it('should return notes keyed by "intro-0", "intro-1" for orphaned footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

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

    const result = transformBibleHtml(html);

    expect(result.notes['intro-0']!.verseHtml).toBe('');
  });

  it('should extract correct note content for intro footnotes', () => {
    const html = `
      <div>
        <div class="ip">Text<span class="yv-n f"><span class="ft">See Rashi</span></span> more.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

    expect(result.notes['intro-0']!.notes).toHaveLength(1);
    expect(result.notes['intro-0']!.notes[0]).toContain('See Rashi');
  });

  it('should create data-verse-footnote anchors with intro keys in the output HTML', () => {
    const html = `
      <div>
        <div class="ip">Before<span class="yv-n f"><span class="ft">Note A</span></span> after<span class="yv-n f"><span class="ft">Note B</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

    expect(result.html).toContain('data-verse-footnote="intro-0"');
    expect(result.html).toContain('data-verse-footnote="intro-1"');
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

    const result = transformBibleHtml(html);

    expect(result.notes['intro-0']).toBeDefined();
    expect(result.notes['intro-0']!.verseHtml).toBe('');
    expect(result.notes['intro-0']!.notes[0]).toContain('Intro note');

    expect(result.notes['1']).toBeDefined();
    expect(result.notes['1']!.verseHtml).not.toBe('');
    expect(result.notes['1']!.notes[0]).toContain('Verse note');
  });

  it('should insert space when orphaned footnote is between two words', () => {
    const html = `
      <div>
        <div class="ip">overcome<span class="yv-n f"><span class="ft">Note</span></span>it.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

    expect(result.html).toContain('overcome ');
    expect(result.html).not.toMatch(/overcome<span data-verse-footnote/);
  });

  it('should not insert space when orphaned footnote is followed by punctuation', () => {
    const html = `
      <div>
        <div class="ip">overcome<span class="yv-n f"><span class="ft">Note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

    expect(result.html).not.toContain('overcome .');
  });
});
