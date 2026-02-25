import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      className={cn('yv:animate-pulse yv:rounded-md yv:bg-accent', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
