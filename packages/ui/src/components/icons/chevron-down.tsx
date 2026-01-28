import type { ComponentProps, ReactElement } from 'react';

export function ChevronDownIcon(props: ComponentProps<'svg'>): ReactElement {
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
        d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L11.6464 13.2322C11.8417 13.4275 12.1583 13.4275 12.3536 13.2322L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L13.0607 15.3536C12.4749 15.9393 11.5251 15.9393 10.9393 15.3536L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
        fill="currentColor"
      />
    </svg>
  );
}
