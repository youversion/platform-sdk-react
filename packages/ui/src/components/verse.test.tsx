/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Verse } from './verse';

describe('Verse.Html - XSS Protection', () => {
  describe('DOMPurify sanitization', () => {
    it('should remove script tags from HTML', async () => {
      const maliciousHtml = '<p>Safe text</p><script>alert("XSS")</script>';

      const { container } = render(<Verse.Html html={maliciousHtml} />);

      await waitFor(() => {
        const scriptTags = container.querySelectorAll('script');
        expect(scriptTags).toHaveLength(0);
      });
    });

    it('should remove inline event handlers (onerror)', async () => {
      const maliciousHtml = '<img src="x" onerror="alert(\'XSS\')" />';

      const { container } = render(<Verse.Html html={maliciousHtml} />);

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img).not.toHaveAttribute('onerror');
      });
    });

    it('should remove inline event handlers (onclick)', async () => {
      const maliciousHtml = '<p onclick="alert(\'XSS\')">Click me</p>';

      const { container } = render(<Verse.Html html={maliciousHtml} />);

      await waitFor(() => {
        const paragraph = container.querySelector('p');
        expect(paragraph).not.toBeNull();
        expect(paragraph?.getAttribute('onclick')).toBeNull();
        expect(paragraph?.textContent).toBe('Click me');
      });
    });

    it('should remove javascript: URLs', async () => {
      const maliciousHtml = '<a href="javascript:alert(\'XSS\')">Link</a>';

      const { container } = render(<Verse.Html html={maliciousHtml} />);

      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link).not.toHaveAttribute('href');
      });
    });

    it('should preserve safe HTML paragraph tags', async () => {
      const safeHtml = '<p class="yv-text">Safe Bible content</p>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        const paragraph = container.querySelector('p');
        expect(paragraph).not.toBeNull();
        expect(paragraph?.textContent).toBe('Safe Bible content');
        expect(paragraph?.className).toContain('yv-text');
      });
    });

    it('should preserve safe HTML span tags', async () => {
      const safeHtml = '<span class="yv-verse">Verse text</span>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span?.textContent).toBe('Verse text');
        expect(span?.className).toContain('yv-verse');
      });
    });

    it('should preserve safe HTML sup tags for verse numbers', async () => {
      const safeHtml = '<p><sup class="yv-vlbl">1</sup>In the beginning...</p>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        const sup = container.querySelector('sup');
        expect(sup).not.toBeNull();
        expect(sup?.textContent).toBe('1\u00A0'); // Note: yvDomTransformer adds non-breaking space
        expect(sup?.className).toContain('yv-vlbl');
      });
    });

    it('should preserve yv-* prefixed classes', async () => {
      const safeHtml = '<p class="yv-verse yv-text-primary yv-custom">Content</p>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        const paragraph = container.querySelector('p');
        expect(paragraph).not.toBeNull();
        expect(paragraph?.className).toContain('yv-verse');
        expect(paragraph?.className).toContain('yv-text-primary');
        expect(paragraph?.className).toContain('yv-custom');
      });
    });

    it('should preserve data-slot attributes', async () => {
      const safeHtml = '<div data-slot="verse-container">Content</div>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        const div = container.querySelector('div[data-slot="verse-container"]');
        expect(div).not.toBeNull();
        expect(div?.textContent).toBe('Content');
      });
    });

    it('should preserve section tags used in Bible markup', async () => {
      const safeHtml = '<section class="yv-chapter"><p>Content</p></section>';

      const { container } = render(<Verse.Html html={safeHtml} />);

      await waitFor(() => {
        // The outer section is the component wrapper
        const sections = container.querySelectorAll('section');
        expect(sections.length).toBeGreaterThanOrEqual(1);

        // Check that inner section content is preserved
        const innerSection = container.querySelector('section.yv-chapter');
        expect(innerSection).not.toBeNull();
      });
    });

    it('should handle complex Bible verse HTML safely', async () => {
      const complexHtml = `
        <p class="yv-p">
          <sup class="yv-vlbl">1</sup>
          <span class="yv-txt">For God so loved the world</span>
        </p>
        <p class="yv-p">
          <sup class="yv-vlbl">2</sup>
          <span class="yv-txt">that he gave his one and only Son</span>
        </p>
      `;

      const { container } = render(<Verse.Html html={complexHtml} />);

      await waitFor(() => {
        const paragraphs = container.querySelectorAll('p.yv-p');
        expect(paragraphs.length).toBe(2);

        const sups = container.querySelectorAll('sup.yv-vlbl');
        expect(sups.length).toBe(2);

        const spans = container.querySelectorAll('span.yv-txt');
        expect(spans.length).toBe(2);
      });
    });

    it('should apply custom styles from props', async () => {
      const html = '<p>Test</p>';

      const { container } = render(
        <Verse.Html html={html} fontFamily="Georgia" fontSize={18} lineHeight={1.5} />,
      );

      await waitFor(() => {
        const section = container.querySelector('section[data-slot="yv-bible-renderer"]');
        expect(section).not.toBeNull();

        // Note: CSS variables are set as style attributes, not computed styles
        const inlineStyle = section?.getAttribute('style');
        expect(inlineStyle).toContain('--yv-reader-font-family: Georgia');
        expect(inlineStyle).toContain('--yv-reader-font-size: 18px');
        expect(inlineStyle).toContain('--yv-reader-line-height: 1.5');
      });
    });

    it('should handle hideVerseNumbers prop', async () => {
      const html = '<p><sup class="yv-vlbl">1</sup>Text</p>';

      const { container } = render(<Verse.Html html={html} showVerseNumbers={false} />);

      await waitFor(() => {
        const section = container.querySelector('section[data-slot="yv-bible-renderer"]');
        expect(section?.getAttribute('data-show-verse-numbers')).toBe('false');
      });
    });
  });

  describe('yvDomTransformer', () => {
    it('should add non-breaking space to verse labels', async () => {
      const html = '<p><sup class="yv-vlbl">3</sup>For God so loved...</p>';

      const { container } = render(<Verse.Html html={html} />);

      await waitFor(() => {
        const sup = container.querySelector('sup.yv-vlbl');
        expect(sup).not.toBeNull();
        // The transformer should add \u00A0 (non-breaking space) to the end
        expect(sup?.textContent).toBe('3\u00A0');
      });
    });

    it('should not duplicate non-breaking space if already present', async () => {
      const html = '<p><sup class="yv-vlbl">3\u00A0</sup>Text</p>';

      const { container } = render(<Verse.Html html={html} />);

      await waitFor(() => {
        const sup = container.querySelector('sup.yv-vlbl');
        expect(sup).not.toBeNull();
        // Should still have only one non-breaking space
        expect(sup?.textContent).toBe('3\u00A0');
      });
    });
  });
});

describe('Verse.Html - Footnotes', () => {
  it('should extract footnotes and create placeholders', async () => {
    const htmlWithFootnotes = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines in the darkness, and the
        darkness has not overcome<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or </span><span class="fqa">understood</span></span>
        it.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithFootnotes} renderNotes={true} />);

    await waitFor(() => {
      const placeholder = container.querySelector('[data-verse-footnote="5"]');
      expect(placeholder).not.toBeNull();
    });
  });

  it('should remove original footnote elements', async () => {
    const htmlWithFootnotes = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or understood</span></span> it.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithFootnotes} renderNotes={true} />);

    await waitFor(() => {
      const footnoteElements = container.querySelectorAll('.yv-n.f');
      expect(footnoteElements.length).toBe(0);
    });
  });

  it('should place footnote at end of correct verse (v42 not v43)', async () => {
    const htmlWithFootnotes = `
      <div class="p">
        <span class="yv-v" v="42"></span><span class="yv-vlbl">42</span>And he brought him to Jesus.
      </div>
      <div class="p">
        Jesus looked at him and said,
        <span class="wj">"You are Simon son of John. You will be called Cephas"</span>
        (which, when translated, is Peter<span class="yv-n f"><span class="fr">1:42 </span><span class="fq">Cephas </span><span class="ft">(Aramaic) and </span><span class="fq">Peter </span><span class="ft">(Greek) both mean </span><span class="fqa">rock.</span></span>).
      </div>
      <div class="s1 yv-h">Jesus Calls Philip and Nathanael</div>
      <div class="p">
        <span class="yv-v" v="43"></span><span class="yv-vlbl">43</span>The next day Jesus decided to leave for Galilee.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithFootnotes} renderNotes={true} />);

    await waitFor(() => {
      const placeholder42 = container.querySelector('[data-verse-footnote="42"]');
      expect(placeholder42).not.toBeNull();

      const verse43Marker = container.querySelector('.yv-v[v="43"]');
      expect(verse43Marker).not.toBeNull();

      const position42 = placeholder42?.compareDocumentPosition(verse43Marker!);
      expect(position42! & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('should handle multiple footnotes in a single verse', async () => {
    const htmlWithMultipleNotes = `
      <div class="p">
        <span class="yv-v" v="51"></span><span class="yv-vlbl">51</span>He then added,
        <span class="wj">"Very truly I tell you,</span><span class="yv-n f"><span class="fr">1:51 </span><span class="ft">The Greek is plural.</span></span>
        <span class="wj">you</span><span class="yv-n f"><span class="fr">1:51 </span><span class="ft">The Greek is plural.</span></span>
        <span class="wj">will see heaven open."</span>
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithMultipleNotes} renderNotes={true} />);

    await waitFor(() => {
      const placeholder = container.querySelector('[data-verse-footnote="51"]');
      expect(placeholder).not.toBeNull();

      const footnoteElements = container.querySelectorAll('.yv-n.f');
      expect(footnoteElements.length).toBe(0);
    });

    const footnoteButton = container.querySelector('[data-verse-footnote="51"] button');
    expect(footnoteButton).not.toBeNull();

    await userEvent.click(footnoteButton!);

    await waitFor(() => {
      const popover = document.body.querySelector('[role="dialog"]');
      expect(popover).not.toBeNull();

      const listItems = popover?.querySelectorAll('ul li');
      expect(listItems?.length).toBe(2);
    });
  });
});

describe('Verse.Text', () => {
  it('should render verse with number and text (default size)', () => {
    const { container } = render(<Verse.Text number={1} text="In the beginning" />);

    const sup = container.querySelector('sup');
    expect(sup).not.toBeNull();
    expect(sup?.textContent).toBe('1');

    expect(container.textContent).toContain('In the beginning');
  });

  it('should render verse with large size variant', () => {
    const { container } = render(<Verse.Text number={1} text="In the beginning" size="lg" />);

    const sup = container.querySelector('sup');
    expect(sup).not.toBeNull();

    const span = container.querySelector('span.yv\\:font-serif\\!');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('In the beginning');
  });
});
