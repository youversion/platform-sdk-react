import type { ComponentProps, ReactElement } from 'react';

export function ChevronRightIcon(props: ComponentProps<'svg'>): ReactElement {
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
        d="M8.29289 18.7071C7.90237 18.3166 7.90237 17.6834 8.29289 17.2929L13.2322 12.3536C13.4275 12.1583 13.4275 11.8417 13.2322 11.6464L8.29289 6.70711C7.90237 6.31658 7.90237 5.68342 8.29289 5.29289C8.68342 4.90237 9.31658 4.90237 9.70711 5.29289L15.3536 10.9393C15.9393 11.5251 15.9393 12.4749 15.3536 13.0607L9.70711 18.7071C9.31658 19.0976 8.68342 19.0976 8.29289 18.7071Z"
        fill="currentColor"
      />
    </svg>
  );
}
