import React, { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import * as stylex from '@stylexjs/stylex';
import i18n from '@/i18n';
import { LoaderIcon } from './icons/loader';
import {
  type AuthenticationScopes,
  type SignInWithYouVersionPermissionValues,
} from '@youversion/platform-core';
import { useYVAuth, useTheme } from '@youversion/platform-react-hooks';
import { Button } from './ui/button-stylex';
import { YouVersionLogo } from './icons/youversion-logo';
import { stylexStylesheet } from '../lib/embedded-styles';
import { colors } from '../lib/tokens.stylex';
import { customClassName } from '../lib/utils.stylex';
import { withShadowIsolation } from '../lib/shadow-isolation';

const spin = stylex.keyframes({
  from: { transform: 'translate(-50%, -50%) rotate(0deg)' },
  to: { transform: 'translate(-50%, -50%) rotate(360deg)' },
});

const styles = stylex.create({
  button: {
    position: 'relative',
    fontFamily: 'var(--yv-font-sans)',
    boxShadow: 'none',
    width: 'fit-content',
    backgroundColor: {
      default: colors.background,
      ':hover': `color-mix(in oklab, ${colors.background} 90%, transparent)`,
    },
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  outline: {
    borderWidth: '1px',
  },
  plain: {
    borderWidth: 0,
  },
  light: {
    color: 'black',
    borderColor: 'var(--yv-gray-15)',
  },
  dark: {
    color: 'white',
    borderColor: 'var(--yv-gray-35)',
  },
  icon: {
    padding: '0.75rem',
    height: 'auto',
  },
  rectangular: {
    borderRadius: '0.65rem',
  },
  label: {
    fontWeight: 400,
  },
  labelBold: {
    fontWeight: 700,
  },
  spinner: {
    zIndex: 20,
    position: 'absolute',
    insetInlineStart: '50%',
    insetBlockStart: '50%',
    transform: 'translate(-50%, -50%)',
    animationName: spin,
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
});

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
        <div {...stylex.props(styles.label)}>
          <Trans
            i18nKey="signOutOfYouVersion"
            i18n={i18n}
            components={{ bold: <span {...stylex.props(styles.labelBold)} /> }}
          />
        </div>
      ) : (
        <div {...stylex.props(styles.label)}>
          <Trans
            i18nKey="signInWithYouVersion"
            i18n={i18n}
            components={{ bold: <span {...stylex.props(styles.labelBold)} /> }}
          />
        </div>
      );
    }, [mode, auth.isAuthenticated, size, text, t]);

    const loadingSpinner = <LoaderIcon {...stylex.props(styles.spinner)} />;
    const isIcon = size === 'icon';
    const composed = stylex.props(
      styles.button,
      variant === 'outline' ? styles.outline : styles.plain,
      theme === 'light' ? styles.light : styles.dark,
      isIcon ? styles.icon : null,
      radius === 'rectangular' ? styles.rectangular : null,
      customClassName(className),
    );

    return (
      <Button
        {...props}
        data-yv-sdk
        data-yv-theme={theme}
        className={composed.className}
        disabled={buttonLoading ? true : (disabled ?? false)}
        ref={ref}
        onClick={(e) => void handleClick(e)}
        size={isIcon ? 'icon' : 'lg'}
        style={composed.style}
        variant="default"
      >
        {buttonLoading ? loadingSpinner : null}
        <YouVersionLogo />
        {isIcon ? <span {...stylex.props(styles.srOnly)}>{buttonText}</span> : buttonText}
      </Button>
    );
  },
);

YouVersionAuthButtonImpl.displayName = 'YouVersionAuthButtonImpl';

/**
 * Automatically rendered in a Shadow DOM so host-page selectors cannot style
 * the button's internal DOM. No consumer wrapper or opt-in flag is required.
 * The adopted sheet is the precompiled StyleX spike CSS, not the Tailwind bundle.
 */
export const YouVersionAuthButton = withShadowIsolation(
  YouVersionAuthButtonImpl,
  'YouVersionAuthButton',
  stylexStylesheet,
);
