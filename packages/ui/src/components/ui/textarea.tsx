import * as React from 'react';

import { cn } from '@/lib/utils';
import { YvComponentStyles } from '@/lib/yv-styles-components';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.ReactElement {
  return (
    <>
      <YvComponentStyles />
      <textarea
        data-slot="textarea"
        className={cn(
          'yv:border-input yv:placeholder:text-muted-foreground yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:aria-invalid:ring-destructive/20 yv:dark:aria-invalid:ring-destructive/40 yv:aria-invalid:border-destructive yv:dark:bg-input/30 yv:flex yv:field-sizing-content yv:min-h-16 yv:w-full yv:rounded-md yv:border yv:bg-transparent yv:px-3 yv:py-2 yv:text-base yv:shadow-xs yv:transition-[color,box-shadow] yv:outline-none yv:focus-visible:ring-[3px] yv:disabled:cursor-not-allowed yv:disabled:opacity-50 yv:md:text-sm',
          className,
        )}
        {...props}
      />
    </>
  );
}

export { Textarea };
