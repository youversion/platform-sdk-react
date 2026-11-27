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
  type Note,
  type UpdateNote,
} from '@youversion/platform-core';
import {
  useCreateNote,
  useUpdateNote,
  YouVersionAuthContext,
} from '@youversion/platform-react-hooks';
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

const editableFields = {
  text: z.string(),
  visibility: z.enum(['private', 'public']),
  color: z.nullable(z.string().check(z.regex(/^[0-9a-f]{6}$/))),
};

const draftSchema = z.object({
  selection: selectionSchema,
  requestId: z.uuid(),
  ownerId: z.nullable(z.string()),
  ...editableFields,
  recovery: z.optional(
    z.object({
      submitted: z.object(editableFields),
      savedNote: z.optional(z.object({ id: z.string(), contentMayExist: z.boolean() })),
    }),
  ),
});

const handoffSchema = z.object({
  draft: draftSchema,
  readerKey: z.string(),
  callbackReaderKey: z.optional(z.string()),
  state: z.string(),
  expiresAt: z.number(),
});
const HANDOFF_KEY = 'youversion-platform:pending-note';
const HANDOFF_LIFETIME = 10 * 60 * 1000;
const NOTE_REJECTION_STATUSES = [400, 401, 403, 404, 412, 413, 422, 429];

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
  dismiss: (intent: 'cancel' | 'discard') => void;
  save: () => Promise<void>;
};

// An OAuth return remounts the page. The Reader's placement distinguishes
// multiple instances even when they display the same passage.
function readerPosition(
  reader: HTMLElement,
  pathname = reader.ownerDocument.location?.pathname,
): string {
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
  return JSON.stringify([pathname, ...path]);
}

function consumeNoteHandoff(
  readerKey: string,
  match?: { state: string; requestId: string },
  callbackState?: string | null,
) {
  const storage = getSessionStorage();
  const raw = storage?.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed = handoffSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const handoff = parsed.data;
    if (
      handoff.readerKey !== readerKey &&
      (handoff.callbackReaderKey !== readerKey || handoff.state !== callbackState)
    )
      return null;
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

function noteMatchesDraft(note: Note, draft: NoteDraftFields) {
  return (
    note.content === draft.text &&
    note.status === draft.visibility &&
    (note.color?.toLowerCase() ?? null) === draft.color
  );
}

function matchesDraftOwner(
  owner: string | null,
  account: string | null,
  state: string | null,
  failedCallbackState?: string | null,
) {
  // A failed refresh can leave the initiating profile without credentials.
  // A verified failed callback can then clear its pending state. That proof is
  // useful for draft recovery only while the same signed-out attempt owns it.
  return (
    owner === account ||
    (account === null &&
      owner !== null &&
      state !== null &&
      config.storedUserInfo?.id === owner &&
      (YouVersionAPIUsers.isSignInPending(state) ||
        (state === failedCallbackState &&
          !config.accessToken &&
          !config.refreshToken &&
          !YouVersionAPIUsers.isSignInPending())))
  );
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
  onAuthorizationCommitted,
}: {
  reader: RefObject<HTMLElement | null>;
  enabled: boolean;
  hostOwnsSignIn: boolean;
  onSaved: (selection: NoteSelection) => void;
  onInvalidated: (selection: NoteSelection) => void;
  onAuthorizationCommitted: () => void;
}): UseBibleReaderNoteResult {
  const auth = useContext(YouVersionAuthContext);
  const account = auth?.userInfo?.userId || null;
  const accountRevision = auth?.accountRevision ?? 0;
  const lastAccountRevision = useRef(accountRevision);
  const authLoading = auth?.isLoading ?? false;
  const oauthCallbackState = auth?.oauthCallbackState;
  const oauthCallbackSuperseded = auth?.oauthCallbackSuperseded;
  const oauthFailedCallbackState = oauthCallbackSuperseded ? null : auth?.oauthFailedCallbackState;
  const canAuthorize = enabled && auth !== null && !auth.isHostControlled && !hostOwnsSignIn;
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [restoredSelection, setRestoredSelection] = useState<NoteSelection | null>(null);
  const clearRestoredSelection = useCallback(() => setRestoredSelection(null), []);
  const [authorizationFailed, setAuthorizationFailed] = useState(false);
  const retainedDraft = useRef<NoteDraft | null>(null);
  const currentFlow = useRef<Flow | null>(null);
  const handoffState = useRef<string | null>(null);
  const draftAuthorizationState = useRef<string | null>(null);
  const checkedHandoff = useRef(false);
  const latest = useRef({
    account,
    canAuthorize,
    oauthFailedCallbackState,
    onSaved,
    onInvalidated,
    onAuthorizationCommitted,
  });
  latest.current = {
    account,
    canAuthorize,
    oauthFailedCallbackState,
    onSaved,
    onInvalidated,
    onAuthorizationCommitted,
  };

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
    const accountChanged = accountRevision !== lastAccountRevision.current;
    lastAccountRevision.current = accountRevision;
    if (authLoading && !accountChanged) return;
    const active = currentFlow.current;
    const draft = active?.draft ?? retainedDraft.current;
    if (
      draft?.ownerId &&
      (accountChanged ||
        !matchesDraftOwner(
          draft.ownerId,
          account,
          draftAuthorizationState.current,
          oauthFailedCallbackState,
        ))
    ) {
      retainedDraft.current = null;
      draftAuthorizationState.current = null;
      show(null);
      latest.current.onInvalidated(draft.selection);
      return;
    }
    if (!canAuthorize && active?.phase === 'authorize') restoreAfterAuthorization(active);
  }, [account, accountRevision, authLoading, canAuthorize, oauthFailedCallbackState]);

  useEffect(() => {
    if (authLoading || !canAuthorize || checkedHandoff.current || !reader.current) return;
    checkedHandoff.current = true;
    const returnedState = oauthCallbackState ?? oauthFailedCallbackState;
    const handoff = consumeNoteHandoff(
      readerPosition(reader.current),
      undefined,
      oauthCallbackSuperseded ? null : returnedState,
    );
    if (
      !handoff ||
      oauthCallbackSuperseded ||
      (returnedState
        ? returnedState !== handoff.state
        : !YouVersionAPIUsers.isSignInPending(handoff.state)) ||
      (handoff.draft.ownerId &&
        !matchesDraftOwner(handoff.draft.ownerId, account, handoff.state, oauthFailedCallbackState))
    ) {
      return;
    }
    setRestoredSelection(handoff.draft.selection);
    if (oauthCallbackState === handoff.state && writerToken(account)) {
      show({ phase: 'compose', draft: { ...handoff.draft, ownerId: account } });
    } else {
      retainedDraft.current = handoff.draft;
      draftAuthorizationState.current = handoff.state;
    }
  }, [
    account,
    authLoading,
    canAuthorize,
    oauthCallbackState,
    oauthFailedCallbackState,
    oauthCallbackSuperseded,
    reader,
  ]);

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
        !matchesDraftOwner(ownerId, latest.current.account, state)
      ) {
        draftAuthorizationState.current = null;
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
    const sameOwnedSelection =
      retained &&
      sameSelection(retained.selection, selection) &&
      (!retained.ownerId ||
        matchesDraftOwner(
          retained.ownerId,
          account,
          draftAuthorizationState.current,
          oauthFailedCallbackState,
        ));
    retainedDraft.current = null;
    if (!sameOwnedSelection) draftAuthorizationState.current = null;
    setAuthorizationFailed(false);
    const draft = sameOwnedSelection
      ? { ...retained, ownerId: retained.ownerId ?? account }
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
    const readerElement = reader.current;
    if (active?.phase !== 'authorize' || !canAuthorize || !readerElement) return;
    const readerKey = readerPosition(readerElement);
    const redirect = { ...active, phase: 'redirect' } as const;
    const previousState = draftAuthorizationState.current;
    show(redirect);
    try {
      const redirectUri = auth?.redirectUri ?? window.location.href;
      const callbackHref = new URL(redirectUri).href;
      // The Core authorize URL removes a trailing slash from the complete URI.
      const callback = new URL(
        callbackHref.endsWith('/') ? callbackHref.slice(0, -1) : callbackHref,
      );
      const callbackReaderKey =
        callback.origin === window.location.origin
          ? readerPosition(readerElement, callback.pathname)
          : undefined;
      await YouVersionAPIUsers.signIn(redirectUri, READER_SIGN_IN_SCOPES, undefined, (state) => {
        if (
          currentFlow.current !== redirect ||
          !matchesDraftOwner(
            redirect.draft.ownerId,
            latest.current.account,
            previousState,
            latest.current.oauthFailedCallbackState,
          ) ||
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
            callbackReaderKey,
            state,
            expiresAt: Date.now() + HANDOFF_LIFETIME,
          }),
        );
        if (!stored) throw new Error('The pending note could not be saved for authorization');
        handoffState.current = state;
        draftAuthorizationState.current = state;
        latest.current.onAuthorizationCommitted();
      });
    } catch {
      if (currentFlow.current !== redirect) return;
      draftAuthorizationState.current = previousState;
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

  function dismiss(intent: 'cancel' | 'discard') {
    const active = currentFlow.current;
    if (active?.phase !== 'compose') return;
    retainedDraft.current = intent === 'cancel' ? active.draft : null;
    if (intent === 'discard') draftAuthorizationState.current = null;
    show(null);
  }

  async function save() {
    const active = currentFlow.current;
    if (
      active?.phase !== 'compose' ||
      authLoading ||
      !matchesDraftOwner(
        active.draft.ownerId,
        account,
        draftAuthorizationState.current,
        oauthFailedCallbackState,
      )
    )
      return;
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
    const draft = active.draft;
    const saving = { draft, phase: 'save' } as const;
    show(saving);
    const { selection, text, color, visibility, requestId, ownerId, recovery } = draft;
    const submitted = recovery?.submitted ?? { text, color, visibility };
    let savedNote = recovery?.savedNote;
    let patchToken: string | null = null;
    const isCurrent = () =>
      currentFlow.current === saving &&
      latest.current.account === ownerId &&
      config.storedUserInfo?.id === ownerId;
    try {
      if (!savedNote) {
        const request: CreateNote = {
          request_id: requestId,
          content: submitted.text,
          status: submitted.visibility,
          passage: {
            version_id: selection.versionId,
            passage_id: buildPassageIds(selection.book, selection.chapter, selection.verses).join(
              '+',
            ),
          },
        };
        if (submitted.color) request.color = submitted.color;
        const note = await createNote(request, token);
        if (!isCurrent()) return;
        if (!noteMatchesDraft(note, draft)) {
          savedNote = { id: note.id, contentMayExist: note.content.length > 0 };
        }
      }
      if (savedNote) {
        // Recheck the live scope after the create round trip and before updating.
        patchToken = writerToken(ownerId);
        if (!patchToken) throw new Error('An access token is required to finish saving the note');
        if (!text && savedNote.contentMayExist) {
          throw new Error('The Notes API cannot clear saved note text');
        }
        const update: UpdateNote = { status: visibility, color };
        if (text) update.content = text;
        const note = await updateNote(savedNote.id, update, patchToken);
        if (note.id !== savedNote.id || !noteMatchesDraft(note, draft)) {
          throw new Error('The updated note does not match the draft');
        }
      }
    } catch (error) {
      if (isCurrent()) {
        const status = getHttpStatus(error);
        const deniedToken = status === 401 || status === 403 ? (patchToken ?? token) : undefined;
        const rejected = status !== undefined && NOTE_REJECTION_STATUSES.includes(status);
        // A lost update may already have changed the note. Retry the desired
        // fields against this ID, even if the user restored the create values.
        if (savedNote && patchToken && text && !rejected) {
          savedNote = { ...savedNote, contentMayExist: true };
        }
        show({
          phase: 'compose',
          draft: {
            ...draft,
            recovery: savedNote || recovery || !rejected ? { submitted, savedNote } : undefined,
          },
          failed: true,
          deniedToken,
        });
      }
      return;
    }
    if (!isCurrent()) return;
    show(null);
    latest.current.onSaved(selection);
  }

  const visibleFlow =
    !enabled ||
    (flow?.draft.ownerId &&
      !matchesDraftOwner(
        flow.draft.ownerId,
        account,
        draftAuthorizationState.current,
        oauthFailedCallbackState,
      ))
      ? null
      : flow;
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
