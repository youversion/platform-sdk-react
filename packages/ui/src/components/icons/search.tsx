import type { ComponentProps, ReactElement } from 'react';

export function SearchIcon(props: ComponentProps<'svg'>): ReactElement {
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
        d="M10.5 19C6.35786 19 3 15.6421 3 11.5C3 7.35786 6.35786 4 10.5 4C14.6421 4 18 7.35786 18 11.5C18 13.2105 17.4274 14.7873 16.4634 16.0491L19.799 19.3848C20.1895 19.7753 20.1895 20.4085 19.799 20.799C19.4085 21.1895 18.7753 21.1895 18.3848 20.799L15.0491 17.4633C13.7873 18.4274 12.2105 19 10.5 19ZM10.5 16.9688C7.47969 16.9688 5.03125 14.5203 5.03125 11.5C5.03125 8.47969 7.47969 6.03125 10.5 6.03125C13.5203 6.03125 15.9688 8.47969 15.9688 11.5C15.9688 14.5203 13.5203 16.9688 10.5 16.9688Z"
        fill="currentColor"
      />
    </svg>
  );
}
