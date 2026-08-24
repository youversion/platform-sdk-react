import { describe, it, expect } from 'vitest';
import { extractTextFromHtml } from './extractTextFromHTML';

describe('extractTextFromHtml', () => {
  it('should return empty string for empty input', () => {
    expect(extractTextFromHtml('')).toBe('');
  });

  it('should return empty string for falsy input', () => {
    expect(extractTextFromHtml(null)).toBe('');
    expect(extractTextFromHtml(undefined)).toBe('');
  });

  it('should extract text from single content span', () => {
    const html = '<span class="content">Hello World</span>';
    expect(extractTextFromHtml(html)).toBe('Hello World');
  });

  it('should extract text from multiple content spans', () => {
    const html = `
      <span class="content">In the</span>
      <span class="content">beginning</span>
      <span class="content">God</span>
    `;
    expect(extractTextFromHtml(html)).toBe('In the beginning God');
  });

  it('should ignore non-content spans', () => {
    const html = `
      <span class="label">1</span>
      <span class="content">In the beginning</span>
      <span class="footnote">*</span>
      <span class="content">God created</span>
    `;
    expect(extractTextFromHtml(html)).toBe('In the beginning God created');
  });

  it('should normalize whitespace', () => {
    const html = `
      <span class="content">  In   the  </span>
      <span class="content">   beginning   </span>
    `;
    expect(extractTextFromHtml(html)).toBe('In the beginning');
  });

  it('should handle nested elements within content spans', () => {
    const html = `
      <span class="content">The <em>word</em> of God</span>
      <span class="content">is <strong>powerful</strong></span>
    `;
    expect(extractTextFromHtml(html)).toBe('The word of God is powerful');
  });

  it('should filter out empty content spans', () => {
    const html = `
      <span class="content">Hello</span>
      <span class="content">   </span>
      <span class="content"></span>
      <span class="content">World</span>
    `;
    expect(extractTextFromHtml(html)).toBe('Hello World');
  });

  it('should handle complex verse markup', () => {
    const html = `
      <span class="label">1</span>
      <span class="content">In the beginning</span>
      <span class="content">God created the heavens and the earth.</span>
      <span class="footnote">a</span>
      <span class="label">2</span>
      <span class="content">Now the earth was formless and empty,</span>
    `;
    expect(extractTextFromHtml(html)).toBe(
      'In the beginning God created the heavens and the earth. Now the earth was formless and empty,',
    );
  });

  it('should handle HTML with no content spans', () => {
    const html = `
      <div>Some text</div>
      <span class="label">1</span>
      <span class="footnote">*</span>
    `;
    expect(extractTextFromHtml(html)).toBe('');
  });

  it('should preserve order of content spans', () => {
    const html = `
      <span class="content">First</span>
      <span class="other">ignored</span>
      <span class="content">Second</span>
      <span class="content">Third</span>
    `;
    expect(extractTextFromHtml(html)).toBe('First Second Third');
  });

  it('should handle special characters and entities', () => {
    const html = `
      <span class="content">God's love</span>
      <span class="content">&amp; mercy</span>
    `;
    expect(extractTextFromHtml(html)).toBe("God's love & mercy");
  });

  it('should handle line breaks and tabs in content', () => {
    const html = `
      <span class="content">Line one\nLine two</span>
      <span class="content">Tab\there</span>
    `;
    expect(extractTextFromHtml(html)).toBe('Line one Line two Tab here');
  });
});
