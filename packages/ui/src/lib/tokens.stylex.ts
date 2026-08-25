import * as stylex from '@stylexjs/stylex';

/**
 * StyleX tokens mapped onto the existing `--yv` / `[data-yv-sdk]` theme.
 * No new palette. Dark mode still flips via `[data-yv-sdk][data-yv-theme='dark']`.
 */
export const colors = stylex.defineVars({
  accent: 'var(--yv-accent)',
  accentForeground: 'var(--yv-accent-foreground)',
  background: 'var(--yv-background)',
  border: 'var(--yv-border)',
  card: 'var(--yv-card)',
  cardForeground: 'var(--yv-card-foreground)',
  destructive: 'var(--yv-destructive)',
  foreground: 'var(--yv-foreground)',
  input: 'var(--yv-input)',
  muted: 'var(--yv-muted)',
  mutedForeground: 'var(--yv-muted-foreground)',
  popover: 'var(--yv-popover)',
  popoverForeground: 'var(--yv-popover-foreground)',
  primary: 'var(--yv-primary)',
  primaryForeground: 'var(--yv-primary-foreground)',
  ring: 'var(--yv-ring)',
  secondary: 'var(--yv-secondary)',
  secondaryForeground: 'var(--yv-secondary-foreground)',
  sidebar: 'var(--yv-sidebar)',
  sidebarAccent: 'var(--yv-sidebar-accent)',
  sidebarAccentForeground: 'var(--yv-sidebar-accent-foreground)',
  sidebarBorder: 'var(--yv-sidebar-border)',
  sidebarForeground: 'var(--yv-sidebar-foreground)',
  sidebarPrimary: 'var(--yv-sidebar-primary)',
  sidebarPrimaryForeground: 'var(--yv-sidebar-primary-foreground)',
  sidebarRing: 'var(--yv-sidebar-ring)',
});

export const radius = stylex.defineVars({
  lg: 'var(--yv-radius)',
  md: 'calc(var(--yv-radius) - 2px)',
  sm: 'calc(var(--yv-radius) - 4px)',
  xl: 'calc(var(--yv-radius) + 4px)',
});
