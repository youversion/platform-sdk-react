import React, { useMemo, useContext } from 'react';
import { Loader2 } from 'lucide-react';
import { type AuthenticationScopes } from '@youversion/platform-core';
import { useYVAuth, YouVersionContext } from '@youversion/platform-react-hooks';
import { Button } from '../components/ui/button';
import { YouVersionLogo } from './youversion-logo';
import { cn } from '../lib/utils';

interface SignInAuthProps {
  /**
   * Called when the sign-in flow fails.
   * @param error - The error thrown by the sign-in flow.
   */
  onAuthError?: (error: Error) => void;
  scopes?: AuthenticationScopes[];
  redirectUrl: string;
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
export const YouVersionAuthButton = React.forwardRef<HTMLButtonElement, YouVersionAuthButtonProps>(
  (
    {
      background,
      className,
      disabled,
      onAuthError,
      onClick,
      mode,
      scopes = [],
      radius = 'rounded',
      redirectUrl,
      size = 'default',
      text,
      variant = 'default',
      ...props
    },
    ref,
  ): React.ReactElement => {
    const { signIn, signOut, auth } = useYVAuth();
    const context = useContext(YouVersionContext);
    const theme = background || context?.theme;

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
            redirectUrl,
            scopes,
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
      if (text) {
        return text;
      } else if (size === 'short') {
        if (mode === 'signOut') {
          return 'Sign Out';
        } else if (mode === 'signIn') {
          return 'Sign In';
        } else {
          return auth.isAuthenticated ? 'Sign Out' : 'Sign In';
        }
      } else {
        if (mode === 'signOut') {
          return 'Sign Out of YouVersion';
        } else if (mode === 'signIn') {
          return 'Sign In with YouVersion';
        } else {
          return auth.isAuthenticated ? 'Sign Out of YouVersion' : 'Sign In with YouVersion';
        }
      }
    }, [mode, auth.isAuthenticated, size, text]);

    const loadingSpinner = (
      <Loader2 className="yv:z-20 yv:absolute yv:left-1/2 yv:top-1/2 yv:animate-spin yv:-translate-x-1/2 yv:-translate-y-1/2 yv:fill-primary-foreground yv:text-primary" />
    );

    if (size === 'icon') {
      return (
        <Button
          {...props}
          data-yv-sdk
          data-yv-theme={theme}
          className={cn(
            'yv:shadow-none yv:p-3 yv:h-auto yv:w-fit',
            variant === 'outline' ? 'yv:border' : 'yv:border-none',
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
          variant={theme === 'light' ? 'outline' : 'default'}
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
          'yv:relative yv:shadow-none yv:w-fit',
          variant === 'outline' ? 'yv:border' : 'yv:border-none',
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
        variant={theme === 'light' ? 'outline' : 'default'}
      >
        {buttonLoading ? loadingSpinner : null}
        <YouVersionLogo />
        {buttonText}
      </Button>
    );
  },
);

YouVersionAuthButton.displayName = 'YouVersionAuthButton';
