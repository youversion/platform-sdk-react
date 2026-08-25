declare const __YV_STYLES__: string;
declare const __YV_STYLEX_STYLES__: string;

/** Tailwind bundle embedded at build time. Light-DOM provider and Tailwind shadows. */
export const tailwindStylesheet: string = __YV_STYLES__;

/**
 * StyleX spike sheet: theme tokens, bible-reader CSS, host reset, and compiled
 * StyleX rules. No Tailwind utilities. Adopted by the two measured shadows.
 */
export const stylexStylesheet: string = __YV_STYLEX_STYLES__;
