/** Query the isolated tree Austin's shadow host owns, or the light DOM if none. */
export function isolatedTree(container: HTMLElement): ParentNode {
  const host = container.querySelector('[data-yv-shadow-host]');
  return host?.shadowRoot ?? container;
}

export function isolatedStyleText(container: HTMLElement): string {
  const host = container.querySelector('[data-yv-shadow-host]');
  return host?.shadowRoot?.querySelector('style')?.textContent ?? '';
}
