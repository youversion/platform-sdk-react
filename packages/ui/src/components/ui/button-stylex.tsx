import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { colors, radius } from '../../lib/tokens.stylex';
import { customClassName } from '../../lib/utils.stylex';

const styles = stylex.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: 0,
    cursor: { ':disabled': 'not-allowed', default: 'pointer' },
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    gap: '0.5rem',
    justifyContent: 'center',
    opacity: { ':disabled': 0.5, default: 1 },
    outline: 'none',
    pointerEvents: { ':disabled': 'none', default: null },
    transition: 'color 0.15s, background-color 0.15s, box-shadow 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
  },
  default: {
    backgroundColor: {
      ':hover': `color-mix(in oklab, ${colors.primary} 90%, transparent)`,
      default: colors.primary,
    },
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    color: colors.primaryForeground,
  },
  destructive: {
    backgroundColor: {
      ':hover': `color-mix(in oklab, ${colors.destructive} 90%, transparent)`,
      default: colors.destructive,
    },
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    color: colors.primaryForeground,
  },
  focusable: {
    boxShadow: {
      ':focus-visible': `0 0 0 3px color-mix(in oklab, ${colors.ring} 50%, transparent)`,
      default: null,
    },
  },
  ghost: {
    backgroundColor: { ':hover': colors.accent, default: 'transparent' },
    color: { ':hover': colors.accentForeground, default: colors.foreground },
  },
  link: {
    backgroundColor: 'transparent',
    color: colors.primary,
    textDecorationLine: { ':hover': 'underline', default: 'none' },
    textUnderlineOffset: '4px',
  },
  outline: {
    backgroundColor: {
      ':hover': colors.accent,
      default: colors.background,
    },
    borderColor: colors.border,
    borderWidth: '1px',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    color: { ':hover': colors.accentForeground, default: colors.foreground },
  },
  secondary: {
    backgroundColor: {
      ':hover': `color-mix(in oklab, ${colors.secondary} 80%, transparent)`,
      default: colors.secondary,
    },
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    color: colors.secondaryForeground,
  },
  sizeDefault: { height: '2.25rem', paddingInline: '1rem' },
  sizeIcon: {
    height: '2.25rem',
    paddingInline: 0,
    width: '2.25rem',
  },
  sizeLg: { height: '2.5rem', paddingInline: '1.5rem' },
  sizeSm: {
    height: '2rem',
    paddingInline: '0.75rem',
  },
});

export type StylexButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
export type StylexButtonSize = 'default' | 'sm' | 'lg' | 'icon';

function variantStyle(variant: StylexButtonVariant): StyleXStyles {
  switch (variant) {
    case 'default':
      return styles.default;
    case 'destructive':
      return styles.destructive;
    case 'outline':
      return styles.outline;
    case 'secondary':
      return styles.secondary;
    case 'ghost':
      return styles.ghost;
    case 'link':
      return styles.link;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function sizeStyle(size: StylexButtonSize): StyleXStyles {
  switch (size) {
    case 'default':
      return styles.sizeDefault;
    case 'sm':
      return styles.sizeSm;
    case 'lg':
      return styles.sizeLg;
    case 'icon':
      return styles.sizeIcon;
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}

type StylexButtonProps = React.ComponentProps<'button'> & {
  variant?: StylexButtonVariant;
  size?: StylexButtonSize;
  asChild?: boolean;
};

/**
 * StyleX sibling of the shared shadcn Button. Used only by the two measured
 * StyleX surfaces. Reader, VOTD, pickers, and dialogs keep `ui/button`.
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  style,
  ...props
}: StylexButtonProps): React.ReactElement {
  const Comp = asChild ? Slot : 'button';
  const xstyle = stylex.props(
    styles.base,
    styles.focusable,
    variantStyle(variant),
    sizeStyle(size),
    customClassName(className),
  );

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...props}
      {...xstyle}
      className={xstyle.className}
      style={{ ...xstyle.style, ...style }}
    />
  );
}

export { Button };
