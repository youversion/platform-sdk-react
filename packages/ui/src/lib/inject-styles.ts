// Built CSS is injected as a global by tsup at bundle time
declare const __YV_STYLES__: string;

export function injectStyles() {
  if (typeof document === 'undefined') return; // SSR safety

  const id = '__yv-sdk-styles';
  if (document.getElementById(id)) return; // Already injected

  // Create and append style tag to DOM
  const style = document.createElement('style');
  style.id = id;
  style.textContent = __YV_STYLES__;
  document.head.appendChild(style);
}
