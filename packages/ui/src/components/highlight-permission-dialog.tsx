import type { FC } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

type HighlightPermissionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** User accepted → start the data-exchange grant. */
  onConfirm: () => void;
  /** User declined → discard the pending highlight. */
  onCancel: () => void;
  theme?: 'light' | 'dark';
};

/**
 * Just-in-time permission confirm dialog for the highlight auth flow
 * (YPE-1034). Copy is verbatim from the Swift SDK (`dataExchange.highlights.*`).
 * Accepting starts the data-exchange grant; declining/dismissing discards only
 * the pending highlight and leaves the verse selection intact.
 */
export const HighlightPermissionDialog: FC<HighlightPermissionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  theme = 'light',
}) => {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'yv:fixed yv:inset-0 yv:z-50 yv:bg-black/50',
            'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
            'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          data-yv-sdk
          data-yv-theme={theme}
          className={cn(
            'yv:fixed yv:left-1/2 yv:top-1/2 yv:z-50 yv:-translate-x-1/2 yv:-translate-y-1/2',
            'yv:w-[calc(100vw-2rem)] yv:max-w-sm',
            'yv:bg-card yv:text-foreground',
            'yv:rounded-2xl yv:p-6 yv:shadow-lg',
            'yv:flex yv:flex-col yv:gap-4',
            'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
            'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
            'yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95',
          )}
          onEscapeKeyDown={onCancel}
        >
          <div className="yv:flex yv:flex-col yv:gap-2">
            <DialogPrimitive.Title className="yv:text-lg yv:font-bold yv:text-balance">
              {t('dataExchangeHighlightsQuestion')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="yv:text-sm yv:text-muted-foreground yv:text-balance">
              {t('dataExchangeHighlightsExplanation')}
            </DialogPrimitive.Description>
          </div>

          <div className="yv:flex yv:justify-end yv:gap-2">
            <Button variant="secondary" onClick={onCancel}>
              {t('genericCancel')}
            </Button>
            <Button variant="default" onClick={onConfirm}>
              {t('dataExchangeContinue')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
