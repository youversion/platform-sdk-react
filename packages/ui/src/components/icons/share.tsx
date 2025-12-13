import type { SVGProps } from 'react';

const SvgComponent = (props: SVGProps<SVGSVGElement>): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path
      fill="currentColor"
      d="M16.121 9.187a1 1 0 0 1-1.414 0L13 7.48V15a1 1 0 1 1-2 0V7.348L9.121 9.227a1 1 0 1 1-1.414-1.414l3.52-3.52a1 1 0 0 1 1.414 0l3.48 3.48a1 1 0 0 1 0 1.414Z"
    />
    <path
      fill="currentColor"
      d="M6 12a1 1 0 0 0-1 1v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a1 1 0 0 0-2 0v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V13a1 1 0 0 0-1-1Z"
    />
  </svg>
);

export { SvgComponent as Share };
