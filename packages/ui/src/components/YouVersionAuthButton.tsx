import React, { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import i18n from '@/i18n';
import { LoaderIcon } from './icons/loader';
import {
  type AuthenticationScopes,
  type SignInWithYouVersionPermissionValues,
} from '@youversion/platform-core';
import { useYVAuth, useTheme } from '@youversion/platform-react-hooks';
import { Button } from '../components/ui/button';
import { YouVersionLogo } from './icons/youversion-logo';
import { cn } from '../lib/utils';
import { withShadowIsolation } from '../lib/shadow-isolation';

interface SignInAuthProps {
  /**
   * Called when the sign-in flow fails.
   * @param error - The error thrown by the sign-in flow.
   */
  onAuthError?: (error: Error) => void;
  scopes?: AuthenticationScopes[];
  /**
   * YouVersion data-exchange permissions to request at sign-in (e.g. `highlights`).
   * These are distinct from OIDC `scopes` and are sent as `requested_permissions`.
   */
  permissions?: SignInWithYouVersionPermissionValues[];
}

export interface YouVersionAuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    SignInAuthProps {
  /**
   * The background color of the button.
   *
   * This is not correlated with the theme of the device (i.e. dark mode or light mode)
   */
  background?: 'light' | 'dark';
  /**
   * The radius of the button.
   *
   * - `rounded` - The button has rounded corners.
   * - `rectangular` - The button has rectangular corners.
   */
  radius?: 'rounded' | 'rectangular';
  /**
   * The size of the button.
   *
   * - `default` - The default button size.
   * - `short` - A shorter button size.
   * - `icon` - A button size for icons.
   */
  size?: 'default' | 'short' | 'icon';
  /**
   * The variant of the button.
   *
   * - `default` - Button without contrast border.
   * - `outline` - Button with contrast border.
   */
  variant?: 'default' | 'outline';
  /**
   * The mode of the signIn/SignOut button
   *
   * - `signIn` - Renders the YouVersionAuthButton
   * - `signOut` - Renders the SignOutButton
   * - `auto` - Renders the YouVersionAuthButton when there
   *   is not a user signed in and renders the SignOutButton
   *   when there is a user signed in.
   *
   * */
  mode?: 'signIn' | 'signOut' | 'auto';
  text?: string;
}

/**
 * YouVersionAuthButton - Initiates the YouVersion OAuth sign-in flow on click.
 *
 * Key behaviors:
 * - Prevents default click behavior and triggers the SDK `signIn` method.
 * - Calls `onAuthError` when the underlying sign-in flow throws.
 *
 * @param {YouVersionAuthButtonProps} props - Component props (see {@link YouVersionAuthButtonProps}).
 * @returns {React.ReactElement} A button element that starts the sign-in flow.
 *
 * @example
 * import { YouVersionAuthButton, SignInWithYouVersionPermission } from '@youversion/platform-react-ui';
 * import { useYVAuth } from '@youversion/platform-react-hooks';
 *
 * export default function UnauthenticatedView() {
 *   const { auth } = useYVAuth();
 *
 *   return (
 *     <div>
 *       {auth.error && <p className="text-red-600">Error: {auth.error.message}</p>}
 *       <YouVersionAuthButton
 *         onAuthError={(err) => console.error(err)}
 *       />
 *     </div>
 *   );
 * }
 *
 * @example
 * // Example: different button styles shown in the example app
 * <YouVersionAuthButton /> // default light background, labeled
 * <YouVersionAuthButton size="short" variant="outline" /> // shorter label with outline
 *
 * @example
 * // Example showing scope usage from the example app
 * import { SignInWithYouVersionPermission } from '@youversion/platform-react-ui';
 *
 * <YouVersionAuthButton scopes={['profile']}/>
 *
 */
const YouVersionAuthButtonImpl = React.forwardRef<HTMLButtonElement, YouVersionAuthButtonProps>(
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
          onAuthError(error as Error);
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

    if (size === 'icon') {
      return (
        <Button
          {...props}
          data-yv-sdk
          data-yv-theme={theme}
          className={cn(
            'yv:font-sans yv:shadow-none yv:p-3 yv:h-auto yv:w-fit',
            // The YV brand button is a neutral surface (white in light, dark in
            // dark) with its own text/logo color set below — pin the background
            // explicitly so it doesn't inherit the `default` variant's
            // `bg-primary`, which would render the logo unreadable.
            'yv:bg-background yv:hover:bg-background/90',
            variant === 'outline' ? 'yv:border' : 'yv:border-none',
            theme === 'light' ? 'yv:text-black' : 'yv:text-white',
            className,
          )}
          disabled={buttonLoading ? true : (disabled ?? false)}
          ref={ref}
          onClick={(e) => void handleClick(e)}
          size="icon"
          style={{
            ...(radius === 'rectangular'
              ? ({
                  '--yv-radius': '0.65rem',
                } as React.CSSProperties)
              : {}),
            borderColor: theme === 'light' ? 'var(--yv-gray-15)' : 'var(--yv-gray-35)',
            borderWidth: '1px',
          }}
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
          // Pin the neutral brand surface so the button doesn't inherit the
          // `default` variant's `bg-primary` (see the icon branch above).
          'yv:bg-background yv:hover:bg-background/90',
          variant === 'outline' ? 'yv:border' : 'yv:border-none',
          theme === 'light' ? 'yv:text-black' : 'yv:text-white',
          className,
        )}
        disabled={buttonLoading ? true : (disabled ?? false)}
        ref={ref}
        onClick={(e) => void handleClick(e)}
        size="lg"
        style={{
          ...(radius === 'rectangular'
            ? ({
                '--yv-radius': '0.65rem',
              } as React.CSSProperties)
            : {}),
          borderColor: theme === 'light' ? 'var(--yv-gray-15)' : 'var(--yv-gray-35)',
          borderWidth: '1px',
        }}
        variant={'default'}
      >
        {buttonLoading ? loadingSpinner : null}
        <YouVersionLogo />
        {buttonText}
      </Button>
    );
  },
);

YouVersionAuthButtonImpl.displayName = 'YouVersionAuthButtonImpl';

/**
 * Automatically rendered in a Shadow DOM so host-page selectors cannot style
 * the button's internal DOM. No consumer wrapper or opt-in flag is required.
 */
export const YouVersionAuthButton = withShadowIsolation(
  YouVersionAuthButtonImpl,
  'YouVersionAuthButton',
);
