export function isExpectedFontStylesheetEvent(event: Event): boolean {
  const target = event.target;
  return (
    target instanceof HTMLLinkElement &&
    target.rel === 'stylesheet' &&
    target.href.includes('/v1/fonts/1/stylesheet?app_key=')
  );
}
