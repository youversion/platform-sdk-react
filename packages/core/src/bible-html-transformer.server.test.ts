/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { transformBibleHtml } from './bible-html-transformer-server';

describe('transformBibleHtml', () => {
  it('should transform HTML using linkedom', () => {
    const html = `
      <div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verse text<span class="yv-n f"><span class="ft">Note</span></span>.
        </div>
      </div>
    `;

    const result = transformBibleHtml(html);

    expect(result.html).toBeDefined();
    expect(result.html).toContain('data-verse-footnote="1"');
  });

  it('should handle empty HTML', () => {
    const result = transformBibleHtml('');

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

    const result = transformBibleHtml(html);

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

    const result = transformBibleHtml(html);

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

    const result = transformBibleHtml(html);

    // linkedom may encode non-breaking space as &#160; instead of the raw character
    expect(result.html).toMatch(/1(\u00A0|&#160;|&nbsp;)/);
  });

  it('should handle intro chapter footnotes', () => {
    const html = `
      <div>
        <div class="ip">Some intro text<span class="yv-n f"><span class="ft">First note</span></span> and more text<span class="yv-n f"><span class="ft">Second note</span></span>.</div>
      </div>
    `;

    const result = transformBibleHtml(html);

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

    const result = transformBibleHtml(html);

    expect(result.html).toContain('data-verse-footnote-content=');
    expect(result.html).toContain('See Rashi');
  });

  it('should return html property only', () => {
    const html = '<div>Test</div>';
    const result = transformBibleHtml(html);

    expect(result).toHaveProperty('html');
    expect(result).not.toHaveProperty('notes');
    expect(typeof result.html).toBe('string');
  });

  it('should remove script tags entirely', () => {
    const html = '<p>Safe text</p><script>alert("XSS")</script>';
    const result = transformBibleHtml(html);

    expect(result.html).not.toContain('script');
    expect(result.html).not.toContain('alert');
    expect(result.html).toContain('Safe text');
  });

  it('should strip event handler attributes', () => {
    const html = '<p onclick="alert(\'XSS\')">Click me</p>';
    const result = transformBibleHtml(html);

    expect(result.html).not.toContain('onclick');
    expect(result.html).toContain('Click me');
  });

  it('should preserve safe Bible HTML through linkedom', () => {
    const html = `
      <div class="p">
        <span class="wj">Jesus said</span>
      </div>
    `;
    const result = transformBibleHtml(html);

    expect(result.html).toContain('class="wj"');
    expect(result.html).toContain('Jesus said');
  });

  it('table rows and colspan survive browser reparse without server <tbody>', async () => {
    // linkedom does not inject <tbody>; browsers/jsdom do. Consumers that set
    // server HTML via dangerouslySetInnerHTML must still see repaired tables.
    const html = `
      <div>
        <table>
          <tr><td>alone</td></tr>
          <tr><td>a</td><td>b</td></tr>
        </table>
      </div>
    `;

    const server = transformBibleHtml(html);
    expect(server.html.toLowerCase()).not.toContain('<tbody');

    // jsdom stands in for a browser HTML parser (still a test-only dep).
    const { JSDOM } = await import('jsdom');
    const browserDoc = new JSDOM(server.html).window.document;
    expect(browserDoc.querySelectorAll('table tr').length).toBe(2);
    const firstCell = browserDoc.querySelector('table tr td');
    expect(firstCell?.getAttribute('colspan')).toBe('2');
    expect(browserDoc.querySelectorAll('table tr')[1]?.querySelectorAll('td').length).toBe(2);
  });
});
