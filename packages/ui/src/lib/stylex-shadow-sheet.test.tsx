/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isolatedStyleText, isolatedTree } from '@/test/isolated-tree';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { Providers } from '@/test/highlights-test-utils';
import { YouVersionAuthButton } from '../components/YouVersionAuthButton';
import { BibleCard } from '../components/bible-card';
import type { UsePassageResult, UseVersionResult } from '@youversion/platform-react-hooks';
import type { BiblePassage, BibleVersion } from '@youversion/platform-core';

const mockPassage: BiblePassage = {
  id: 'JHN.3.16',
  content: '<p class="yv-p">For God so loved the world</p>',
  reference: 'John 3:16',
};

const mockVersion: BibleVersion = {
  id: 3034,
  title: 'Berean Standard Bible',
  abbreviation: 'BSB',
  localized_title: 'Berean Standard Bible',
  localized_abbreviation: 'BSB',
  language_tag: 'en',
  books: ['GEN', 'JHN'],
  youversion_deep_link: 'https://bible.com/versions/3034',
};

function idleVersion(): UseVersionResult {
  return {
    version: mockVersion,
    loading: false,
    error: null,
    refetch: () => undefined,
  };
}

function loadedPassage(): UsePassageResult {
  return {
    passage: mockPassage,
    loading: false,
    error: null,
    refetch: () => undefined,
  };
}

const TAILWIND_MARKERS = ['@layer yv-sdk-utilities', '.yv\\:', '@utility card-content'];

describe('StyleX-only shadow sheets', () => {
  it('YouVersionAuthButton adopts StyleX CSS without the Tailwind bundle', () => {
    const { container } = render(
      <Providers>
        <YouVersionAuthButton />
      </Providers>,
    );

    const css = isolatedStyleText(container);
    expect(css).toContain('yv-stylex-spike');
    expect(css).toContain('[data-yv-sdk]');
    expect(css).toMatch(/:host,\s*\[data-yv-sdk\]/);
    for (const marker of TAILWIND_MARKERS) {
      expect(css).not.toContain(marker);
    }
    expect(isolatedTree(container).querySelector('button')).not.toBeNull();
  });

  it('BibleCard with the picker off adopts StyleX CSS without the Tailwind bundle', () => {
    const { container } = render(
      <HookOverrideProvider
        overrides={{
          useVersion: () => idleVersion(),
          usePassage: () => loadedPassage(),
        }}
      >
        <BibleCard reference="JHN.3.16" versionId={3034} />
      </HookOverrideProvider>,
    );

    const css = isolatedStyleText(container);
    expect(css).toContain('yv-stylex-spike');
    expect(css).toContain('[data-yv-sdk]');
    expect(css).toContain('[data-slot=\'yv-bible-renderer\']');
    for (const marker of TAILWIND_MARKERS) {
      expect(css).not.toContain(marker);
    }
    expect(isolatedTree(container).querySelector('section[data-yv-sdk]')).not.toBeNull();
  });
});
