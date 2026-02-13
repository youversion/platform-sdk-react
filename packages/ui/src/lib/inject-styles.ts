// Built CSS is injected as a global by tsup at bundle time
declare const __YV_STYLES__: string;

export function injectStyles() {
  if (typeof document === 'undefined') return; // SSR safety

  const id = '__yv-sdk-styles';
  if (document.getElementById(id)) return; // Already injected

  // Prepend style tag so consumer styles take cascade priority
  const style = document.createElement('style');
  style.id = id;
  style.textContent = __YV_STYLES__;
  document.head.prepend(style);
}
