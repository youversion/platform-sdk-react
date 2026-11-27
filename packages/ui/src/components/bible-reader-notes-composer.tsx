'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { HIGHLIGHT_COLORS } from '@/lib/highlight-colors';
import { getOwnShadowRoot, isElementFromOwnerDocument } from '@/lib/shadow-root-host';
import { HighlightColorCircle } from './highlight-color-circle';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import type { NoteDraft, NoteDraftFields } from './use-bible-reader-note';

type NotesComposerProps = {
  draft: NoteDraft;
  saving: boolean;
  failed: boolean;
  onChange: (fields: Partial<NoteDraftFields>) => void;
  onSave: () => void;
  onDismiss: () => void;
  theme: 'light' | 'dark';
};

export function BibleReaderNotesComposer({
  draft,
  saving,
  failed,
  onChange,
  onSave,
  onDismiss,
  theme,
}: NotesComposerProps): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const visibilityName = useId();
  const discardDescriptionId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const focusBeforeDiscard = useRef<HTMLElement | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useLayoutEffect(() => {
    if (confirmDiscard) {
      stayButtonRef.current?.focus({ preventScroll: true });
    } else {
      focusBeforeDiscard.current?.focus({ preventScroll: true });
      focusBeforeDiscard.current = null;
    }
  }, [confirmDiscard]);

  function requestDismiss() {
    if (saving) return;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return;
    }
    if (draft.text || draft.visibility !== 'private' || draft.color) {
      const form = formRef.current;
      if (form) {
        const active = getOwnShadowRoot(form)?.activeElement ?? form.ownerDocument.activeElement;
        if (isElementFromOwnerDocument(active, form, 'HTMLElement') && form.contains(active)) {
          focusBeforeDiscard.current = active;
        }
      }
      setConfirmDiscard(true);
    } else {
      onDismiss();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestDismiss();
      }}
    >
      <DialogContent
        theme={theme}
        aria-describedby={confirmDiscard ? discardDescriptionId : undefined}
        className="yv:box-border yv:max-h-[calc(100dvh-2rem)] yv:max-w-md yv:overflow-y-auto"
      >
        <DialogTitle className="yv:[margin-block-end:1rem] yv:text-lg yv:font-semibold">
          {confirmDiscard ? (
            t('notesDiscardTitle')
          ) : (
            <bdi dir="auto">{draft.selection.reference}</bdi>
          )}
        </DialogTitle>
        <form
          ref={formRef}
          aria-busy={saving}
          className={confirmDiscard ? 'yv:hidden' : 'yv:flex yv:flex-col yv:gap-4'}
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Textarea
            aria-label={t('notesPlaceholder')}
            placeholder={t('notesPlaceholder')}
            value={draft.text}
            onInput={(event) => onChange({ text: event.currentTarget.value })}
            readOnly={saving}
            dir="auto"
            className="yv:min-h-24"
          />
          <fieldset disabled={saving} className="yv:flex yv:gap-4">
            <label className="yv:flex yv:items-center yv:gap-2 yv:text-sm">
              <input
                type="radio"
                name={visibilityName}
                checked={draft.visibility === 'private'}
                onChange={() => onChange({ visibility: 'private' })}
                className="yv:accent-primary"
              />
              {t('notesPrivate')}
            </label>
            <label className="yv:flex yv:items-center yv:gap-2 yv:text-sm">
              <input
                type="radio"
                name={visibilityName}
                checked={draft.visibility === 'public'}
                onChange={() => onChange({ visibility: 'public' })}
                className="yv:accent-primary"
              />
              {t('notesPublic')}
            </label>
          </fieldset>
          <fieldset disabled={saving} className="yv:flex yv:flex-wrap yv:gap-2">
            <legend className="yv:sr-only">{t('highlightColorsAriaLabel')}</legend>
            {HIGHLIGHT_COLORS.map((color) => {
              const selected = draft.color === color;
              return (
                <HighlightColorCircle
                  key={color}
                  color={color}
                  selected={selected}
                  toggle
                  label={`${t('applyHighlightAriaLabel')} #${color}`}
                  onClick={() => onChange({ color: selected ? null : color })}
                  theme={theme}
                />
              );
            })}
          </fieldset>
          {failed && (
            <p role="alert" className="yv:text-sm yv:text-destructive">
              {t('generic.requestErrorBody')}
            </p>
          )}
          <div className="yv:flex yv:flex-wrap yv:justify-end yv:gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={requestDismiss}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('notesSave')}
            </Button>
          </div>
        </form>

        {confirmDiscard && (
          <div className="yv:flex yv:flex-col yv:gap-4">
            <DialogDescription
              id={discardDescriptionId}
              className="yv:text-sm yv:text-muted-foreground"
            >
              {t('notesDiscardMessage')}
            </DialogDescription>
            <div className="yv:flex yv:flex-wrap yv:justify-end yv:gap-2">
              <Button ref={stayButtonRef} type="button" variant="ghost" onClick={requestDismiss}>
                {t('cancel')}
              </Button>
              <Button type="button" variant="destructive" onClick={onDismiss}>
                {t('notesDiscard')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
