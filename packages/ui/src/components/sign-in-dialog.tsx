import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { YouVersionPlatformLogo } from './icons/youversion-platform-logo';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The integrating app's display name, interpolated into the body copy. */
  appName: string;
  /**
   * Optional pitch line supplied by the integrator (from
   * `YouVersionPlatformConfiguration`, passed in by the wiring layer). Hidden
   * entirely when unset.
   */
  promptMessage?: string;
  /** User tapped "Yes Please" → launch the OAuth sign-in flow. */
  onConfirm: () => void;
  /** User tapped "No Thanks" / dismissed → abandon the sign-in flow. */
  onDecline: () => void;
  theme?: 'light' | 'dark';
};

/**
 * "Sign in with YouVersion" introduction dialog (YPE-1034). Shown when a
 * signed-out user taps a highlight color, before OAuth launches. Copy is
 * verbatim from the Swift SDK's `SignInWithYouVersionView` (`signIn.*`).
 * Presentational only — accepting/declining is delegated to the callbacks; the
 * component performs no OAuth, network, or config reads.
 */
export const SignInDialog: FC<SignInDialogProps> = ({
  open,
  onOpenChange,
  appName,
  promptMessage,
  onConfirm,
  onDecline,
  theme = 'light',
}) => {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        theme={theme}
        className="yv:flex yv:flex-col yv:items-center yv:gap-4 yv:text-center"
        onEscapeKeyDown={onDecline}
      >
        <div className="yv:flex yv:flex-col yv:items-center yv:gap-3">
          <DialogTitle className="yv:text-xs yv:font-semibold yv:uppercase yv:tracking-widest yv:text-muted-foreground">
            {t('signInIntroducing')}
          </DialogTitle>
          <YouVersionPlatformLogo
            theme={theme}
            aria-label={t('youVersionPlatformLogoAriaLabel')}
            className="yv:h-4 yv:w-[11.875rem]"
          />
        </div>

        {promptMessage ? (
          <p className="yv:text-sm yv:font-medium yv:italic yv:text-foreground yv:text-balance">
            &ldquo;{promptMessage}&rdquo;
          </p>
        ) : null}

        <DialogDescription className="yv:text-sm yv:text-muted-foreground yv:text-balance">
          {t('signInParagraph', { appName })}
        </DialogDescription>

        <div className="yv:flex yv:w-full yv:flex-col yv:gap-2">
          <Button variant="default" className="yv:w-full yv:rounded-full" onClick={onConfirm}>
            {t('signInYesButton')}
          </Button>
          <Button variant="ghost" className="yv:w-full yv:rounded-full" onClick={onDecline}>
            {t('signInNoButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
