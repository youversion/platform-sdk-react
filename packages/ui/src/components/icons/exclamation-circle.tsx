import type { ComponentProps, ReactElement } from 'react';

/**
 * Circular exclamation icon for error/warning states (e.g. verse unavailable).
 * Solid outline circle with bold exclamation for high visibility.
 */
export function ExclamationCircle(props: ComponentProps<'svg'>): ReactElement {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M12 6.5v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="16.25" r="1.5" fill="currentColor" />
    </svg>
  );
}
