/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by @floating-ui/dom (Radix Popover)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import { BibleChapterPicker } from './bible-chapter-picker';
import { useBooks, useTheme } from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';

vi.mock('@youversion/platform-react-hooks');

const mockBooks: BibleBook[] = [
  {
    id: 'GEN',
    title: 'Genesis',
    full_title: 'The First Book of Moses, Commonly Called Genesis',
    canon: 'old_testament',
    abbreviation: 'Gen',
    intro: { id: 'INTRO', passage_id: 'GEN.0.INTRO', title: 'Intro' },
    chapters: [
      { id: '1', title: '1', passage_id: 'GEN.1' },
      { id: '2', title: '2', passage_id: 'GEN.2' },
    ],
  },
];

function setupDefaultMocks() {
  vi.mocked(useTheme).mockReturnValue('light');
  vi.mocked(useBooks).mockReturnValue({
    books: { data: [...mockBooks], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('BibleChapterPicker - onChapterPickerPress override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('calls onChapterPickerPress with { book, chapter, versionId } when Trigger is clicked', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={onChapterPickerPress}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByRole('button'));

    expect(onChapterPickerPress).toHaveBeenCalledTimes(1);
    expect(onChapterPickerPress).toHaveBeenCalledWith({
      book: 'GEN',
      chapter: '1',
      versionId: 3034,
    });
  });

  it('does NOT render popover content when onChapterPickerPress is provided', () => {
    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    expect(screen.queryByText('Books')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
  });
});

describe('BibleChapterPicker - default popover mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders popover content when Trigger is clicked and no override is provided', async () => {
    const user = userEvent.setup();

    render(
      <BibleChapterPicker.Root versionId={3034} book="GEN" chapter="1">
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Books')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Search')).toBeInTheDocument();
  });
});
