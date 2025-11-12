import { describe, it, expect } from 'vitest';
import { extractVersesFromHTML } from './extractVersesFromHTML';

describe('extractVersesFromHTML', () => {
  it('should return empty array for null input', () => {
    expect(extractVersesFromHTML(null)).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    expect(extractVersesFromHTML(undefined)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(extractVersesFromHTML('')).toEqual([]);
  });

  it('should extract single verse from HTML', () => {
    const html = `
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
      <span class="content">In the beginning God created the heavens and the earth.</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      verse: 1,
      html: expect.stringContaining('<span class="yv-v" v="1">') as string,
    });
    expect(result[0]?.html).toContain('In the beginning God created');
  });

  it('should extract multiple verses from HTML', () => {
    const html = `
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
      <span class="content">In the beginning God created the heavens and the earth.</span>
      <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>
      <span class="content">Now the earth was formless and empty.</span>
      <span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>
      <span class="content">And God said, "Let there be light," and there was light.</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      verse: 1,
      html: expect.stringContaining('In the beginning') as string,
    });
    expect(result[1]).toEqual({
      verse: 2,
      html: expect.stringContaining('formless and empty') as string,
    });
    expect(result[2]).toEqual({
      verse: 3,
      html: expect.stringContaining('Let there be light') as string,
    });
  });

  it('should handle verses with double-digit numbers', () => {
    const html = `
      <span class="yv-v" v="10"></span><span class="yv-vlbl">10</span>
      <span class="content">Verse ten content.</span>
      <span class="yv-v" v="25"></span><span class="yv-vlbl">25</span>
      <span class="content">Verse twenty-five content.</span>
      <span class="yv-v" v="100"></span><span class="yv-vlbl">100</span>
      <span class="content">Verse one hundred content.</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(3);
    expect(result[0]?.verse).toBe(10);
    expect(result[1]?.verse).toBe(25);
    expect(result[2]?.verse).toBe(100);
  });

  it('should preserve HTML formatting within verses', () => {
    const html = `
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
      <span class="content">This has <strong>bold</strong> and <em>italic</em> text.</span>
      <sup class="footnote">a</sup>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(1);
    expect(result[0]?.html).toContain('<strong>bold</strong>');
    expect(result[0]?.html).toContain('<em>italic</em>');
    expect(result[0]?.html).toContain('<sup class="footnote">a</sup>');
  });

  it('should handle verses with footnotes and cross-references', () => {
    const html = `
      <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>
      <span class="content">God called the light "day,"</span>
      <sup class="footnote">a</sup>
      <span class="content">and the darkness he called "night."</span>
      <sup class="crossref">b</sup>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(1);
    expect(result[0]?.verse).toBe(5);
    expect(result[0]?.html).toContain('God called the light');
    expect(result[0]?.html).toContain('footnote');
    expect(result[0]?.html).toContain('crossref');
  });

  it('should handle HTML with no verse markers', () => {
    const html = `
      <div>Some content without verse markers</div>
      <span class="content">Just regular text</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toEqual([]);
  });

  it('should handle malformed verse markers', () => {
    const html = `
      <span class="yv-v" v="1"></span>
      <span class="content">Missing verse label span</span>
      <span class="yv-vlbl">2</span>
      <span class="content">Missing verse marker span</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toEqual([]);
  });

  it('should trim whitespace from extracted HTML', () => {
    const html = `
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>


      <span class="content">Content with surrounding whitespace</span>


    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(1);
    expect(result[0]?.html).not.toMatch(/^\s+/);
    expect(result[0]?.html).not.toMatch(/\s+$/);
  });

  it('should handle consecutive verses without content between them', () => {
    const html = `
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
      <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>
      <span class="content">Verse 2 content</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      verse: 1,
      html: '<span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>',
    });
    expect(result[1]?.html).toContain('Verse 2 content');
  });

  it('should extract verses in correct order', () => {
    const html = `
      <span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>
      <span class="content">Third verse</span>
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
      <span class="content">First verse</span>
      <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>
      <span class="content">Second verse</span>
    `;

    const result = extractVersesFromHTML(html);

    expect(result).toHaveLength(3);
    expect(result[0]?.verse).toBe(3);
    expect(result[1]?.verse).toBe(1);
    expect(result[2]?.verse).toBe(2);
  });
});
