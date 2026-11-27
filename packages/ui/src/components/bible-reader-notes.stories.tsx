import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type CreateNote,
} from '@youversion/platform-core';
import { useYVAuth } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { getWorker } from 'msw-storybook-addon';
import { useEffect, useState } from 'react';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import * as z from 'zod/mini';
import { globalHandlers } from '@/test/mocks/handlers';
import mockPassages from '@/test/mock-data/passages.json';
import {
  getBackgroundColorChannels,
  getColorChannels,
  verifyNativeBrowserKey,
  waitForShadowRoot,
} from '@/test/storybook-dom';
import { BibleReader } from './bible-reader';
import { BibleReaderNavigation } from './bible-reader-navigation';
import { YouVersionProvider } from './YouVersionProvider';

const meta: Meta = {
  title: 'Components/BibleReader/Notes',
  // In the shared Firefox process, the Reader's network calls can bypass MSW
  // after switching preview files. The existing runner isolates tagged files.
  tags: ['shadow-fresh-process'],
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="yv:h-screen">
      <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof meta>;

function readerVerse(root: ShadowRoot, verse: number) {
  return waitFor(() => {
    const target = root.querySelector<HTMLElement>(`.yv-v[v="${verse}"]`);
    if (!target) throw new Error(`Verse ${verse} is missing`);
    return target;
  });
}

async function selectVerses(root: ShadowRoot, verses: number[]) {
  for (const verse of verses) await userEvent.click(await readerVerse(root, verse));
}

async function fillEditor(editor: HTMLTextAreaElement, value: string) {
  if (__YV_STORYBOOK_VITEST__) {
    const { userEvent } = await import('vitest/browser');
    // Native keys avoid the WebDriver lookup of an escaped Radix ID in the shadow tree.
    editor.focus();
    editor.select();
    await userEvent.keyboard(value || '{Backspace}');
    return;
  }
  await userEvent.type(editor, value || '{Backspace}', {
    initialSelectionStart: 0,
    initialSelectionEnd: editor.value.length,
  });
}

async function readerOverlays(root: ShadowRoot) {
  return within(
    await waitFor(() => {
      const overlay = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!overlay) throw new Error('Reader overlay is missing');
      return overlay;
    }),
  );
}

function tokenResponse(scope: string) {
  return HttpResponse.json({
    access_token: 'notes-story-token',
    expires_in: 3600,
    id_token: `e30.${btoa(JSON.stringify({ sub: 'notes-story-user', name: 'Reader' }))}.fixture`,
    refresh_token: 'notes-story-refresh',
    scope,
    token_type: 'Bearer',
  });
}

function stageCallback(state: string) {
  const callback = new URL(location.href);
  callback.searchParams.set('state', state);
  callback.searchParams.set('code', crypto.randomUUID());
  localStorage.setItem('youversion-auth-state', state);
  localStorage.setItem('youversion-auth-code-verifier', 'notes-story-verifier');
  localStorage.setItem('youversion-auth-redirect-uri', callback.origin);
  history.replaceState(history.state, '', callback);
}

async function prepareCallback() {
  YouVersionPlatformConfiguration.clearAuthTokens();
  const originalNotesCallbackUrl = location.href;
  stageCallback('notes-story-state');
  return { originalNotesCallbackUrl };
}

type Play = NonNullable<Story['play']>;

function withWritableSession(play: Play): Play {
  return async (context) => {
    try {
      await play(context);
    } finally {
      YouVersionPlatformConfiguration.clearAuthTokens();
      const url = z.url().parse(context.loaded.originalNotesCallbackUrl);
      history.replaceState(history.state, '', url);
    }
  };
}

const writableSession = {
  msw: {
    handlers: [
      http.post('*/auth/token', () => tokenResponse('profile read_notes write_notes')),
      http.get('*/v1/highlights', () => HttpResponse.json({ data: [], next_page_token: null })),
      ...globalHandlers,
    ],
  },
};

type NoteRequest = Omit<CreateNote, 'passage'> & {
  passage: { bible_id: number; passage_id: string };
};

const noteResponse = (body: NoteRequest) =>
  HttpResponse.json({ ...body, id: 'saved-note' }, { status: 201 });

function deferred<T>() {
  let resolve!: (result: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function openComposer(root: ShadowRoot, reference: string) {
  const overlays = await readerOverlays(root);
  const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
  await userEvent.click(actions.getByRole('button', { name: 'Save' }));
  const composer = await overlays.findByRole('dialog', { name: reference });
  await waitFor(() => expect(composer).toBeVisible());
  await waitFor(() => expect(overlays.queryByRole('dialog', { name: 'Verse actions' })).toBeNull());
  return { overlays, composer: within(composer) };
}

async function expectSwatchBorder(swatch: HTMLElement | undefined, expectedColor: string) {
  if (!swatch) throw new Error('Reader highlight swatch is missing');
  const { ownerDocument } = swatch;
  const style = getComputedStyle(swatch);
  await expect(style.borderTopWidth).toBe('1px');
  await expect(style.borderTopStyle).toBe('solid');
  await expect(getColorChannels(style.borderTopColor, ownerDocument)).toEqual(
    getColorChannels(expectedColor, ownerDocument),
  );
}

export const SavePassage: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  parameters: writableSession,
  play: withWritableSession(async ({ canvasElement }) => {
    const saved = deferred<{ body: NoteRequest; authorization: string | null }>();
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        saved.resolve({ body, authorization: request.headers.get('authorization') });
        return noteResponse(body);
      }),
    );
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [4, 1, 3]);
    const overlays = await readerOverlays(root);
    const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
    await expect(actions.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    await expect(actions.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    await expectSwatchBorder(
      actions.getAllByRole('button', { name: 'Apply highlight' })[0],
      'rgba(18, 18, 18, 0.2)',
    );
    const { composer } = await openComposer(root, 'John 1:1,3-4');
    await expect(composer.getByRole('textbox', { name: 'Add Note…' })).toHaveValue('');
    await expect(composer.getByRole('radio', { name: 'Private' })).toBeChecked();
    await expect(composer.getByRole('radio', { name: 'Public' })).not.toBeChecked();
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await expect(await saved.promise).toEqual({
      authorization: 'Bearer notes-story-token',
      body: {
        request_id: expect.stringMatching(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i),
        content: '',
        status: 'private',
        passage: { bible_id: 111, passage_id: 'JHN.1.1+JHN.1.3-4' },
      },
    });
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
  }),
};

export const EditAndRetry: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  globals: { theme: 'dark' },
  parameters: writableSession,
  play: withWritableSession(async ({ canvasElement }) => {
    const requests: NoteRequest[] = [];
    const updates: Pick<NoteRequest, 'content' | 'status' | 'color'>[] = [];
    let stored: NoteRequest | undefined;
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        requests.push(body);
        if (body.content === 'Rejected thought') {
          return requests.length === 1
            ? HttpResponse.error()
            : new HttpResponse(null, { status: 413 });
        }
        if (stored) return noteResponse(stored);
        stored = body;
        return HttpResponse.error();
      }),
      http.patch<never, Pick<NoteRequest, 'content' | 'status' | 'color'>>(
        '*/v1/notes/saved-note',
        async ({ request }) => {
          if (!stored) return new HttpResponse(null, { status: 404 });
          const update = await request.json();
          updates.push(update);
          stored = { ...stored, ...update };
          return updates.length === 1 ? HttpResponse.error() : noteResponse(stored);
        },
      ),
    );
    const root = await waitForShadowRoot(canvasElement);
    const settings = root.querySelector<HTMLButtonElement>('button[aria-label="Settings"]');
    if (!settings) throw new Error('Reader settings control is missing');
    settings.focus();
    await selectVerses(root, [2]);
    const actions = within(
      await (await readerOverlays(root)).findByRole('dialog', { name: 'Verse actions' }),
    );
    await expectSwatchBorder(
      actions.getAllByRole('button', { name: 'Apply highlight' })[0],
      'rgba(255, 255, 255, 0.2)',
    );
    const { overlays, composer } = await openComposer(root, 'John 1:2');
    const editor = composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' });
    await waitFor(() => expect(root.activeElement).toBe(editor));
    const colors = within(composer.getByRole('group', { name: 'Highlight colors' }));
    const palette = ['ffec5b', 'b4ffc1', 'bbf4ff', 'ffdca7', 'ffcff8', 'dfdcff'];
    const colorName = (color: string) => `Apply highlight #${color}`;
    const selected = colors.getByRole('button', { name: colorName('ffdca7') });
    await expect(getBackgroundColorChannels(selected)).toEqual([79, 70, 60, 255]);

    async function confirmDirty() {
      await userEvent.click(composer.getByRole('button', { name: 'Cancel' }));
      const confirmation = await overlays.findByRole('dialog', { name: 'Discard note?' });
      await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(overlays.queryByRole('dialog', { name: 'Discard note?' })).toBeNull(),
      );
    }

    await fillEditor(editor, 'First thought');
    editor.focus();
    await verifyNativeBrowserKey('{Shift>}{Tab}{/Shift}', async () => {
      await expect(root.activeElement).toBe(composer.getByRole('button', { name: 'Save' }));
    });
    await verifyNativeBrowserKey('{Tab}', async () => {
      await expect(root.activeElement).toBe(editor);
    });
    const dismiss = composer.getByRole('button', { name: 'Cancel' });
    dismiss.focus();
    const nativeKeys = await verifyNativeBrowserKey('{Enter}', async () => {
      const confirmation = within(await overlays.findByRole('dialog', { name: 'Discard note?' }));
      const stay = confirmation.getByRole('button', { name: 'Cancel' });
      const discard = confirmation.getByRole('button', { name: 'Discard' });
      await waitFor(() => expect(root.activeElement).toBe(stay));
      await verifyNativeBrowserKey('{Tab}', async () => expect(root.activeElement).toBe(discard));
      await verifyNativeBrowserKey('{Tab}', async () => expect(root.activeElement).toBe(stay));
      await verifyNativeBrowserKey('{Escape}', async () => {
        await waitFor(() =>
          expect(overlays.queryByRole('dialog', { name: 'Discard note?' })).toBeNull(),
        );
        await waitFor(() => expect(root.activeElement).toBe(dismiss));
      });
    });
    if (!nativeKeys) await confirmDirty();
    await expect(editor).toHaveValue('First thought');
    await fillEditor(editor, '');

    await userEvent.click(composer.getByRole('radio', { name: 'Public' }));
    await confirmDirty();
    await expect(composer.getByRole('radio', { name: 'Public' })).toBeChecked();
    await userEvent.click(composer.getByRole('radio', { name: 'Private' }));

    await userEvent.click(selected);
    await confirmDirty();
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(
      colors.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(palette.map(colorName));

    await fillEditor(editor, 'Rejected thought');
    await userEvent.click(composer.getByRole('radio', { name: 'Public' }));
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await expect(await composer.findByRole('alert')).toBeVisible();

    await fillEditor(editor, 'First thought');
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(requests.map(({ content }) => content)).toEqual([
        'Rejected thought',
        'Rejected thought',
      ]),
    );
    await expect(await composer.findByRole('alert')).toBeVisible();

    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(requests.map(({ content }) => content)).toEqual([
        'Rejected thought',
        'Rejected thought',
        'First thought',
      ]),
    );
    await expect(await composer.findByRole('alert')).toBeVisible();
    await expect(editor).toHaveValue('First thought');
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(composer.getByRole('radio', { name: 'Public' })).toBeChecked();
    await fillEditor(editor, 'Edited thought');
    await userEvent.click(composer.getByRole('radio', { name: 'Private' }));
    await userEvent.click(selected);
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updates).toEqual([{ content: 'Edited thought', status: 'private', color: null }]),
    );
    await waitFor(() => expect(composer.getByRole('alert')).toBeVisible());
    await expect(editor).toHaveValue('Edited thought');
    await expect(composer.getByRole('radio', { name: 'Private' })).toBeChecked();
    await expect(selected).toHaveAttribute('aria-pressed', 'false');

    // PATCH cannot clear already saved text. The empty draft remains editable.
    await fillEditor(editor, '');
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(composer.getByRole('alert')).toBeVisible());
    await expect(editor).toHaveValue('');

    // The lost update may have reached the server. Restoring the original fields
    // still needs an update to that same note.
    await fillEditor(editor, 'First thought');
    await userEvent.click(composer.getByRole('radio', { name: 'Public' }));
    await userEvent.click(selected);
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(root.activeElement).toBe(settings));

    const common = {
      request_id: expect.stringMatching(/^[\da-f-]{36}$/i),
      status: 'public',
      color: 'ffdca7',
      passage: { bible_id: 111, passage_id: 'JHN.1.2' },
    };
    await expect(requests).toEqual([
      { ...common, content: 'Rejected thought' },
      { ...common, content: 'Rejected thought' },
      { ...common, content: 'First thought' },
      { ...common, content: 'First thought' },
    ]);
    await expect(new Set(requests.map(({ request_id }) => request_id)).size).toBe(1);
    await expect(updates).toEqual([
      { content: 'Edited thought', status: 'private', color: null },
      { content: 'First thought', status: 'public', color: 'ffdca7' },
    ]);
    await expect(stored).toEqual(requests[2]);
  }),
};

const yellow = { bible_id: 111, passage_id: 'JHN.1.1', color: 'ffec5b' };
const green = { ...yellow, color: 'b4ffc1' };
const highlightPage = (highlight: typeof yellow) =>
  HttpResponse.json({ data: [highlight], next_page_token: null });

export const RefreshHighlights: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/highlights', () => highlightPage(yellow)),
        ...writableSession.msw.handlers,
      ],
    },
  },
  play: withWritableSession(async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const verse = await readerVerse(root, 1);
    const paint = () => getBackgroundColorChannels(verse);
    const oldColor = [255, 236, 91, 255];
    await waitFor(() => expect(paint()).toEqual(oldColor));

    const reads = [
      new HttpResponse(null, { status: 503 }),
      highlightPage(yellow),
      highlightPage(green),
    ].map((response) => ({
      response,
      release: deferred<void>(),
      request: deferred<URL>(),
      finished: deferred<void>(),
    }));
    const queued = reads.slice();
    const awaitingFetch = reads.slice();
    const browserFetch = globalThis.fetch.bind(globalThis);
    const observedFetch = spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, location.href);
      const read = url.pathname === '/v1/highlights' ? awaitingFetch.shift() : undefined;
      const response = await browserFetch(input, init);
      if (read) {
        await response.clone().arrayBuffer();
        read.finished.resolve();
      }
      return response;
    });
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) =>
        noteResponse(await request.json()),
      ),
      http.get('*/v1/highlights', async ({ request }) => {
        const read = queued.shift();
        if (!read) return highlightPage(green);
        read.request.resolve(new URL(request.url));
        await read.release.promise;
        return read.response;
      }),
    );

    try {
      for (const [index, read] of reads.entries()) {
        await selectVerses(root, [2]);
        const { overlays, composer } = await openComposer(root, 'John 1:2');
        await userEvent.click(composer.getByRole('button', { name: 'Save' }));
        const scope = (await read.request.promise).searchParams;
        await expect(scope.get('bible_id')).toBe('111');
        await expect(scope.get('passage_id')).toBe('JHN.1');
        await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
        await expect(paint()).toEqual(oldColor);
        read.release.resolve();
        await read.finished.promise;
        if (index < reads.length - 1) {
          // The response body has reached fetch. Let the Reader publish the
          // resulting query state before reading the painted verse.
          await new Promise<void>((resolve) => setTimeout(() => setTimeout(resolve, 0), 0));
          await expect(paint()).toEqual(oldColor);
        }
      }
      await waitFor(() => expect(paint()).toEqual([180, 255, 193, 255]));
    } finally {
      observedFetch.mockRestore();
    }
  }),
};

const storyNavigation = z.instanceof(BibleReaderNavigation);

export const BuiltInActionsDuringNavigation: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback, async () => ({ hostNavigation: new BibleReaderNavigation() })],
  parameters: writableSession,
  render: (_args, { loaded }) => (
    <div className="yv:h-screen">
      <BibleReader.Root
        defaultBook="JHN"
        defaultChapter="1"
        defaultVersionId={111}
        navigation={storyNavigation.parse(loaded.hostNavigation)}
        verseActionItems={['copy', 'save', 'share']}
      >
        <BibleReader.Content />
      </BibleReader.Root>
    </div>
  ),
  play: withWritableSession(async ({ canvasElement, loaded }) => {
    const chapterRequested = deferred<void>();
    const returnChapter = deferred<void>();
    getWorker().use(
      http.get('*/v1/bibles/111/passages/JHN.3', async () => {
        chapterRequested.resolve();
        await returnChapter.promise;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const root = await waitForShadowRoot(canvasElement);
    const retainedVerse = await readerVerse(root, 1);
    await userEvent.click(retainedVerse);
    const overlays = await readerOverlays(root);
    const activeActions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
    await waitFor(() => expect(activeActions.getByRole('button', { name: 'Save' })).toBeVisible());
    storyNavigation.parse(loaded.hostNavigation).request({ versionId: 111, passageId: 'JHN.3' });
    await chapterRequested.promise;
    try {
      await userEvent.click(retainedVerse);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await waitFor(() => expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible());
      await expect(actions.getByRole('button', { name: 'Share' })).toBeVisible();
      await expect(actions.queryByRole('button', { name: 'Save' })).toBeNull();
    } finally {
      returnChapter.resolve();
    }
  }),
};

export const ControlledHighlightsDuringSameChapterNavigation: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [async () => ({ hostNavigation: new BibleReaderNavigation() })],
  render: function ControlledReader(_args, { loaded }) {
    const [applied, setApplied] = useState('');
    return (
      <>
        <output aria-label="Applied highlight">{applied}</output>
        <div className="yv:h-screen">
          <BibleReader.Root
            defaultBook="JHN"
            defaultChapter="1"
            defaultVersionId={111}
            navigation={storyNavigation.parse(loaded.hostNavigation)}
            highlights={[]}
            onHighlightApply={({ versionId, passageIds, color }) =>
              setApplied(`${versionId}:${passageIds.join('+')}:${color}`)
            }
          >
            <BibleReader.Content />
          </BibleReader.Root>
        </div>
      </>
    );
  },
  play: async ({ canvasElement, loaded }) => {
    const passageRequested = deferred<void>();
    const releasePassage = deferred<void>();
    getWorker().use(
      http.get('*/v1/bibles/111/passages/JHN.1.4', async () => {
        passageRequested.resolve();
        await releasePassage.promise;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const root = await waitForShadowRoot(canvasElement);
    const retainedVerse = await readerVerse(root, 1);
    try {
      storyNavigation
        .parse(loaded.hostNavigation)
        .request({ versionId: 111, passageId: 'JHN.1.4' });
      await passageRequested.promise;
      await expect(retainedVerse).toBeVisible();
      await userEvent.click(retainedVerse);
      const overlays = await readerOverlays(root);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await waitFor(() => expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible());
      const [color] = actions.getAllByRole('button', { name: 'Apply highlight' });
      if (!color) throw new Error('Controlled highlight swatches are missing');
      await userEvent.click(color);
      await expect(
        within(canvasElement).getByRole('status', { name: 'Applied highlight' }),
      ).toHaveTextContent('111:JHN.1.1:ffec5b');
    } finally {
      releasePassage.resolve();
    }
  },
};

export const RefreshDisplayedChapterAfterNavigation: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback, async () => ({ hostNavigation: new BibleReaderNavigation() })],
  parameters: writableSession,
  render: (_args, { loaded }) => (
    <div className="yv:h-screen">
      <BibleReader.Root
        defaultBook="JHN"
        defaultChapter="1"
        defaultVersionId={111}
        navigation={storyNavigation.parse(loaded.hostNavigation)}
      >
        <BibleReader.Content />
      </BibleReader.Root>
    </div>
  ),
  play: withWritableSession(async ({ canvasElement, loaded }) => {
    const root = await waitForShadowRoot(canvasElement);
    const noteSent = deferred<NoteRequest>();
    const releaseNote = deferred<void>();
    const releaseFirstRead = deferred<void>();
    const chapterReads: string[] = [];
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const note = await request.json();
        noteSent.resolve(note);
        await releaseNote.promise;
        return noteResponse(note);
      }),
      http.get('*/v1/highlights', async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const scope = `${searchParams.get('bible_id')}:${searchParams.get('passage_id')}`;
        if (scope === '111:JHN.3') {
          chapterReads.push(scope);
          if (chapterReads.length > 1) {
            return highlightPage({ ...green, passage_id: 'JHN.3.16' });
          }
          await releaseFirstRead.promise;
        }
        return HttpResponse.json({ data: [], next_page_token: null });
      }),
    );
    await selectVerses(root, [2]);
    const { overlays, composer } = await openComposer(root, 'John 1:2');
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await expect((await noteSent.promise).passage).toEqual({
      bible_id: 111,
      passage_id: 'JHN.1.2',
    });

    try {
      storyNavigation.parse(loaded.hostNavigation).request({ versionId: 111, passageId: 'JHN.3' });
      await readerVerse(root, 16);
      await waitFor(() => expect(chapterReads).toEqual(['111:JHN.3']));
      await expect(overlays.getByRole('dialog', { name: 'John 1:2' })).toBeVisible();
      releaseNote.resolve();
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      releaseFirstRead.resolve();
      await waitFor(() => expect(chapterReads).toEqual(['111:JHN.3', '111:JHN.3']));
      await waitFor(async () =>
        expect(getBackgroundColorChannels(await readerVerse(root, 16))).toEqual([
          180, 255, 193, 255,
        ]),
      );
    } finally {
      releaseNote.resolve();
      releaseFirstRead.resolve();
    }
  }),
};

export const CancelRetainsDraftAcrossNavigation: Story = {
  ...RefreshDisplayedChapterAfterNavigation,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  play: withWritableSession(async ({ canvasElement, loaded }) => {
    const attempts: NoteRequest[] = [];
    type Update = Pick<NoteRequest, 'status' | 'color'> & { content?: string };
    const updates: Update[] = [];
    let stored: NoteRequest | undefined;
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        attempts.push(body);
        if (stored) return noteResponse(stored);
        stored = body;
        return HttpResponse.error();
      }),
      http.patch<never, Update>('*/v1/notes/saved-note', async ({ request }) => {
        if (!stored) return new HttpResponse(null, { status: 404 });
        const update = await request.json();
        updates.push(update);
        if (update.content !== undefined) return new HttpResponse(null, { status: 429 });
        return noteResponse({ ...stored, ...update });
      }),
    );
    const root = await waitForShadowRoot(canvasElement);
    const navigation = storyNavigation.parse(loaded.hostNavigation);
    const renderedPassage = () => root.querySelector('[data-slot="yv-bible-renderer"]');
    await selectVerses(root, [1, 4]);
    const { composer, overlays } = await openComposer(root, 'John 1:1,4');
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(composer.getByRole('alert')).toBeVisible());

    navigation.request({ versionId: 111, passageId: 'JHN.3' });
    await waitFor(() => expect(renderedPassage()).toHaveTextContent('Nicodemus'));
    await userEvent.click(composer.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
    await expect(renderedPassage()).toHaveTextContent('Nicodemus');

    navigation.request({ versionId: 111, passageId: 'JHN.1' });
    await waitFor(() => expect(renderedPassage()).toHaveTextContent('The Word Became Flesh'));
    await selectVerses(root, [1, 4]);
    const { composer: reopened } = await openComposer(root, 'John 1:1,4');
    const editor = reopened.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' });
    await expect(editor).toHaveValue('');
    await userEvent.click(reopened.getByRole('radio', { name: 'Public' }));
    await fillEditor(editor, 'Rejected text update');
    await userEvent.click(reopened.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(reopened.getByRole('alert')).toBeVisible());
    const rejected = { content: 'Rejected text update', status: 'public', color: null };
    await expect(updates).toEqual([rejected]);

    await fillEditor(editor, '');
    await userEvent.click(reopened.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updates).toEqual([rejected, { status: 'public', color: null }]));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
    const request = {
      request_id: expect.stringMatching(/^[\da-f-]{36}$/i),
      passage: { bible_id: 111, passage_id: 'JHN.1.1+JHN.1.4' },
      content: '',
      status: 'private',
    };
    await expect(attempts).toEqual([request, request]);
    await expect(attempts[1]?.request_id).toBe(attempts[0]?.request_id);
  }),
};

export const RefreshRetainedChapterWhileNavigationLoads: Story = {
  ...RefreshDisplayedChapterAfterNavigation,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  play: withWritableSession(async ({ canvasElement, loaded }) => {
    const root = await waitForShadowRoot(canvasElement);
    const noteSent = deferred<void>();
    const releaseNote = deferred<void>();
    const chapterRequested = deferred<void>();
    const releaseChapter = deferred<void>();
    const releaseDestinationRevalidation = deferred<void>();
    let destinationReads = 0;
    const postSaveReads: string[] = [];
    let noteSaved = false;
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        noteSent.resolve();
        await releaseNote.promise;
        noteSaved = true;
        return noteResponse(body);
      }),
      http.get('*/v1/bibles/111/passages/JHN.3', async () => {
        chapterRequested.resolve();
        await releaseChapter.promise;
        return HttpResponse.json(mockPassages['JHN.3']);
      }),
      http.get('*/v1/highlights', async ({ request }) => {
        const scope = new URL(request.url).searchParams.get('passage_id') ?? '';
        if (noteSaved) postSaveReads.push(scope);
        if (scope === 'JHN.3') {
          destinationReads += 1;
          if (destinationReads > 1) await releaseDestinationRevalidation.promise;
          return highlightPage({ ...green, passage_id: 'JHN.3.16' });
        }
        return highlightPage(noteSaved ? green : yellow);
      }),
    );
    const retained = await readerVerse(root, 1);
    await selectVerses(root, [2]);
    const { overlays, composer } = await openComposer(root, 'John 1:2');
    try {
      await userEvent.click(composer.getByRole('button', { name: 'Save' }));
      await noteSent.promise;
      storyNavigation.parse(loaded.hostNavigation).request({ versionId: 111, passageId: 'JHN.3' });
      await chapterRequested.promise;
      await expect(retained).toBeVisible();
      await expect(getBackgroundColorChannels(retained)).toEqual([255, 236, 91, 255]);
      await waitFor(() => expect(destinationReads).toBe(1));
      releaseNote.resolve();
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      await waitFor(() =>
        expect(getBackgroundColorChannels(retained)).toEqual([180, 255, 193, 255]),
      );
      await expect(postSaveReads).toEqual(['JHN.1']);
      await userEvent.click(retained);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await waitFor(() => expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible());
      await expect(actions.getByRole('button', { name: 'Share' })).toBeVisible();
      await expect(actions.queryByRole('button', { name: 'Clear highlight' })).toBeNull();
      await expect(actions.queryAllByRole('button', { name: 'Apply highlight' })).toHaveLength(0);
      await expect(getBackgroundColorChannels(retained)).toEqual([180, 255, 193, 255]);
      releaseChapter.resolve();
      await waitFor(() =>
        expect(root.querySelector('[data-slot="yv-bible-renderer"]')).toHaveTextContent(
          'Nicodemus',
        ),
      );
      const destination = await readerVerse(root, 16);
      await expect(destination).toBeVisible();
      await expect(getBackgroundColorChannels(destination)).toEqual([180, 255, 193, 255]);
      await waitFor(() => expect(postSaveReads).toEqual(['JHN.1', 'JHN.3']));
      await selectVerses(root, [16]);
      const currentActions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await waitFor(() =>
        expect(currentActions.getAllByRole('button', { name: 'Apply highlight' })).toHaveLength(6),
      );
    } finally {
      releaseNote.resolve();
      releaseChapter.resolve();
      releaseDestinationRevalidation.resolve();
    }
  }),
};

export const WritePermissionChangesWhileEditing: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  parameters: writableSession,
  play: withWritableSession(async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1]);
    const { overlays, composer } = await openComposer(root, 'John 1:1');
    let creates = 0;
    getWorker().use(
      http.post('*/auth/token', () => tokenResponse('profile read_notes')),
      http.post('*/v1/notes', () => {
        creates += 1;
        return HttpResponse.json({}, { status: 403 });
      }),
    );
    await fillEditor(
      composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' }),
      'Retained thought',
    );
    await YouVersionAPIUsers.refreshTokens();
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await expect(await overlays.findByRole('button', { name: 'Yes Please' })).toBeInTheDocument();
    await expect(creates).toBe(0);
    await userEvent.click(overlays.getByRole('button', { name: 'No Thanks' }));
    const editor = await overlays.findByRole('textbox', { name: 'Add Note…' });
    await expect(editor).toHaveValue('Retained thought');
    await waitFor(() => expect(root.activeElement).toBe(editor));

    const signIn = stayOnAuthorizationHandoff();
    try {
      await userEvent.click(overlays.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() =>
        expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull(),
      );
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      await expect(await overlays.findByRole('textbox', { name: 'Add Note…' })).toHaveValue(
        'Retained thought',
      );
      await expect(creates).toBe(0);

      await userEvent.click(overlays.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() =>
        expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull(),
      );
      const profile = YouVersionPlatformConfiguration.storedUserInfo;
      if (!profile?.id) throw new Error('Missing initial Reader account');
      // Sign out and back into the same account while the original page is cached.
      YouVersionAPIUsers.signOut();
      YouVersionPlatformConfiguration.saveAuthData('new-access', 'new-refresh', null, {
        userId: profile.id,
        scope: 'profile read_notes write_notes',
      });
      YouVersionPlatformConfiguration.saveUserInfo(profile);
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      await waitFor(async () =>
        expect(await readerVerse(root, 1)).not.toHaveClass('yv-v-selected'),
      );
      await selectVerses(root, [2]);
      const { composer: newDraft } = await openComposer(root, 'John 1:2');
      await expect(newDraft.getByRole('textbox', { name: 'Add Note…' })).toHaveValue('');
      await expect(creates).toBe(0);
    } finally {
      signIn.mockRestore();
    }
  }),
};

function ReaderPage({ version }: { version: number }) {
  const [mountedVersion] = useState(version);
  return <output aria-label="Reader page">{mountedVersion}</output>;
}

function waitForReaderPage(container: HTMLElement, version: number) {
  return waitFor(() =>
    expect(within(container).getByLabelText('Reader page')).toHaveTextContent(
      new RegExp(`^${version}$`),
    ),
  );
}

function PendingSessionSignOut() {
  const { auth, signOut } = useYVAuth();
  return (
    <button type="button" disabled={auth.isAuthenticated || auth.isLoading} onClick={signOut}>
      Sign out the pending session
    </button>
  );
}

function ReloadableReader({ withCallback = false }: { withCallback?: boolean }) {
  const [pageVersion, setPageVersion] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setPageVersion((version) => version + 1)}>
        Reload Reader
      </button>
      {withCallback && (
        <button
          type="button"
          onClick={() => {
            const state = localStorage.getItem('youversion-auth-state');
            if (!state) throw new Error('Reader did not start an OAuth handoff');
            stageCallback(state);
            setPageVersion((version) => version + 1);
          }}
        >
          Return from sign-in
        </button>
      )}
      <YouVersionProvider
        key={pageVersion}
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || 'storybook-notes'}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
        authRedirectUrl={location.origin}
        locale="en"
        includeAuth
      >
        <ReaderPage version={pageVersion} />
        {withCallback && <PendingSessionSignOut />}
        <div className="yv:h-screen">
          <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
            <BibleReader.Content />
          </BibleReader.Root>
        </div>
      </YouVersionProvider>
    </>
  );
}

export const RemountDropsDraftFromReplacedSession: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  parameters: { ...writableSession, includeAuth: false },
  render: () => <ReloadableReader />,
  play: withWritableSession(async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1, 4]);
    const { overlays, composer } = await openComposer(root, 'John 1:1,4');
    await fillEditor(
      composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' }),
      'A draft from the original session',
    );
    getWorker().use(http.post('*/auth/token', () => tokenResponse('profile read_notes')));
    await YouVersionAPIUsers.refreshTokens();
    const signIn = stayOnAuthorizationHandoff();
    try {
      await userEvent.click(composer.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      const profile = YouVersionPlatformConfiguration.storedUserInfo;
      if (!profile?.id) throw new Error('Missing initial Reader account');
      YouVersionAPIUsers.signOut();
      YouVersionPlatformConfiguration.saveAuthData(
        'new-access',
        'new-refresh',
        new Date(Date.now() + 3_600_000),
        { userId: profile.id, scope: 'profile read_notes write_notes' },
      );
      YouVersionPlatformConfiguration.saveUserInfo(profile);

      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Reload Reader' }));
      await waitForReaderPage(canvasElement, 1);
      const remounted = await waitForShadowRoot(canvasElement);
      await expect(await readerVerse(remounted, 1)).not.toHaveClass('yv-v-selected');
      await expect(await readerVerse(remounted, 4)).not.toHaveClass('yv-v-selected');
      await selectVerses(remounted, [1, 4]);
      const { composer: fresh } = await openComposer(remounted, 'John 1:1,4');
      await expect(fresh.getByRole('textbox', { name: 'Add Note…' })).toHaveValue('');
    } finally {
      signIn.mockRestore();
    }
  }),
};

function playFailedRefreshDraft(
  afterFailure: (result: {
    canvasElement: HTMLElement;
    root: ShadowRoot;
    overlays: ReturnType<typeof within>;
    draftText: string;
    ownerId: string;
  }) => Promise<void>,
): Play {
  return withWritableSession(async ({ canvasElement }) => {
    const page = within(canvasElement);
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1, 4]);
    const { overlays, composer } = await openComposer(root, 'John 1:1,4');
    const draftText = 'A draft held while the session refreshes';
    await fillEditor(
      composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' }),
      draftText,
    );
    getWorker().use(http.post('*/auth/token', () => tokenResponse('profile read_notes')));
    await YouVersionAPIUsers.refreshTokens();
    const signIn = stayOnAuthorizationHandoff();
    try {
      await userEvent.click(composer.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      const profile = YouVersionPlatformConfiguration.storedUserInfo;
      if (!profile?.id) throw new Error('Missing initial Reader account');
      YouVersionPlatformConfiguration.saveAuthData(
        'notes-story-token',
        'notes-story-refresh',
        new Date(0),
        {
          userId: profile.id,
          scope: 'profile read_notes',
        },
      );
      const failedGrants: string[] = [];
      getWorker().use(
        http.post('*/auth/token', async ({ request }) => {
          const parameters = new URLSearchParams(await request.text());
          failedGrants.push(parameters.get('grant_type') ?? '');
          return new HttpResponse(null, { status: 503 });
        }),
      );
      await userEvent.click(page.getByRole('button', { name: 'Reload Reader' }));
      await waitForReaderPage(canvasElement, 1);
      const remounted = await waitForShadowRoot(canvasElement);
      const returnedOverlays = await readerOverlays(remounted);
      const actions = within(
        await returnedOverlays.findByRole('dialog', { name: 'Verse actions' }),
      );
      await expect(await readerVerse(remounted, 1)).toHaveClass('yv-v-selected');
      await expect(await readerVerse(remounted, 4)).toHaveClass('yv-v-selected');
      await userEvent.click(actions.getByRole('button', { name: 'Save' }));
      await userEvent.click(await returnedOverlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() => expect(returnedOverlays.queryByRole('dialog')).toBeNull());

      await userEvent.click(page.getByRole('button', { name: 'Return from sign-in' }));
      await waitForReaderPage(canvasElement, 2);
      const failedRoot = await waitForShadowRoot(canvasElement);
      await waitFor(() => expect(failedGrants).toEqual(['refresh_token', 'authorization_code']));
      await waitFor(async () =>
        expect(await readerVerse(failedRoot, 1)).toHaveClass('yv-v-selected'),
      );
      await expect(await readerVerse(failedRoot, 4)).toHaveClass('yv-v-selected');
      const failedOverlays = await readerOverlays(failedRoot);
      const failedActions = within(
        await failedOverlays.findByRole('dialog', { name: 'Verse actions' }),
      );
      await expect(failedActions.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      await afterFailure({
        canvasElement,
        root: failedRoot,
        overlays: failedOverlays,
        draftText,
        ownerId: profile.id,
      });
    } finally {
      signIn.mockRestore();
    }
  });
}

export const RemountRecoversDraftDuringFailedRefresh: Story = {
  ...RemountDropsDraftFromReplacedSession,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  render: () => <ReloadableReader withCallback />,
  play: playFailedRefreshDraft(async ({ canvasElement, overlays, draftText }) => {
    const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
    await userEvent.click(actions.getByRole('button', { name: 'Save' }));
    await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
    getWorker().use(
      http.post('*/auth/token', () => tokenResponse('profile read_notes write_notes')),
    );
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Return from sign-in' }),
    );
    await waitForReaderPage(canvasElement, 3);
    const finalRoot = await waitForShadowRoot(canvasElement);
    const finalOverlays = await readerOverlays(finalRoot);
    const returned = within(await finalOverlays.findByRole('dialog', { name: 'John 1:1,4' }));
    await expect(returned.getByRole('textbox', { name: 'Add Note…' })).toHaveValue(draftText);
  }),
};

export const ExplicitSignOutClearsTheRecoveredDraft: Story = {
  ...RemountRecoversDraftDuringFailedRefresh,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  play: playFailedRefreshDraft(async ({ canvasElement, root, overlays, ownerId }) => {
    const saved = deferred<NoteRequest>();
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        saved.resolve(body);
        return noteResponse(body);
      }),
    );
    const signOut = within(canvasElement).getByRole('button', {
      name: 'Sign out the pending session',
    });
    await waitFor(() => expect(signOut).toBeEnabled());
    await userEvent.click(signOut);

    const frame = canvasElement.ownerDocument.createElement('iframe');
    frame.hidden = true;
    canvasElement.append(frame);
    try {
      const storage = frame.contentWindow?.localStorage;
      if (!storage) throw new Error('Same-origin account writer did not mount');
      YouVersionPlatformConfiguration.saveAuthData(
        'returning-reader-token',
        'returning-reader-refresh',
        new Date('2100-01-01'),
        { userId: ownerId, scope: 'profile read_notes write_notes' },
      );
      storage.setItem('userInfo', JSON.stringify({ id: ownerId, name: 'Reader' }));
      await waitFor(() => expect(signOut).toBeDisabled());
      for (const verseNumber of [1, 4]) {
        const verse = await readerVerse(root, verseNumber);
        if (!verse.classList.contains('yv-v-selected')) await userEvent.click(verse);
      }
      const { composer } = await openComposer(root, 'John 1:1,4');
      await expect(composer.getByRole('textbox', { name: 'Add Note…' })).toHaveValue('');
      await userEvent.click(composer.getByRole('button', { name: 'Save' }));
      await expect(await saved.promise).toEqual({
        request_id: expect.stringMatching(/^[\da-f-]{36}$/i),
        content: '',
        status: 'private',
        passage: { bible_id: 111, passage_id: 'JHN.1.1+JHN.1.4' },
      });
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
    } finally {
      frame.remove();
    }
  }),
};

function stayOnAuthorizationHandoff() {
  // Simulate sign-in handing off to OAuth without replacing the Reader document.
  // The SampleApp smoke exercises the actual redirect and token exchange.
  return spyOn(YouVersionAPIUsers, 'signIn').mockImplementation(
    async (_url, _scopes, _permissions, beforeRedirect) => {
      const state = crypto.randomUUID();
      beforeRedirect?.(state);
      localStorage.setItem('youversion-auth-state', state);
      localStorage.setItem('youversion-auth-code-verifier', 'notes-story-verifier');
    },
  );
}

export const BackCancelsPendingAuthorization: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  play: async ({ canvasElement }) => {
    const signIn = stayOnAuthorizationHandoff();
    try {
      const root = await waitForShadowRoot(canvasElement);
      await selectVerses(root, [1, 4]);
      const overlays = await readerOverlays(root);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await userEvent.click(actions.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() =>
        expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull(),
      );
      await expect(overlays.queryByRole('dialog', { name: 'Verse actions' })).toBeNull();

      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      const restored = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await expect(await readerVerse(root, 1)).toHaveClass('yv-v-selected');
      await expect(await readerVerse(root, 4)).toHaveClass('yv-v-selected');
      await userEvent.click(restored.getByRole('button', { name: 'Save' }));
      await expect(await overlays.findByRole('button', { name: 'Yes Please' })).toBeInTheDocument();
    } finally {
      signIn.mockRestore();
      YouVersionPlatformConfiguration.clearAuthTokens();
    }
  },
};

function ParallelReaders() {
  const [callbackCount, setCallbackCount] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          const state = localStorage.getItem('youversion-auth-state');
          if (!state) throw new Error('Reader did not start an OAuth handoff');
          stageCallback(state);
          setCallbackCount((count) => count + 1);
        }}
      >
        Return from sign-in
      </button>
      <YouVersionProvider
        key={callbackCount}
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || 'storybook-notes'}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
        authRedirectUrl={location.origin}
        locale="en"
        includeAuth
      >
        <ReaderPage version={callbackCount} />
        <div className="yv:grid yv:grid-cols-2 yv:h-[30rem]">
          {['First Reader', 'Second Reader'].map((label) => (
            <section key={label} aria-label={label} className="yv:min-h-0">
              <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
                <BibleReader.Content />
              </BibleReader.Root>
            </section>
          ))}
        </div>
      </YouVersionProvider>
    </>
  );
}

export const OAuthReturnsToTheInitiatingReader: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: { ...writableSession, includeAuth: false },
  loaders: [
    async () => {
      YouVersionPlatformConfiguration.clearAuthTokens();
      return { originalNotesCallbackUrl: location.href };
    },
  ],
  render: () => <ParallelReaders />,
  play: withWritableSession(async ({ canvasElement }) => {
    const signIn = stayOnAuthorizationHandoff();
    try {
      const page = within(canvasElement);
      const second = page.getByRole('region', { name: 'Second Reader' });
      const secondRoot = await waitForShadowRoot(second);
      await selectVerses(secondRoot, [1, 4]);
      const overlays = await readerOverlays(secondRoot);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await userEvent.click(actions.getByRole('button', { name: 'Save' }));
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await waitFor(() =>
        expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull(),
      );
      await userEvent.click(page.getByRole('button', { name: 'Return from sign-in' }));

      await waitForReaderPage(canvasElement, 1);
      const returned = await waitForShadowRoot(page.getByRole('region', { name: 'Second Reader' }));
      const returnedOverlays = await readerOverlays(returned);
      const note = await returnedOverlays.findByRole('dialog', { name: 'John 1:1,4' });
      await waitFor(() => expect(note).toBeVisible());
      const first = canvasElement.querySelector('section[aria-label="First Reader"]');
      if (!first) throw new Error('The first Reader did not remount');
      const firstRoot = await waitForShadowRoot(first);
      await expect(firstRoot.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      signIn.mockRestore();
    }
  }),
};

export const NoBuiltInAuth: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: { includeAuth: false },
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1]);
    const overlays = await readerOverlays(root);
    const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
    await waitFor(() => expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible());
    await expect(actions.queryByRole('button', { name: 'Save' })).toBeNull();
    await expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull();
  },
};

export const HostControlledSignIn: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: { includeAuth: false },
  render: () => (
    <YouVersionProvider
      appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || 'storybook-notes'}
      apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      authRedirectUrl={location.origin}
      userInfo={null}
      locale="en"
      includeAuth
    >
      <div className="yv:h-screen">
        <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
          <BibleReader.Content />
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </div>
    </YouVersionProvider>
  ),
  play: async ({ canvasElement }) => {
    const signIn = spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    try {
      const root = await waitForShadowRoot(canvasElement);
      const toolbar = root.querySelector('button[aria-label="Sign In" i]');
      if (!toolbar) throw new Error('Reader sign-in control is missing');
      await userEvent.click(toolbar);
      const overlays = await readerOverlays(root);
      await userEvent.click(await overlays.findByRole('button', { name: /sign in/i }));
      await expect(signIn).toHaveBeenNthCalledWith(1, location.origin, ['profile'], undefined);

      await selectVerses(root, [1]);
      const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await expect(actions.queryByRole('button', { name: 'Save' })).toBeNull();
      const [firstColor] = actions.getAllByRole('button', { name: 'Apply highlight' });
      if (!firstColor) throw new Error('Reader highlight swatches are missing');
      await userEvent.click(firstColor);
      await userEvent.click(await overlays.findByRole('button', { name: 'Yes Please' }));
      await expect(signIn).toHaveBeenNthCalledWith(2, location.origin, ['profile'], ['highlights']);
    } finally {
      signIn.mockRestore();
    }
  },
};

function ReaderAccountStatus() {
  const { auth, userInfo } = useYVAuth();
  const [lastEvent, setLastEvent] = useState('ready');
  useEffect(() => {
    const observe = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key && event.isTrusted)
        setLastEvent(event.key);
    };
    window.addEventListener('storage', observe);
    return () => window.removeEventListener('storage', observe);
  }, []);
  return (
    <output aria-label="Reader account">
      {auth.isLoading ? 'Loading' : (userInfo?.name ?? 'Signed out')} / {lastEvent}
    </output>
  );
}

export const HighlightsWaitForTheStagedAccount: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: { includeAuth: false },
  loaders: [
    async () => {
      YouVersionPlatformConfiguration.clearAuthTokens();
      YouVersionPlatformConfiguration.saveUserInfo({ id: 'alice', name: 'Alice' });
      return {};
    },
  ],
  render: () => (
    <YouVersionProvider
      appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || 'storybook-notes'}
      apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      authRedirectUrl={location.origin}
      locale="en"
      includeAuth
    >
      <ReaderAccountStatus />
      <div className="yv:h-screen">
        <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
          <BibleReader.Content />
        </BibleReader.Root>
      </div>
    </YouVersionProvider>
  ),
  play: async ({ canvasElement }) => {
    const requests: (string | null)[] = [];
    getWorker().use(
      http.get('*/v1/highlights', ({ request }) => {
        requests.push(request.headers.get('authorization'));
        return highlightPage(yellow);
      }),
    );
    const status = () => within(canvasElement).getByLabelText('Reader account');
    const frame = canvasElement.ownerDocument.createElement('iframe');
    frame.hidden = true;
    canvasElement.append(frame);
    try {
      const storage = frame.contentWindow?.localStorage;
      if (!storage) throw new Error('Same-origin account writer did not mount');
      const root = await waitForShadowRoot(canvasElement);
      const verse = await readerVerse(root, 1);
      await waitFor(() => expect(status()).toHaveTextContent('Signed out / ready'));
      YouVersionPlatformConfiguration.saveAuthData(
        'bob-access',
        'bob-refresh',
        new Date('2100-01-01'),
        {
          userId: 'bob',
          scope: 'profile read_notes',
        },
      );
      // Stage the bound token in another document while the old profile remains visible in storage.
      localStorage.removeItem('accessToken');
      storage.setItem('accessToken', 'bob-access');
      await waitFor(() => expect(status()).toHaveTextContent('Signed out / accessToken'));
      await expect(requests).toEqual([]);

      storage.setItem('userInfo', JSON.stringify({ id: 'bob', name: 'Bob' }));
      await waitFor(() => expect(status()).toHaveTextContent('Bob / userInfo'));
      await waitFor(() => expect(getBackgroundColorChannels(verse)).toEqual([255, 236, 91, 255]));
      await expect(requests).toEqual(['Bearer bob-access']);
    } finally {
      frame.remove();
      YouVersionPlatformConfiguration.clearAuthTokens();
    }
  },
};

export const SignInFlow: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [
    async () => {
      YouVersionPlatformConfiguration.clearAuthTokens();
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const signIn = spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    try {
      const root = await waitForShadowRoot(canvasElement);
      const trigger = await waitFor(() => {
        const button = root.querySelector('[data-testid="user-menu-trigger"]');
        if (!button) throw new Error('Reader sign-in trigger is missing');
        return button;
      });
      await expect(trigger.querySelector('img')).not.toBeInTheDocument();
      await userEvent.click(trigger);
      const overlays = await readerOverlays(root);
      await userEvent.click(await overlays.findByRole('button', { name: /sign in/i }));
      await expect(signIn).toHaveBeenCalledWith(
        expect.any(String),
        ['profile', 'read_notes', 'write_notes'],
        undefined,
      );
    } finally {
      signIn.mockRestore();
    }
  },
};

export const HostTakesOverSignIn: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  render: function HostSignInReader() {
    const [hostOwnsSignIn, setHostOwnsSignIn] = useState(false);
    const [hostSignInRequested, setHostSignInRequested] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setHostOwnsSignIn(true)}>
          Use host sign-in
        </button>
        {hostSignInRequested && <p role="status">Host sign-in requested</p>}
        <div className="yv:h-screen">
          <BibleReader.Root
            defaultBook="JHN"
            defaultChapter="1"
            defaultVersionId={111}
            onSignInPress={hostOwnsSignIn ? () => setHostSignInRequested(true) : undefined}
          >
            <BibleReader.Content />
            <BibleReader.Toolbar />
          </BibleReader.Root>
        </div>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    const signIn = spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    try {
      const root = await waitForShadowRoot(canvasElement);
      const takeOver = await page.findByRole('button', { name: 'Use host sign-in' });
      await selectVerses(root, [1, 4]);
      const overlays = await readerOverlays(root);
      const initialActions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
      await userEvent.click(initialActions.getByRole('button', { name: 'Save' }));
      await waitFor(() =>
        expect(overlays.getByRole('button', { name: 'Yes Please' })).toBeVisible(),
      );

      // A host can take ownership regardless of the open Reader modal.
      takeOver.click();
      await waitFor(() =>
        expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull(),
      );
      const restoredActions = within(
        await overlays.findByRole('dialog', { name: 'Verse actions' }),
      );
      await waitFor(() =>
        expect(restoredActions.getByRole('button', { name: 'Copy' })).toBeVisible(),
      );
      await expect(restoredActions.queryByRole('button', { name: 'Save' })).toBeNull();
      await expect(await readerVerse(root, 1)).toHaveClass('yv-v-selected');
      await expect(await readerVerse(root, 4)).toHaveClass('yv-v-selected');
      const toolbar = root.querySelector('button[aria-label="Sign In" i]');
      if (!toolbar) throw new Error('Reader sign-in control is missing');
      await userEvent.click(toolbar);
      await userEvent.click(await overlays.findByRole('button', { name: /sign in/i }));
      await expect(page.getByRole('status')).toHaveTextContent('Host sign-in requested');
      await expect(signIn).not.toHaveBeenCalled();
    } finally {
      signIn.mockRestore();
    }
  },
};

export const SharedCopyAndDiscard: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [prepareCallback],
  parameters: { ...writableSession, locale: 'es' },
  play: withWritableSession(async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1]);
    const overlays = await readerOverlays(root);
    const actions = within(await overlays.findByRole('dialog', { name: 'Acciones del versículo' }));
    await waitFor(() => expect(actions.getByRole('button', { name: 'Copiar' })).toBeVisible());
    await userEvent.click(actions.getByRole('button', { name: 'Save' }));
    const composer = within(await overlays.findByRole('dialog', { name: 'John 1:1' }));
    await fillEditor(
      composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' }),
      'A saved thought',
    );
    await userEvent.click(composer.getByRole('button', { name: 'Cancelar' }));
    const confirmation = within(await overlays.findByRole('dialog', { name: 'Discard note?' }));
    await userEvent.click(confirmation.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(overlays.queryByRole('dialog', { name: 'John 1:1' })).toBeNull());
    const reopened = within(
      await overlays.findByRole('dialog', { name: 'Acciones del versículo' }),
    );
    await userEvent.click(reopened.getByRole('button', { name: 'Save' }));
    await expect(await overlays.findByRole('textbox', { name: 'Add Note…' })).toHaveValue('');
  }),
};
