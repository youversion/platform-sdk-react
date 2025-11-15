import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  type SignInWithYouVersionPermissionValues,
  type SignInWithYouVersionResult,
} from '@youversion/platform-core';
import { useAuthentication } from '../hooks/useAuthentication';
import { Button } from '../components/ui/button';
import { YouVersionLogo } from './youversion-logo';
import { cn } from '../lib/utils';

interface SignInAuthProps {
  /**
   * Called when the sign-in flow fails.
   * @param error - The error thrown by the sign-in flow.
   */
  onAuthError?: (error: Error) => void;
  /**
   * Called when the sign-in flow succeeds.
   * @param result - The result of the sign-in flow.
   */
  onSuccess?: (result: SignInWithYouVersionResult) => void;
  /**
   * Permissions that are requested but not required for sign-in to succeed.
   */
  optionalPermissions?: SignInWithYouVersionPermissionValues[];
  /**
   * Permissions that must be granted for sign-in to succeed.
   */
  requiredPermissions?: SignInWithYouVersionPermissionValues[];
}

export interface SignInButtonProps
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
}

/**
 * SignInButton - Initiates the YouVersion OAuth sign-in flow on click.
 *
 * Key behaviors:
 * - Prevents default click behavior and triggers the SDK `signIn` method.
 * - Calls `onSuccess` with the SignInWithYouVersionResult when sign-in succeeds.
 * - Calls `onAuthError` when the underlying sign-in flow throws.
 *
 * @param {SignInButtonProps} props - Component props (see {@link SignInButtonProps}).
 * @returns {React.ReactElement} A button element that starts the sign-in flow.
 *
 * @example
 * import { SignInButton, SignInWithYouVersionPermission } from '@youversion/platform-react-ui';
 * import { useAuthentication } from '@youversion/platform-react-ui';
 *
 * export default function UnauthenticatedView() {
 *   const auth = useAuthentication();
 *
 *   return (
 *     <div>
 *       {auth.error && <p className="text-red-600">Error: {auth.error.message}</p>}
 *       <SignInButton
 *         requiredPermissions={[SignInWithYouVersionPermission.bibles]}
 *         optionalPermissions={[SignInWithYouVersionPermission.highlights]}
 *         onSuccess={(result) => console.log('signed in', result)}
 *         onAuthError={(err) => console.error(err)}
 *       />
 *     </div>
 *   );
 * }
 *
 * @example
 * // Example: different button styles shown in the example app
 * <SignInButton /> // default light background, labeled
 * <SignInButton size="short" variant="outline" /> // shorter label with outline
 *
 * @example
 * // Example showing permission enum usage from the example app
 * import { SignInWithYouVersionPermission } from '@youversion/platform-react-ui';
 *
 * <SignInButton
 *   requiredPermissions={[SignInWithYouVersionPermission.bibles]}
 *   optionalPermissions={[SignInWithYouVersionPermission.highlights]}
 * />
 *
 */
export const SignInButton = React.forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      background = 'light',
      className,
      disabled,
      onAuthError,
      onClick,
      _onSuccess,
      optionalPermissions = [],
      radius = 'rounded',
      requiredPermissions = [],
      size = 'default',
      variant = 'default',
      ...props
    },
    ref,
  ): React.ReactElement => {
    const { signIn, auth } = useAuthentication();
    const [localLoading, setLocalLoading] = React.useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.preventDefault();

      if (onClick) {
        onClick(e);
      }

      setLocalLoading(true);

      // Fire-and-forget: In web apps, signIn() triggers a full-page redirect,
      // so the promise won't resolve. The YVPProvider will auto-complete
      // the flow when the user returns from OAuth.
      // Note: onSuccess and onAuthError won't fire in web - observe auth state instead.
      signIn(requiredPermissions, optionalPermissions).catch((error) => {
        // Only handle errors that happen before redirect (e.g., config errors)
        console.error('[SignInButton] Pre-redirect error:', error);
        if (onAuthError) {
          onAuthError(error as Error);
        }
        setLocalLoading(false);
      });
    };

    const buttonLoading = Boolean(auth.isLoading || localLoading);

    let buttonCopy = 'Sign in with YouVersion';
    if (size === 'short') {
      buttonCopy = 'Sign in';
    }

    const loadingSpinner = (
      <Loader2 className="yv:z-20 yv:absolute yv:left-1/2 yv:top-1/2 yv:animate-spin yv:-translate-x-1/2 yv:-translate-y-1/2 yv:fill-primary-foreground yv:text-primary" />
    );

    if (size === 'icon') {
      return (
        <Button
          {...props}
          className={cn(
            'yv:shadow-none yv:p-3 yv:h-auto yv:w-fit',
            variant === 'outline' ? 'yv:border' : 'yv:border-none',
            className,
          )}
          disabled={buttonLoading ? true : (disabled ?? false)}
          ref={ref}
          // This was needed to pass eslint.
          // See https://github.com/orgs/react-hook-form/discussions/8622
          onClick={(e) => void handleClick(e)}
          size="icon"
          style={{
            ...(radius === 'rectangular'
              ? ({
                  '--yv-radius': '0.65rem',
                } as React.CSSProperties)
              : {}),
            borderColor: background === 'light' ? 'var(--yv-gray-15)' : 'var(--yv-gray-35)',
            borderWidth: '1px',
          }}
          variant={background === 'light' ? 'outline' : 'default'}
        >
          {buttonLoading ? loadingSpinner : null}
          <YouVersionLogo />
          <span className="yv:sr-only">{buttonCopy}</span>
        </Button>
      );
    }

    return (
      <Button
        {...props}
        className={cn(
          'yv:relative yv:shadow-none yv:w-fit',
          variant === 'outline' ? 'yv:border' : 'yv:border-none',
          className,
        )}
        disabled={buttonLoading ? true : (disabled ?? false)}
        ref={ref}
        // This was needed to pass eslint.
        // See https://github.com/orgs/react-hook-form/discussions/8622
        onClick={(e) => void handleClick(e)}
        size="lg"
        style={{
          ...(radius === 'rectangular'
            ? ({
                '--yv-radius': '0.65rem',
              } as React.CSSProperties)
            : {}),
          borderColor: background === 'light' ? 'var(--yv-gray-15)' : 'var(--yv-gray-35)',
          borderWidth: '1px',
        }}
        variant={background === 'light' ? 'outline' : 'default'}
      >
        {buttonLoading ? loadingSpinner : null}
        <YouVersionLogo />
        {buttonCopy}
      </Button>
    );
  },
);

SignInButton.displayName = 'SignInButton';
