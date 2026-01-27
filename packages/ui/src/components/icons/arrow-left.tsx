import type { ComponentProps, ReactElement } from 'react';

export function ArrowLeftIcon(props: ComponentProps<'svg'>): ReactElement {
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
        d="M12.7071 5.73958C13.0976 5.34905 13.0976 4.71589 12.7071 4.32536C12.3166 3.93484 11.6834 3.93484 11.2929 4.32536L4.64643 10.9718C4.06064 11.5576 4.06065 12.5073 4.64643 13.0931L11.2929 19.7396C11.6834 20.1301 12.3166 20.1301 12.7071 19.7396C13.0976 19.3491 13.0976 18.7159 12.7071 18.3254L7.80851 13.4268C7.65101 13.2693 7.76256 13 7.98528 13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H8.05022C7.8275 11 7.71595 10.7307 7.87345 10.5732L12.7071 5.73958Z"
        fill="currentColor"
      />
    </svg>
  );
}
