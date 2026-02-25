import type { ComponentProps, ReactElement } from 'react';

export function ChevronLeftIcon(props: ComponentProps<'svg'>): ReactElement {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.707 5.29289C16.0976 5.68342 16.0976 6.31658 15.707 6.70711L10.5909 11.8232C10.4933 11.9209 10.4933 12.0791 10.5909 12.1768L15.707 17.2929C16.0976 17.6834 16.0976 18.3166 15.707 18.7071C15.3165 19.0976 14.6833 19.0976 14.2928 18.7071L8.64637 13.0607C8.06058 12.4749 8.06058 11.5251 8.64637 10.9393L14.2928 5.29289C14.6833 4.90237 15.3165 4.90237 15.707 5.29289Z"
        fill="currentColor"
      />
    </svg>
  );
}
