/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render as rtlRender, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { requireHtmlButton, requireHtmlElement } from '@/test/dom-stubs';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { Verse, BibleTextView, type BibleTextViewPassageState, type FootnoteData } from './verse';

// BibleTextView always calls usePassage internally (even when passageState is
// provided). Stub the result so these tests do not need a live BibleClient.
function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <HookOverrideProvider
        overrides={{
          usePassage: () => ({
            passage: null,
            loading: false,
            error: null,
            refetch: () => undefined,
          }),
        }}
      >
        {children}
      </HookOverrideProvider>
    ),
  });
}

describe('Verse.Html - XSS Protection', () => {
  describe('sanitization', () => {
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
        expect(img).toBeNull();
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
        expect(link).toBeNull();
      });
    });
  });

  describe('safe HTML preservation', () => {
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
      const placeholders = container.querySelectorAll('[data-verse-footnote="51"]');
      expect(placeholders.length).toBe(2);

      const footnoteElements = container.querySelectorAll('.yv-n.f');
      expect(footnoteElements.length).toBe(0);
    });

    const footnoteButtons = container.querySelectorAll('[data-verse-footnote="51"] button');
    expect(footnoteButtons.length).toBe(2);

    await userEvent.click(footnoteButtons[0]!);

    await waitFor(() => {
      const popover = document.body.querySelector('[role="dialog"]');
      expect(popover).not.toBeNull();

      const listItems = popover?.querySelectorAll('ul li');
      expect(listItems?.length).toBe(2);
    });
  });

  it('should use alphabetic markers beyond z in the popover list', async () => {
    const repeatedFootnotes = Array.from({ length: 27 }, () => {
      return '<span class="yv-n f"><span class="fr">1:1 </span><span class="ft">Footnote text</span></span>';
    }).join('');

    const htmlWithManyFootnotes = `
      <div class="p">
        <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Text ${repeatedFootnotes}
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithManyFootnotes} renderNotes={true} />);

    const footnoteButton = await waitFor(() => {
      const button = container.querySelector('[data-verse-footnote="1"] button');
      expect(button).not.toBeNull();
      return requireHtmlButton(button);
    });

    await userEvent.click(footnoteButton);

    await waitFor(() => {
      const popover = document.body.querySelector('[role="dialog"]');
      expect(popover).not.toBeNull();

      const listItems = popover?.querySelectorAll('ul li');
      expect(listItems?.length).toBe(27);

      const marker27 = listItems?.[26]?.querySelector('span')?.textContent;
      expect(marker27).toBe('aa.');
    });
  });
});

describe('Verse.Html - Footnote spacing', () => {
  it('should insert space when footnote is between two words without spacing', async () => {
    const htmlWithNoSpacing = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The darkness hasn't overcome<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Note text</span></span>it.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithNoSpacing} renderNotes={true} />);

    await waitFor(() => {
      const text = container.textContent;
      expect(text).toContain('overcome it');
      expect(text).not.toContain('overcomeit');
    });
  });

  it('should not insert space when footnote is followed by punctuation', async () => {
    const htmlWithPunctuation = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The darkness hasn't overcome<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Note text</span></span>.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithPunctuation} renderNotes={true} />);

    await waitFor(() => {
      const text = container.textContent;
      expect(text).toContain('overcome.');
      expect(text).not.toContain('overcome .');
    });
  });

  it('should insert spacing when adjacent siblings are element nodes', async () => {
    const htmlWithElementSiblings = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span><span class="wj">overcome</span><span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Note text</span></span><span class="wj">it</span>.
      </div>
    `;

    const { container } = render(<Verse.Html html={htmlWithElementSiblings} renderNotes={true} />);

    await waitFor(() => {
      const text = container.textContent ?? '';
      expect(text).toContain('overcome it.');
      expect(text).not.toContain('overcomeit.');
    });
  });
});

describe('Verse.Html - Verse Wrapping', () => {
  it('should wrap verse content in yv-v elements', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning was the Word.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const verseWrapper = container.querySelector('.yv-v[v="1"]');
      expect(verseWrapper).not.toBeNull();
      expect(verseWrapper?.textContent).toContain('In the beginning was the Word');
    });
  });

  it('should wrap multiple verses in same paragraph', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>First verse.
        <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Second verse.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const verse1 = container.querySelector('.yv-v[v="1"]');
      const verse2 = container.querySelector('.yv-v[v="2"]');

      expect(verse1).not.toBeNull();
      expect(verse2).not.toBeNull();
      expect(verse1?.textContent).toContain('First verse');
      expect(verse2?.textContent).toContain('Second verse');
    });
  });

  it('should duplicate yv-v wrapper when verse spans multiple paragraphs', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="39"></span><span class="yv-vlbl">39</span>"Come," he replied.
      </div>
      <div class="p">So they went and saw where he was staying.</div>
      <div class="p">
        <span class="yv-v" v="40"></span><span class="yv-vlbl">40</span>Andrew was one of the two.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const verse39Wrappers = container.querySelectorAll('.yv-v[v="39"]');
      expect(verse39Wrappers.length).toBe(2);

      expect(verse39Wrappers[0]?.textContent).toContain('Come');
      expect(verse39Wrappers[1]?.textContent).toContain('So they went');
    });
  });

  it('should enable CSS selection of individual verses', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>First verse text.
        <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Second verse text.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const verse1 = container.querySelector('.yv-v[v="1"]');
      const verse2 = container.querySelector('.yv-v[v="2"]');

      expect(verse1).not.toBeNull();
      expect(verse2).not.toBeNull();
      expect(verse1).not.toBe(verse2);
    });
  });

  it('should preserve verse label inside wrapper', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const verseWrapper = container.querySelector('.yv-v[v="5"]');
      const label = verseWrapper?.querySelector('.yv-vlbl');

      expect(label).not.toBeNull();
      expect(label?.textContent).toContain('5');
    });
  });

  it('should not wrap header elements in verse spans', async () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="42"></span><span class="yv-vlbl">42</span>And he brought him to Jesus.
      </div>
      <div class="s1 yv-h">Jesus Calls Philip</div>
      <div class="p">
        <span class="yv-v" v="43"></span><span class="yv-vlbl">43</span>The next day Jesus decided to leave.
      </div>
    `;

    const { container } = render(<Verse.Html html={html} />);

    await waitFor(() => {
      const header = container.querySelector('.yv-h');
      expect(header).not.toBeNull();
      expect(header?.closest('.yv-v')).toBeNull();
    });
  });
});

describe('Verse.Html - Intro Chapter Footnotes', () => {
  it('should render footnote buttons for intro HTML with no verse markers', async () => {
    const introHtml = `
      <div>
        <div class="ip">Israel recognized Joshua as their prophet<span class="yv-n f"><span class="ft">See Rashi</span></span> and leader.</div>
      </div>
    `;

    const { container } = render(<Verse.Html html={introHtml} renderNotes={true} />);

    await waitFor(() => {
      const placeholder = container.querySelector('[data-verse-footnote="intro-0"]');
      expect(placeholder).not.toBeNull();

      const button = placeholder?.querySelector('button');
      expect(button).not.toBeNull();
    });
  });

  it('should show popover without verse reference or verse text for intro footnotes', async () => {
    const introHtml = `
      <div>
        <div class="ip">Some text<span class="yv-n f"><span class="ft">A scholarly note</span></span> here.</div>
      </div>
    `;

    const { container } = render(
      <Verse.Html html={introHtml} renderNotes={true} reference="Joshua" />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="intro-0"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    await waitFor(() => {
      const popover = document.body.querySelector('[role="dialog"]');
      expect(popover).not.toBeNull();

      const contentArea = popover?.querySelector('.yv\\:p-3');
      const boldHeaders = contentArea?.querySelectorAll('.yv\\:font-bold');
      expect(boldHeaders?.length ?? 0).toBe(0);

      const listItems = popover?.querySelectorAll('ul li');
      expect(listItems?.length).toBe(1);
      expect(listItems?.[0]?.textContent).toContain('A scholarly note');
    });
  });
});

describe('Verse.Html - Highlight fill (theme-aware, Swift parity)', () => {
  const highlightHtml = `
    <div class="p">
      <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning was the Word.
    </div>
  `;

  it('paints the fill at full opacity in light mode', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="light" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse).not.toBeNull();
      // rgba(255, 254, 0, 1) — jsdom serializes full alpha as rgb().
      expect(verse!.style.backgroundColor).toBe('rgb(255, 254, 0)');
    });
  });

  it('paints white verse text over a dark fill in light mode so the words stay legible', async () => {
    const { container, rerender } = render(
      <Verse.Html html={highlightHtml} theme="light" highlightedVerses={{ 1: '000000' }} />,
    );

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse).not.toBeNull();
      expect(verse!.style.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(verse!.style.color).toBe('rgb(255, 255, 255)');
    });

    rerender(<Verse.Html html={highlightHtml} theme="light" highlightedVerses={{}} />);

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse!.style.backgroundColor).toBe('');
      expect(verse!.style.color).toBe('');
    });
  });

  it('keeps default verse text color over a palette fill in light mode', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="light" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse).not.toBeNull();
      expect(verse!.style.color).toBe('');
    });
  });

  it('paints the fill at 0.3 alpha in dark mode', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="dark" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse).not.toBeNull();
      expect(verse!.style.backgroundColor).toBe('rgba(255, 254, 0, 0.3)');
    });
  });

  it('makes the verse label inherit the body text color over a dark-mode highlight', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="dark" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label).not.toBeNull();
      // `inherit` resolves to the verse body text color, which is white/near-white
      // in dark mode — preserving the prior explicit-white behavior.
      expect(label!.style.color).toBe('inherit');
    });
  });

  it('makes the verse label inherit the body text color over a light-mode highlight', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="light" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label).not.toBeNull();
      // Over a light-mode fill the muted gray label now matches the body text
      // color instead of clashing with saturated fills.
      expect(label!.style.color).toBe('inherit');
    });
  });

  it('leaves the verse label color untouched on an unhighlighted verse (light mode)', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="light" highlightedVerses={{}} />,
    );

    await waitFor(() => {
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label).not.toBeNull();
      expect(label!.style.color).toBe('');
    });
  });

  it('leaves the verse label color untouched on an unhighlighted verse (dark mode)', async () => {
    const { container } = render(
      <Verse.Html html={highlightHtml} theme="dark" highlightedVerses={{}} />,
    );

    await waitFor(() => {
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label).not.toBeNull();
      expect(label!.style.color).toBe('');
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse!.style.backgroundColor).toBe('');
    });
  });

  it('clears both the fill and the label recolor when a highlight is removed', async () => {
    const { container, rerender } = render(
      <Verse.Html html={highlightHtml} theme="dark" highlightedVerses={{ 1: 'fffe00' }} />,
    );

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse!.style.backgroundColor).toBe('rgba(255, 254, 0, 0.3)');
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label!.style.color).toBe('inherit');
    });

    rerender(<Verse.Html html={highlightHtml} theme="dark" highlightedVerses={{}} />);

    await waitFor(() => {
      const verse = container.querySelector<HTMLElement>('.yv-v[v="1"]');
      expect(verse!.style.backgroundColor).toBe('');
      const label = container.querySelector<HTMLElement>('.yv-v[v="1"] .yv-vlbl');
      expect(label!.style.color).toBe('');
    });
  });
});

describe('Verse.Html - Footnote icon color over highlight fills', () => {
  const footnoteHtml = `
    <div class="p">
      <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or understood</span></span> on.
    </div>
  `;

  it('makes the footnote icon inherit the body text color over a highlight fill', async () => {
    const { container } = render(
      <Verse.Html html={footnoteHtml} theme="light" highlightedVerses={{ 5: 'fffe00' }} />,
    );

    const btn = await waitFor(() => {
      const b = container.querySelector<HTMLElement>('[data-verse-footnote="5"] button');
      expect(b).not.toBeNull();
      return b!;
    });

    expect(btn.className).toContain('yv:text-inherit');
    expect(btn.className).not.toContain('yv:text-(--yv-gray-20)');
  });

  it('keeps the footnote icon muted-gray on an unhighlighted verse', async () => {
    const { container } = render(
      <Verse.Html html={footnoteHtml} theme="light" highlightedVerses={{}} />,
    );

    const btn = await waitFor(() => {
      const b = container.querySelector<HTMLElement>('[data-verse-footnote="5"] button');
      expect(b).not.toBeNull();
      return b!;
    });

    expect(btn.className).toContain('yv:text-(--yv-gray-20)');
    expect(btn.className).not.toContain('yv:text-inherit');
  });
});

describe('Verse.Html - Rounded highlight fill (static structural CSS)', () => {
  // The rounded corners / clone / padding are structural styles that live in the
  // core stylesheet (`bible-reader.css`), not the imperative paint path (which
  // only sets colors). They are applied to the base `.yv-v` rule so they are
  // STATIC — present whether or not a verse is highlighted — which is what keeps
  // applying/removing a fill from reflowing text (no layout shift). jsdom doesn't
  // load that external sheet, so we assert against the CSS source directly.
  // Resolve relative to this file so it works whether the suite runs from the ui
  // package (the filtered command) or the repo root (turbo).
  const css = readFileSync(
    resolve(import.meta.dirname, '../../../core/src/styles/bible-reader.css'),
    'utf8',
  );

  // The base `.yv-v` rule (identified by its background-color transition), not the
  // `.yv-v.yv-v-highlighted` demo rule.
  const baseRule = Array.from(css.matchAll(/&\s*\.yv-v\s*\{([^}]*)\}/g))
    .map((m) => m[1]!)
    .find((body) => body.includes('transition: background-color'));

  it('defines the base .yv-v rule with the fade transition', () => {
    expect(baseRule).toBeDefined();
  });

  it('rounds the corners statically (4px) on the base rule', () => {
    expect(baseRule).toContain('border-radius: 4px');
  });

  it('adds static 2px inline padding so a fill never causes reflow', () => {
    expect(baseRule).toContain('padding-inline: 2px');
  });

  it('clones the box decoration so wrapped line fragments get their own rounded ends', () => {
    expect(baseRule).toContain('box-decoration-break: clone');
    expect(baseRule).toContain('-webkit-box-decoration-break: clone');
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

describe('BibleTextView - Refetch loading behavior', () => {
  const mockPassage: BibleTextViewPassageState['passage'] = {
    id: 'JHN.3.16',
    content: '<p class="yv-p">For God so loved the world</p>',
    reference: 'John 3:16',
  };

  it('should show old passage content during refetch instead of Loading...', async () => {
    const { container } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: mockPassage,
          loading: true,
          error: null,
        }}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain('For God so loved the world');
      expect(container.textContent).not.toContain('Loading...');
    });
  });

  it('should show spinner on initial load when passage is null', async () => {
    const { container } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: true,
          error: null,
        }}
      />,
    );

    await waitFor(() => {
      expect(within(container).getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });
  });

  it('should apply pointer-events: none when loading with old content', async () => {
    const { container } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: mockPassage,
          loading: true,
          error: null,
        }}
      />,
    );

    await waitFor(() => {
      const wrapper = container.querySelector('[data-yv-sdk]');
      expect(wrapper).not.toBeNull();
      expect(requireHtmlElement(wrapper).style.pointerEvents).toBe('none');
    });
  });

  it('should not apply pointer-events: none when not loading', async () => {
    const { container } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: mockPassage,
          loading: false,
          error: null,
        }}
      />,
    );

    await waitFor(() => {
      const wrapper = container.querySelector('[data-yv-sdk]');
      expect(wrapper).not.toBeNull();
      expect(requireHtmlElement(wrapper).style.pointerEvents).toBe('');
    });
  });
});

describe('BibleTextView - Error messaging', () => {
  const originalNavigator = globalThis.navigator;

  function createError(message: string, status?: number): Error {
    return Object.assign(new Error(message), status === undefined ? {} : { status });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('should show a passage-specific message for 404 errors', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="PRO.30.1"
        versionId={2530}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Bible passage PRO.30.1 for version 2530 not found', 404),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        "This passage isn't available in the selected Bible version.",
      );
    });
  });

  it('should show an app key message for 401 errors', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request failed with status 401', 401),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        "This Bible content couldn't be loaded because the app key is missing or invalid.",
      );
    });
  });

  it('should show a forbidden message for 403 errors', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request failed with status 403', 403),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        "This app isn't allowed to access this Bible content.",
      );
    });
  });

  it('should show an offline message when navigator reports offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
        onLine: false,
      },
    });

    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Unexpected connection state'),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        "The Bible server couldn't be reached. Check your connection and try again.",
      );
    });
  });

  it('should show an unreachable-server message for request timeouts', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request timeout after 10000ms'),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        "The Bible server couldn't be reached. Check your connection and try again.",
      );
    });
  });

  it('should show a rate-limit message for 429 errors', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request failed with status 429', 429),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        'The Bible service is receiving too many requests right now. Please wait a moment and try again.',
      );
    });
  });

  it('should show a service message for 5xx errors', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request failed with status 503', 503),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        'The Bible service is having trouble right now. Please try again in a moment.',
      );
    });
  });

  it('should render one polite alert region with a hidden icon and no heading line', async () => {
    const { getAllByRole, getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Request failed with status 503', 503),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        'The Bible service is having trouble right now. Please try again in a moment.',
      );
    });

    const alert = getByRole('alert');

    expect(getAllByRole('alert')).toHaveLength(1);
    // role="alert" implies assertive, so this attribute is what keeps the
    // announcement polite. Removing it would be a behavior change.
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Standalone BibleTextView has no header slot, so no "Error" label renders.
    expect(alert).not.toHaveTextContent('Error');
  });

  it('should prioritize 5xx errors over "not found" text in the message', async () => {
    const { getByRole } = render(
      <BibleTextView
        reference="JHN.3.16"
        versionId={3034}
        passageState={{
          passage: null,
          loading: false,
          error: createError('Upstream dependency not found while handling request', 503),
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(
        'The Bible service is having trouble right now. Please try again in a moment.',
      );
    });
  });
});

describe('Verse.Html - onFootnotePress callback', () => {
  const htmlWithFootnote = `
    <div class="p">
      <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines in the darkness<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or understood</span></span>.
    </div>
  `;

  it('should call onFootnotePress with correct FootnoteData when clicked', async () => {
    const onFootnotePress = vi.fn<(data: FootnoteData) => void>();

    const { container } = render(
      <Verse.Html
        html={htmlWithFootnote}
        renderNotes={true}
        reference="JHN.1"
        onFootnotePress={onFootnotePress}
      />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    expect(onFootnotePress).toHaveBeenCalledTimes(1);
    const data = onFootnotePress.mock.calls[0]![0];
    expect(data.verseNum).toBe('5');
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toContain('Or understood');
    expect(data.reference).toBe('JHN.1');
    expect(data.verseHtml).toContain('The light shines');
  });

  it('should NOT render a Popover when onFootnotePress is provided', async () => {
    const onFootnotePress = vi.fn<(data: FootnoteData) => void>();

    const { container } = render(
      <Verse.Html
        html={htmlWithFootnote}
        renderNotes={true}
        reference="JHN.1"
        onFootnotePress={onFootnotePress}
      />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    // No popover should appear
    const popover = document.body.querySelector('[role="dialog"]');
    expect(popover).toBeNull();
  });

  it('should still render Popover when onFootnotePress is NOT provided', async () => {
    const { container } = render(
      <Verse.Html html={htmlWithFootnote} renderNotes={true} reference="JHN.1" />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    await waitFor(() => {
      const popover = document.body.querySelector('[role="dialog"]');
      expect(popover).not.toBeNull();
    });
  });
});

describe('BibleTextView - onFootnotePress callback', () => {
  const mockPassage: BibleTextViewPassageState['passage'] = {
    id: 'JHN.1',
    content: `<div class="p"><span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or understood</span></span>.</div>`,
    reference: 'JHN.1',
  };

  it('should call onFootnotePress when provided via BibleTextView', async () => {
    const onFootnotePress = vi.fn<(data: FootnoteData) => void>();

    const { container } = render(
      <BibleTextView
        reference="JHN.1"
        versionId={3034}
        passageState={{ passage: mockPassage, loading: false, error: null }}
        onFootnotePress={onFootnotePress}
      />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    expect(onFootnotePress).toHaveBeenCalledTimes(1);
    const data = onFootnotePress.mock.calls[0]![0];
    expect(data.verseNum).toBe('5');
    expect(data.reference).toBe('JHN.1');
  });
});
