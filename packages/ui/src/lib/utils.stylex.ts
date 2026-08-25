import type { StyleXStyles } from '@stylexjs/stylex';

export function customClassName(className: string | undefined): StyleXStyles | null {
  if (!className) return null;
  // SAFETY: StyleX's props() accepts compiled objects that mark a class name
  // with `$$css: true`. The registry ships this same shape for host className.
  return { [className]: className, $$css: true } as StyleXStyles;
}
