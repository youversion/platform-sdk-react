'use client';

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  getHttpStatus,
  getSessionStorage,
  removeStorageItem,
  setStorageItem,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration as config,
  type CreateNote,
} from '@youversion/platform-core';
import { useCreateNote, YouVersionAuthContext } from '@youversion/platform-react-hooks';
import * as z from 'zod/mini';
import { buildPassageIds } from '@/lib/usfm-ranges';
import { getOwnShadowRoot } from '@/lib/shadow-root-host';
import { READER_SIGN_IN_SCOPES } from './bible-reader-auth';

const selectionSchema = z.object({
  versionId: z.int().check(z.positive()),
  book: z.string(),
  chapter: z.string(),
  verses: z.array(z.int().check(z.positive())).check(z.minLength(1)),
  reference: z.string(),
});

const draftSchema = z.object({
  selection: selectionSchema,
  requestId: z.uuid(),
  ownerId: z.nullable(z.string()),
  text: z.string(),
  visibility: z.enum(['private', 'public']),
  color: z.nullable(z.string().check(z.regex(/^[0-9a-f]{6}$/))),
});

const handoffSchema = z.object({
  draft: draftSchema,
  readerKey: z.string(),
  state: z.string(),
  expiresAt: z.number(),
});
const HANDOFF_KEY = 'youversion-platform:pending-note';
const HANDOFF_LIFETIME = 10 * 60 * 1000;

type NoteSelection = z.infer<typeof selectionSchema>;
export type NoteDraft = z.infer<typeof draftSchema>;
export type NoteDraftFields = Pick<NoteDraft, 'text' | 'visibility' | 'color'>;

type Flow = {
  draft: NoteDraft;
  phase: 'authorize' | 'redirect' | 'compose' | 'save';
  failed?: boolean;
  editing?: boolean;
  deniedToken?: string;
};

type UseBibleReaderNoteResult = {
  flow: Flow | null;
  available: boolean;
  authorizationFailed: boolean;
  restoredSelection: NoteSelection | null;
  clearRestoredSelection: () => void;
  open: (selection: NoteSelection) => void;
  authorize: () => Promise<void>;
  cancelAuthorization: () => void;
  change: (fields: Partial<NoteDraftFields>) => void;
  dismiss: () => void;
  save: () => Promise<void>;
};

// An OAuth return remounts the page. The Reader's placement distinguishes
// multiple instances even when they display the same passage.
function readerPosition(reader: HTMLElement): string {
  const path: string[] = [];
  for (
    let node: Element | null = reader;
    node;
    node = node.parentElement ?? getOwnShadowRoot(node)?.host ?? null
  ) {
    if (node.id && !getOwnShadowRoot(node)) {
      path.unshift(`#${node.id}`);
      break;
    }
    const siblings = Array.from(node.parentNode?.children ?? []).filter(
      (sibling) => sibling.localName === node?.localName,
    );
    path.unshift(`${node.localName}:${siblings.indexOf(node)}`);
  }
  return JSON.stringify([reader.ownerDocument.location?.pathname, ...path]);
}

function consumeNoteHandoff(readerKey: string, match?: { state: string; requestId: string }) {
  const storage = getSessionStorage();
  const raw = storage?.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed = handoffSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const handoff = parsed.data;
    if (handoff.readerKey !== readerKey) return null;
    if (match && (handoff.state !== match.state || handoff.draft.requestId !== match.requestId))
      return null;
    removeStorageItem(storage, HANDOFF_KEY);
    return handoff.expiresAt > Date.now() ? handoff : null;
  } catch {
    return null;
  }
}

function writerToken(account: string | null) {
  return account ? config.getOAuthAccessToken(account, 'write_notes') : null;
}

function sameSelection(left: NoteSelection, right: NoteSelection): boolean {
  return (
    left.versionId === right.versionId &&
    left.book === right.book &&
    left.chapter === right.chapter &&
    left.verses.length === right.verses.length &&
    left.verses.every((verse, index) => verse === right.verses[index])
  );
}

export function useBibleReaderNote({
  reader,
  enabled,
  hostOwnsSignIn,
  onSaved,
  onInvalidated,
}: {
  reader: RefObject<HTMLElement | null>;
  enabled: boolean;
  hostOwnsSignIn: boolean;
  onSaved: (selection: NoteSelection) => void;
  onInvalidated: (selection: NoteSelection) => void;
}): UseBibleReaderNoteResult {
  const auth = useContext(YouVersionAuthContext);
  const account = auth?.userInfo?.userId || null;
  const authLoading = auth?.isLoading ?? false;
  const canAuthorize = enabled && auth !== null && !auth.isHostControlled && !hostOwnsSignIn;
  const createNote = useCreateNote();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [restoredSelection, setRestoredSelection] = useState<NoteSelection | null>(null);
  const clearRestoredSelection = useCallback(() => setRestoredSelection(null), []);
  const [authorizationFailed, setAuthorizationFailed] = useState(false);
  const retainedDraft = useRef<NoteDraft | null>(null);
  const currentFlow = useRef<Flow | null>(null);
  const handoffState = useRef<string | null>(null);
  const checkedHandoff = useRef(false);
  const latest = useRef({ account, canAuthorize, onSaved, onInvalidated });
  latest.current = { account, canAuthorize, onSaved, onInvalidated };

  function show(next: Flow | null) {
    currentFlow.current = next;
    setFlow(next);
  }

  function restoreAfterAuthorization(active: Flow, failed = false) {
    if (active.editing) {
      show({ ...active, phase: 'compose', failed: failed || active.failed });
      return;
    }
    retainedDraft.current = active.draft;
    if (failed) setAuthorizationFailed(true);
    show(null);
  }

  useLayoutEffect(() => {
    if (authLoading) return;
    const draft = currentFlow.current?.draft ?? retainedDraft.current;
    if (!draft?.ownerId || draft.ownerId === account) return;
    retainedDraft.current = null;
    show(null);
    latest.current.onInvalidated(draft.selection);
  }, [account, authLoading]);

  const oauthCallbackState = auth?.oauthCallbackState;
  const oauthCallbackSuperseded = auth?.oauthCallbackSuperseded;
  useEffect(() => {
    if (authLoading || !canAuthorize || checkedHandoff.current || !reader.current) return;
    checkedHandoff.current = true;
    const handoff = consumeNoteHandoff(readerPosition(reader.current));
    if (
      !handoff ||
      oauthCallbackSuperseded ||
      (oauthCallbackState && oauthCallbackState !== handoff.state) ||
      (handoff.draft.ownerId && handoff.draft.ownerId !== account)
    ) {
      return;
    }
    setRestoredSelection(handoff.draft.selection);
    if (oauthCallbackState === handoff.state && writerToken(account)) {
      show({ phase: 'compose', draft: { ...handoff.draft, ownerId: account } });
    } else {
      retainedDraft.current = handoff.draft;
    }
  }, [account, authLoading, canAuthorize, oauthCallbackState, oauthCallbackSuperseded, reader]);

  useEffect(() => {
    // Browser Back can restore this same document without remounting the Reader.
    function onPageShow(event: PageTransitionEvent) {
      const active = currentFlow.current;
      const state = handoffState.current;
      if (!event.persisted || active?.phase !== 'redirect' || !state || !reader.current) return;
      handoffState.current = null;
      const handoff = consumeNoteHandoff(readerPosition(reader.current), {
        state,
        requestId: active.draft.requestId,
      });
      const ownerId = active.draft.ownerId;
      if (
        !YouVersionAPIUsers.isSignInPending(state) ||
        (config.storedUserInfo?.id || null) !== ownerId ||
        latest.current.account !== ownerId
      ) {
        show(null);
        latest.current.onInvalidated(active.draft.selection);
      } else if (handoff && latest.current.canAuthorize) {
        restoreAfterAuthorization(active);
      } else {
        show(null);
      }
    }

    globalThis.window?.addEventListener('pageshow', onPageShow);
    return () => globalThis.window?.removeEventListener('pageshow', onPageShow);
  }, [reader]);

  function open(selection: NoteSelection) {
    if (authLoading || currentFlow.current || selection.verses.length === 0) return;
    const token = writerToken(account);
    if (!token && !canAuthorize) return;
    const retained = retainedDraft.current;
    retainedDraft.current = null;
    setAuthorizationFailed(false);
    const draft =
      retained && sameSelection(retained.selection, selection)
        ? { ...retained, ownerId: account }
        : {
            selection: selectionSchema.parse(selection),
            ownerId: account,
            requestId: crypto.randomUUID(),
            text: '',
            visibility: 'private' as const,
            color: null,
          };
    show({ phase: token ? 'compose' : 'authorize', draft });
  }

  function cancelAuthorization() {
    const active = currentFlow.current;
    if (active?.phase === 'authorize') restoreAfterAuthorization(active);
  }

  async function authorize() {
    const active = currentFlow.current;
    if (active?.phase !== 'authorize' || !canAuthorize || !reader.current) return;
    const readerKey = readerPosition(reader.current);
    const redirect = { ...active, phase: 'redirect' } as const;
    show(redirect);
    try {
      await YouVersionAPIUsers.signIn(
        auth?.redirectUri ?? window.location.href,
        READER_SIGN_IN_SCOPES,
        undefined,
        (state) => {
          if (
            currentFlow.current !== redirect ||
            latest.current.account !== redirect.draft.ownerId ||
            !latest.current.canAuthorize ||
            (config.storedUserInfo?.id || null) !== redirect.draft.ownerId
          ) {
            throw new Error('The Reader account changed before authorization');
          }
          const stored = setStorageItem(
            getSessionStorage(),
            HANDOFF_KEY,
            JSON.stringify({
              draft: redirect.draft,
              readerKey,
              state,
              expiresAt: Date.now() + HANDOFF_LIFETIME,
            }),
          );
          if (!stored) throw new Error('The pending note could not be saved for authorization');
          handoffState.current = state;
        },
      );
    } catch {
      if (currentFlow.current !== redirect) return;
      if (handoffState.current) {
        consumeNoteHandoff(readerKey, {
          state: handoffState.current,
          requestId: active.draft.requestId,
        });
        handoffState.current = null;
      }
      restoreAfterAuthorization(active, true);
    }
  }

  function change(fields: Partial<NoteDraftFields>) {
    const active = currentFlow.current;
    if (active?.phase === 'compose') show({ ...active, draft: { ...active.draft, ...fields } });
  }

  function dismiss() {
    if (currentFlow.current?.phase === 'compose') show(null);
  }

  async function save() {
    const active = currentFlow.current;
    if (active?.phase !== 'compose' || authLoading || active.draft.ownerId !== account) return;
    const token = writerToken(account);
    if (!token || token === active.deniedToken) {
      show({
        ...active,
        phase: canAuthorize ? 'authorize' : 'compose',
        editing: true,
        failed: true,
      });
      return;
    }
    const saving = { draft: active.draft, phase: 'save' } as const;
    show(saving);
    const { selection, text, color, visibility, requestId, ownerId } = active.draft;
    const isCurrent = () =>
      currentFlow.current === saving &&
      latest.current.account === ownerId &&
      config.storedUserInfo?.id === ownerId;
    const request: CreateNote = {
      request_id: requestId,
      content: text,
      status: visibility,
      passage: {
        version_id: selection.versionId,
        passage_id: buildPassageIds(selection.book, selection.chapter, selection.verses).join('+'),
      },
    };
    if (color) request.color = color;
    try {
      await createNote(request, token);
    } catch (error) {
      if (isCurrent()) {
        const status = getHttpStatus(error);
        show({
          phase: 'compose',
          draft: active.draft,
          failed: true,
          deniedToken: status === 401 || status === 403 ? token : undefined,
        });
      }
      return;
    }
    if (!isCurrent()) return;
    show(null);
    latest.current.onSaved(selection);
  }

  const visibleFlow =
    !enabled || (flow?.draft.ownerId && flow.draft.ownerId !== account) ? null : flow;
  return {
    flow: visibleFlow,
    available: enabled && !authLoading && (canAuthorize || !!writerToken(account)),
    authorizationFailed,
    restoredSelection,
    clearRestoredSelection,
    open,
    authorize,
    cancelAuthorization,
    change,
    dismiss,
    save,
  };
}
