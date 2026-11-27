import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type CreateNote,
} from '@youversion/platform-core';
import { http, HttpResponse } from 'msw';
import { getWorker } from 'msw-storybook-addon';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { globalHandlers } from '@/test/mocks/handlers';
import { getBackgroundColorChannels, waitForShadowRoot } from '@/test/storybook-dom';
import { BibleReader } from './bible-reader';
import { BibleReaderNavigation } from './bible-reader-navigation';

const meta: Meta = {
  title: 'Components/BibleReader/Notes',
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
    await userEvent.fill(editor, value);
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

function prepareCallback() {
  YouVersionPlatformConfiguration.clearAuthTokens();
  const url = location.href;
  const callback = new URL(url);
  callback.searchParams.set('state', 'notes-story-state');
  callback.searchParams.set('code', crypto.randomUUID());
  localStorage.setItem('youversion-auth-state', 'notes-story-state');
  localStorage.setItem('youversion-auth-code-verifier', 'notes-story-verifier');
  localStorage.setItem('youversion-auth-redirect-uri', callback.origin);
  history.replaceState(history.state, '', callback);
  return () => {
    YouVersionPlatformConfiguration.clearAuthTokens();
    history.replaceState(history.state, '', url);
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

export const SavePassage: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  parameters: writableSession,
  play: async ({ canvasElement }) => {
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
  },
};

export const EditAndRetry: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  globals: { theme: 'dark' },
  parameters: writableSession,
  play: async ({ canvasElement }) => {
    const requests: NoteRequest[] = [];
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const body = await request.json();
        requests.push(body);
        return requests.length === 1 ? HttpResponse.error() : noteResponse(body);
      }),
    );
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [2]);
    const { overlays, composer } = await openComposer(root, 'John 1:2');
    const editor = composer.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add Note…' });
    const colors = within(composer.getByRole('group', { name: 'Highlight colors' }));
    const palette = ['ffec5b', 'b4ffc1', 'bbf4ff', 'ffdca7', 'ffcff8', 'dfdcff'];
    const colorName = (color: string) => `Apply highlight #${color}`;
    const selected = colors.getByRole('button', { name: colorName('ffdca7') });
    const lightSurface = [255, 220, 167, 255];
    await expect(getBackgroundColorChannels(selected)).not.toEqual(lightSurface);

    async function confirmDirty() {
      await userEvent.click(composer.getByRole('button', { name: 'Cancel' }));
      const confirmation = await overlays.findByRole('dialog', { name: 'Discard note?' });
      await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(overlays.queryByRole('dialog', { name: 'Discard note?' })).toBeNull(),
      );
    }

    await fillEditor(editor, 'First thought');
    await confirmDirty();
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

    await fillEditor(editor, 'First thought');
    await userEvent.click(composer.getByRole('radio', { name: 'Public' }));
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await expect(await composer.findByRole('alert')).toBeVisible();
    await expect(editor).toHaveValue('First thought');
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(composer.getByRole('radio', { name: 'Public' })).toBeChecked();
    await fillEditor(editor, 'Edited thought');
    await userEvent.click(composer.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());

    const common = {
      request_id: expect.stringMatching(/^[\da-f-]{36}$/i),
      status: 'public',
      color: 'ffdca7',
      passage: { bible_id: 111, passage_id: 'JHN.1.2' },
    };
    await expect(requests).toEqual([
      { ...common, content: 'First thought' },
      { ...common, content: 'Edited thought' },
    ]);
    await expect(requests[1]?.request_id).toBe(requests[0]?.request_id);
  },
};

const yellow = { bible_id: 111, passage_id: 'JHN.1.1', color: 'ffec5b' };
const green = { ...yellow, color: 'b4ffc1' };
const highlightPage = (highlight: typeof yellow) =>
  HttpResponse.json({ data: [highlight], next_page_token: null });

export const RefreshHighlights: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/highlights', () => highlightPage(yellow)),
        ...writableSession.msw.handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const verse = await readerVerse(root, 1);
    const paint = () => getBackgroundColorChannels(verse);
    const oldColor = [255, 236, 91, 255];
    await waitFor(() => expect(paint()).toEqual(oldColor));

    const reads = [HttpResponse.error(), highlightPage(yellow), highlightPage(green)].map(
      (response) => ({ response, release: deferred<void>(), request: deferred<URL>() }),
    );
    const queued = reads.slice();
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

    for (const read of reads) {
      await selectVerses(root, [2]);
      const { overlays, composer } = await openComposer(root, 'John 1:2');
      await userEvent.click(composer.getByRole('button', { name: 'Save' }));
      const scope = (await read.request.promise).searchParams;
      await expect(scope.get('bible_id')).toBe('111');
      await expect(scope.get('passage_id')).toBe('JHN.1');
      await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
      await expect(paint()).toEqual(oldColor);
      read.release.resolve();
    }
    await waitFor(() => expect(paint()).toEqual([180, 255, 193, 255]));
  },
};

const hostNavigation = new BibleReaderNavigation();

export const RefreshDisplayedChapterAfterNavigation: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  parameters: writableSession,
  render: () => (
    <div className="yv:h-screen">
      <BibleReader.Root
        defaultBook="JHN"
        defaultChapter="1"
        defaultVersionId={111}
        navigation={hostNavigation}
      >
        <BibleReader.Content />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const noteSent = deferred<NoteRequest>();
    const releaseNote = deferred<void>();
    const chapterReads: string[] = [];
    getWorker().use(
      http.post<never, NoteRequest>('*/v1/notes', async ({ request }) => {
        const note = await request.json();
        noteSent.resolve(note);
        await releaseNote.promise;
        return noteResponse(note);
      }),
      http.get('*/v1/highlights', ({ request }) => {
        const { searchParams } = new URL(request.url);
        chapterReads.push(`${searchParams.get('bible_id')}:${searchParams.get('passage_id')}`);
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

    hostNavigation.request({ versionId: 111, passageId: 'JHN.3' });
    await waitFor(() => expect(chapterReads).toContain('111:JHN.3'));
    await expect(overlays.getByRole('dialog', { name: 'John 1:2' })).toBeVisible();
    chapterReads.length = 0;
    releaseNote.resolve();
    await waitFor(() => expect(chapterReads).toEqual(['111:JHN.3']));
    await waitFor(() => expect(overlays.queryByRole('dialog')).toBeNull());
  },
};

export const WritePermissionChangesWhileEditing: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  parameters: writableSession,
  play: async ({ canvasElement }) => {
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
    await expect(await overlays.findByRole('textbox', { name: 'Add Note…' })).toHaveValue(
      'Retained thought',
    );

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
    } finally {
      signIn.mockRestore();
    }
  },
};

function stayOnAuthorizationHandoff() {
  // Intercept only the location change so this test can deliver a browser Back
  // restoration to the same Reader. The SampleApp smoke exercises real redirects.
  return spyOn(YouVersionAPIUsers, 'signIn').mockImplementation(
    async (_url, _scopes, _permissions, beforeRedirect) => {
      beforeRedirect?.(crypto.randomUUID());
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
    }
  },
};

export const NoBuiltInAuth: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: { includeAuth: false },
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1]);
    const overlays = await readerOverlays(root);
    const actions = within(await overlays.findByRole('dialog', { name: 'Verse actions' }));
    await expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(actions.queryByRole('button', { name: 'Save' })).toBeNull();
    await expect(overlays.queryByRole('button', { name: 'Yes Please' })).toBeNull();
  },
};

export const SharedCopyAndDiscard: Story = {
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  beforeEach: prepareCallback,
  parameters: { ...writableSession, locale: 'es' },
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await selectVerses(root, [1]);
    const overlays = await readerOverlays(root);
    const actions = within(await overlays.findByRole('dialog', { name: 'Acciones del versículo' }));
    await expect(actions.getByRole('button', { name: 'Copiar' })).toBeVisible();
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
  },
};
