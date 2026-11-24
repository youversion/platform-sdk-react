export function prefersReducedMotion(view: Pick<Window, 'matchMedia'> | null = globalThis): boolean {
  return Boolean(view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
