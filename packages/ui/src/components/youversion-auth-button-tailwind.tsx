import React, { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import i18n from '@/i18n';
import { LoaderIcon } from './icons/loader';
import { useYVAuth, useTheme } from '@youversion/platform-react-hooks';
import { Button } from '../components/ui/button';
import { YouVersionLogo } from './icons/youversion-logo';
import { cn } from '../lib/utils';
import { withShadowIsolation } from '../lib/shadow-isolation';
import type { YouVersionAuthButtonProps } from './YouVersionAuthButton';

/**
 * Tailwind-in-shadow control for the YPE-5298 visual comparison. Not public API.
 */
const YouVersionAuthButtonTailwindImpl = React.forwardRef<
  HTMLButtonElement,
  YouVersionAuthButtonProps
>(
  (
    {
      background,
      className,
      disabled,
      onAuthError,
      onClick,
      mode,
      scopes = [],
      permissions,
      radius = 'rounded',
      size = 'default',
      text,
      variant = 'default',
      ...props
    },
    ref,
  ): React.ReactElement => {
    const { signIn, signOut, auth } = useYVAuth();
    const providerTheme = useTheme();
    const theme = background || providerTheme;
    const { t } = useTranslation(undefined, { i18n });

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
      e.preventDefault();

      if (onClick) {
        onClick(e);
      }

      try {
        if (mode === 'signOut' || auth.isAuthenticated) {
          signOut();
        } else {
          await signIn({
            scopes,
            permissions,
          });
        }
      } catch (error) {
        if (onAuthError) {
          onAuthError(error instanceof Error ? error : new Error('Auth failed'));
        }
      }
    };

    const buttonLoading = auth.isLoading;

    const buttonText = useMemo(() => {
      if (text) return text;

      const isSignOut = mode === 'signOut' || (mode === 'auto' && auth.isAuthenticated);

      if (size === 'short') {
        return isSignOut ? t('signOut') : t('signIn');
      }

      return isSignOut ? (
        <div className="yv:font-normal">
          <Trans
            i18nKey="signOutOfYouVersion"
            i18n={i18n}
            components={{ bold: <span className="yv:font-bold" /> }}
          />
        </div>
      ) : (
        <div className="yv:font-normal">
          <Trans
            i18nKey="signInWithYouVersion"
            i18n={i18n}
            components={{ bold: <span className="yv:font-bold" /> }}
          />
        </div>
      );
    }, [mode, auth.isAuthenticated, size, text, t]);

    const loadingSpinner = (
      <LoaderIcon className="yv:z-20 yv:absolute yv:left-1/2 yv:top-1/2 yv:animate-spin yv:-translate-x-1/2 yv:-translate-y-1/2 yv:fill-primary-foreground yv:text-primary" />
    );

    type AuthButtonStyle = React.CSSProperties & { '--yv-radius'?: string };
    const buttonStyle: AuthButtonStyle = {
      borderColor: theme === 'light' ? 'var(--yv-gray-15)' : 'var(--yv-gray-35)',
      borderWidth: '1px',
    };
    if (radius === 'rectangular') {
      buttonStyle['--yv-radius'] = '0.65rem';
    }

    if (size === 'icon') {
      return (
        <Button
          {...props}
          data-yv-sdk
          data-yv-theme={theme}
          className={cn(
            'yv:font-sans yv:shadow-none yv:p-3 yv:h-auto yv:w-fit',
            'yv:bg-background yv:hover:bg-background/90',
            variant === 'outline' ? 'yv:border' : 'yv:border-none',
            theme === 'light' ? 'yv:text-black' : 'yv:text-white',
            className,
          )}
          disabled={buttonLoading ? true : (disabled ?? false)}
          ref={ref}
          onClick={(e) => void handleClick(e)}
          size="icon"
          style={buttonStyle}
          variant={'default'}
        >
          {buttonLoading ? loadingSpinner : null}
          <YouVersionLogo />
          <span className="yv:sr-only">{buttonText}</span>
        </Button>
      );
    }

    return (
      <Button
        {...props}
        data-yv-sdk
        data-yv-theme={theme}
        className={cn(
          'yv:font-sans yv:relative yv:shadow-none yv:w-fit',
          'yv:bg-background yv:hover:bg-background/90',
          variant === 'outline' ? 'yv:border' : 'yv:border-none',
          theme === 'light' ? 'yv:text-black' : 'yv:text-white',
          className,
        )}
        disabled={buttonLoading ? true : (disabled ?? false)}
        ref={ref}
        onClick={(e) => void handleClick(e)}
        size="lg"
        style={buttonStyle}
        variant={'default'}
      >
        {buttonLoading ? loadingSpinner : null}
        <YouVersionLogo />
        {buttonText}
      </Button>
    );
  },
);

YouVersionAuthButtonTailwindImpl.displayName = 'YouVersionAuthButtonTailwindImpl';

export const YouVersionAuthButtonTailwind = withShadowIsolation(
  YouVersionAuthButtonTailwindImpl,
  'YouVersionAuthButtonTailwind',
);
