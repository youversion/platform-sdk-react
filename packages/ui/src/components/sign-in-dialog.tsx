import type { FC } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { cn } from '../lib/utils';
import { YouVersionLogo } from './icons/youversion-logo';
import { Button } from './ui/button';

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
            'yv:flex yv:flex-col yv:items-center yv:gap-4 yv:text-center',
            'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
            'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
            'yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95',
          )}
          onEscapeKeyDown={onDecline}
        >
          <div className="yv:flex yv:flex-col yv:items-center yv:gap-3">
            <DialogPrimitive.Title className="yv:text-xs yv:font-semibold yv:uppercase yv:tracking-widest yv:text-muted-foreground">
              {t('signInIntroducing')}
            </DialogPrimitive.Title>
            <YouVersionLogo aria-label="YouVersion Platform" className="yv:size-14" />
          </div>

          {promptMessage ? (
            <p className="yv:text-sm yv:font-medium yv:italic yv:text-foreground yv:text-balance">
              &ldquo;{promptMessage}&rdquo;
            </p>
          ) : null}

          <DialogPrimitive.Description className="yv:text-sm yv:text-muted-foreground yv:text-balance">
            {t('signInParagraph', { appName })}
          </DialogPrimitive.Description>

          <div className="yv:flex yv:w-full yv:flex-col yv:gap-2">
            <Button variant="default" className="yv:w-full yv:rounded-full" onClick={onConfirm}>
              {t('signInYesButton')}
            </Button>
            <Button variant="ghost" className="yv:w-full yv:rounded-full" onClick={onDecline}>
              {t('signInNoButton')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
