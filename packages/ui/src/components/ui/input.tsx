import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>): React.ReactNode {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'yv:file:text-foreground yv:placeholder:text-muted-foreground yv:selection:bg-primary yv:selection:text-primary-foreground yv:dark:bg-input/30 yv:border-input yv:h-9 yv:w-full yv:min-w-0 yv:rounded-md yv:border yv:bg-transparent yv:px-3 yv:py-1 yv:text-base yv:shadow-xs yv:transition-[color,box-shadow] yv:outline-none yv:file:inline-flex yv:file:h-7 yv:file:border-0 yv:file:bg-transparent yv:file:text-sm yv:file:font-medium yv:disabled:pointer-events-none yv:disabled:cursor-not-allowed yv:disabled:opacity-50 yv:md:text-sm',
        'yv:aria-invalid:ring-destructive/20 yv:dark:aria-invalid:ring-destructive/40 yv:aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
