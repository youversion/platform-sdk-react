import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        theme={theme}
        className="yv:flex yv:flex-col yv:gap-4"
        onEscapeKeyDown={onCancel}
      >
        <div className="yv:flex yv:flex-col yv:gap-2">
          <DialogTitle className="yv:text-lg yv:font-bold yv:text-balance">
            {t('dataExchangeHighlightsQuestion')}
          </DialogTitle>
          <DialogDescription className="yv:text-sm yv:text-muted-foreground yv:text-balance">
            {t('dataExchangeHighlightsExplanation')}
          </DialogDescription>
        </div>

        <div className="yv:flex yv:justify-end yv:gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('genericCancel')}
          </Button>
          <Button variant="default" onClick={onConfirm}>
            {t('dataExchangeContinue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
