import type { ComponentProps, ReactElement } from 'react';
import i18n from '@/i18n';

export function LoaderIcon({
  'aria-label': ariaLabel,
  ...props
}: ComponentProps<'svg'>): ReactElement {
  return (
    <svg
      role="status"
      aria-label={ariaLabel ?? i18n.t('loading')}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
