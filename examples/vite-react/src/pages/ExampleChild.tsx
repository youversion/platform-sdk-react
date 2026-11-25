import type { ReactNode } from 'react';
import { formatHash } from '@/routes';

export function ExampleChild({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b ps-4 pe-4 py-2">
        <a
          href={formatHash({ destination: 'examples', exampleId: null })}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Examples
        </a>
      </div>
      {children}
    </div>
  );
}
